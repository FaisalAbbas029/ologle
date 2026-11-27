import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchIceServerConfig, getFallbackIceServers } from '../services/iceServerConfig.ts';

interface QueuedWebRTCSignal {
  signal: any;
  id: number;
  roomId?: string;
}

interface UseWebRTCOptions {
  roomId: string;
  isInitiator?: boolean;
  mediaMode?: 'video' | 'voice' | 'messaging';
  onSendSignal: (signal: any) => boolean | void;
  incomingSignal: { signal: any; id: number; queue?: QueuedWebRTCSignal[] } | null;
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
  | 'permission_denied'
  | 'unstable'
  | 'reconnecting'
  | 'offline';

function logWebRTC(event: string, details: Record<string, string | number | boolean | null>): void {
  console.info('[webrtc]', { event, ...details });
}

// Creates a lightweight, high-performance virtual MediaStream with an animated canvas video track (when includeVideo is true) and silent audio track
const createVirtualMediaStream = (label = 'You', includeVideo = true): MediaStream => {
  const stream = new MediaStream();
  (stream as any)._isVirtual = true;

  let animFrame: number | null = null;
  let audioCtxInstance: AudioContext | null = null;

  if (includeVideo && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let angle = 0;

    const draw = () => {
      if (!ctx) return;
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#121214');
      grad.addColorStop(1, '#1A1A1E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      angle += 0.04;
      const pulse = Math.sin(angle) * 6;
      ctx.beginPath();
      ctx.arc(320, 200, 56 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(236, 94, 39, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(320, 200, 50, 0, Math.PI * 2);
      ctx.fillStyle = '#EC5E27';
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((label.charAt(0) || 'Y').toUpperCase(), 320, 202);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Camera Inactive • Ready to Connect', 320, 290);

      animFrame = requestAnimationFrame(draw);
    };
    draw();

    const canvasStream: MediaStream | null = (canvas as any).captureStream ? (canvas as any).captureStream(15) : null;
    if (canvasStream) {
      canvasStream.getVideoTracks().forEach((track) => {
        (track as any)._isVirtual = true;
        stream.addTrack(track);
      });
    }
  }

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
        audioCtx.resume().then(() => osc.start()).catch(() => { });
      }
      dst.stream.getAudioTracks().forEach((t) => {
        (t as any)._isVirtual = true;
        stream.addTrack(t);
      });
    }
  } catch (e) {
    console.warn('AudioContext silent track creation skipped:', e);
  }

  const cleanupVirtual = () => {
    if (animFrame !== null) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    if (audioCtxInstance && audioCtxInstance.state !== 'closed') {
      audioCtxInstance.close().catch(() => { });
    }
  };

  stream.getTracks().forEach((track) => {
    const origStop = track.stop.bind(track);
    track.stop = () => {
      cleanupVirtual();
      origStop();
    };
  });

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
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isJustReconnected, setIsJustReconnected] = useState(false);
  const [isIceRestarting, setIsIceRestarting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'critical'>('good');
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [isExhausted, setIsExhausted] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const onSendSignalRef = useRef(onSendSignal);
  onSendSignalRef.current = onSendSignal;
  const isInitiatorRef = useRef(isInitiator);
  isInitiatorRef.current = isInitiator;

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const restartIceRef = useRef<() => Promise<void>>(async () => { });
  const autoRecoveryRef = useRef<() => void>(() => { });
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
  const offerRetransmitTimerRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  const iceRetryAttemptRef = useRef<number>(0);
  const iceRetryTimerRef = useRef<number | null>(null);
  const previousConnectionStateRef = useRef<WebRTCConnectionState>('idle');
  const processedSignalIdRef = useRef<number>(0);
  const mediaPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const hasInitializedPcRef = useRef<boolean>(false);
  const isCameraBusyRef = useRef(false);
  const remoteVideoCleanupRef = useRef<(() => void) | null>(null);
  const attachedRemoteElRef = useRef<HTMLVideoElement | null>(null);
  const attachRemoteVideoElementRef = useRef<((videoEl: HTMLVideoElement, stream: MediaStream) => void) | null>(null);

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

  // Listen to device network changes (online/offline) for instant recovery
  useEffect(() => {
    const handleOnline = () => {
      logWebRTC('device.online', { roomId });
      if (pcRef.current && pcRef.current.connectionState !== 'connected') {
        iceRetryAttemptRef.current = 0;
        setReconnectAttempt(0);
        setIsExhausted(false);
        autoRecoveryRef.current();
      }
    };
    const handleOffline = () => {
      logWebRTC('device.offline', { roomId });
      if (iceRetryTimerRef.current !== null) {
        window.clearTimeout(iceRetryTimerRef.current);
        iceRetryTimerRef.current = null;
      }
      previousConnectionStateRef.current = 'offline';
      setConnectionState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [roomId]);

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
      const oldStream = localStreamRef.current;

      // If browser doesn't support getUserMedia or is unsecure
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia is not supported in this browser context (requires secure context HTTPS or localhost).');
        if (oldStream) {
          oldStream.getTracks().forEach((track) => track.stop());
        }
        const fallback = createVirtualMediaStream('You', mediaMode === 'video');
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

      // ATTEMPT 1: Full requested constraints with ideal facingMode
      try {
        const constraints: MediaStreamConstraints = {
          video: mediaMode === 'video' ? {
            facingMode: { ideal: facingUser ? 'user' : 'environment' },
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
        if (oldStream && oldStream !== stream) {
          oldStream.getTracks().forEach((track) => track.stop());
        }
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

      // ATTEMPT 5: Graceful fallback stream (Canvas in video mode + silent audio)
      // Allows WebRTC signaling and UI to work without freezing or throwing fatal exceptions
      console.warn('All physical media attempts failed. Generating virtual user stream fallback.');
      if (oldStream) {
        oldStream.getTracks().forEach((track) => track.stop());
      }
      const fallback = createVirtualMediaStream('You', mediaMode === 'video');
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

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 2,
      });
      pcRef.current = pc;
      hasInitializedPcRef.current = true;
      // Preserve any early candidates in iceCandidatesQueue.current so they are not wiped
      setConnectionState('connecting');
      logWebRTC('peer.created', { roomId, role: isInitiatorRef.current ? 'initiator' : 'responder' });

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      const safePlayRemoteVideo = async () => {
        const videoEl = remoteVideoRef.current;
        if (!videoEl) return;
        try {
          await videoEl.play();
          setIsAutoplayBlocked(false);
        } catch (err: any) {
          if (err && err.name === 'NotAllowedError') {
            // Browser autoplay policy restricted audio. Mute temporarily so video plays immediately!
            videoEl.muted = true;
            try {
              await videoEl.play();
              setIsAutoplayBlocked(true);
              console.warn('[webrtc] Autoplay with sound restricted by browser; playing muted video. Prompting user to unmute.');
            } catch (muteErr) {
              console.warn('[webrtc] Muted play also failed:', muteErr);
            }
          } else {
            console.warn('[webrtc] Remote video play error:', err);
          }
        }
      };

      const attachRemoteVideoElement = (videoEl: HTMLVideoElement, stream: MediaStream) => {
        if (remoteVideoCleanupRef.current) {
          remoteVideoCleanupRef.current();
          remoteVideoCleanupRef.current = null;
        }
        attachedRemoteElRef.current = videoEl;

        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }
        void safePlayRemoteVideo();

        const checkDimensions = () => {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            setIsRemoteVideoActive(true);
          }
        };

        const handlePlaying = () => {
          checkDimensions();
        };
        const handleLoadedMetadata = () => {
          checkDimensions();
        };
        const handleResize = () => {
          checkDimensions();
        };

        videoEl.addEventListener('playing', handlePlaying);
        videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoEl.addEventListener('resize', handleResize);

        let rvfcId: number | null = null;
        if ('requestVideoFrameCallback' in videoEl) {
          const onFrame = () => {
            setIsRemoteVideoActive(true);
            if (rvfcId !== null && 'requestVideoFrameCallback' in videoEl) {
              rvfcId = (videoEl as any).requestVideoFrameCallback(onFrame);
            }
          };
          rvfcId = (videoEl as any).requestVideoFrameCallback(onFrame);
        }

        checkDimensions();

        remoteVideoCleanupRef.current = () => {
          videoEl.removeEventListener('playing', handlePlaying);
          videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoEl.removeEventListener('resize', handleResize);
          if (rvfcId !== null && 'cancelVideoFrameCallback' in videoEl) {
            (videoEl as any).cancelVideoFrameCallback(rvfcId);
            rvfcId = null;
          }
        };
      };
      attachRemoteVideoElementRef.current = attachRemoteVideoElement;

      if (remoteVideoRef.current) {
        attachRemoteVideoElement(remoteVideoRef.current, remoteStream);
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
            if (track.kind === 'video') {
              const hasLiveVideoTrack = activeRemote.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);
              const isRenderingFrames = remoteVideoRef.current ? remoteVideoRef.current.videoWidth > 0 && remoteVideoRef.current.videoHeight > 0 : false;
              if (!hasLiveVideoTrack && !isRenderingFrames) {
                setIsRemoteVideoActive(false);
              }
            } else if (track.kind === 'audio') {
              const hasLiveAudioTrack = activeRemote.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled);
              if (!hasLiveAudioTrack) {
                setIsRemoteAudioActive(false);
              }
            }
          };
          track.onended = () => {
            if (track.kind === 'video') {
              const remainingLive = activeRemote.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);
              setIsRemoteVideoActive(remainingLive);
            }
            if (track.kind === 'audio') {
              const remainingLive = activeRemote.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled);
              setIsRemoteAudioActive(remainingLive);
            }
          };
        });

        if (remoteVideoRef.current) {
          attachRemoteVideoElement(remoteVideoRef.current, activeRemote);
        }
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const sent = onSendSignalRef.current({
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
        if (offerRetransmitTimerRef.current !== null) {
          window.clearTimeout(offerRetransmitTimerRef.current);
          offerRetransmitTimerRef.current = null;
        }
      };

      const MAX_RECONNECT_ATTEMPTS = 5;
      const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 12000];

      const startConnectionTimeout = () => {
        if (connectionTimeoutRef.current !== null) {
          window.clearTimeout(connectionTimeoutRef.current);
        }
        // Give 10 seconds for initial connection before automatically triggering recovery
        connectionTimeoutRef.current = window.setTimeout(() => {
          if (pcRef.current === pc && pc.connectionState !== 'connected') {
            logWebRTC('peer.connection.timeout', { roomId, state: pc.connectionState });
            scheduleAutoRecovery();
          }
        }, 10_000);
      };

      const restartIce = async () => {
        if (pcRef.current !== pc || iceRestartInProgressRef.current) return;

        // If a local offer was already created while the signaling socket was reconnecting, re-send it
        if (pc.signalingState === 'have-local-offer' && pc.localDescription) {
          const resent = onSendSignalRef.current({ type: 'offer', sdp: pc.localDescription });
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
        setIsIceRestarting(true);
        makingOfferRef.current = true;
        candidatePairLogged = false;
        previousConnectionStateRef.current = 'reconnecting';
        setConnectionState('reconnecting');
        startConnectionTimeout();
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          const sent = onSendSignalRef.current({ type: 'offer', sdp: pc.localDescription });
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
          setIsIceRestarting(false);
        }
      };
      restartIceRef.current = restartIce;

      const recreatePeerConnection = async () => {
        if (pcRef.current !== pc || iceRestartInProgressRef.current) return;
        iceRestartInProgressRef.current = true;
        setIsIceRestarting(true);
        previousConnectionStateRef.current = 'reconnecting';
        setConnectionState('reconnecting');
        startConnectionTimeout();

        try {
          const stream = localStreamRef.current;
          if (!stream) return;

          logWebRTC('recovery.recreating-pc', { roomId, attempt: iceRetryAttemptRef.current });
          if (pcRef.current) {
            try { pcRef.current.close(); } catch {}
            pcRef.current = null;
          }

          peerConnectionGenerationRef.current++;
          hasInitializedPcRef.current = false;
          makingOfferRef.current = false;
          settingRemoteAnswerRef.current = false;
          ignoreOfferRef.current = false;

          // initPeerConnection already creates and sends the initial offer when isInitiator is true,
          // and notifies peer_ready when responder is ready. Do NOT call createOffer a second time here.
          await initPeerConnection(stream);
        } catch (error) {
          console.error('[webrtc] Recreate peer connection failed:', error);
        } finally {
          iceRestartInProgressRef.current = false;
          setIsIceRestarting(false);
        }
      };

      const scheduleAutoRecovery = () => {
        if (iceRetryTimerRef.current !== null) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          previousConnectionStateRef.current = 'offline';
          setConnectionState('offline');
          return;
        }

        const attempt = iceRetryAttemptRef.current;
        if (attempt >= MAX_RECONNECT_ATTEMPTS) {
          logWebRTC('recovery.exhausted', { roomId, attempts: attempt });
          setIsExhausted(true);
          previousConnectionStateRef.current = 'failed';
          setConnectionState('failed');
          return;
        }

        setIsExhausted(false);
        previousConnectionStateRef.current = 'reconnecting';
        setConnectionState('reconnecting');
        setReconnectAttempt(attempt + 1);

        const baseDelay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
        const jitter = Math.floor(Math.random() * 400) - 200;
        const delay = Math.max(800, baseDelay + jitter);
        logWebRTC('recovery.scheduled', { roomId, attempt: attempt + 1, delay });

        iceRetryTimerRef.current = window.setTimeout(async () => {
          iceRetryTimerRef.current = null;
          iceRetryAttemptRef.current = attempt + 1;

          if (pcRef.current && pcRef.current.connectionState === 'connected') return;

          // Attempt 0 & 1: ICE restart or offer re-send on existing connection
          if (
            attempt < 2 &&
            pcRef.current &&
            (pcRef.current.signalingState === 'stable' || pcRef.current.signalingState === 'have-local-offer')
          ) {
            void restartIce();
          } else {
            // Attempt 2+: Full clean PeerConnection re-creation
            await recreatePeerConnection();
          }
        }, delay);
      };
      autoRecoveryRef.current = scheduleAutoRecovery;

      const handleConnectionSuccess = () => {
        clearConnectionTimers();
        if (iceRetryTimerRef.current !== null) {
          window.clearTimeout(iceRetryTimerRef.current);
          iceRetryTimerRef.current = null;
        }
        iceRetryAttemptRef.current = 0;
        setReconnectAttempt(0);
        setIsExhausted(false);
        setIsIceRestarting(false);

        const wasInterrupted =
          previousConnectionStateRef.current === 'disconnected' ||
          previousConnectionStateRef.current === 'failed' ||
          previousConnectionStateRef.current === 'reconnecting' ||
          previousConnectionStateRef.current === 'unstable' ||
          previousConnectionStateRef.current === 'offline';

        if (wasInterrupted) {
          setIsJustReconnected(true);
          window.setTimeout(() => setIsJustReconnected(false), 3500);
        }
        previousConnectionStateRef.current = 'connected';
        setConnectionState('connected');
        void logSelectedCandidatePair();
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        logWebRTC('peer.connection.state', { roomId, state });
        if (state === 'connected') {
          handleConnectionSuccess();
        } else if (state === 'connecting') {
          if (previousConnectionStateRef.current !== 'reconnecting') {
            setConnectionState('connecting');
          }
        } else if (state === 'disconnected') {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            previousConnectionStateRef.current = 'offline';
            setConnectionState('offline');
          } else {
            previousConnectionStateRef.current = 'reconnecting';
            setConnectionState('reconnecting');
            scheduleAutoRecovery();
          }
        } else if (state === 'failed') {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            previousConnectionStateRef.current = 'offline';
            setConnectionState('offline');
          } else {
            scheduleAutoRecovery();
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        logWebRTC('ice.connection.state', { roomId, state });
        if (state === 'connected' || state === 'completed') {
          handleConnectionSuccess();
        } else if (state === 'checking') {
          if (previousConnectionStateRef.current !== 'reconnecting') {
            setConnectionState('connecting');
          }
        } else if (state === 'disconnected') {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            previousConnectionStateRef.current = 'offline';
            setConnectionState('offline');
          } else {
            previousConnectionStateRef.current = 'reconnecting';
            setConnectionState('reconnecting');
            scheduleAutoRecovery();
          }
        } else if (state === 'failed') {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            previousConnectionStateRef.current = 'offline';
            setConnectionState('offline');
          } else {
            scheduleAutoRecovery();
          }
        }
      };

      // Quality stats monitoring loop (runs every 3.5s)
      if (statsIntervalRef.current !== null) {
        window.clearInterval(statsIntervalRef.current);
      }
      let lastPacketsReceived = 0;
      let lastPacketsLost = 0;
      let lastStatsTime = 0;

      statsIntervalRef.current = window.setInterval(async () => {
        if (pcRef.current !== pc || pc.connectionState !== 'connected') return;
        try {
          const stats = await pc.getStats();
          let rtt: number | null = null;
          let packetLossRate: number | null = null;

          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (typeof report.currentRoundTripTime === 'number') {
                rtt = report.currentRoundTripTime;
              }
            }
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              const now = report.timestamp || Date.now();
              const packetsReceived = report.packetsReceived || 0;
              const packetsLost = report.packetsLost || 0;

              if (lastStatsTime > 0) {
                const deltaPackets = packetsReceived - lastPacketsReceived;
                const deltaLost = packetsLost - lastPacketsLost;
                const totalExpected = deltaPackets + deltaLost;
                if (totalExpected > 0) {
                  packetLossRate = Math.max(0, deltaLost / totalExpected);
                }
              }
              lastPacketsReceived = packetsReceived;
              lastPacketsLost = packetsLost;
              lastStatsTime = now;
            }
          });

          const isRttHigh = rtt !== null && rtt > 0.600; // > 600ms
          const isLossHigh = packetLossRate !== null && packetLossRate > 0.08; // > 8%

          if (isRttHigh || isLossHigh) {
            setConnectionQuality('poor');
            setConnectionState((prev) => (prev === 'connected' ? 'unstable' : prev));

            // Congestion response: reduce video bitrate to 250 kbps to preserve audio
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender && videoSender.getParameters && videoSender.setParameters) {
              const params = videoSender.getParameters();
              if (params.encodings && params.encodings[0] && params.encodings[0].maxBitrate !== 250_000) {
                params.encodings[0].maxBitrate = 250_000;
                void videoSender.setParameters(params).catch(() => {});
              }
            }
          } else if (rtt !== null && rtt < 0.300 && (packetLossRate === null || packetLossRate < 0.03)) {
            setConnectionQuality('good');
            setConnectionState((prev) => (prev === 'unstable' ? 'connected' : prev));

            // Restore video bitrate to 1.2 Mbps
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender && videoSender.getParameters && videoSender.setParameters) {
              const params = videoSender.getParameters();
              if (params.encodings && params.encodings[0] && params.encodings[0].maxBitrate === 250_000) {
                params.encodings[0].maxBitrate = 1_200_000;
                void videoSender.setParameters(params).catch(() => {});
              }
            }
          }
        } catch {}
      }, 3500);

      startConnectionTimeout();

      if (isInitiatorRef.current) {
        makingOfferRef.current = true;
        try {
          const offer = await pc.createOffer();
          if (pcRef.current !== pc || generation !== peerConnectionGenerationRef.current) return null;
          await pc.setLocalDescription(offer);
          const sent = onSendSignalRef.current({ type: 'offer', sdp: pc.localDescription });
          logWebRTC('sdp.offer.sent', { roomId, sent: sent !== false });

          // Schedule non-destructive offer re-transmission if responder takes time to grant camera/mic permissions
          const scheduleOfferRetransmit = (delayMs: number) => {
            if (offerRetransmitTimerRef.current !== null) {
              window.clearTimeout(offerRetransmitTimerRef.current);
            }
            offerRetransmitTimerRef.current = window.setTimeout(() => {
              offerRetransmitTimerRef.current = null;
              if (
                pcRef.current === pc &&
                pc.connectionState !== 'connected' &&
                pc.signalingState === 'have-local-offer' &&
                pc.localDescription &&
                !pc.remoteDescription
              ) {
                const resent = onSendSignalRef.current({ type: 'offer', sdp: pc.localDescription });
                logWebRTC('sdp.offer.retransmitted', { roomId, sent: resent !== false });
                if (delayMs < 5000) {
                  scheduleOfferRetransmit(3000);
                }
              }
            }, delayMs);
          };
          scheduleOfferRetransmit(2500);
        } catch (error) {
          console.error('[webrtc]', { event: 'sdp.offer.failed', roomId, error });
          setConnectionState('failed');
        } finally {
          makingOfferRef.current = false;
        }
      } else if (!pc.remoteDescription) {
        // Responder is ready (e.g. after camera/mic permission dialog); ask initiator to send/re-send offer if needed
        onSendSignalRef.current({ type: 'peer_ready' });
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
  }, [roomId]);

  // Keep video refs synced with streams whenever re-rendered or layout swaps (e.g. mobile PiP / desktop)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (
        remoteVideoRef.current.srcObject !== remoteStreamRef.current ||
        attachedRemoteElRef.current !== remoteVideoRef.current
      ) {
        if (attachRemoteVideoElementRef.current) {
          attachRemoteVideoElementRef.current(remoteVideoRef.current, remoteStreamRef.current);
        } else {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch(() => { });
        }
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

  // Handle incoming signals from the signaling server (processes full FIFO queue so no batched offers/candidates are dropped)
  useEffect(() => {
    if (!incomingSignal) {
      return;
    }

    const rawList: QueuedWebRTCSignal[] = Array.isArray(incomingSignal.queue) && incomingSignal.queue.length > 0
      ? incomingSignal.queue
      : incomingSignal.signal
        ? [{ signal: incomingSignal.signal, id: incomingSignal.id }]
        : [];

    const pendingItems = rawList.filter(
      (item) =>
        item &&
        item.signal &&
        item.id > processedSignalIdRef.current &&
        (!item.roomId || !roomId || item.roomId === roomId)
    );

    if (pendingItems.length === 0) {
      return;
    }

    const generation = peerConnectionGenerationRef.current;

    for (const item of pendingItems) {
      processedSignalIdRef.current = Math.max(processedSignalIdRef.current, item.id);
      const signal = item.signal;
      logWebRTC('signal.received', { roomId, type: signal.type || 'unknown', signalId: item.id });

      const handleSignal = async (): Promise<void> => {
        try {
          if (generation !== peerConnectionGenerationRef.current) return;

          if (signal.type === 'peer_ready') {
            const currentPc = pcRef.current;
            if (
              isInitiatorRef.current &&
              currentPc &&
              currentPc.connectionState !== 'connected' &&
              currentPc.signalingState === 'have-local-offer' &&
              currentPc.localDescription &&
              !currentPc.remoteDescription
            ) {
              const sent = onSendSignalRef.current({ type: 'offer', sdp: currentPc.localDescription });
              logWebRTC('sdp.offer.resent-on-peer-ready', { roomId, sent: sent !== false });
            }
            return;
          }

          if (signal.type === 'reconnect_check') {
            const currentPc = pcRef.current;
            if (!currentPc) {
              let stream = localStreamRef.current;
              if (!stream) stream = await startLocalMedia(isFacingUserRef.current);
              if (stream) await initPeerConnection(stream);
              return;
            }
            if (currentPc.connectionState !== 'connected') {
              iceRetryAttemptRef.current = 0;
              setReconnectAttempt(0);
              setIsExhausted(false);
              autoRecoveryRef.current();
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
                const sent = onSendSignalRef.current({ type: 'answer', sdp: currentPc.localDescription });
                logWebRTC('sdp.answer.resent', { roomId, sent: sent !== false });
              }
              return;
            }

            const readyForOffer = !makingOfferRef.current &&
              (currentPc.signalingState === 'stable' || settingRemoteAnswerRef.current);
            const offerCollision = !readyForOffer;
            const isPolite = !isInitiatorRef.current;
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
            const sent = onSendSignalRef.current({ type: 'answer', sdp: currentPc.localDescription });
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
    }
  }, [incomingSignal, initPeerConnection, roomId, startLocalMedia]);

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
      if (remoteVideoCleanupRef.current) {
        remoteVideoCleanupRef.current();
        remoteVideoCleanupRef.current = null;
      }
      if (connectionTimeoutRef.current !== null) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (disconnectTimerRef.current !== null) {
        window.clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      if (offerRetransmitTimerRef.current !== null) {
        window.clearTimeout(offerRetransmitTimerRef.current);
        offerRetransmitTimerRef.current = null;
      }
      if (statsIntervalRef.current !== null) {
        window.clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      if (iceRetryTimerRef.current !== null) {
        window.clearTimeout(iceRetryTimerRef.current);
        iceRetryTimerRef.current = null;
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
  }, [roomId, autoStart, mediaMode, initPeerConnection, startLocalMedia]);

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
  const toggleCamera = useCallback(async () => {
    if (mediaMode !== 'video') return;
    if (isCameraBusyRef.current) return;

    const currentStream = localStreamRef.current;
    if (!currentStream) return;

    const videoTracks = currentStream.getVideoTracks();
    const isVirtual = videoTracks.some((t) => (t as any)._isVirtual || t.label.includes('canvas'));

    // If currently on virtual/canvas fallback or has no video tracks, re-request real camera
    if (videoTracks.length === 0 || (!isCameraOn && (isVirtual || mediaError))) {
      isCameraBusyRef.current = true;
      try {
        const stream = await startLocalMedia(isFacingUserRef.current, true);
        if (stream && pcRef.current) {
          const newVideoTrack = stream.getVideoTracks()[0];
          if (newVideoTrack) {
            const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newVideoTrack);
            } else {
              pcRef.current.addTrack(newVideoTrack, stream);
            }
            setIsCameraOn(true);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.play().catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('[webrtc] Failed to turn camera on:', err);
      } finally {
        isCameraBusyRef.current = false;
      }
      return;
    }

    // Physical camera track: directly toggle track.enabled without recreating stream or calling getUserMedia
    const nextState = !isCameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsCameraOn(nextState);

    if (nextState && localVideoRef.current) {
      localVideoRef.current.play().catch(() => {});
    }
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
    if (isCameraBusyRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Camera switching is not supported on this device/browser.');
      return;
    }

    isCameraBusyRef.current = true;
    const prevFacing = isFacingUserRef.current;
    const nextFacing = !prevFacing;
    let newVideoStream: MediaStream | null = null;

    try {
      // 1. Acquire the new camera video track first
      newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing ? 'user' : 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('No video track returned from requested camera.');
      }

      // 2. Find existing video RTCRtpSender (or video transceiver)
      const pc = pcRef.current;
      if (pc) {
        let videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (!videoSender && pc.getTransceivers) {
          const videoTransceiver = pc.getTransceivers().find(
            (t) => t.sender.track?.kind === 'video' || t.receiver?.track?.kind === 'video'
          );
          if (videoTransceiver) {
            videoSender = videoTransceiver.sender;
          }
        }

        // 3. Await sender.replaceTrack(newVideoTrack)
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        } else if (localStreamRef.current) {
          // 8. Safely handle case where no video sender exists without creating duplicate senders
          const existingSenders = pc.getSenders().filter((s) => s.track?.kind === 'video');
          if (existingSenders.length === 0) {
            pc.addTrack(newVideoTrack, localStreamRef.current);
          }
        }
      }

      // 4. Only after successful replacement, update local MediaStream and local video preview
      const currentStream = localStreamRef.current;
      const oldVideoTracks = currentStream ? currentStream.getVideoTracks() : [];

      if (currentStream) {
        currentStream.addTrack(newVideoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = currentStream || newVideoStream;
        localVideoRef.current.play().catch(() => {});
      }

      // 5. Stop the old video track only after the new track is successfully installed
      oldVideoTracks.forEach((t) => {
        if (t !== newVideoTrack) {
          currentStream?.removeTrack(t);
          t.stop();
        }
      });

      // Update state to reflect newly active facing mode
      setIsFacingUser(nextFacing);
      isFacingUserRef.current = nextFacing;
      setIsCameraOn(true);
      setMediaError(null);
    } catch (err: any) {
      console.warn('[webrtc] flipCamera failed:', err);
      // 6. If replacement or acquisition fails, stop newly acquired track and retain old working track
      if (newVideoStream) {
        newVideoStream.getTracks().forEach((t) => t.stop());
      }
      // Restore previous camera state
      setIsFacingUser(prevFacing);
      isFacingUserRef.current = prevFacing;
      setMediaError('Could not switch camera. Keeping current camera active.');
    } finally {
      isCameraBusyRef.current = false;
    }
  }, [mediaMode]);

  const terminateConnection = useCallback(() => {
    if (statsIntervalRef.current !== null) {
      window.clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (connectionTimeoutRef.current !== null) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (disconnectTimerRef.current !== null) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    if (offerRetransmitTimerRef.current !== null) {
      window.clearTimeout(offerRetransmitTimerRef.current);
      offerRetransmitTimerRef.current = null;
    }
    if (iceRetryTimerRef.current !== null) {
      window.clearTimeout(iceRetryTimerRef.current);
      iceRetryTimerRef.current = null;
    }
    iceRetryAttemptRef.current = 0;
    setReconnectAttempt(0);
    setIsExhausted(false);
    setIsIceRestarting(false);

    if (remoteVideoCleanupRef.current) {
      remoteVideoCleanupRef.current();
      remoteVideoCleanupRef.current = null;
    }
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

  const unlockAudio = useCallback(async () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      try {
        await remoteVideoRef.current.play();
        setIsAutoplayBlocked(false);
      } catch (e) {
        console.warn('[webrtc] Failed to unmute remote video:', e);
      }
    }
  }, []);

  const manualReconnect = useCallback(() => {
    logWebRTC('manual.reconnect-invoked', { roomId });
    iceRetryAttemptRef.current = 0;
    setReconnectAttempt(0);
    setIsExhausted(false);
    autoRecoveryRef.current();
  }, [roomId]);

  return {
    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    remoteStreamRef,
    connectionState,
    reconnectAttempt,
    isExhausted,
    manualReconnect,
    isJustReconnected,
    isIceRestarting,
    connectionQuality,
    isCameraOn,
    isMicOn,
    isFacingUser,
    hasMultipleCameras,
    isRemoteVideoActive,
    isRemoteAudioActive,
    isAutoplayBlocked,
    unlockAudio,
    retryConnection: manualReconnect,
    mediaError,
    toggleCamera,
    toggleMic,
    flipCamera,
    startLocalMedia,
    terminateConnection,
  };
};
