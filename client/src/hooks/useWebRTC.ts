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

// Creates a lightweight, high-performance virtual MediaStream with an animated canvas video track and silent audio track
const createVirtualMediaStream = (label = 'You'): MediaStream => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  let animFrame: number;
  let angle = 0;

  const draw = () => {
    if (!ctx) return;
    // Dark modern gradient
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#121214');
    grad.addColorStop(1, '#1A1A1E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Subtle pulsing ring
    angle += 0.04;
    const pulse = Math.sin(angle) * 6;
    ctx.beginPath();
    ctx.arc(320, 200, 56 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(236, 94, 39, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center Avatar Circle
    ctx.beginPath();
    ctx.arc(320, 200, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#EC5E27';
    ctx.fill();

    // User Initial
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((label.charAt(0) || 'Y').toUpperCase(), 320, 202);

    // Status label below avatar
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Camera Inactive • Ready to Connect', 320, 290);

    animFrame = requestAnimationFrame(draw);
  };
  draw();

  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : new MediaStream();

  let audioCtxInstance: AudioContext | null = null;
  // Add a silent audio track using Web Audio API so RTCPeerConnection negotiation succeeds
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      audioCtxInstance = audioCtx;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0; // Completely silent
      osc.connect(gain);
      const dst = audioCtx.createMediaStreamDestination();
      gain.connect(dst);
      if (audioCtx.state === 'running') {
        osc.start();
      } else if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => osc.start()).catch(() => {});
      }
      dst.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
  } catch (e) {
    console.warn('AudioContext silent track creation skipped:', e);
  }

  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    const origStop = videoTrack.stop.bind(videoTrack);
    videoTrack.stop = () => {
      cancelAnimationFrame(animFrame);
      if (audioCtxInstance && audioCtxInstance.state !== 'closed') {
        audioCtxInstance.close().catch(() => {});
      }
      origStop();
    };
  }

  return stream;
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
  const isFacingUserRef = useRef(true);
  isFacingUserRef.current = isFacingUser;
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
  const processedSignalIdRef = useRef<number | null>(null);
  const mediaPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const hasInitializedPcRef = useRef<boolean>(false);

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
        .catch(() => { });
    }
  }, []);

  // Initialize or update local media stream with progressive multi-level fallback
  const startLocalMedia = useCallback(async (facingUser = true, forceFresh = false): Promise<MediaStream | null> => {
    if (mediaMode === 'messaging') return null;

    if (forceFresh) {
      mediaPromiseRef.current = null;
    }

    if (mediaPromiseRef.current) {
      return mediaPromiseRef.current;
    }

    setConnectionState('requesting_media');
    setMediaError(null);

    const promise = (async () => {
      // Stop existing local tracks before acquiring new ones
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // If browser doesn't support getUserMedia or is unsecure
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia is not supported in this browser context (requires secure context HTTPS or localhost).');
        const fallback = createVirtualMediaStream();
        localStreamRef.current = fallback;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = fallback;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(() => { });
        }
        setIsCameraOn(false);
        setIsMicOn(false);
        setConnectionState('ready');
        setMediaError('Camera & microphone require a secure browser connection.');
        return fallback;
      }

      let stream: MediaStream | null = null;
      let hasRealVideo = false;
      let hasRealAudio = false;

      // ATTEMPT 1: Full requested constraints
      try {
        const constraints: MediaStreamConstraints = {
          video: mediaMode === 'video' ? {
            facingMode: facingUser ? 'user' : 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
          } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        hasRealVideo = stream.getVideoTracks().length > 0;
        hasRealAudio = stream.getAudioTracks().length > 0;
      } catch (err1) {
        console.warn('Attempt 1 with constraints failed, trying basic boolean constraints:', err1);
      }

      // ATTEMPT 2: Lenient boolean constraints { video: true, audio: true }
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: mediaMode === 'video',
            audio: true,
          });
          hasRealVideo = stream.getVideoTracks().length > 0;
          hasRealAudio = stream.getAudioTracks().length > 0;
        } catch (err2) {
          console.warn('Attempt 2 with basic media failed:', err2);
        }
      }

      // ATTEMPT 3: Video-only (if user has no microphone or mic in use)
      if (!stream && mediaMode === 'video') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          hasRealVideo = stream.getVideoTracks().length > 0;
          setIsMicOn(false);
        } catch (err3) {
          console.warn('Attempt 3 with video-only failed:', err3);
        }
      }

      // ATTEMPT 4: Audio-only (if user has no camera or camera in use)
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          hasRealAudio = stream.getAudioTracks().length > 0;
          setIsCameraOn(false);
        } catch (err4) {
          console.warn('Attempt 4 with audio-only failed:', err4);
        }
      }

      // Physical stream successfully acquired
      if (stream) {
        setIsCameraOn(hasRealVideo);
        setIsMicOn(hasRealAudio);
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // prevent local feedback
          localVideoRef.current.play().catch(() => { });
        }

        // If RTCPeerConnection already exists, hot-swap tracks to newly acquired physical stream
        if (pcRef.current) {
          try {
            const senders = pcRef.current.getSenders();
            stream.getTracks().forEach((track) => {
              const sender = senders.find((s) => s.track && s.track.kind === track.kind);
              if (sender) {
                sender.replaceTrack(track).catch(() => { });
              } else {
                pcRef.current?.addTrack(track, stream!);
              }
            });
          } catch (swapErr) {
            console.warn('Error hot-swapping tracks to peer connection:', swapErr);
          }
        }

        setConnectionState('ready');
        setMediaError(null);
        return stream;
      }

      // ATTEMPT 5: Graceful fallback stream (Canvas + silent audio)
      // Allows WebRTC signaling and UI to work without freezing or throwing fatal exceptions
      console.warn('All physical media attempts failed. Generating virtual user stream fallback.');
      const fallback = createVirtualMediaStream();
      localStreamRef.current = fallback;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = fallback;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => { });
      }
      setIsCameraOn(false);
      setIsMicOn(false);
      setConnectionState('ready');
      setMediaError('Could not access camera or microphone. Please allow permissions in your browser.');
      return fallback;
    })().finally(() => {
      mediaPromiseRef.current = null;
    });

    mediaPromiseRef.current = promise;
    return promise;
  }, [mediaMode]);

  // Initialize WebRTC PeerConnection
  const initPeerConnection = useCallback((stream: MediaStream) => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch { }
      pcRef.current = null;
    }

    hasInitializedPcRef.current = true;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    iceCandidatesQueue.current = [];

    // Create remote media stream
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => { });
    }

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const activeRemote = remoteStreamRef.current || new MediaStream();
      remoteStreamRef.current = activeRemote;

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!activeRemote.getTracks().includes(track)) {
            activeRemote.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!activeRemote.getTracks().includes(event.track)) {
          activeRemote.addTrack(event.track);
        }
      }

      const hasVideo = activeRemote.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
      const hasAudio = activeRemote.getAudioTracks().some((t) => t.enabled && t.readyState === 'live');
      setIsRemoteVideoActive(hasVideo);
      setIsRemoteAudioActive(hasAudio);

      activeRemote.getTracks().forEach((track) => {
        track.onunmute = () => {
          if (track.kind === 'video') setIsRemoteVideoActive(true);
          if (track.kind === 'audio') setIsRemoteAudioActive(true);
        };
        track.onmute = () => {
          if (track.kind === 'video') setIsRemoteVideoActive(false);
          if (track.kind === 'audio') setIsRemoteAudioActive(false);
        };
        track.onended = () => {
          if (track.kind === 'video') setIsRemoteVideoActive(false);
          if (track.kind === 'audio') setIsRemoteAudioActive(false);
        };
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = activeRemote;
        remoteVideoRef.current.play().catch(() => { });
      }
    };

    // Send local ICE candidates to remote partner
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
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

  // Keep video refs synced with streams whenever re-rendered
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => { });
      }
    }
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => { });
      }
    }
  });

  // Handle incoming signals from the signaling server
  useEffect(() => {
    if (!incomingSignal || !incomingSignal.signal || incomingSignal.id === processedSignalIdRef.current) {
      return;
    }

    processedSignalIdRef.current = incomingSignal.id;
    const signal = incomingSignal.signal;

    const handleSignal = async () => {
      try {
        if (signal.type === 'offer') {
          let currentPc = pcRef.current;
          if (!currentPc) {
            let stream = localStreamRef.current;
            if (!stream) {
              stream = await startLocalMedia(isFacingUserRef.current);
            }
            if (stream) {
              currentPc = initPeerConnection(stream);
            }
          }

          if (!currentPc) return;

          const rtcDesc = signal.sdp?.type ? signal.sdp : (signal.type ? signal : signal.sdp);
          await currentPc.setRemoteDescription(new RTCSessionDescription(rtcDesc));

          // Process queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const cand = iceCandidatesQueue.current.shift();
            if (cand) {
              try {
                await currentPc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('Queued ICE candidate application failed:', e);
              }
            }
          }

          const answer = await currentPc.createAnswer();
          await currentPc.setLocalDescription(answer);

          onSendSignal({
            type: 'answer',
            sdp: currentPc.localDescription,
          });
        } else if (signal.type === 'answer') {
          const currentPc = pcRef.current;
          if (currentPc && currentPc.signalingState !== 'stable') {
            const rtcDesc = signal.sdp?.type ? signal.sdp : (signal.type ? signal : signal.sdp);
            await currentPc.setRemoteDescription(new RTCSessionDescription(rtcDesc));

            // Process queued ICE candidates
            while (iceCandidatesQueue.current.length > 0) {
              const cand = iceCandidatesQueue.current.shift();
              if (cand) {
                try {
                  await currentPc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  console.warn('Queued ICE candidate application failed:', e);
                }
              }
            }
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          const currentPc = pcRef.current;
          if (currentPc && currentPc.remoteDescription && currentPc.remoteDescription.type) {
            try {
              await currentPc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (candErr) {
              console.warn('Error adding ICE candidate:', candErr);
            }
          } else {
            iceCandidatesQueue.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.warn('Error handling incoming WebRTC signal:', err);
      }
    };

    handleSignal();
  }, [incomingSignal, initPeerConnection, onSendSignal, startLocalMedia]);

  // Setup on mount and teardown on unmount / room change
  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      if (autoStart && mediaMode !== 'messaging') {
        let stream = localStreamRef.current;
        const isStreamLive = stream && stream.getTracks().some((t) => t.readyState === 'live');
        if (!isStreamLive) {
          stream = await startLocalMedia(isFacingUserRef.current);
        } else if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(() => { });
        }

        // Only initialize peer connection if there is an active paired room (not just in waiting queue)
        if (stream && isMounted && roomId && roomId !== 'queue-waiting' && !hasInitializedPcRef.current) {
          initPeerConnection(stream);
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
      hasInitializedPcRef.current = false;
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch { }
        pcRef.current = null;
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
      }
    };
  }, [roomId, autoStart, mediaMode, isInitiator, initPeerConnection, startLocalMedia]);

  // Clean up local media when hook unmounts completely
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  // Toggle Video Track
  const toggleCamera = useCallback(() => {
    if (mediaMode !== 'video') return;
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    const hasOnlyCanvas = videoTracks.some((t) => t.label.includes('canvas') || !t.label);

    if (videoTracks.length === 0 || (!isCameraOn && (hasOnlyCanvas || mediaError))) {
      // Re-request real physical camera if currently on canvas fallback or missing
      startLocalMedia(isFacingUserRef.current, true).then((stream) => {
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
  }, [isCameraOn, mediaError, mediaMode, startLocalMedia]);

  // Toggle Audio Track
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0 || (!isMicOn && mediaError)) {
      startLocalMedia(isFacingUserRef.current, true).then((stream) => {
        if (stream && pcRef.current) {
          const newAudioTrack = stream.getAudioTracks()[0];
          if (newAudioTrack) {
            const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(newAudioTrack);
            } else {
              pcRef.current.addTrack(newAudioTrack, stream);
            }
            setIsMicOn(true);
          }
        }
      });
      return;
    }

    const nextState = !isMicOn;
    audioTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsMicOn(nextState);
  }, [isMicOn, mediaError, startLocalMedia]);

  // Switch Camera (Front vs Back)
  const flipCamera = useCallback(async () => {
    if (mediaMode !== 'video') return;
    const nextFacing = !isFacingUserRef.current;
    setIsFacingUser(nextFacing);
    isFacingUserRef.current = nextFacing;
    const newStream = await startLocalMedia(nextFacing, true);
    if (newStream && pcRef.current) {
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }
    }
  }, [startLocalMedia]);

  const terminateConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch { }
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
