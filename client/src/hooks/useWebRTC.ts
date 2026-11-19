import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchIceServerConfig, getFallbackIceServers } from '../services/iceServerConfig.ts';

interface UseWebRTCOptions {
  roomId: string;
  isInitiator?: boolean;
  mediaMode?: 'video' | 'voice' | 'messaging';
  onSendSignal: (signal: any) => boolean | void;
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

function logWebRTC(event: string, details: Record<string, string | number | boolean | null>): void {
  console.info('[webrtc]', { event, ...details });
}

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
  const peerConnectionPromiseRef = useRef<Promise<RTCPeerConnection | null> | null>(null);
  const peerConnectionGenerationRef = useRef(0);
  const signalProcessingRef = useRef<Promise<void>>(Promise.resolve());
  const makingOfferRef = useRef(false);
  const settingRemoteAnswerRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const iceRestartInProgressRef = useRef(false);
  const disconnectTimerRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
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
  const initPeerConnection = useCallback(async (stream: MediaStream): Promise<RTCPeerConnection | null> => {
    if (pcRef.current) return pcRef.current;
    if (peerConnectionPromiseRef.current) return peerConnectionPromiseRef.current;

    const generation = peerConnectionGenerationRef.current;
    const initialization = (async () => {
      let iceServers: RTCIceServer[];
      try {
        const config = await fetchIceServerConfig();
        iceServers = config.iceServers;
        if (!config.relayAvailable) {
          console.warn('[webrtc]', {
            event: 'turn.unavailable',
            message: 'TURN is not configured; calls may fail on restrictive networks.',
          });
        }
      } catch (error) {
        console.error('[webrtc]', { event: 'ice-config.failed', error });
        iceServers = getFallbackIceServers();
      }

      if (generation !== peerConnectionGenerationRef.current) return null;

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      hasInitializedPcRef.current = true;
      iceCandidatesQueue.current = [];
      setConnectionState('connecting');
      logWebRTC('peer.created', { roomId, role: isInitiator ? 'initiator' : 'responder' });

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => { });
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      let candidatePairLogged = false;
      const logSelectedCandidatePair = async () => {
        if (candidatePairLogged) return;
        try {
          const stats = await pc.getStats();
          const transport = Array.from(stats.values()).find(
            (report) => report.type === 'transport' && 'selectedCandidatePairId' in report
          );
          const pairId = transport && 'selectedCandidatePairId' in transport
            ? transport.selectedCandidatePairId
            : undefined;
          const pair = pairId ? stats.get(pairId) : undefined;
          if (!pair || pair.type !== 'candidate-pair' || !('localCandidateId' in pair) || !('remoteCandidateId' in pair)) {
            logWebRTC('ice.candidate-pair.unavailable', { roomId });
            return;
          }

          candidatePairLogged = true;
          const localCandidate = stats.get(pair.localCandidateId);
          const remoteCandidate = stats.get(pair.remoteCandidateId);
          const localType = localCandidate && 'candidateType' in localCandidate
            ? localCandidate.candidateType
            : 'unknown';
          const remoteType = remoteCandidate && 'candidateType' in remoteCandidate
            ? remoteCandidate.candidateType
            : 'unknown';
          logWebRTC('ice.candidate-pair.selected', {
            roomId,
            localType,
            remoteType,
            protocol: 'protocol' in pair ? pair.protocol || 'unknown' : 'unknown',
          });
        } catch (error) {
          console.warn('[webrtc]', { event: 'ice.stats.failed', roomId, error });
        }
      };

      pc.ontrack = (event) => {
        const activeRemote = remoteStreamRef.current || new MediaStream();
        remoteStreamRef.current = activeRemote;

        const tracks = event.streams?.[0]?.getTracks() || (event.track ? [event.track] : []);
        tracks.forEach((track) => {
          if (!activeRemote.getTracks().includes(track)) activeRemote.addTrack(track);
        });

        logWebRTC('track.received', { roomId, audio: event.track?.kind === 'audio', video: event.track?.kind === 'video' });
        setIsRemoteVideoActive(activeRemote.getVideoTracks().some((track) => track.enabled && track.readyState === 'live'));
        setIsRemoteAudioActive(activeRemote.getAudioTracks().some((track) => track.enabled && track.readyState === 'live'));

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

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const sent = onSendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
        logWebRTC('ice.candidate.sent', {
          roomId,
          candidateType: event.candidate.type || 'unknown',
          sent: sent !== false,
        });
      };

      pc.onicecandidateerror = (event) => {
        logWebRTC('ice.candidate.error', { roomId, code: event.errorCode, url: event.url || '' });
      };

      pc.onicegatheringstatechange = () => {
        logWebRTC('ice.gathering.state', { roomId, state: pc.iceGatheringState });
      };

      const clearConnectionTimers = () => {
        if (connectionTimeoutRef.current !== null) {
          window.clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        if (disconnectTimerRef.current !== null) {
          window.clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
      };

      const startConnectionTimeout = () => {
        if (connectionTimeoutRef.current !== null) {
          window.clearTimeout(connectionTimeoutRef.current);
        }
        connectionTimeoutRef.current = window.setTimeout(() => {
          if (pcRef.current === pc && pc.connectionState !== 'connected') {
            logWebRTC('peer.connection.timeout', { roomId, state: pc.connectionState });
            setConnectionState('failed');
          }
        }, 30_000);
      };

      const restartIce = async () => {
        if (pcRef.current !== pc || iceRestartInProgressRef.current) return;

        // If a local offer was already created while the signaling socket was reconnecting, re-send it
        if (pc.signalingState === 'have-local-offer' && pc.localDescription) {
          const resent = onSendSignal({ type: 'offer', sdp: pc.localDescription });
          logWebRTC('ice.restart.resent', { roomId, sent: resent !== false });
          if (resent === false && disconnectTimerRef.current === null) {
            disconnectTimerRef.current = window.setTimeout(() => {
              disconnectTimerRef.current = null;
              if (pcRef.current === pc && pc.connectionState !== 'connected') void restartIce();
            }, 1500);
          }
          return;
        }

        if (pc.signalingState !== 'stable') return;

        iceRestartInProgressRef.current = true;
        makingOfferRef.current = true;
        candidatePairLogged = false;
        setConnectionState('connecting');
        startConnectionTimeout();
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          const sent = onSendSignal({ type: 'offer', sdp: pc.localDescription });
          logWebRTC('ice.restart.sent', { roomId, sent: sent !== false });
          if (sent === false && disconnectTimerRef.current === null) {
            disconnectTimerRef.current = window.setTimeout(() => {
              disconnectTimerRef.current = null;
              if (pcRef.current === pc && pc.connectionState !== 'connected') void restartIce();
            }, 1500);
          }
        } catch (error) {
          console.error('[webrtc]', { event: 'ice.restart.failed', roomId, error });
        } finally {
          makingOfferRef.current = false;
          iceRestartInProgressRef.current = false;
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        logWebRTC('peer.connection.state', { roomId, state });
        if (state === 'connected') {
          clearConnectionTimers();
          setConnectionState('connected');
          void logSelectedCandidatePair();
        } else if (state === 'connecting') {
          setConnectionState('connecting');
        } else if (state === 'disconnected') {
          setConnectionState('disconnected');
        } else if (state === 'failed') {
          setConnectionState('failed');
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        logWebRTC('ice.connection.state', { roomId, state });
        if (state === 'connected' || state === 'completed') {
          clearConnectionTimers();
          setConnectionState('connected');
          void logSelectedCandidatePair();
        } else if (state === 'checking') {
          setConnectionState('connecting');
        } else if (state === 'disconnected') {
          setConnectionState('disconnected');
          if (disconnectTimerRef.current === null) {
            // Stagger responder ICE restart behind initiator; Perfect Negotiation resolves any offer collision
            const restartDelayMs = isInitiator ? 4000 : 6000;
            disconnectTimerRef.current = window.setTimeout(() => {
              disconnectTimerRef.current = null;
              if (pc.iceConnectionState === 'disconnected') void restartIce();
            }, restartDelayMs);
          }
        } else if (state === 'failed') {
          clearConnectionTimers();
          setConnectionState('failed');
          void restartIce();
        }
      };

      startConnectionTimeout();

      if (isInitiator) {
        makingOfferRef.current = true;
        try {
          const offer = await pc.createOffer();
          if (pcRef.current !== pc || generation !== peerConnectionGenerationRef.current) return null;
          await pc.setLocalDescription(offer);
          const sent = onSendSignal({ type: 'offer', sdp: pc.localDescription });
          logWebRTC('sdp.offer.sent', { roomId, sent: sent !== false });
        } catch (error) {
          console.error('[webrtc]', { event: 'sdp.offer.failed', roomId, error });
          setConnectionState('failed');
        } finally {
          makingOfferRef.current = false;
        }
      }

      return pc;
    })();

    peerConnectionPromiseRef.current = initialization;
    try {
      return await initialization;
    } finally {
      if (peerConnectionPromiseRef.current === initialization) {
        peerConnectionPromiseRef.current = null;
      }
    }
  }, [isInitiator, onSendSignal, roomId]);

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
    const generation = peerConnectionGenerationRef.current;
    logWebRTC('signal.received', { roomId, type: signal.type || 'unknown' });

    const handleSignal = async (): Promise<void> => {
      try {
        if (generation !== peerConnectionGenerationRef.current) return;

        if (signal.type === 'reconnect_check') {
          const currentPc = pcRef.current;
          if (!currentPc) return;
          if (currentPc.signalingState === 'have-local-offer' && currentPc.localDescription) {
            const resent = onSendSignal({ type: 'offer', sdp: currentPc.localDescription });
            logWebRTC('ice.restart.resent-on-reconnect', { roomId, sent: resent !== false });
            return;
          }
          const needsIceRecovery =
            currentPc.iceConnectionState === 'disconnected' ||
            currentPc.iceConnectionState === 'failed' ||
            currentPc.connectionState === 'disconnected' ||
            currentPc.connectionState === 'failed';
          if (needsIceRecovery && isInitiator && currentPc.signalingState === 'stable' && !makingOfferRef.current) {
            makingOfferRef.current = true;
            try {
              const offer = await currentPc.createOffer({ iceRestart: true });
              await currentPc.setLocalDescription(offer);
              const sent = onSendSignal({ type: 'offer', sdp: currentPc.localDescription });
              logWebRTC('ice.restart.on-reconnect', { roomId, sent: sent !== false });
            } catch (err) {
              console.warn('[webrtc]', { event: 'ice.restart.on-reconnect.failed', roomId, error: err });
            } finally {
              makingOfferRef.current = false;
            }
          }
          return;
        }

        if (signal.type === 'candidate' && signal.candidate) {
          const currentPc = pcRef.current;
          if (ignoreOfferRef.current) return;
          if (!currentPc?.remoteDescription) {
            iceCandidatesQueue.current.push(signal.candidate);
            return;
          }

          const candidate = new RTCIceCandidate(signal.candidate);
          await currentPc.addIceCandidate(candidate);
          logWebRTC('ice.candidate.received', { roomId, candidateType: candidate.type || 'unknown' });
          return;
        }

        if (signal.type !== 'offer' && signal.type !== 'answer') return;

        let currentPc = pcRef.current;
        if (!currentPc) {
          let stream = localStreamRef.current;
          if (!stream) stream = await startLocalMedia(isFacingUserRef.current);
          if (generation !== peerConnectionGenerationRef.current) return;
          if (stream) {
            const initializedPc = await initPeerConnection(stream);
            if (initializedPc) currentPc = initializedPc;
          }
        }
        if (!currentPc || generation !== peerConnectionGenerationRef.current) return;

        const description = signal.sdp?.type
          ? signal.sdp as RTCSessionDescriptionInit
          : { type: signal.type, sdp: signal.sdp } as RTCSessionDescriptionInit;

        if (signal.type === 'offer') {
          if (
            currentPc.remoteDescription?.type === 'offer' &&
            currentPc.remoteDescription.sdp === description.sdp
          ) {
            if (currentPc.localDescription?.type === 'answer') {
              const sent = onSendSignal({ type: 'answer', sdp: currentPc.localDescription });
              logWebRTC('sdp.answer.resent', { roomId, sent: sent !== false });
            }
            return;
          }

          const readyForOffer = !makingOfferRef.current &&
            (currentPc.signalingState === 'stable' || settingRemoteAnswerRef.current);
          const offerCollision = !readyForOffer;
          const isPolite = !isInitiator;
          ignoreOfferRef.current = !isPolite && offerCollision;
          if (ignoreOfferRef.current) {
            logWebRTC('sdp.offer.ignored', { roomId, reason: 'offer-collision' });
            return;
          }
          if (offerCollision) {
            await currentPc.setLocalDescription({ type: 'rollback' });
          }

          await currentPc.setRemoteDescription(description);
          if (generation !== peerConnectionGenerationRef.current) return;
          ignoreOfferRef.current = false;
          logWebRTC('sdp.offer.received', { roomId });
        } else {
          if (
            currentPc.remoteDescription?.type === 'answer' &&
            currentPc.remoteDescription.sdp === description.sdp
          ) {
            logWebRTC('sdp.answer.duplicate', { roomId });
            return;
          }
          if (currentPc.signalingState !== 'have-local-offer') {
            logWebRTC('sdp.answer.ignored', { roomId, state: currentPc.signalingState });
            return;
          }

          settingRemoteAnswerRef.current = true;
          try {
            await currentPc.setRemoteDescription(description);
          } finally {
            settingRemoteAnswerRef.current = false;
          }
          if (generation !== peerConnectionGenerationRef.current) return;
          ignoreOfferRef.current = false;
          logWebRTC('sdp.answer.received', { roomId });
        }

        const queuedCandidates = iceCandidatesQueue.current.splice(0);
        for (const candidateInit of queuedCandidates) {
          try {
            const candidate = new RTCIceCandidate(candidateInit);
            await currentPc.addIceCandidate(candidate);
            logWebRTC('ice.candidate.received', { roomId, candidateType: candidate.type || 'unknown' });
          } catch (error) {
            if (!ignoreOfferRef.current) {
              console.warn('[webrtc]', { event: 'ice.candidate.add-failed', roomId, error });
            }
          }
        }

        if (signal.type === 'offer') {
          const answer = await currentPc.createAnswer();
          if (generation !== peerConnectionGenerationRef.current) return;
          await currentPc.setLocalDescription(answer);
          const sent = onSendSignal({ type: 'answer', sdp: currentPc.localDescription });
          logWebRTC('sdp.answer.sent', { roomId, sent: sent !== false });
        }
      } catch (err) {
        console.error('[webrtc]', { event: 'signal.processing.failed', roomId, type: signal.type || 'unknown', error: err });
      }
    };

    signalProcessingRef.current = signalProcessingRef.current
      .then(handleSignal)
      .catch((error) => {
        console.error('[webrtc]', { event: 'signal.queue.failed', roomId, error });
      });
  }, [incomingSignal, initPeerConnection, isInitiator, onSendSignal, roomId, startLocalMedia]);

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
          await initPeerConnection(stream);
        }
      }
    };

    setup().catch((error) => {
      console.error('[webrtc]', { event: 'media.setup.failed', roomId, error });
      setConnectionState('failed');
    });

    return () => {
      isMounted = false;
      peerConnectionGenerationRef.current++;
      peerConnectionPromiseRef.current = null;
      hasInitializedPcRef.current = false;
      makingOfferRef.current = false;
      settingRemoteAnswerRef.current = false;
      ignoreOfferRef.current = false;
      iceRestartInProgressRef.current = false;
      if (connectionTimeoutRef.current !== null) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (disconnectTimerRef.current !== null) {
        window.clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
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
      iceCandidatesQueue.current = [];
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
