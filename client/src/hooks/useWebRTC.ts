import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebRTCOptions {
  roomId: string;
  isInitiator?: boolean;
  mediaMode?: 'video' | 'voice' | 'messaging';
  onSendSignal: (signal: any) => void;
  incomingSignal: { signal: any; id: number } | null;
  autoStart?: boolean;
}

export type WebRTCConnectionState =
  | 'idle'
  | 'requesting_media'
  | 'ready'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'permission_denied';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

export const useWebRTC = ({
  roomId,
  isInitiator = true,
  mediaMode = 'video',
  onSendSignal,
  incomingSignal,
  autoStart = true,
}: UseWebRTCOptions) => {
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('idle');
  const [isCameraOn, setIsCameraOn] = useState(mediaMode === 'video');
  const [isMicOn, setIsMicOn] = useState(mediaMode !== 'messaging');
  const [isFacingUser, setIsFacingUser] = useState(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(false);
  const [isRemoteAudioActive, setIsRemoteAudioActive] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const isSettingRemoteAnswerPending = useRef<boolean>(false);
  const processedSignalIdRef = useRef<number | null>(null);

  useEffect(() => {
    setIsCameraOn(mediaMode === 'video');
    setIsMicOn(mediaMode !== 'messaging');
  }, [mediaMode]);

  // Check available camera devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  // Initialize or update local media stream
  const startLocalMedia = useCallback(async (facingUser = true): Promise<MediaStream | null> => {
    if (mediaMode === 'messaging') return null;

    setConnectionState('requesting_media');
    setMediaError(null);

    // Stop existing local tracks before acquiring new ones
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: mediaMode === 'video' ? {
          facingMode: facingUser ? 'user' : 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        if (mediaMode !== 'video') throw err;

        console.warn('Video capture failed, retrying with audio only:', err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsCameraOn(false);
        } catch (audioErr) {
          throw audioErr;
        }
      }

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // prevent local feedback
        localVideoRef.current.play().catch(() => {});
      }

      setConnectionState('ready');
      return stream;
    } catch (err: any) {
      console.error('Failed to get media devices:', err);
      setConnectionState('permission_denied');
      setMediaError('Could not access camera or microphone.');
      return null;
    }
  }, [mediaMode]);

  // Initialize WebRTC PeerConnection
  const initPeerConnection = useCallback((stream: MediaStream) => {
    // Clean up existing PC
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    iceCandidatesQueue.current = [];

    // Create remote media stream
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().includes(track)) {
          remoteStream.addTrack(track);
        }

        if (track.kind === 'video') {
          setIsRemoteVideoActive(track.enabled && track.readyState === 'live');
          track.onunmute = () => setIsRemoteVideoActive(true);
          track.onmute = () => setIsRemoteVideoActive(false);
          track.onended = () => setIsRemoteVideoActive(false);
        }

        if (track.kind === 'audio') {
          setIsRemoteAudioActive(track.enabled && track.readyState === 'live');
          track.onunmute = () => setIsRemoteAudioActive(true);
          track.onmute = () => setIsRemoteAudioActive(false);
          track.onended = () => setIsRemoteAudioActive(false);
        }
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    // Send local ICE candidates to remote partner
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionState('connected');
      } else if (state === 'connecting') {
        setConnectionState('connecting');
      } else if (state === 'disconnected') {
        setConnectionState('disconnected');
      } else if (state === 'failed') {
        setConnectionState('failed');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionState('connected');
      }
    };

    // If initiator, send initial offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (pc.localDescription) {
            onSendSignal({
              type: 'offer',
              sdp: pc.localDescription,
            });
          }
        })
        .catch((err) => {
          console.warn('Error creating WebRTC offer:', err);
        });
    }

    return pc;
  }, [isInitiator, onSendSignal]);

  // Handle incoming signals from the signaling server
  useEffect(() => {
    if (!incomingSignal || !incomingSignal.signal || incomingSignal.id === processedSignalIdRef.current) {
      return;
    }

    processedSignalIdRef.current = incomingSignal.id;
    const signal = incomingSignal.signal;
    const pc = pcRef.current;

    const handleSignal = async () => {
      try {
        if (signal.type === 'offer') {
          let currentPc = pc;
          if (!currentPc) {
            let stream = localStreamRef.current;
            if (!stream) {
              stream = await startLocalMedia(isFacingUser);
            }
            if (stream) {
              currentPc = initPeerConnection(stream);
            }
          }

          if (!currentPc) return;

          await currentPc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Process queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const cand = iceCandidatesQueue.current.shift();
            if (cand) {
              await currentPc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }

          const answer = await currentPc.createAnswer();
          await currentPc.setLocalDescription(answer);

          onSendSignal({
            type: 'answer',
            sdp: currentPc.localDescription,
          });
        } else if (signal.type === 'answer') {
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

            // Process queued ICE candidates
            while (iceCandidatesQueue.current.length > 0) {
              const cand = iceCandidatesQueue.current.shift();
              if (cand) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
            }
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            iceCandidatesQueue.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.warn('Error handling incoming WebRTC signal:', err);
      }
    };

    handleSignal();
  }, [incomingSignal, initPeerConnection, isFacingUser, onSendSignal, startLocalMedia]);

  // Setup on mount and teardown on unmount / room change
  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      if (autoStart && mediaMode !== 'messaging') {
        const stream = await startLocalMedia(isFacingUser);
        if (stream && isMounted) {
          initPeerConnection(stream);
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
      }
    };
  }, [roomId, autoStart, mediaMode]);

  // Toggle Video Track
  const toggleCamera = useCallback(() => {
    if (mediaMode !== 'video') return;
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) {
      // Re-request camera if not available
      startLocalMedia(isFacingUser).then((stream) => {
        if (stream && pcRef.current) {
          const newVideoTrack = stream.getVideoTracks()[0];
          if (newVideoTrack) {
            const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            } else {
              pcRef.current.addTrack(newVideoTrack, stream);
            }
            setIsCameraOn(true);
          }
        }
      });
      return;
    }

    const nextState = !isCameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsCameraOn(nextState);
  }, [isCameraOn, isFacingUser, mediaMode, startLocalMedia]);

  // Toggle Audio Track
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    const nextState = !isMicOn;
    audioTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsMicOn(nextState);
  }, [isMicOn]);

  // Switch Camera (Front vs Back)
  const flipCamera = useCallback(async () => {
    if (mediaMode !== 'video') return;
    const nextFacing = !isFacingUser;
    setIsFacingUser(nextFacing);
    const newStream = await startLocalMedia(nextFacing);
    if (newStream && pcRef.current) {
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }
    }
  }, [isFacingUser, startLocalMedia]);

  const terminateConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setConnectionState('disconnected');
    setIsRemoteVideoActive(false);
    setIsRemoteAudioActive(false);
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    connectionState,
    isCameraOn,
    isMicOn,
    isFacingUser,
    hasMultipleCameras,
    isRemoteVideoActive,
    isRemoteAudioActive,
    mediaError,
    toggleCamera,
    toggleMic,
    flipCamera,
    startLocalMedia,
    terminateConnection,
  };
};
