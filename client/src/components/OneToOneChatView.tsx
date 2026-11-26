import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Active1on1Room } from '../types/index.ts';
import { useWebRTC } from '../hooks/useWebRTC.ts';
import { useLiveSpeechRecognition } from '../hooks/useLiveSpeechRecognition.ts';
import { LiveSubtitleOverlay, SubtitleData } from './LiveSubtitleOverlay.tsx';
import { ChatMessageBubble } from './ChatMessageBubble.tsx';
import { ChatTranslationToggle } from './ChatTranslationToggle.tsx';
import { SharedInterestBadgePopover } from './SharedInterestBadgePopover.tsx';
import { InputVoiceTranscribeButton } from './InputVoiceTranscribeButton.tsx';
import { CountryFlag } from './CountryFlag.tsx';
import { soundService } from '../services/soundService.ts';
import { useChatTranslation } from '../hooks/useChatTranslation.ts';
import { ologleSocket, type ConnectionStatus } from '../services/ologleSocket.ts';
import { translateCaption, autoDetectAndTranslateMessage } from '../services/translationService.ts';
import { getBackendApiUrl } from '../services/apiConfig.ts';
import { analyzeInFlightText } from '../utils/zeroStorageModeration.ts';
import { validateChatMessage } from '../utils/chatSafety.ts';
import { LocalStreamModerator } from '../services/localStreamModeration.ts';

// Helper for type-safe named export lazy-loading
const lazyNamed = <T extends Record<string, any>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K
) => React.lazy(() => loader().then((m) => ({ default: m[key] })));

const AffinityBreakdownModal = lazyNamed(() => import('./AffinityBreakdownModal.tsx'), 'AffinityBreakdownModal');
const SessionSummaryModal = lazyNamed(() => import('./SessionSummaryModal.tsx'), 'SessionSummaryModal');
const BlockAndReportModal = lazyNamed(() => import('./BlockAndReportModal.tsx'), 'BlockAndReportModal');
import { AudioWaveVideoFrame } from './AudioWaveVideoFrame.tsx';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  Send,
  ArrowRight,
  ArrowDown,
  Shield,
  Clock,
  AlertTriangle,
  Sparkles,
  Rocket,
  Camera,
  ChevronDown,
  ChevronRight,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCw,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  User,
  Radio,
  AlertCircle,
  WifiOff,
  Lightbulb,
  ShieldAlert,
  LoaderCircle,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Subtitles,
  X,
  LayoutGrid,
  Smile,
  Paperclip,
  Volume2,
  VolumeX,
  FileText,
  CheckCheck,
} from 'lucide-react';

const EMOJI_CATEGORIES = [
  { id: 'Smileys', label: 'Smileys', emojis: ['😊', '😂', '😃', '😍', '🥳', '😎', '🤔', '😅', '🥺', '🤩', '😇', '🤝', '🙌', '👏', '😉', '😋'] },
  { id: 'Gestures', label: 'Gestures', emojis: ['👍', '👎', '✌️', '💡', '👋', '🚀', '🔥', '✨', '💯', '🎯', '⚡', '💪', '🙏', '🎉', '👌', '⭐'] },
  { id: 'Tech', label: 'Tech & Work', emojis: ['💻', '📱', '☕', '📚', '🧠', '🔒', '🌐', '📊', '📝', '💬', '🛠️', '⚙️', '📂', '📈', '🔬', '📎'] },
  { id: 'Hearts', label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🌟', '💫', '🕊️', '🏆', '🎨', '☀️', '☕', '🔥'] },
] as const;

interface OneToOneChatViewProps {
  room: Active1on1Room;
  sessionId: string;
  messages: ChatMessage[];
  partnerLeftReason: string | null;
  incomingSignal: { signal: any; id: number } | null;
  onSendSignal: (signal: any) => boolean | void;
  onSendMessage: (text: string) => void;
  onNextPerson: () => void;
  onEndConversation: () => void;
  onOpenReport: () => void;
  onOpenBlock: () => void;
  onBlockAndReport: (reason: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  skipCooldownSeconds?: number;
  onUpdateMessage?: (id: string, updates: Partial<ChatMessage>) => void;
  isPartnerReconnecting?: boolean;
  partnerJustReconnected?: boolean;
  sessionMode: 'video' | 'voice' | 'messaging';
  isInitiator: boolean;
}

export const OneToOneChatView: React.FC<OneToOneChatViewProps> = ({
  room,
  sessionId,
  messages,
  partnerLeftReason,
  incomingSignal,
  onSendSignal,
  onSendMessage,
  onNextPerson,
  onEndConversation,
  onOpenReport,
  onOpenBlock,
  onBlockAndReport,
  isMuted,
  onToggleMute,
  skipCooldownSeconds = 0,
  onUpdateMessage,
  isPartnerReconnecting = false,
  partnerJustReconnected = false,
  sessionMode,
  isInitiator,
}) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  // Default to compact layout as required
  const [layoutMode, setLayoutMode] = useState<'compact' | 'expanded'>('compact');
  const [videoViewMode, setVideoViewMode] = useState<'split' | 'pip'>('split');
  const [isCompactChatOpen, setIsCompactChatOpen] = useState(false);
  const [stopConfirmState, setStopConfirmState] = useState<'idle' | 'really'>('idle');
  const [isBlockReportModalOpen, setIsBlockReportModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const fullscreenInputRef = useRef<HTMLInputElement>(null);
  const mobileFullscreenMessagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const isUserScrolledUpRef = useRef(false);
  const previousMessagesCountRef = useRef(messages.length);

  // High-Impact Feature States
  const [isAffinityModalOpen, setIsAffinityModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'split' | 'video' | 'chat'>('split');
  // Responsive viewport device type detection: mobile (< 768px), tablet (768px - 1023px), desktop (>= 1024px)
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const w = window.innerWidth;
      const nextType = w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
      setDeviceType((prev) => (prev !== nextType ? nextType : prev));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [formattedDuration, setFormattedDuration] = useState<string>('00:00');
  const sessionStartTimeRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const connectedSinceRef = useRef<number | null>(null);

  // Speaker / Audio Output control (mute/unmute peer audio)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const toggleSpeaker = () => {
    setIsSpeakerMuted((prev) => {
      const next = !prev;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = next;
      }
      return next;
    });
  };

  // Mobile drawer state for Audio Chat mode
  const [isAudioChatOpen, setIsAudioChatOpen] = useState(false);

  // Emoji Picker popover state
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<'Smileys' | 'Gestures' | 'Tech' | 'Hearts'>('Smileys');
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [isMobileEmojiPickerOpen, setIsMobileEmojiPickerOpen] = useState(false);
  const mobileEmojiPickerRef = useRef<HTMLDivElement>(null);
  const mobileAttachmentInputRef = useRef<HTMLInputElement>(null);

  // Attachment handling state
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    name: string;
    size: string;
    previewUrl?: string;
  } | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setInFlightWarning('File size exceeds 10MB limit.');
      return;
    }
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }
    setPendingAttachment({ file, name: file.name, size: sizeStr, previewUrl });
    e.target.value = '';
  };

  const handleRemoveAttachment = () => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  const handleInsertEmoji = (emoji: string) => {
    const target = isCompactChatOpen && fullscreenInputRef.current
      ? fullscreenInputRef.current
      : singleInputRef.current || chatInputRef.current;
    if (!target) {
      setInputText((prev) => prev + emoji);
      return;
    }
    const start = target.selectionStart ?? inputText.length;
    const end = target.selectionEnd ?? inputText.length;
    const updated = inputText.substring(0, start) + emoji + inputText.substring(end);
    setInputText(updated);
    setTimeout(() => {
      target.focus();
      if ('setSelectionRange' in target) {
        target.setSelectionRange(start + emoji.length, start + emoji.length);
      }
    }, 0);
  };

  useEffect(() => {
    if (isCompactChatOpen) {
      setTimeout(() => {
        mobileFullscreenMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [isCompactChatOpen, messages.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
      if (mobileEmojiPickerRef.current && !mobileEmojiPickerRef.current.contains(e.target as Node)) {
        setIsMobileEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen || isMobileEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen, isMobileEmojiPickerOpen]);

  // Optional profile details (Name, Country with flag, Age)
  const [userProfileData, setUserProfileData] = useState<{
    name?: string;
    country?: string;
    countryCode?: string;
    countryFlag?: string;
    age?: number | string;
    professionLevel?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ologle_user_profile') || localStorage.getItem('hayloo_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.countryFlag || parsed.country || parsed.countryCode || parsed.age || parsed.professionLevel)) {
          setUserProfileData(parsed);
        }
      }
    } catch {}
  }, []);

  // Reset timer on new match room
  useEffect(() => {
    sessionStartTimeRef.current = 0;
    setSessionStartTime(null);
    setSessionDuration(0);
    setFormattedDuration('00:00');
    accumulatedMsRef.current = 0;
    connectedSinceRef.current = null;
  }, [room.roomId]);

  // RequestAnimationFrame loop for fluid, drift-free duration updates
  useEffect(() => {
    let animFrameId: number;
    let lastSecond = -1;

    const tick = () => {
      if (!partnerLeftReason) {
        let currentElapsedMs = accumulatedMsRef.current;
        if (connectedSinceRef.current !== null) {
          currentElapsedMs += Math.max(0, Date.now() - connectedSinceRef.current);
        }
        const totalSec = Math.floor(currentElapsedMs / 1000);

        if (totalSec !== lastSecond) {
          lastSecond = totalSec;
          setSessionDuration(totalSec);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          const hours = Math.floor(mins / 60);
          const remMins = mins % 60;

          if (hours > 0) {
            setFormattedDuration(
              `${hours}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            );
          } else {
            setFormattedDuration(
              `${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            );
          }
        }
      }
      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [room.roomId, partnerLeftReason]);

  // Icebreaker Suggestions State
  const [isIcebreakerLoading, setIsIcebreakerLoading] = useState(false);
  const [icebreakerList, setIcebreakerList] = useState<string[]>([]);
  const [showIcebreakerDropdown, setShowIcebreakerDropdown] = useState(false);

  // Language Selection & Real-Time Voice Captioning States
  const [spokenLanguage, setSpokenLanguage] = useState<string>(() => {
    return localStorage.getItem('ologle_spoken_lang') || localStorage.getItem('hayloo_spoken_lang') || 'en-US';
  });
  const [subtitleLanguage, setSubtitleLanguage] = useState<string>(() => {
    return localStorage.getItem('ologle_subtitle_lang') || localStorage.getItem('hayloo_subtitle_lang') || localStorage.getItem('ologle_sub_lang') || 'ja-JP';
  });
  const [isVoiceTranscribeEnabled, setIsVoiceTranscribeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ologle_captions_on') ?? localStorage.getItem('hayloo_captions_on');
    return saved !== 'false';
  });
  const [isCaptionsVisible, setIsCaptionsVisible] = useState<boolean>(true);
  const [remoteSubtitle, setRemoteSubtitle] = useState<SubtitleData | null>(null);

  const handleToggleCaptions = () => {
    setIsCaptionsVisible((prev) => {
      const next = !prev;
      setIsVoiceTranscribeEnabled(next);
      try {
        localStorage.setItem('ologle_captions_on', next ? 'true' : 'false');
      } catch {}
      return next;
    });
  };

  // Typing debounce timer
  const typingTimeoutRef = useRef<any>(null);
  const partnerTypingTimeoutRef = useRef<any>(null);

  // Zero-Storage Moderation States
  const [inFlightWarning, setInFlightWarning] = useState<string | null>(null);
  const [isRemoteStreamBlurred, setIsRemoteStreamBlurred] = useState(false);
  const streamModeratorRef = useRef<LocalStreamModerator | null>(null);

  // Real-Time Chat Message Translation Hook
  const {
    isAutoTranslateEnabled,
    targetLanguage,
    toggleAutoTranslate,
    setTargetLanguage,
    translateSingleMessage,
  } = useChatTranslation({
    messages,
    onUpdateMessage: onUpdateMessage || (() => {}),
    storagePrefix: 'ologle_1on1',
    defaultTargetLanguage: subtitleLanguage || 'en-US',
  });

  const readMessagesReportedRef = useRef<Set<string>>(new Set());

  const [showTimeOnHover, setShowTimeOnHover] = useState<boolean>(() => {
    const saved = localStorage.getItem('ologle_hover_time') ?? localStorage.getItem('hayloo_hover_time');
    return saved !== 'false';
  });

  const toggleShowTimeOnHover = () => {
    setShowTimeOnHover((prev) => {
      const next = !prev;
      localStorage.setItem('ologle_hover_time', next ? 'true' : 'false');
      return next;
    });
  };

  useEffect(() => {
    readMessagesReportedRef.current.clear();
  }, [room.roomId]);

  const handleMessageInViewport = useCallback(
    (messageId: string) => {
      if (readMessagesReportedRef.current.has(messageId)) return;
      readMessagesReportedRef.current.add(messageId);

      ologleSocket.send({
        type: 'MESSAGE_READ',
        messageId,
      });

      if (onUpdateMessage) {
        onUpdateMessage(messageId, { isRead: true, readAt: Date.now() });
      }
    },
    [onUpdateMessage]
  );

  // WebRTC Hook for Live Video & Audio Streaming
  const {
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
    hasMultipleCameras,
    isRemoteVideoActive,
    isAutoplayBlocked,
    unlockAudio,
    retryConnection,
    mediaError,
    toggleCamera,
    toggleMic,
    flipCamera,
    startLocalMedia,
    terminateConnection,
  } = useWebRTC({
    roomId: room.roomId,
    isInitiator,
    mediaMode: sessionMode,
    onSendSignal,
    incomingSignal,
    autoStart: sessionMode !== 'messaging',
  });

  // Re-sync video element srcObject on responsive layout transitions (mobile <-> tablet <-> desktop)
  useEffect(() => {
    if (localVideoRef.current && localStreamRef?.current && localVideoRef.current.srcObject !== localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamRef?.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [deviceType, videoViewMode, layoutMode, localVideoRef, remoteVideoRef, localStreamRef, remoteStreamRef]);

  // Timer established gate: Only advance when peer connection is successfully established (or messaging / AI)
  const isCallEstablished = Boolean(room.isAI) || sessionMode === 'messaging' || connectionState === 'connected';

  useEffect(() => {
    if (partnerLeftReason) {
      if (connectedSinceRef.current !== null) {
        accumulatedMsRef.current += Math.max(0, Date.now() - connectedSinceRef.current);
        connectedSinceRef.current = null;
      }
      return;
    }

    if (isCallEstablished) {
      if (connectedSinceRef.current === null) {
        const now = Date.now();
        connectedSinceRef.current = now;
        if (sessionStartTimeRef.current === 0) {
          sessionStartTimeRef.current = now;
          setSessionStartTime(now);
        }
      }
    } else {
      // Reconnecting, negotiating or temporarily disconnected: freeze elapsed time without resetting
      if (connectedSinceRef.current !== null) {
        accumulatedMsRef.current += Math.max(0, Date.now() - connectedSinceRef.current);
        connectedSinceRef.current = null;
      }
    }
  }, [isCallEstablished, partnerLeftReason]);

  const [socketStatus, setSocketStatus] = useState<ConnectionStatus>('connected');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    return ologleSocket.onStatusChange((status) => {
      setSocketStatus(status);
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const getDynamicStatus = useCallback(() => {
    if (!isOnline) {
      return {
        message: 'You are offline. Reconnecting as soon as internet is back...',
        color: 'bg-rose-500/90 text-white border-rose-400/50 shadow-rose-950/40',
      };
    }
    if (socketStatus === 'reconnecting' || socketStatus === 'disconnected' || socketStatus === 'offline') {
      return {
        message: 'Connection unstable. Reconnecting to signaling server...',
        color: 'bg-amber-500/90 text-black border-amber-300 shadow-amber-950/40',
      };
    }
    if (isPartnerReconnecting) {
      return {
        message: 'Partner connection lost. Waiting for them to rejoin...',
        color: 'bg-amber-500/90 text-black border-amber-300 shadow-amber-950/40',
      };
    }
    if (partnerJustReconnected) {
      return {
        message: 'Partner reconnected! Resuming video...',
        color: 'bg-emerald-500/90 text-white border-emerald-300 shadow-emerald-950/40',
      };
    }
    if (isIceRestarting) {
      return {
        message: 'Re-establishing peer connection...',
        color: 'bg-amber-500/90 text-black border-amber-300 shadow-amber-950/40',
      };
    }
    if (connectionState === 'disconnected' || connectionState === 'failed' || connectionState === 'reconnecting') {
      return {
        message: 'Video connection interrupted. Attempting automatic recovery...',
        color: 'bg-amber-500/90 text-black border-amber-300 shadow-amber-950/40',
      };
    }
    if (connectionState === 'unstable') {
      return {
        message: 'Network unstable. Optimizing video quality...',
        color: 'bg-amber-500/90 text-black border-amber-300 shadow-amber-950/40',
      };
    }
    if (isJustReconnected) {
      return {
        message: 'Connection restored!',
        color: 'bg-emerald-500/90 text-white border-emerald-300 shadow-emerald-950/40',
      };
    }
    return null;
  }, [
    isOnline,
    socketStatus,
    isPartnerReconnecting,
    partnerJustReconnected,
    isIceRestarting,
    connectionState,
    isJustReconnected,
  ]);

  const [isMediaErrorDismissed, setIsMediaErrorDismissed] = useState(false);
  useEffect(() => {
    if (mediaError) {
      setIsMediaErrorDismissed(false);
    }
  }, [mediaError]);

  // One-time gesture listener to unlock peer audio if browser blocked unmuted autoplay
  useEffect(() => {
    if (!isAutoplayBlocked) return;
    const handleGesture = () => {
      void unlockAudio();
    };
    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [isAutoplayBlocked, unlockAudio]);

  const handleRetryCamera = async () => {
    setIsMediaErrorDismissed(false);
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const probe = await navigator.mediaDevices.getUserMedia({
          video: sessionMode === 'video',
          audio: true,
        });
        probe.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn('Direct media permission query failed:', err);
    }
    await startLocalMedia(true, true);
  };

  // Client-side On-Device ML Stream Moderation (Volatile RAM only, zero recording)
  useEffect(() => {
    const moderator = new LocalStreamModerator();
    streamModeratorRef.current = moderator;

    const cleanup = moderator.onFlagged((event) => {
      if (event.isInappropriate) {
        setIsRemoteStreamBlurred(true);
        // Ephemerally notify server without recording any media
        ologleSocket.send({
          type: 'FLAG_LIVE_STREAM',
          reason: event.reason === 'excessive_exposure' ? 'Excessive exposure detected by on-device model' : 'Harmful visual pattern detected by on-device model',
          confidence: event.confidence,
        });
      }
    });

    if (remoteVideoRef.current) {
      moderator.attachVideoElement(remoteVideoRef.current);
    }

    return () => {
      cleanup();
      moderator.stop();
      streamModeratorRef.current = null;
    };
  }, [remoteVideoRef.current, room.roomId]);

  // Browser Native Speech Recognition Hook for Local Voice Capture
  const { isListening, interimText, error: speechError } = useLiveSpeechRecognition({
    spokenLanguage,
    isEnabled: isVoiceTranscribeEnabled && isMicOn && !partnerLeftReason && (connectionState === 'connected' || Boolean(room.isAI)),
    onTranscript: ({ text, language, isFinal }) => {
      if (room.isAI) {
        if (isFinal && text.trim()) {
          onSendMessage(text.trim());
        }
      } else {
        ologleSocket.send({
          type: 'VOICE_TRANSCRIPT',
          text,
          language,
          isFinal,
          timestamp: Date.now(),
        });
      }
    },
  });

  // Audio analysis and speaking states
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState<boolean>(false);
  const partnerSpeakingTimeoutRef = useRef<any>(null);

  // Real-time audio analysis for You (Local stream / Mic)
  const localAudio = useAudioVisualizer({
    videoElement: localVideoRef.current,
    isActive: isMicOn,
    simulatedSpeaking: isVoiceTranscribeEnabled && isListening && !!interimText,
  });

  // Real-time audio analysis for Partner / Stranger
  const remoteAudio = useAudioVisualizer({
    videoElement: remoteVideoRef.current,
    isActive: (connectionState === 'connected' || Boolean(room.isAI)) && !partnerLeftReason,
    simulatedSpeaking: isPartnerSpeaking || (room.isAI && isPartnerSpeaking) || !!remoteSubtitle,
  });

  // AI Voice Synthesis & Speaking Waveform
  const lastSpokenMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!room.isAI || (sessionMode !== 'voice' && sessionMode !== 'video')) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === 'peer' && lastMsg.id !== lastSpokenMsgIdRef.current) {
      lastSpokenMsgIdRef.current = lastMsg.id;

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lastMsg.text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsPartnerSpeaking(true);
        utterance.onend = () => setIsPartnerSpeaking(false);
        utterance.onerror = () => setIsPartnerSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }, [messages, room.isAI, sessionMode]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle incoming voice transcripts, code pad updates, and typing indicators
  useEffect(() => {
    const unsubscribe = ologleSocket.subscribe((msg: any) => {
      if (msg.type === 'VOICE_TRANSCRIPT') {
        setIsPartnerSpeaking(true);
        if (partnerSpeakingTimeoutRef.current) clearTimeout(partnerSpeakingTimeoutRef.current);
        partnerSpeakingTimeoutRef.current = setTimeout(() => {
          setIsPartnerSpeaking(false);
        }, 2200);

        const sLang = msg.language || 'en';
        const tLang = subtitleLanguage || 'en';
        const sCode = sLang.split('-')[0].toLowerCase();
        const tCode = tLang.split('-')[0].toLowerCase();

        // Check if translation is needed:
        // 1. Explicitly different language codes, OR
        // 2. Contains non-ASCII foreign characters (e.g. Urdu, Arabic, Persian, French, Spanish, Russian, Hindi, etc.)
        const hasForeignScript = /[^\u0000-\u007F]/.test(msg.text);

        if (sCode !== tCode || hasForeignScript) {
          autoDetectAndTranslateMessage(msg.text, tCode)
            .then((res) => {
              setRemoteSubtitle({
                text: msg.text,
                sourceLanguage: res.detectedLanguage || msg.language || 'auto',
                translatedText: res.isTranslated ? res.translatedText : (sCode !== tCode ? res.translatedText : undefined),
                targetLanguage: subtitleLanguage,
                isFinal: msg.isFinal,
                speakerName: 'Stranger',
                timestamp: msg.timestamp || Date.now(),
              });
            })
            .catch(() => {
              translateCaption(msg.text, sLang, tLang).then((translated) => {
                setRemoteSubtitle({
                  text: msg.text,
                  sourceLanguage: msg.language,
                  translatedText: translated,
                  targetLanguage: subtitleLanguage,
                  isFinal: msg.isFinal,
                  speakerName: 'Stranger',
                  timestamp: msg.timestamp || Date.now(),
                });
              });
            });
        } else {
          setRemoteSubtitle({
            text: msg.text,
            sourceLanguage: msg.language,
            targetLanguage: subtitleLanguage,
            isFinal: msg.isFinal,
            speakerName: 'Stranger',
            timestamp: msg.timestamp || Date.now(),
          });
        }
      } else if (msg.type === 'TYPING_INDICATOR') {
        setIsPartnerTyping(Boolean(msg.isTyping));
        if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
        if (msg.isTyping) {
          partnerTypingTimeoutRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3000);
        }
      }
    });

    return () => unsubscribe();
  }, [subtitleLanguage]);

  // When partner leaves, show session wrap up
  useEffect(() => {
    if (partnerLeftReason) {
      const duration = Math.round((Date.now() - sessionStartTime) / 1000);
      setSessionDuration(duration);
      setIsSessionSummaryOpen(true);
      soundService.playSkip();
    }
  }, [partnerLeftReason, sessionStartTime]);

  useEffect(() => {
    setRemoteSubtitle(null);
  }, [room.roomId, partnerLeftReason]);

  const handleSelectSpokenLanguage = (code: string) => {
    setSpokenLanguage(code);
    localStorage.setItem('ologle_spoken_lang', code);
  };

  const handleSelectSubtitleLanguage = (code: string) => {
    setSubtitleLanguage(code);
    localStorage.setItem('ologle_subtitle_lang', code);
    localStorage.setItem('ologle_sub_lang', code);
  };

  const handleToggleVoiceTranscribe = () => {
    setIsVoiceTranscribeEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('ologle_captions_on', next ? 'true' : 'false');
      return next;
    });
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // A user is considered "scrolled up" if they are more than 70px above the bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const scrolledUp = distanceFromBottom > 70;

    isUserScrolledUpRef.current = scrolledUp;
    setIsUserScrolledUp(scrolledUp);

    // If user has scrolled back down to the bottom, clear the unread notification badge
    if (!scrolledUp) {
      setNewMessagesBelow(0);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isUserScrolledUpRef.current = false;
    setIsUserScrolledUp(false);
    setNewMessagesBelow(0);
  };

  // Reset scroll-up state on room change
  useEffect(() => {
    isUserScrolledUpRef.current = false;
    setIsUserScrolledUp(false);
    setNewMessagesBelow(0);
    previousMessagesCountRef.current = 0;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 50);
  }, [room.roomId]);

  // Auto-scroll when a new message arrives, UNLESS the user has manually scrolled up to view history
  useEffect(() => {
    const isNewMessage = messages.length > previousMessagesCountRef.current;
    const lastMessage = messages[messages.length - 1];
    const isSelfMessage = lastMessage?.sender === 'self';

    if (isNewMessage) {
      if (isSelfMessage) {
        // User sent a message themselves -> always scroll to bottom
        scrollToBottom('smooth');
      } else if (!isUserScrolledUpRef.current) {
        // User is at bottom -> smoothly auto-scroll
        scrollToBottom('smooth');
      } else {
        // User has manually scrolled up to view history -> preserve scroll position
        setNewMessagesBelow((prev) => prev + 1);
      }
    } else if (!isUserScrolledUpRef.current) {
      // Content updates (like translations or typing status) while already at bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    previousMessagesCountRef.current = messages.length;
  }, [messages, partnerLeftReason, isPartnerTyping]);

  useEffect(() => {
    setStopConfirmState('idle');
  }, [room.roomId, partnerLeftReason]);

  // Keyboard shortcut: ESC to Stop -> Really -> Next
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (skipCooldownSeconds > 0) return;
        if (partnerLeftReason) {
          onNextPerson();
          return;
        }

        if (stopConfirmState === 'idle') {
          setStopConfirmState('really');
        } else if (stopConfirmState === 'really') {
          setStopConfirmState('idle');
          soundService.playSkip();
          onNextPerson();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [stopConfirmState, partnerLeftReason, skipCooldownSeconds, onNextPerson]);

  // Fetch AI Icebreakers
  const handleFetchIcebreakers = async () => {
    setIsIcebreakerLoading(true);
    setShowIcebreakerDropdown(true);
    try {
      const res = await fetch(getBackendApiUrl('/api/suggest-icebreaker'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: room.sharedInterests.length > 0 ? room.sharedInterests : ['technology', 'future'],
          professionA: room.partnerProfession || 'Peer',
          professionB: 'Peer',
        }),
      });
      const data = await res.json();
      if (data.icebreakers && Array.isArray(data.icebreakers)) {
        setIcebreakerList(data.icebreakers);
      } else {
        setIcebreakerList([
          'What project are you currently most passionate about?',
          'What tech or trend do you think will surprise us all next year?',
          'What is one tool or ritual that fundamentally changed your workflow?',
        ]);
      }
    } catch {
      setIcebreakerList([
        'What project are you currently most passionate about?',
        'What tech or trend do you think will surprise us all next year?',
      ]);
    } finally {
      setIsIcebreakerLoading(false);
    }
  };

  // Handle local typing indicator emission
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setInputText(e.target.value);

    // Emit typing indicator
    if (!typingTimeoutRef.current) {
      ologleSocket.send({ type: 'TYPING_INDICATOR', isTyping: true });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      ologleSocket.send({ type: 'TYPING_INDICATOR', isTyping: false });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let clean = inputText.trim();
    if (pendingAttachment) {
      const attachTag = `[📎 ${pendingAttachment.name} (${pendingAttachment.size})]`;
      clean = clean ? `${clean}\n${attachTag}` : attachTag;
      handleRemoveAttachment();
    }
    if (!clean || partnerLeftReason) return;

    // 1. In-flight text analysis in volatile browser memory before message dispatch
    const check = analyzeInFlightText(clean);
    if (!check.isSafe) {
      setInFlightWarning(check.warningMessage || 'Message blocked: Safety policy violation detected.');
      return;
    }

    // 2. Chat safety check (banning external links, phone numbers, emails, sensitive personal data)
    const safety = validateChatMessage(clean);
    if (!safety.isAllowed) {
      setInFlightWarning(safety.reason || 'Sharing external links, phone numbers, or emails is banned.');
      return;
    }
    setInFlightWarning(null);

    onSendMessage(clean);
    soundService.playSent();
    setInputText('');
    setIsEmojiPickerOpen(false);
    setIsMobileEmojiPickerOpen(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      ologleSocket.send({ type: 'TYPING_INDICATOR', isTyping: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleStopOrNextClick = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(15); } catch {}
    }

    if (partnerLeftReason) {
      soundService.playSkip();
      onNextPerson();
      return;
    }

    if (stopConfirmState === 'idle') {
      setStopConfirmState('really');
    } else {
      setStopConfirmState('idle');
      soundService.playSkip();
      onNextPerson();
    }
  };

  // Helper to render the Mobile Video Chat Layout strictly matching the User's Reference Images (Image 1: Split View, Image 2: PiP Floating View)
  // ONLY for Mobile Screens (< 768px)
  const renderMobileVideoLayout = () => {
    const dynStatus = getDynamicStatus();

    return (
      <div className="w-full h-full flex-1 min-h-0 flex flex-col bg-[#070B14] relative overflow-hidden select-none">
        {/* SLIDE-UP FULL-SCREEN CHAT PANEL (Mobile Only) */}
        <div
          className={`fixed inset-0 z-50 bg-[#090E1A] flex flex-col transition-transform duration-300 ease-in-out transform ${
            isCompactChatOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
          }`}
          style={{ height: '100dvh', maxHeight: '100dvh' }}
        >
          {/* Top Bar Header */}
          <div className="px-3.5 py-2.5 bg-[#0C121E] border-b border-white/10 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#EC5E27]/20 border border-[#EC5E27]/40 flex items-center justify-center text-[#EC5E27] shrink-0 font-bold text-xs">
                {room.isAI ? 'AI' : (room.partnerProfession?.[0] || 'U')}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white truncate">
                    {room.isAI ? (room.partnerName || 'AI Partner') : (room.partnerProfession || 'Partner')}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <span className="text-[10px] text-slate-400">
                  {connectionState === 'connected' ? 'Video call active' : 'Connecting...'} • {messages.length} msgs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ChatTranslationToggle
                isAutoTranslateEnabled={isAutoTranslateEnabled}
                onToggleAutoTranslate={toggleAutoTranslate}
                targetLanguage={targetLanguage}
                onSelectTargetLanguage={setTargetLanguage}
                idPrefix="mobile-fullscreen-trans"
              />
              <button
                type="button"
                onClick={() => setIsCompactChatOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Return to video call"
                aria-label="Return to video call"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Complete Chat Messages History */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-2.5 text-sm overscroll-contain"
          >
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold text-xs">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Persistence Room</span>
              </div>
              <p className="text-[10px] text-slate-400">Direct encrypted video & chat. Zero logs saved.</p>
            </div>

            {messages.length === 0 && !partnerLeftReason && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#EC5E27]/20 border border-[#EC5E27]/30 flex items-center justify-center mb-2">
                  <Sparkles className="w-5 h-5 text-[#EC5E27]" />
                </div>
                <p className="font-semibold text-xs text-white mb-0.5">Encrypted Conversation Active</p>
                <p className="text-[11px] text-slate-400 max-w-xs mb-3">Say hello or select an icebreaker below to start talking.</p>
                <button
                  type="button"
                  onClick={handleFetchIcebreakers}
                  className="px-3 py-1.5 rounded-full bg-[#EC5E27]/20 border border-[#EC5E27]/40 text-xs font-semibold text-[#EC5E27] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
                  <span>Suggest Icebreaker</span>
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                isSelf={msg.sender === 'self'}
                preferredLanguage={targetLanguage}
                autoTranslateEnabled={isAutoTranslateEnabled}
                onManualTranslate={(id) => translateSingleMessage(id)}
                onMessageInViewport={handleMessageInViewport}
                showTimeOnHover={showTimeOnHover}
                showSenderName={true}
                senderLabel={msg.sender === 'self' ? 'You:' : 'Partner:'}
              />
            ))}

            {isPartnerTyping && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 italic py-1">
                <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-ping" />
                <span>Partner is typing...</span>
              </div>
            )}

            <div ref={mobileFullscreenMessagesEndRef} />
          </div>

          {/* Accessible Message Input at the Bottom of Full Screen */}
          <div className="bg-[#0C121E] border-t border-white/10 px-2.5 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
            {pendingAttachment && (
              <div className="flex items-center gap-1.5 mb-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 shadow-sm animate-fadeIn">
                <FileText className="w-3.5 h-3.5 text-[#EC5E27] shrink-0" />
                <span className="truncate max-w-[170px] font-medium">{pendingAttachment.name}</span>
                <span className="text-[10px] text-slate-500 shrink-0">({pendingAttachment.size})</span>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="ml-auto text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-rose-100/90 shadow-md p-1.5 sm:p-2 flex flex-col gap-1.5 transition-all">
              <div className="rounded-xl border border-rose-200/70 focus-within:border-orange-400 focus-within:ring-1 focus-within:ring-orange-200/50 bg-white px-3 py-1.5 transition-all flex items-center gap-1.5">
                <input
                  ref={fullscreenInputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={!!partnerLeftReason}
                  placeholder={partnerLeftReason ? 'Conversation ended.' : 'Type a message... (Press Enter)'}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-w-0"
                />
              </div>

              <div className="flex items-center justify-between px-1 pt-0.5">
                <div className="flex items-center gap-1 relative">
                  <button
                    type="button"
                    onClick={() => setIsMobileEmojiPickerOpen((prev) => !prev)}
                    disabled={!!partnerLeftReason}
                    className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${
                      isMobileEmojiPickerOpen ? 'text-[#EC5E27] bg-orange-50' : ''
                    }`}
                    title="Insert Emoji"
                    aria-label="Insert Emoji"
                  >
                    <Smile className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                  </button>

                  <button
                    type="button"
                    onClick={() => mobileAttachmentInputRef.current?.click()}
                    disabled={!!partnerLeftReason}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Attach File"
                    aria-label="Attach File"
                  >
                    <Paperclip className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <InputVoiceTranscribeButton
                    onTranscribeComplete={(text) => {
                      setInputText((prev) => (prev ? `${prev} ${text}` : text));
                      fullscreenInputRef.current?.focus();
                    }}
                    targetLanguage={spokenLanguage}
                    disabled={!!partnerLeftReason}
                  />

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!inputText.trim() && !pendingAttachment) || !!partnerLeftReason}
                    className="w-8 h-8 rounded-full bg-[#E1EBF5] hover:bg-[#D4E4F5] disabled:opacity-40 disabled:hover:bg-[#E1EBF5] text-[#5487B2] flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs cursor-pointer"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 text-[#5487B2]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sleek Reference Top Header Bar: • Ologle (Left), • Online Pill (Center), Safety & Report / Flip Cam (Right) */}
        <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 z-30 bg-[#090E1A]/90 backdrop-blur-md border-b border-white/10 shrink-0">
          {/* Left: Brand with dot and subtle Affinity score */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EC5E27] shrink-0 shadow-[0_0_8px_rgba(236,94,39,0.7)]" />
              <span className="font-extrabold text-white text-base tracking-wide">Ologle</span>
            </div>
            {room.score > 0 && !room.isAI && (
              <button
                type="button"
                onClick={() => setIsAffinityModalOpen(true)}
                title="View affinity breakdown"
                className="px-2 py-0.5 rounded-lg bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-[#EC5E27] text-[11px] font-bold flex items-center gap-1 hover:bg-[#EC5E27]/25 transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-[#EC5E27]" />
                <span>{Math.min(100, Math.max(20, room.score))}%</span>
              </button>
            )}
          </div>

          {/* Center: Online / Status Counter Badge */}
          <div className="px-3 py-1 rounded-full bg-[#131A26]/90 border border-white/10 flex items-center gap-1.5 text-xs font-semibold text-white/90 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="tabular-nums font-mono tracking-wider">12,477</span>
          </div>

          {/* Right: Functional Action Icons (No hamburger menu! Safety Report & Camera Flip) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasMultipleCameras && (
              <button
                type="button"
                onClick={flipCamera}
                title={t('call.flipCamera', 'Switch Camera')}
                className="w-8 h-8 rounded-xl bg-[#131A26]/80 hover:bg-[#1a2332] border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsBlockReportModalOpen(true)}
              title={t('call.report', 'Report')}
              className="w-8 h-8 rounded-xl bg-[#131A26]/80 hover:bg-rose-950/60 border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Status Notification Overlay Banner (if reconnecting/network issues) */}
        {dynStatus && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 max-w-[90%] px-3 py-1 rounded-full border border-white/10 shadow-lg backdrop-blur-md bg-black/75 flex items-center gap-2 pointer-events-none transition-all duration-300 text-xs">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dynStatus.message.includes('restored') || dynStatus.message.includes('reconnected!')
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className={`font-semibold truncate ${dynStatus.color}`}>
              {dynStatus.message}
            </span>
          </div>
        )}

        {/* Autoplay Audio Unlock Banner */}
        {isAutoplayBlocked && (
          <button
            type="button"
            onClick={unlockAudio}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-xl bg-[#EC5E27] hover:bg-[#D94E1A] text-white text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            Tap to Enable Peer Audio
          </button>
        )}

        {/* Main Video Presentation Area */}
        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
          {videoViewMode === 'split' ? (
            /* IMAGE 1: SPLIT VIEW (Equal vertically stacked feeds) */
            <div className="flex-1 min-h-0 flex flex-col">
              {/* TOP HALF: REMOTE FEED (User) */}
              <div className="flex-1 min-h-0 relative bg-gradient-to-b from-[#0B1528] via-[#091224] to-[#060D1A] border-b border-white/10 flex items-center justify-center overflow-hidden">
                {/* User badge top-left */}
                <div className="absolute top-3 left-3 z-20 px-2.5 py-0.5 rounded-lg bg-[#131A26]/85 border border-white/10 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-sm">
                  {room.isAI ? (room.partnerName || 'User') : (room.partnerProfession || 'User')}
                </div>

                {/* Center graphic: circle avatar + Connected • HD Video text */}
                {room.isAI ? (
                  <div className="flex flex-col items-center justify-center text-center z-10 p-2">
                    <img
                      src={room.aiAvatar || '/ai-portraits/hero_mia_v1.webp'}
                      alt={room.partnerName || 'AI Partner'}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 shadow-xl mb-1.5 ${
                        isPartnerSpeaking ? 'border-emerald-400 scale-105' : 'border-white/20'
                      }`}
                    />
                    <p className="text-xs sm:text-sm font-bold text-white">{room.partnerName || 'AI Partner'}</p>
                    <p className="text-[11px] font-semibold text-[#EC5E27]">{room.partnerProfession}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center z-10 pointer-events-none">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/80 mb-2 shadow-inner">
                      <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/70" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-300 dark:text-neutral-300 tracking-wide">
                      {connectionState === 'connected'
                        ? 'Connected • HD Video'
                        : isPartnerReconnecting
                        ? 'Partner reconnecting...'
                        : isJustReconnected
                        ? 'Connection restored'
                        : connectionState === 'reconnecting'
                        ? (reconnectAttempt > 0 ? `Reconnecting automatically (${reconnectAttempt}/5)...` : 'Reconnecting automatically...')
                        : connectionState === 'offline'
                        ? 'Connection interrupted • Waiting for network...'
                        : connectionState === 'failed' && isExhausted
                        ? 'Connection failed'
                        : connectionState === 'requesting_media'
                        ? 'Connecting media...'
                        : !room.partnerVisitorId
                        ? 'Searching peer...'
                        : 'Establishing connection...'}
                    </p>
                  </div>
                )}

                {/* Remote Video Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    isRemoteStreamBlurred ? 'blur-2xl scale-105' : ''
                  } ${
                    (isRemoteVideoActive || (connectionState === 'connected' && (remoteVideoRef.current?.videoWidth || 0) > 0)) && !partnerLeftReason
                      ? 'opacity-100 z-15'
                      : 'opacity-0 pointer-events-none'
                  }`}
                />

                {/* On-Device ML Protective Blur Overlay */}
                {isRemoteStreamBlurred && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-2xl text-center animate-fadeIn">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2 shadow-lg">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      {t('call.streamBlurredTitle', 'Stream Blurred by Safety ML')}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setIsRemoteStreamBlurred(false)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-neutral-200 transition-colors cursor-pointer"
                      >
                        {t('call.unblur', 'Unblur')}
                      </button>
                      <button
                        type="button"
                        onClick={onNextPerson}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-[11px] font-bold text-white shadow-md transition-colors cursor-pointer"
                      >
                        {t('call.next', 'Next')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Captions Subtitle Overlay */}
                <LiveSubtitleOverlay
                  subtitle={remoteSubtitle}
                  isVisible={isCaptionsVisible && isVoiceTranscribeEnabled}
                  onDismiss={() => setRemoteSubtitle(null)}
                />
              </div>

              {/* BOTTOM HALF: LOCAL FEED (You) */}
              <div className="flex-1 min-h-0 relative bg-gradient-to-b from-[#061822] via-[#07202b] to-[#04121a] flex items-center justify-center overflow-hidden">
                {/* You badge top-left */}
                <div className="absolute top-3 left-3 z-20 px-2.5 py-0.5 rounded-lg bg-[#131A26]/85 border border-white/10 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-sm">
                  You
                </div>

                {/* Expand / Maximize button top-right (switches to PiP View) */}
                <button
                  type="button"
                  onClick={() => setVideoViewMode('pip')}
                  className="absolute top-3 right-3 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#131A26]/85 hover:bg-[#1c2638] border border-white/10 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                  title="Switch to Picture-in-Picture mode"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>

                {/* Center graphic: circle camera + Camera Active text */}
                <div className="flex flex-col items-center justify-center text-center z-10 pointer-events-none">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/80 mb-2 shadow-inner">
                    <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white/70" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-300 dark:text-neutral-300 tracking-wide">
                    {isCameraOn ? 'Camera Active' : 'Camera Off'}
                  </p>
                </div>

                {/* Local Video Stream */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                    isCameraOn ? 'opacity-100 z-15' : 'opacity-0 pointer-events-none'
                  }`}
                />

                {/* Local Speech Transcription Interim */}
                {isVoiceTranscribeEnabled && isListening && interimText && (
                  <div className="absolute bottom-2 left-2 right-2 z-20 px-2 py-0.5 rounded-lg bg-[#141414]/90 text-[10px] text-white flex items-center gap-1 border border-white/10 shadow-lg truncate">
                    <Mic className="w-3 h-3 text-[#EC5E27] animate-pulse shrink-0" />
                    <span className="truncate">{interimText}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* IMAGE 2: PIP / FLOATING VIEW (Remote is fullscreen, Local is floating bottom-right card) */
            <div className="flex-1 min-h-0 relative bg-gradient-to-b from-[#0B1528] via-[#091224] to-[#060D1A] flex items-center justify-center overflow-hidden">
              {/* User badge top-left */}
              <div className="absolute top-3 left-3 z-20 px-2.5 py-0.5 rounded-lg bg-[#131A26]/85 border border-white/10 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-sm">
                {room.isAI ? (room.partnerName || 'User') : (room.partnerProfession || 'User')}
              </div>

              {/* Center graphic: circle avatar + Connected • HD Video text */}
              {room.isAI ? (
                <div className="flex flex-col items-center justify-center text-center z-10 p-2">
                  <img
                    src={room.aiAvatar || '/ai-portraits/hero_mia_v1.webp'}
                    alt={room.partnerName || 'AI Partner'}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 shadow-xl mb-1.5 ${
                      isPartnerSpeaking ? 'border-emerald-400 scale-105' : 'border-white/20'
                    }`}
                  />
                  <p className="text-xs sm:text-sm font-bold text-white">{room.partnerName || 'AI Partner'}</p>
                  <p className="text-[11px] font-semibold text-[#EC5E27]">{room.partnerProfession}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center z-10 pointer-events-none">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/80 mb-2 shadow-inner">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/70" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-300 dark:text-neutral-300 tracking-wide">
                    {connectionState === 'connected'
                      ? 'Connected • HD Video'
                      : isPartnerReconnecting
                      ? 'Partner reconnecting...'
                      : isJustReconnected
                      ? 'Connection restored'
                      : connectionState === 'reconnecting'
                      ? (reconnectAttempt > 0 ? `Reconnecting automatically (${reconnectAttempt}/5)...` : 'Reconnecting automatically...')
                      : connectionState === 'offline'
                      ? 'Connection interrupted • Waiting for network...'
                      : connectionState === 'failed' && isExhausted
                      ? 'Connection failed'
                      : connectionState === 'requesting_media'
                      ? 'Connecting media...'
                      : !room.partnerVisitorId
                      ? 'Searching peer...'
                      : 'Establishing connection...'}
                  </p>
                </div>
              )}

              {/* Remote Video Stream taking full view */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isRemoteStreamBlurred ? 'blur-2xl scale-105' : ''
                } ${
                  (isRemoteVideoActive || (connectionState === 'connected' && (remoteVideoRef.current?.videoWidth || 0) > 0)) && !partnerLeftReason
                    ? 'opacity-100 z-15'
                    : 'opacity-0 pointer-events-none'
                }`}
              />

              {/* Live Captions Subtitle Overlay */}
              <LiveSubtitleOverlay
                subtitle={remoteSubtitle}
                isVisible={isCaptionsVisible && isVoiceTranscribeEnabled}
                onDismiss={() => setRemoteSubtitle(null)}
              />

              {/* Floating Layout Toggle Button in bottom-left corner to return to Split mode */}
              <button
                type="button"
                onClick={() => setVideoViewMode('split')}
                className="absolute bottom-4 left-3 sm:left-4 z-20 w-10 h-10 rounded-xl bg-[#131A26]/90 hover:bg-[#1c2638] border border-white/15 text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                title="Switch back to Split View"
              >
                <Minimize2 className="w-4 h-4 text-white" />
              </button>

              {/* Floating Local Video Card in bottom-right corner */}
              <div className="absolute bottom-4 right-3 sm:right-4 w-28 sm:w-36 aspect-[3/4] rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden bg-gradient-to-b from-[#061822] via-[#07202b] to-[#04121a] z-20 flex items-center justify-center">
                {/* You badge top-left inside floating card */}
                <div className="absolute top-1.5 left-1.5 z-20 px-1.5 py-0.2 rounded-md bg-[#131A26]/90 text-[10px] text-white font-semibold">
                  You
                </div>

                {/* Center graphic inside card */}
                <div className="flex flex-col items-center justify-center text-center z-10 pointer-events-none">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/80 mb-1">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
                  </div>
                  <p className="text-[10px] font-medium text-slate-300">
                    {isCameraOn ? 'Camera Active' : 'Camera Off'}
                  </p>
                </div>

                {/* Local Video Stream inside floating card */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                    isCameraOn ? 'opacity-100 z-15' : 'opacity-0 pointer-events-none'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Floating Recent Messages Overlay (Floats directly above the bottom chat bar) */}
          {messages.length > 0 && !isCompactChatOpen && (
            <div className={`absolute bottom-3 ${videoViewMode === 'pip' ? 'left-16 right-36 sm:right-44' : 'left-3 right-3 sm:left-4 sm:right-4'} z-20 pointer-events-none flex flex-col gap-1.5 max-h-28 overflow-hidden justify-end`}>
              {messages.slice(-2).map((msg) => (
                <div
                  key={msg.id}
                  onClick={videoViewMode !== 'pip' ? () => setIsCompactChatOpen(true) : undefined}
                  className={`pointer-events-auto w-fit max-w-[90%] px-3 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 text-xs text-white shadow-md animate-fadeIn ${
                    videoViewMode !== 'pip' ? 'cursor-pointer hover:bg-black/80' : ''
                  }`}
                  title={videoViewMode !== 'pip' ? 'Open full-screen chat' : undefined}
                >
                  <span className="font-bold text-[#EC5E27] mr-1">
                    {msg.sender === 'self' ? 'You:' : 'Partner:'}
                  </span>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Reference Image 1 Mobile Chat Input + 5 Action Buttons + Down Chevron */}
        <div className="bg-[#090E1A]/95 backdrop-blur-xl border-t border-white/10 flex flex-col z-30 shrink-0">
          {/* Mobile Chat Input - Reference Image 1 Layout */}
          <div className="px-2.5 sm:px-4 pt-2 pb-1 relative">
            {/* Hidden Mobile File Attachment Input */}
            <input
              ref={mobileAttachmentInputRef}
              type="file"
              className="hidden"
              onChange={handleAttachmentSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            {/* In-Flight Zero-Storage Safety Warning if any */}
            {inFlightWarning && (
              <div className="mb-1.5 px-2.5 py-1 rounded-xl bg-red-500/20 border border-red-500/40 text-[11px] text-red-200 flex items-center justify-between gap-1.5 animate-fadeIn">
                <span className="truncate">{inFlightWarning}</span>
                <button
                  type="button"
                  onClick={() => setInFlightWarning(null)}
                  className="text-red-300 hover:text-white p-0.5 cursor-pointer shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Pending Attachment preview if user selected a file */}
            {pendingAttachment && (
              <div className="flex items-center gap-1.5 mb-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 shadow-sm animate-fadeIn">
                <FileText className="w-3.5 h-3.5 text-[#EC5E27] shrink-0" />
                <span className="truncate max-w-[170px] font-medium">{pendingAttachment.name}</span>
                <span className="text-[10px] text-slate-500 shrink-0">({pendingAttachment.size})</span>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="ml-auto text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Clean, Light-Colored Rounded Rectangular Container (Reference Image 1) */}
            <div className="bg-white rounded-2xl border border-rose-100/90 shadow-md p-1.5 sm:p-2 flex flex-col gap-1.5 transition-all">
              {/* Upper Row: Message Input Box with Subtle Border */}
              <div className="rounded-xl border border-rose-200/70 focus-within:border-orange-400 focus-within:ring-1 focus-within:ring-orange-200/50 bg-white px-3 py-1.5 transition-all flex items-center gap-1.5">
                <input
                  ref={singleInputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={!!partnerLeftReason}
                  placeholder={partnerLeftReason ? 'Conversation ended.' : 'Type a message... (Press Enter)'}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-w-0"
                />
                {/* Small clean expand icon near message input (hidden in PiP mode) */}
                {videoViewMode !== 'pip' && (
                  <button
                    type="button"
                    onClick={() => setIsCompactChatOpen(true)}
                    className="p-1 rounded-md text-slate-400 hover:text-[#EC5E27] hover:bg-orange-50 active:scale-95 transition-all shrink-0 cursor-pointer"
                    title="Expand full-screen chat"
                    aria-label="Expand full-screen chat"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Bottom Toolbar Row */}
              <div className="flex items-center justify-between px-1 pt-0.5">
                {/* Left: Emoji Button + Attachment Button */}
                <div className="flex items-center gap-1 relative">
                  <button
                    type="button"
                    onClick={() => setIsMobileEmojiPickerOpen((prev) => !prev)}
                    disabled={!!partnerLeftReason}
                    className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${
                      isMobileEmojiPickerOpen ? 'text-[#EC5E27] bg-orange-50' : ''
                    }`}
                    title="Insert Emoji"
                    aria-label="Insert Emoji"
                  >
                    <Smile className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                  </button>

                  <button
                    type="button"
                    onClick={() => mobileAttachmentInputRef.current?.click()}
                    disabled={!!partnerLeftReason}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Attach File"
                    aria-label="Attach File"
                  >
                    <Paperclip className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                  </button>

                  {/* Mobile Categorized Emoji Picker Popover */}
                  {isMobileEmojiPickerOpen && (
                    <div
                      ref={mobileEmojiPickerRef}
                      className="absolute bottom-11 left-0 w-72 max-w-[calc(100vw-3rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 z-50 animate-scaleUp text-slate-800"
                    >
                      <div className="flex items-center gap-1 pb-1.5 mb-1.5 border-b border-slate-100 overflow-x-auto text-[11px] font-semibold">
                        {EMOJI_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveEmojiCategory(cat.id as any)}
                            className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                              activeEmojiCategory === cat.id
                                ? 'bg-[#EC5E27] text-white shadow-xs'
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 p-1 max-h-36 overflow-y-auto">
                        {EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCategory)?.emojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              handleInsertEmoji(emoji);
                              setIsMobileEmojiPickerOpen(false);
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Microphone Button + Light Blue Circular Send Button */}
                <div className="flex items-center gap-1.5">
                  <InputVoiceTranscribeButton
                    onTranscribeComplete={(text) => {
                      setInputText((prev) => (prev ? `${prev} ${text}` : text));
                      singleInputRef.current?.focus();
                    }}
                    targetLanguage={spokenLanguage}
                    disabled={!!partnerLeftReason}
                  />

                  {/* Circular Send Button (Light Blue with paper plane icon matching Reference Image 1) */}
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!inputText.trim() && !pendingAttachment) || !!partnerLeftReason}
                    className="w-8 h-8 rounded-full bg-[#E1EBF5] hover:bg-[#D4E4F5] disabled:opacity-40 disabled:hover:bg-[#E1EBF5] text-[#5487B2] flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs cursor-pointer"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 text-[#5487B2]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Button Action Bar: [Mic] [Video] [CC] [End] [Next >] */}
          <div className="px-2.5 sm:px-4 py-2 flex items-center justify-between gap-1 sm:gap-2">
            {/* 1. Mic Button */}
            <button
              type="button"
              onClick={toggleMic}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
                isMicOn
                  ? 'bg-[#131A26] hover:bg-[#1a2332] text-white border border-white/15'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
              title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {isMicOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />}
            </button>

            {/* 2. Video Button */}
            <button
              type="button"
              onClick={() => {
                if (!isCameraOn) setIsMediaErrorDismissed(false);
                toggleCamera();
              }}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
                isCameraOn
                  ? 'bg-[#131A26] hover:bg-[#1a2332] text-white border border-white/15'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
              title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isCameraOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />}
            </button>

            {/* 3. CC Button */}
            <button
              type="button"
              onClick={handleToggleCaptions}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                isCaptionsVisible
                  ? 'bg-[#EC5E27] text-white border border-[#EC5E27] shadow-[0_0_14px_rgba(236,94,39,0.4)]'
                  : 'bg-[#131A26] hover:bg-[#1a2332] text-white/90 border border-white/15'
              }`}
              title={isCaptionsVisible ? 'Captions ON' : 'Captions OFF'}
            >
              CC
            </button>

            {/* 4. End Button (Red Pill with scissors/phone off + End) */}
            <button
              type="button"
              onClick={onEndConversation}
              className="flex-1 sm:flex-none px-3 sm:px-4 h-10 sm:h-11 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4 text-white" />
              <span>End</span>
            </button>

            {/* 5. Next Button (Vibrant Brand Orange Pill with Next >) */}
            <button
              id="video-skip-next-peer-btn"
              type="button"
              onClick={handleStopOrNextClick}
              disabled={skipCooldownSeconds > 0}
              className={`flex-1 sm:flex-none px-3.5 sm:px-5 h-10 sm:h-11 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 shadow-lg active:scale-95 cursor-pointer whitespace-nowrap ${
                skipCooldownSeconds > 0
                  ? 'bg-neutral-800 text-neutral-500 border border-white/10 cursor-not-allowed'
                  : partnerLeftReason
                  ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-white animate-pulse shadow-[0_0_16px_rgba(236,94,39,0.5)]'
                  : stopConfirmState === 'really'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                  : 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white shadow-[0_0_14px_rgba(236,94,39,0.4)]'
              }`}
            >
              {skipCooldownSeconds > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{skipCooldownSeconds}s</span>
                </>
              ) : partnerLeftReason ? (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : stopConfirmState === 'really' ? (
                <>
                  <span>Really?</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Bottom Center Down / Up Arrow (hidden in PiP mode) */}
          {videoViewMode !== 'pip' && (
            <div className="pb-2 flex justify-center">
              <button
                type="button"
                onClick={() => setIsCompactChatOpen((prev) => !prev)}
                className="w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shadow-sm"
                title={isCompactChatOpen ? 'Return to video call' : 'Open full-screen chat'}
                aria-label="Toggle full-screen chat"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCompactChatOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to render the dual video feeds (Stranger + Self) with WebRTC, AudioWave, Subtitles, and Safety ML blur
  const renderDualVideoFeeds = () => {
    const dynStatus = getDynamicStatus();
    return (
      <div className="flex-1 min-h-0 h-full grid grid-cols-1 grid-rows-2 landscape:grid-cols-2 landscape:grid-rows-1 md:portrait:grid-cols-1 md:portrait:grid-rows-2 md:landscape:grid-cols-2 md:landscape:grid-rows-1 lg:grid-cols-2 lg:grid-rows-1 gap-1 relative overflow-hidden w-full bg-black p-0 sm:p-0.5">
        {/* Dynamic Status Notification Overlay Banner (Part 1 D) */}
        {dynStatus && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 max-w-[92%] px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-2 pointer-events-none transition-all duration-300 text-xs">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dynStatus.message.includes('restored') || dynStatus.message.includes('reconnected!')
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className={`font-semibold truncate ${dynStatus.color}`}>
              {dynStatus.message}
            </span>
          </div>
        )}
        {/* STRANGER VIDEO WITH AUDIO WAVE RIPPLES */}
        <AudioWaveVideoFrame
        isSpeaking={remoteAudio.isSpeaking || isPartnerSpeaking || !!remoteSubtitle}
        audioLevel={remoteAudio.audioLevel}
        isActive={connectionState === 'connected' && !partnerLeftReason}
        themeColor="emerald"
        animationMode="ripples"
        label={t('call.partnerSpeaking', 'Partner Speaking')}
        className="h-full min-h-0 overflow-hidden"
      >
        <div className="relative w-full h-full bg-black flex items-center justify-center min-h-0 rounded-xl overflow-hidden">
          {/* Stranger / AI Partner Label Badge */}
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#141414]/90 text-white text-[10px] sm:text-[11px] font-semibold border border-white/10 backdrop-blur-sm max-w-[85%] truncate">
            {room.isAI ? (
              <span className="flex items-center gap-1 text-[#EC5E27] font-bold truncate">
                <Sparkles className="w-3 h-3 text-[#EC5E27] shrink-0" />
                <span className="truncate">{room.partnerName || 'AI Partner'}</span>
                <span className="px-1 py-0.2 rounded-full bg-[#EC5E27]/20 text-[#EC5E27] text-[8px] uppercase tracking-wide border border-[#EC5E27]/40 shrink-0">AI</span>
              </span>
            ) : room.partnerVisitorId ? (
              <>
                <Radio className="w-3 h-3 text-[#10B981] animate-pulse shrink-0" />
                <span className="truncate">{room.partnerProfession ? room.partnerProfession : t('call.stranger', 'Stranger')}</span>
              </>
            ) : (
              <>
                <LoaderCircle className="w-3 h-3 animate-spin text-[#EC5E27] shrink-0" />
                <span className="truncate">{t('call.searchingPeer', 'Searching peer...')}</span>
              </>
            )}
            {room.partnerCountry && room.partnerCountry !== 'GLOBAL' && (
              <CountryFlag code={room.partnerCountry} className="w-3 h-2 shrink-0 inline-block" />
            )}
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 right-2 z-20">
            {partnerLeftReason ? (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                {t('call.ended', 'Ended')}
              </span>
            ) : room.isAI ? (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="hidden sm:inline">{t('call.aiActive', 'AI Active')}</span>
              </span>
            ) : isJustReconnected ? (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline">Restored</span>
              </span>
            ) : connectionState === 'connected' ? (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="hidden sm:inline">{t('call.live', 'Live')}</span>
              </span>
            ) : connectionState === 'reconnecting' || connectionState === 'disconnected' ? (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/40 text-[9px] font-bold flex items-center gap-1">
                <LoaderCircle className="w-2.5 h-2.5 animate-spin" />
                <span>{reconnectAttempt > 0 ? `Reconnecting (${reconnectAttempt}/5)...` : t('call.reconnecting', 'Reconnecting...')}</span>
              </span>
            ) : connectionState === 'offline' ? (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/40 text-[9px] font-bold">
                Offline
              </span>
            ) : connectionState === 'failed' && isExhausted ? (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                {t('call.connectionFailed', 'Connection failed')}
              </span>
            ) : connectionState === 'requesting_media' ? (
              <span className="px-1.5 py-0.5 rounded-md bg-[#EC5E27]/20 text-[#EC5E27] border border-[#EC5E27]/40 text-[9px] font-bold flex items-center gap-1">
                <LoaderCircle className="w-2.5 h-2.5 animate-spin" />
                <span>{t('call.mediaInit', 'Media...')}</span>
              </span>
            ) : !room.partnerVisitorId ? (
              <span className="px-1.5 py-0.5 rounded-md bg-[#EC5E27]/20 text-[#EC5E27] border border-[#EC5E27]/40 text-[9px] font-bold flex items-center gap-1">
                <LoaderCircle className="w-2.5 h-2.5 animate-spin" />
                <span>{t('call.queue', 'Queue')}</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-md bg-[#1A1A1A] text-neutral-300 text-[9px] font-bold animate-pulse">
                {t('call.connecting', 'Connecting...')}
              </span>
            )}
          </div>

          {/* Video Element */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover max-h-full transition-all duration-300 ${
              isRemoteStreamBlurred ? 'blur-2xl scale-105' : ''
            } ${
              (isRemoteVideoActive || (connectionState === 'connected' && (remoteVideoRef.current?.videoWidth || 0) > 0)) && !partnerLeftReason
                ? 'opacity-100'
                : 'opacity-0'
            }`}
          />

          {/* On-Device ML Protective Blur Overlay */}
          {isRemoteStreamBlurred && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-2xl text-center animate-fadeIn">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2 shadow-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">
                {t('call.streamBlurredTitle', 'Stream Blurred by Safety ML')}
              </h4>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsRemoteStreamBlurred(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-neutral-200 transition-colors cursor-pointer"
                >
                  {t('call.unblur', 'Unblur')}
                </button>
                <button
                  type="button"
                  onClick={onNextPerson}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-[11px] font-bold text-white shadow-md transition-colors cursor-pointer"
                >
                  {t('call.next', 'Next')}
                </button>
              </div>
            </div>
          )}

          {/* Autoplay Audio Unlock Banner */}
          {isAutoplayBlocked && (
            <button
              type="button"
              onClick={unlockAudio}
              className="absolute top-12 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D94E1A] text-white text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              Tap to Enable Peer Audio
            </button>
          )}

          {/* Floating Live Subtitles Overlay (Synchronized via CC button) */}
          <LiveSubtitleOverlay
            subtitle={remoteSubtitle}
            isVisible={isCaptionsVisible && isVoiceTranscribeEnabled}
            onDismiss={() => setRemoteSubtitle(null)}
          />

          {/* AI Partner Profile Frame OR Human Camera Placeholder */}
          {room.isAI ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#18181b] via-[#121214] to-[#09090b]">
              <div className="relative mb-2">
                <img
                  src={room.aiAvatar || '/ai-portraits/hero_mia_v1.webp'}
                  alt={room.partnerName || 'AI Partner'}
                  loading="lazy"
                  decoding="async"
                  width={96}
                  height={96}
                  className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover border-2 shadow-xl transition-all duration-300 ${
                    isPartnerSpeaking
                      ? 'border-emerald-400 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : 'border-white/20'
                  }`}
                />
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-black" />
                </span>
              </div>
              <div className="flex items-center gap-1 mb-0.5">
                <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-[120px] sm:max-w-none">
                  {room.partnerName || 'AI Partner'}
                </h3>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-[#EC5E27] truncate max-w-[140px]">
                {room.partnerProfession}
              </p>
              {isPartnerSpeaking && (
                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{t('call.partnerSpeaking', 'Speaking...')}</span>
                </div>
              )}
            </div>
          ) : ((!isRemoteVideoActive && !(connectionState === 'connected' && (remoteVideoRef.current?.videoWidth || 0) > 0)) || partnerLeftReason || !room.partnerVisitorId) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#111111]/95">
              <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center text-neutral-400 mb-1.5 shadow-inner">
                {!room.partnerVisitorId ? (
                  <LoaderCircle className="w-6 h-6 animate-spin text-[#EC5E27]" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-semibold text-white truncate max-w-[240px]">
                {!room.partnerVisitorId
                  ? t('call.searchingPeer', 'Searching peer...')
                  : partnerLeftReason
                  ? t('call.partnerDisconnected', 'Partner disconnected')
                  : isPartnerReconnecting
                  ? 'Partner reconnecting...'
                  : isJustReconnected
                  ? 'Connection restored'
                  : connectionState === 'reconnecting'
                  ? (reconnectAttempt > 0 ? `Reconnecting automatically (${reconnectAttempt}/5)...` : 'Reconnecting automatically...')
                  : connectionState === 'offline'
                  ? 'Connection interrupted • Waiting for network...'
                  : connectionState === 'failed' && isExhausted
                  ? 'Connection could not be recovered automatically'
                  : connectionState === 'requesting_media'
                  ? t('call.connectingMedia', 'Connecting media...')
                  : connectionState === 'connected'
                  ? t('call.partnerCameraOff', 'Partner camera off')
                  : 'Establishing connection...'}
              </p>

              {/* Subtle loading spinner during automatic reconnection */}
              {connectionState === 'reconnecting' && (
                <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-amber-300">
                  <LoaderCircle className="w-3 h-3 animate-spin text-[#EC5E27]" />
                  <span>Attempt {reconnectAttempt || 1} of 5</span>
                </div>
              )}

              {/* Only show manual action when automatic reconnection is genuinely exhausted */}
              {connectionState === 'failed' && isExhausted && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={manualReconnect}
                    className="px-3.5 py-1.5 rounded-xl bg-[#EC5E27] hover:bg-[#D94E1A] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Now
                  </button>
                  <button
                    type="button"
                    onClick={onNextPerson}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    Find Next Match
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </AudioWaveVideoFrame>

      {/* LOCAL SELF VIDEO (You) WITH AUDIO WAVE RIPPLES */}
      <AudioWaveVideoFrame
        isSpeaking={localAudio.isSpeaking || (isVoiceTranscribeEnabled && isListening && !!interimText)}
        audioLevel={localAudio.audioLevel}
        isActive={isMicOn}
        themeColor="coral"
        animationMode="ripples"
        label={t('call.youSpeaking', 'You Speaking')}
        className="h-full min-h-0 overflow-hidden"
      >
        <div className="relative w-full h-full bg-black flex items-center justify-center min-h-0 rounded-xl overflow-hidden">
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#141414]/90 text-white text-[10px] sm:text-[11px] font-semibold border border-white/10 backdrop-blur-sm max-w-[85%] truncate">
            <span className="w-2 h-2 rounded-full bg-[#EC5E27] shrink-0" />
            <span>{t('call.you', 'You')}</span>
          </div>

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover max-h-full scale-x-[-1] ${
              isCameraOn ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Local Real-time Speech Transcription */}
          {isVoiceTranscribeEnabled && isListening && interimText && (
            <div className="absolute bottom-2 left-2 right-2 z-20 px-2 py-0.5 rounded-lg bg-[#141414]/90 text-[10px] text-white flex items-center gap-1 border border-white/10 shadow-lg truncate">
              <Mic className="w-3 h-3 text-[#EC5E27] animate-pulse shrink-0" />
              <span className="truncate">{interimText}</span>
            </div>
          )}

          {/* Placeholder when local camera is off or initializing */}
          {connectionState === 'requesting_media' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/90">
              <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center text-[#EC5E27] mb-1.5 shadow-inner">
                <LoaderCircle className="w-6 h-6 animate-spin text-[#EC5E27]" />
              </div>
              <p className="text-xs font-semibold text-white">{t('call.initializingCamera', 'Initializing camera...')}</p>
            </div>
          ) : !isCameraOn ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black">
              <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center text-neutral-400 mb-1.5 shadow-inner">
                <VideoOff className="w-6 h-6 text-[#EC5E27]" />
              </div>
              <p className="text-xs font-semibold text-white">{t('call.cameraOff', 'Camera Off')}</p>
            </div>
          ) : null}
        </div>
      </AudioWaveVideoFrame>
    </div>
  );
};

  // Helper to render the video control toolbar (Below video feeds)
  const renderVideoToolbar = (mode: 'compact' | 'expanded') => (
    <div className={`flex items-center justify-between gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar w-full ${
      sessionMode === 'video'
        ? 'px-3 sm:px-4 py-2 bg-[#090E1A]/95 border-t border-white/10 rounded-none'
        : 'p-1 sm:p-1.5 md:p-2 rounded-xl bg-orange-50/80 dark:bg-[#111111]/85 border border-orange-200/80 dark:border-white/10'
    }`}>
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
        {/* Live indicator in compact mode */}
        {mode === 'compact' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-black/50 border border-orange-200/70 dark:border-white/10 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]">{t('call.live', 'Live')}</span>
            <span className="text-slate-600 dark:text-neutral-300 font-mono text-[11px]">{formattedDuration}</span>
          </div>
        )}

        {/* Camera Toggle */}
        <button
          type="button"
          onClick={() => {
            if (!isCameraOn) {
              setIsMediaErrorDismissed(false);
            }
            toggleCamera();
          }}
          className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            isCameraOn
              ? 'bg-[#EC5E27] text-white font-bold hover:bg-[#D94E1A]'
              : 'bg-white dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
          }`}
          title={isCameraOn ? t('call.cameraOn', 'Camera On') : t('call.cameraOff', 'Camera Off')}
        >
          {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isCameraOn ? t('call.cameraOn', 'Camera') : t('call.cameraOff', 'Cam Off')}</span>
        </button>

        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMic}
          className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            isMicOn
              ? 'bg-white dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
              : 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/40 font-bold'
          }`}
          title={isMicOn ? t('call.mute', 'Mute') : t('call.unmuted', 'Unmuted')}
        >
          {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMicOn ? t('call.mute', 'Mute') : t('call.unmuted', 'Unmuted')}</span>
        </button>

        {/* Functional Captions (CC) Button */}
        <button
          type="button"
          onClick={handleToggleCaptions}
          title={isCaptionsVisible ? t('call.captionsOn', 'CC ON') : t('call.captionsOff', 'CC OFF')}
          className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            isCaptionsVisible
              ? 'bg-[#EC5E27] text-white ring-2 ring-[#EC5E27]/40 shadow-[0_0_12px_rgba(236,94,39,0.3)]'
              : 'bg-white/90 dark:bg-[#1A1A1A]/90 hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
          }`}
        >
          <Subtitles className={`w-3.5 h-3.5 ${isCaptionsVisible ? 'text-white' : 'text-slate-500 dark:text-neutral-400'}`} />
          <span className="hidden sm:inline">{isCaptionsVisible ? t('call.captionsOn', 'CC ON') : t('call.captionsOff', 'CC OFF')}</span>
        </button>

        {/* Flip Camera (for mobile/multi-cam) */}
        {hasMultipleCameras && (
          <button
            type="button"
            onClick={flipCamera}
            title={t('call.flipCamera', 'Switch Camera')}
            className="p-1.5 sm:p-2 rounded-lg bg-white/80 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right controls: Chat Drawer Toggle (compact/mobile), Layout switcher, End, Next */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 ml-auto shrink-0">
        {/* Chat toggle button (always available on mobile, or in compact mode) */}
        <button
          type="button"
          onClick={() => {
            if (mode === 'compact') {
              setIsCompactChatOpen(!isCompactChatOpen);
            } else {
              setMobileTab(mobileTab === 'chat' ? 'video' : 'chat');
            }
          }}
          className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
            (mode === 'compact' ? isCompactChatOpen : mobileTab === 'chat')
              ? 'bg-[#EC5E27] text-white shadow-md'
              : 'bg-white/90 dark:bg-[#1A1A1A]/90 hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200 border border-orange-200/80 dark:border-white/10'
          } ${mode === 'expanded' ? 'lg:hidden' : ''}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('call.chat', 'Chat')}</span>
          {messages.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${(mode === 'compact' ? isCompactChatOpen : mobileTab === 'chat') ? 'bg-white text-[#EC5E27]' : 'bg-[#EC5E27] text-white'}`}>
              {messages.length}
            </span>
          )}
        </button>

        {/* Desktop Mode switch button (Compact vs Expanded) */}
        {mode === 'compact' ? (
          <button
            type="button"
            onClick={() => setLayoutMode('expanded')}
            className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-300 text-xs font-semibold hidden lg:flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title={t('call.expandedView', 'Expanded View')}
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>{t('call.expandedView', 'Expanded View')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLayoutMode('compact')}
            className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-300 text-xs font-semibold hidden lg:flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title={t('call.compactView', 'Compact View')}
          >
            <Minimize2 className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>{t('call.compactView', 'Compact View')}</span>
          </button>
        )}

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-white/80 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-300 text-xs font-semibold flex items-center transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-[#EC5E27]" /> : <Maximize className="w-3.5 h-3.5 text-[#EC5E27]" />}
        </button>

        {/* End Conversation Button */}
        <button
          type="button"
          onClick={onEndConversation}
          className="px-2 sm:px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-[#1A1A1A]/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-neutral-200 hover:text-rose-600 dark:hover:text-rose-400 border border-orange-200/80 dark:border-white/10 transition-colors whitespace-nowrap cursor-pointer shadow-xs flex items-center gap-1"
        >
          <PhoneOff className="w-3.5 h-3.5 text-rose-500 sm:hidden" />
          <span className="hidden sm:inline">{t('call.endCall', 'End')}</span>
        </button>

        {/* Next (Esc) Button */}
        <button
          id="video-skip-next-peer-btn"
          type="button"
          onClick={handleStopOrNextClick}
          disabled={skipCooldownSeconds > 0}
          className={`px-3 sm:px-3.5 md:px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm cursor-pointer ${
            skipCooldownSeconds > 0
              ? 'bg-[#1A1A1A] text-neutral-500 border border-white/10 cursor-not-allowed'
              : partnerLeftReason
              ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-white shadow-[0_0_15px_rgba(236,94,39,0.5)] animate-pulse'
              : stopConfirmState === 'really'
              ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
              : 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white shadow-[0_0_12px_rgba(236,94,39,0.35)]'
          }`}
        >
          {skipCooldownSeconds > 0 ? (
            <>
              <Clock className="w-3 h-3" />
              <span>{skipCooldownSeconds}s</span>
            </>
          ) : partnerLeftReason ? (
            <>
              <span>{t('call.nextEsc', 'Next (Esc)')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : stopConfirmState === 'really' ? (
            <>
              <span>{t('call.really', 'Really?')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>{t('call.next', 'Next')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Helper to render chat stream content (shared between Video expanded column, Video compact drawer, Audio Chat mode, and Message Chat mode)
  const renderChatContent = (isDrawer: boolean = false, hideHeader: boolean = false) => (
    <div className={`flex flex-col h-full ${isDrawer ? 'p-3' : 'p-2.5 sm:p-3'} min-h-0 relative`}>
      {/* Chat Stream Header */}
      {!hideHeader && (
        <div className="pb-2 mb-2 border-b border-orange-100 dark:border-white/10 flex items-center justify-between gap-2 text-xs text-slate-800 dark:text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold uppercase tracking-wider text-[11px] text-[#EC5E27]">
              {t('call.liveConversation', 'Live Conversation')}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400">
              {messages.length} {t('call.msgs', 'msgs')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ChatTranslationToggle
              isAutoTranslateEnabled={isAutoTranslateEnabled}
              onToggleAutoTranslate={toggleAutoTranslate}
              targetLanguage={targetLanguage}
              onSelectTargetLanguage={setTargetLanguage}
              idPrefix={isDrawer ? '1on1-drawer-trans' : '1on1-chat-trans'}
            />
            {isDrawer && (
              <button
                type="button"
                onClick={() => {
                  setIsCompactChatOpen(false);
                  setIsAudioChatOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                title={t('call.closeChat', 'Close Chat')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={isDrawer ? undefined : messagesContainerRef}
        onScroll={isDrawer ? undefined : handleMessagesScroll}
        className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-2 text-sm relative"
      >
        {messages.length > 0 && (
          <div className="p-2.5 rounded-xl bg-orange-50/70 dark:bg-[#111111]/60 border border-orange-200/60 dark:border-white/10 text-xs text-slate-600 dark:text-neutral-300 text-center space-y-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-800 dark:text-white">{t('call.zeroPersistence', 'Zero-Persistence Room Established')}</p>
            <p className="text-[10px] text-slate-500 dark:text-neutral-400">
              {t('call.zeroPersistenceDesc', 'Direct encrypted tunnel. No chat logs or transcripts are saved.')}
            </p>
          </div>
        )}

        {/* Empty State with Clickable Icebreakers */}
        {messages.length === 0 && !partnerLeftReason && (
          <div className="p-4 sm:p-5 my-auto rounded-2xl bg-orange-50/40 dark:bg-white/[0.03] border border-orange-200/60 dark:border-white/10 text-center space-y-3.5 animate-fadeIn">
            <div className="w-11 h-11 rounded-2xl bg-[#EC5E27]/10 border border-[#EC5E27]/25 flex items-center justify-center text-[#EC5E27] mx-auto shadow-[0_0_15px_rgba(236,94,39,0.2)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                {t('call.emptyChatTitle', 'Encrypted Conversation Active')}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {t('call.emptyChatDesc', 'Say hello or tap one of the icebreakers below to break the ice.')}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1 text-left max-w-sm mx-auto">
              {[
                { text: t('call.icebreaker1', "Hey there! How is your day going?"), icon: Sparkles },
                { text: t('call.icebreaker2', "What interesting project are you working on lately?"), icon: Rocket },
                { text: t('call.icebreaker3', "If you could master any new technology, what would it be?"), icon: Lightbulb },
              ].map((ice, i) => {
                const IceIcon = ice.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInputText(ice.text);
                      chatInputRef.current?.focus();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151D2A] hover:bg-orange-50 dark:hover:bg-[#1E293B] border border-orange-200/70 dark:border-white/10 text-xs text-slate-700 dark:text-neutral-200 text-left transition-all hover:border-[#EC5E27]/50 flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2 min-w-0 pr-1">
                      <IceIcon className="w-3.5 h-3.5 text-[#EC5E27] shrink-0" />
                      <span className="truncate">{ice.text}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#EC5E27] group-hover:translate-x-0.5 shrink-0 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            isSelf={msg.sender === 'self'}
            preferredLanguage={targetLanguage}
            autoTranslateEnabled={isAutoTranslateEnabled}
            onManualTranslate={(id) => translateSingleMessage(id)}
            onMessageInViewport={handleMessageInViewport}
            showTimeOnHover={showTimeOnHover}
            showSenderName={true}
            senderLabel={msg.sender === 'self' ? 'You:' : 'Partner:'}
          />
        ))}

        {/* Partner Typing Indicator */}
        {(isPartnerTyping || (room.isAI && messages.length > 0 && messages[messages.length - 1].sender === 'self')) && !partnerLeftReason && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-orange-200/80 dark:border-white/10 w-fit text-xs text-slate-700 dark:text-white shadow-sm animate-pulse">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27] animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27]" />
            </span>
            <span>{room.partnerName || 'Partner'} {t('call.typing', 'is typing...')}</span>
          </div>
        )}

        {/* Partner Left Notice */}
        {partnerLeftReason && (
          <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#111111]/80 border border-orange-200/80 dark:border-white/10 text-center space-y-2 my-2 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">{t('call.conversationEnded', 'Conversation ended')}</h4>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {partnerLeftReason === 'skipped' && t('call.partnerLeftSkipped', 'Partner moved to the next conversation.')}
                {partnerLeftReason === 'ended' && t('call.partnerLeftEnded', 'Partner left the session.')}
                {partnerLeftReason === 'disconnected' && t('call.partnerLeftDisconnected', 'Partner disconnected.')}
                {partnerLeftReason === 'reported' && t('call.partnerLeftReported', 'Session separated following a report.')}
                {partnerLeftReason === 'blocked' && t('call.partnerLeftBlocked', 'User blocked.')}
              </p>
            </div>
            <button
              type="button"
              onClick={onNextPerson}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-bold text-xs flex items-center justify-center gap-1.5 mx-auto shadow-md cursor-pointer"
            >
              <span>{t('call.nextEsc', 'Next (Esc)')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Subtle Scroll-to-Bottom Floating Pill when user is scrolled up */}
        {isUserScrolledUp && (
          <div className="sticky bottom-1 flex justify-center z-20 pointer-events-none pb-1">
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="pointer-events-auto px-3 py-1.5 rounded-full bg-[#EC5E27] hover:bg-[#D94E1A] text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-[#EC5E27]/40"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>
                {newMessagesBelow > 0
                  ? `${newMessagesBelow} ${newMessagesBelow > 1 ? t('call.newMessagesPlural', 'new messages') : t('call.newMessages', 'new message')}`
                  : t('call.scrollToBottom', 'Scroll to bottom')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Icebreaker Prompt Dropdown Popover */}
      {showIcebreakerDropdown && (
        <div className="p-2.5 mb-2 rounded-2xl bg-white/95 dark:bg-[#111111]/95 border border-[#EC5E27]/30 shadow-2xl text-xs text-slate-800 dark:text-white">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-orange-100 dark:border-white/10 text-[11px] font-semibold text-[#EC5E27]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {t('call.smartIcebreakers', 'Smart Icebreakers')}
            </span>
            <button
              type="button"
              onClick={() => setShowIcebreakerDropdown(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              {t('call.close', 'Close')}
            </button>
          </div>

          {isIcebreakerLoading ? (
            <div className="py-3 text-center text-slate-500 dark:text-neutral-400 text-xs flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#EC5E27]" />
              {t('call.generatingPrompts', 'Generating context-aware prompts...')}
            </div>
          ) : (
            <div className="space-y-1.5">
              {icebreakerList.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(prompt);
                    setShowIcebreakerDropdown(false);
                    chatInputRef.current?.focus();
                  }}
                  className="w-full text-left p-2 rounded-xl bg-orange-50/60 dark:bg-[#141414] hover:bg-orange-100/70 dark:hover:bg-[#1E1E1E] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white border border-orange-200/60 dark:border-white/10 hover:border-[#EC5E27]/40 transition-colors text-xs cursor-pointer flex items-start gap-2"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Attachment Preview Chip */}
      {pendingAttachment && (
        <div className="mb-2 p-2 rounded-xl bg-orange-50 dark:bg-[#1A1A1A] border border-orange-200 dark:border-white/15 flex items-center justify-between gap-2 animate-fadeIn shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {pendingAttachment.previewUrl ? (
              <img src={pendingAttachment.previewUrl} alt="preview" className="w-9 h-9 rounded-lg object-cover border border-orange-200 dark:border-white/20" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#EC5E27]/15 flex items-center justify-center text-[#EC5E27]">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{pendingAttachment.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400">{pendingAttachment.size}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
            title={t('call.removeAttachment', 'Remove attachment')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Text Input Area */}
      <form onSubmit={handleSend} className="relative shrink-0 pt-1">
        {/* Hidden File Attachment Input */}
        <input
          ref={attachmentInputRef}
          type="file"
          className="hidden"
          onChange={handleAttachmentSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        {/* In-Flight Zero-Storage Safety Warning Banner */}
        {inFlightWarning && (
          <div className="mb-2 p-2.5 rounded-xl bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-500/50 text-xs text-red-700 dark:text-red-200 flex items-center justify-between gap-2 animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>{inFlightWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setInFlightWarning(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-md cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Icebreaker Trigger Pill */}
        <div className="flex items-center gap-1.5 mb-2">
          <button
            type="button"
            id="fetch-icebreaker-btn"
            onClick={handleFetchIcebreakers}
            className="px-3 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-[#EC5E27]/30 text-xs font-semibold text-[#EC5E27] dark:text-orange-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>{t('call.suggestIcebreaker', 'Suggest Icebreaker')}</span>
          </button>
        </div>

        <div className="relative w-full">
          {/* Full-width Comfortable Input Box with Textarea, Emoji Button, Attachment Button, Transcribe & Send */}
          <div className="relative w-full bg-white dark:bg-[#111A29]/95 rounded-2xl border border-orange-200/80 dark:border-white/15 shadow-inner focus-within:border-[#EC5E27] focus-within:ring-1 focus-within:ring-[#EC5E27]/60 transition-all flex flex-col p-1.5 sm:p-2">
            <textarea
              ref={chatInputRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={!!partnerLeftReason}
              placeholder={partnerLeftReason ? 'Conversation ended.' : t('call.typeMessage', 'Type a message... (Press Enter)')}
              maxLength={1000}
              className="w-full bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none resize-none max-h-28 overflow-y-auto disabled:opacity-50"
            />

            <div className="flex items-center justify-between pt-1 border-t border-orange-100/60 dark:border-white/10 mt-1">
              {/* Left action buttons: Emoji & Attachment */}
              <div className="flex items-center gap-1 relative">
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  disabled={!!partnerLeftReason}
                  className={`p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-[#EC5E27] hover:bg-orange-50 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                    isEmojiPickerOpen ? 'text-[#EC5E27] bg-orange-50 dark:bg-white/10' : ''
                  }`}
                  title={t('call.insertEmoji', 'Insert Emoji')}
                >
                  <Smile className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={!!partnerLeftReason}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-[#EC5E27] hover:bg-orange-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title={t('call.attachFile', 'Attach File')}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Categorized Emoji Picker Popover */}
                {isEmojiPickerOpen && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-12 left-0 right-0 sm:right-auto sm:w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-[#18181A]/95 backdrop-blur-xl rounded-2xl border border-orange-200/90 dark:border-white/15 shadow-2xl p-2.5 z-50 animate-scaleUp text-slate-800 dark:text-white"
                  >
                    <div className="flex items-center gap-1 pb-1.5 mb-1.5 border-b border-orange-100 dark:border-white/10 overflow-x-auto text-[11px] font-semibold">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveEmojiCategory(cat.id as any)}
                          className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                            activeEmojiCategory === cat.id
                              ? 'bg-[#EC5E27] text-white shadow-xs'
                              : 'hover:bg-orange-50 dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-8 gap-1 p-1 max-h-44 overflow-y-auto">
                      {EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCategory)?.emojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          className="w-8 h-8 rounded-lg hover:bg-orange-100 dark:hover:bg-white/10 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right side: Shift+Enter hint, Transcribe & Send */}
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-neutral-500 mr-1">
                  {t('call.shiftEnterHint', 'Shift + Enter for newline')}
                </span>
                <InputVoiceTranscribeButton
                  onTranscribeComplete={(text) => {
                    setInputText((prev) => (prev ? `${prev} ${text}` : text));
                    chatInputRef.current?.focus();
                  }}
                  targetLanguage={spokenLanguage}
                  disabled={!!partnerLeftReason}
                />
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !pendingAttachment) || !!partnerLeftReason}
                  className={`w-8 h-8 rounded-full font-bold transition-all flex items-center justify-center shrink-0 ${
                    (inputText.trim() || pendingAttachment) && !partnerLeftReason
                      ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white shadow-md hover:scale-105 active:scale-95 cursor-pointer'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-neutral-500 cursor-not-allowed'
                  }`}
                  aria-label={t('call.send', 'Send')}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );

  // Dedicated Tablet Video Layout (768px - 1023px)
  // Occupies 100% of available viewport width & height with balanced dual video feeds and sleek bottom toolbar.
  const renderTabletVideoLayout = () => (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-black relative overflow-hidden w-full">
      {/* Dual video feeds fill the space edge-to-edge */}
      {renderDualVideoFeeds()}

      {/* Slide-over floating chat drawer on tablet when opened */}
      {isCompactChatOpen && (
        <div className="absolute inset-y-0 right-0 w-full max-w-sm sm:max-w-md bg-[#0C121E]/95 backdrop-blur-2xl border-l border-white/15 shadow-2xl z-30 flex flex-col overflow-hidden animate-fadeIn">
          {renderChatContent(true)}
        </div>
      )}

      {/* Tablet bottom glassmorphic toolbar */}
      {renderVideoToolbar('compact')}
    </div>
  );

  // Dedicated Laptop & Desktop Video Layout (>= 1024px)
  // Full-screen desktop arrangement: Left column for spacious dual video feeds + bottom toolbar,
  // right column for persistent live chat stream (or compact mode if user toggles it).
  const renderDesktopVideoLayout = () => {
    if (layoutMode === 'compact') {
      return (
        <div className="flex-1 min-h-0 h-full flex flex-col bg-black relative overflow-hidden w-full">
          {renderDualVideoFeeds()}
          {isCompactChatOpen && (
            <div className="absolute inset-y-0 right-0 w-full max-w-sm sm:max-w-md bg-[#0C121E]/95 backdrop-blur-2xl border-l border-white/15 shadow-2xl z-30 flex flex-col overflow-hidden animate-fadeIn">
              {renderChatContent(true)}
            </div>
          )}
          {renderVideoToolbar('compact')}
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 h-full grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden w-full bg-black">
        {/* Left Column (8-9 cols): Spacious dual video feeds + bottom toolbar */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-black min-h-0 h-full relative overflow-hidden border-r border-white/10">
          {renderDualVideoFeeds()}
          {renderVideoToolbar('expanded')}
        </div>

        {/* Right Column (4-3 cols): Persistent Live Chat */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-[#0C121E] min-h-0 h-full relative overflow-hidden">
          {renderChatContent(false)}
        </div>
      </div>
    );
  };

  // Dedicated Audio Chat Mode Interface (Side-by-side voice centerpiece and live messaging stream)
  const renderAudioChatMode = () => {
    const baseLevel = remoteAudio.audioLevel || (isPartnerSpeaking ? 0.6 : 0.05);
    const bars = [0.3, 0.6, 0.9, 0.4, 0.8, 1.0, 0.5, 0.7, 0.4];

    return (
      <div className="flex-1 min-h-0 h-full grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 relative overflow-hidden">
        {/* Invisible video elements positioned offscreen so browser native WebRTC audio tracks keep playing continuously */}
        <video ref={remoteVideoRef} autoPlay playsInline className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none" />
        <video ref={localVideoRef} autoPlay playsInline muted className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none" />

        {/* Left Column: Voice Call Centerpiece (Avatar, Speaking Ripples, Audio Waveform, Call Status, Controls) */}
        <div className="h-full lg:col-span-6 xl:col-span-5 flex flex-col justify-between rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 p-3 sm:p-5 md:p-6 shadow-xl relative overflow-hidden">
          {/* Top Info Bar inside Voice Card */}
          <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-orange-100 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {t('call.audioChat', 'Audio Call')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-white/5 border border-orange-200/60 dark:border-white/10 text-xs font-mono font-bold text-[#EC5E27]">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedDuration}</span>
            </div>
          </div>

          {/* Centerpiece: Avatar with Ripple Waves + Waveform */}
          <div className="my-auto py-2 sm:py-4 md:py-6 flex flex-col items-center justify-center text-center overflow-y-auto">
            {/* Concentric Speaking Ripple Rings */}
            <div className="relative flex items-center justify-center mb-3 sm:mb-5">
              {(remoteAudio.isSpeaking || isPartnerSpeaking) && (
                <>
                  <span className="absolute -inset-3 sm:-inset-4 rounded-full bg-emerald-400/20 animate-ping" />
                  <span className="absolute -inset-6 sm:-inset-8 rounded-full bg-emerald-500/10 animate-pulse" />
                </>
              )}

              {room.isAI ? (
                <img
                  src={room.aiAvatar || '/ai-portraits/hero_mia_v1.webp'}
                  alt={room.partnerName || 'AI Partner'}
                  loading="lazy"
                  decoding="async"
                  width={128}
                  height={128}
                  className={`w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover border-4 transition-all duration-300 relative z-10 shadow-2xl ${
                    remoteAudio.isSpeaking || isPartnerSpeaking
                      ? 'border-emerald-500 ring-8 ring-emerald-500/25 scale-105 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                      : 'border-orange-300 dark:border-white/20'
                  }`}
                />
              ) : (
                <div
                  className={`w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#EC5E27] to-[#FF5500] flex items-center justify-center text-white font-black text-2xl sm:text-3xl md:text-4xl border-4 transition-all duration-300 relative z-10 shadow-2xl ${
                    remoteAudio.isSpeaking || isPartnerSpeaking
                      ? 'border-emerald-500 ring-8 ring-emerald-500/25 scale-105 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                      : 'border-orange-300 dark:border-white/20'
                  }`}
                >
                  {room.partnerProfession ? room.partnerProfession[0].toUpperCase() : 'P'}
                </div>
              )}

              {/* Status Dot */}
              <span className="absolute bottom-1 right-2 z-20 flex h-4 w-4 sm:h-5 sm:w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 sm:h-5 sm:w-5 bg-emerald-500 border-2 border-white dark:border-black" />
              </span>
            </div>

            {/* Partner Info */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 dark:text-white">
                  {room.isAI ? (room.partnerName || 'AI Partner') : (room.partnerProfession || 'Stranger')}
                </h2>
                {room.partnerCountry && room.partnerCountry !== 'GLOBAL' && (
                  <CountryFlag code={room.partnerCountry} className="w-4 h-3 sm:w-5 sm:h-3.5 inline-block shrink-0 shadow-xs" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {room.isAI ? t('call.aiVoicePartner', 'Interactive AI Voice Partner') : (room.partnerProfession || 'Peer')}
              </p>
            </div>

            {/* Speaking Status Pill */}
            <div className="mt-2 sm:mt-3">
              {partnerLeftReason ? (
                <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                  {t('call.callConcluded', 'Audio conversation concluded')}
                </span>
              ) : isPartnerSpeaking || remoteAudio.isSpeaking ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{t('call.partnerSpeaking', 'Partner is speaking...')}</span>
                </span>
              ) : isSpeakerMuted ? (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>{t('call.speakerOff', 'Speaker Muted')}</span>
                </span>
              ) : connectionState === 'connected' || room.isAI ? (
                <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-[#EC5E27]/30 text-[#EC5E27] text-xs font-semibold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>{t('call.audioConnected', 'Audio Connected • Encrypted P2P')}</span>
                </span>
              ) : connectionState === 'reconnecting' ? (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#EC5E27]" />
                  <span>{reconnectAttempt > 0 ? `Reconnecting automatically (${reconnectAttempt}/5)...` : 'Reconnecting automatically...'}</span>
                </span>
              ) : connectionState === 'offline' ? (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline • Waiting for network</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5">
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#EC5E27]" />
                  <span>{t('call.establishingAudio', 'Establishing encrypted voice tunnel...')}</span>
                </span>
              )}
            </div>

            {/* Dynamic Animated Audio Equalizer Waveform */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-7 sm:h-10 mt-3 sm:mt-5">
              {bars.map((mult, idx) => {
                const heightPercent = isPartnerSpeaking || remoteAudio.isSpeaking
                  ? Math.min(100, Math.max(20, Math.round(baseLevel * mult * 100)))
                  : (connectionState === 'connected' || room.isAI ? 14 : 8);
                return (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-gradient-to-t from-[#EC5E27] to-[#FF5500] transition-all duration-150"
                    style={{
                      height: `${heightPercent}%`,
                      opacity: isPartnerSpeaking || remoteAudio.isSpeaking ? 1 : 0.35,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Bottom Audio Call Controls */}
          <div className="pt-2 sm:pt-3 border-t border-orange-100 dark:border-white/10 flex items-center justify-between gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
            {/* Left Controls: Mic Toggle, Speaker Output Toggle, CC */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                  isMicOn
                    ? 'bg-orange-50 dark:bg-[#1A1A1A] hover:bg-orange-100 dark:hover:bg-[#262626] text-[#EC5E27] dark:text-white border border-[#EC5E27]/40'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                }`}
                title={isMicOn ? t('call.mute', 'Mute') : t('call.unmuted', 'Unmuted')}
              >
                {isMicOn ? <Mic className="w-4 h-4 text-[#EC5E27]" /> : <MicOff className="w-4 h-4 text-rose-500" />}
                <span className="hidden sm:inline">{isMicOn ? t('call.mute', 'Mute') : t('call.unmuted', 'Unmuted')}</span>
              </button>

              {/* Speaker / Audio Output Toggle */}
              <button
                type="button"
                onClick={toggleSpeaker}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                  !isSpeakerMuted
                    ? 'bg-white/90 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                }`}
                title={isSpeakerMuted ? t('call.speakerOff', 'Speaker Muted') : t('call.speakerOn', 'Speaker On')}
              >
                {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-amber-500" /> : <Volume2 className="w-4 h-4 text-[#EC5E27]" />}
                <span className="hidden sm:inline">{isSpeakerMuted ? t('call.speakerOff', 'Speaker Muted') : t('call.speakerOn', 'Speaker On')}</span>
              </button>

              {/* Live Captions CC Button */}
              <button
                type="button"
                onClick={handleToggleCaptions}
                title={isCaptionsVisible ? t('call.captionsOn', 'CC ON') : t('call.captionsOff', 'CC OFF')}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                  isCaptionsVisible
                    ? 'bg-[#EC5E27] text-white ring-2 ring-[#EC5E27]/40 shadow-[0_0_12px_rgba(236,94,39,0.3)]'
                    : 'bg-white/90 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
                }`}
              >
                <Subtitles className={`w-4 h-4 ${isCaptionsVisible ? 'text-white' : 'text-slate-500 dark:text-neutral-400'}`} />
                <span className="hidden sm:inline">{isCaptionsVisible ? t('call.captionsOn', 'CC ON') : t('call.captionsOff', 'CC OFF')}</span>
              </button>
            </div>

            {/* Right Controls: Mobile Chat Toggle, End, Next */}
            <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
              {/* Mobile Chat Drawer Toggle (visible on small/medium screens) */}
              <button
                type="button"
                onClick={() => setIsAudioChatOpen(!isAudioChatOpen)}
                className={`lg:hidden px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                  isAudioChatOpen
                    ? 'bg-[#EC5E27] text-white shadow-md'
                    : 'bg-white/90 dark:bg-[#1A1A1A] text-slate-700 dark:text-neutral-200 border border-orange-200/80 dark:border-white/10'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">{t('call.chat', 'Chat')}</span>
                {messages.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isAudioChatOpen ? 'bg-white text-[#EC5E27]' : 'bg-[#EC5E27] text-white'}`}>
                    {messages.length}
                  </span>
                )}
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={onEndConversation}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white/90 dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-neutral-200 hover:text-rose-600 dark:hover:text-rose-400 border border-orange-200/80 dark:border-white/10 transition-colors cursor-pointer shadow-xs flex items-center gap-1 whitespace-nowrap"
              >
                <PhoneOff className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">{t('call.endCall', 'End')}</span>
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleStopOrNextClick}
                disabled={skipCooldownSeconds > 0}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0 shadow-md cursor-pointer ${
                  skipCooldownSeconds > 0
                    ? 'bg-[#1A1A1A] text-neutral-500 border border-white/10 cursor-not-allowed'
                    : partnerLeftReason
                    ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-white shadow-[0_0_15px_rgba(236,94,39,0.5)] animate-pulse'
                    : stopConfirmState === 'really'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                    : 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white shadow-[0_0_12px_rgba(236,94,39,0.35)]'
                }`}
              >
                {skipCooldownSeconds > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{skipCooldownSeconds}s</span>
                  </>
                ) : partnerLeftReason ? (
                  <>
                    <span>{t('call.nextEsc', 'Next (Esc)')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : stopConfirmState === 'really' ? (
                  <>
                    <span>{t('call.really', 'Really?')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>{t('call.next', 'Next')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop): Persistent Integrated Live Chat Stream */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 shadow-xl p-0 min-h-0 h-full relative overflow-hidden">
          {renderChatContent(false)}
        </div>

        {/* Mobile Slide-Over Chat Drawer */}
        {isAudioChatOpen && (
          <div className="lg:hidden absolute inset-1 sm:inset-2 z-30 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl border border-orange-200/80 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            {renderChatContent(true)}
          </div>
        )}
      </div>
    );
  };

  // Dedicated Message Chat Mode Interface (Professional, distraction-free messaging view)
  const renderMessageChatMode = () => (
    <div className="flex-1 min-h-0 h-full max-w-4xl w-full mx-auto flex flex-col rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 shadow-xl relative overflow-hidden">
      {/* Top Header for Message Chat Mode */}
      <div className="px-2.5 sm:px-4 py-2 sm:py-2.5 border-b border-orange-100 dark:border-white/10 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 bg-orange-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Avatar */}
          <div className="relative shrink-0">
            {room.isAI ? (
              <img
                src={room.aiAvatar || '/ai-portraits/hero_mia_v1.webp'}
                alt={room.partnerName || 'AI Partner'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-[#EC5E27]/40 shadow-xs"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#EC5E27] to-[#FF5500] flex items-center justify-center text-white font-black text-sm shadow-xs">
                {room.partnerProfession ? room.partnerProfession[0].toUpperCase() : 'P'}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white dark:border-black" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-bold text-xs sm:text-base text-slate-800 dark:text-white truncate">
                {room.isAI ? (room.partnerName || 'AI Partner') : (room.partnerProfession || 'Stranger')}
              </h2>
              {room.isAI && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#EC5E27]/20 border border-[#EC5E27]/40 text-[#EC5E27] text-[9px] font-extrabold uppercase">
                  AI
                </span>
              )}
              {room.partnerCountry && room.partnerCountry !== 'GLOBAL' && (
                <CountryFlag code={room.partnerCountry} className="w-3.5 h-2.5 inline-block shrink-0" />
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
              {room.isAI ? (
                <span>{t('call.interactiveAi', 'Interactive AI Conversation')}</span>
              ) : partnerLeftReason ? (
                <span className="text-rose-500">{t('call.conversationEnded', 'Conversation ended')}</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {t('call.encryptedZeroPersistence', 'Encrypted Zero-Persistence Room')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Actions: Translation Toggle, Duration, End, Next */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <ChatTranslationToggle
            isAutoTranslateEnabled={isAutoTranslateEnabled}
            onToggleAutoTranslate={toggleAutoTranslate}
            targetLanguage={targetLanguage}
            onSelectTargetLanguage={setTargetLanguage}
            idPrefix="1on1-messages-mode-trans"
          />

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-white/5 border border-orange-200/60 dark:border-white/10 text-xs font-mono font-semibold text-slate-700 dark:text-neutral-200">
            <Clock className="w-3 h-3 text-[#EC5E27]" />
            <span>{formattedDuration}</span>
          </div>

          <button
            type="button"
            onClick={onEndConversation}
            className="px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-neutral-200 hover:text-rose-600 dark:hover:text-rose-400 border border-orange-200/80 dark:border-white/10 transition-colors cursor-pointer shadow-xs"
          >
            {t('call.endCall', 'End')}
          </button>

          <button
            type="button"
            onClick={handleStopOrNextClick}
            disabled={skipCooldownSeconds > 0}
            className={`px-2.5 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0 shadow-md cursor-pointer ${
              skipCooldownSeconds > 0
                ? 'bg-[#1A1A1A] text-neutral-500 border border-white/10 cursor-not-allowed'
                : partnerLeftReason
                ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-white animate-pulse'
                : stopConfirmState === 'really'
                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                : 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white'
            }`}
          >
            {skipCooldownSeconds > 0 ? (
              <span>{skipCooldownSeconds}s</span>
            ) : partnerLeftReason ? (
              <>
                <span>{t('call.nextEsc', 'Next (Esc)')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : stopConfirmState === 'really' ? (
              <>
                <span>{t('call.really', 'Really?')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>{t('call.next', 'Next')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
        {renderChatContent(false, true)}
      </div>
    </div>
  );

  return (
    <div
      id="one-to-one-chat-view"
      className={`w-full flex-1 h-full min-h-0 relative flex flex-col overflow-hidden ${
        sessionMode === 'video' ? 'bg-[#070B14] text-white p-0 m-0 w-full h-full' : 'prism-grid-bg text-slate-900 dark:text-white'
      }`}
    >
      <div className={`w-full mx-auto flex-1 h-full min-h-0 flex flex-col overflow-hidden ${
        sessionMode === 'video'
          ? 'p-0 m-0 max-w-none'
          : 'max-w-7xl px-1.5 sm:px-3 md:px-4 py-1 sm:py-2'
      }`}>
        {/* Top Header / Context & Affinity Bar (Rendered for tablet/desktop video calls, voice, and message chats; mobile video has its own integrated reference top bar) */}
        {(sessionMode !== 'video' || deviceType !== 'mobile') && (
          <div className={`flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-30 ${
            sessionMode === 'video'
              ? 'px-3 sm:px-4 py-2 bg-[#090E1A]/95 border-b border-white/10 text-white rounded-none mb-0 shadow-sm'
              : 'p-1.5 sm:p-2 md:p-2.5 rounded-2xl bg-white/80 dark:bg-[#141414]/90 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 shadow-sm mb-1 sm:mb-1.5 md:mb-2 text-slate-900 dark:text-white'
          }`}>
          {/* Left: Partner / Affinity Badge + Shared Interests */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
            {/* Ologle Brand with dot in video mode */}
            {sessionMode === 'video' && (
              <div className="flex items-center gap-1.5 mr-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EC5E27] shrink-0 shadow-[0_0_8px_rgba(236,94,39,0.7)]" />
                <span className="font-extrabold text-white text-sm sm:text-base tracking-wide">Ologle</span>
              </div>
            )}
            {/* Interactive Affinity Score Button or AI Partner Badge */}
            {room.isAI ? (
              <div className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-[#EC5E27] text-xs font-bold shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="truncate max-w-[80px] sm:max-w-none">{room.partnerName || 'Maya'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#EC5E27] text-[9px] uppercase font-black text-white">AI</span>
              </div>
            ) : (
              <button
                id="open-affinity-modal-btn"
                type="button"
                onClick={() => setIsAffinityModalOpen(true)}
                title="Click to view detailed affinity breakdown"
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-[#EC5E27] dark:text-white text-xs font-bold flex items-center gap-1 hover:bg-[#EC5E27]/25 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
                <span>{Math.min(100, Math.max(20, room.score))}%</span>
                <span className="hidden sm:inline">Affinity</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[140px] sm:max-w-xs md:max-w-md shrink">
              {room.sharedInterests.length > 0 ? (
                room.sharedInterests.map((interest) => (
                  <SharedInterestBadgePopover
                    key={interest}
                    interest={interest}
                    compatibilityScore={room.score}
                    onUseIcebreaker={(promptText) => {
                      setInputText((prev) => (prev ? `${prev} ${promptText}` : promptText));
                      chatInputRef.current?.focus();
                    }}
                  />
                ))
              ) : room.sharedTopics.length > 0 ? (
                room.sharedTopics.map((topic) => (
                  <SharedInterestBadgePopover
                    key={topic}
                    interest={topic}
                    compatibilityScore={room.score}
                    onUseIcebreaker={(promptText) => {
                      setInputText((prev) => (prev ? `${prev} ${promptText}` : promptText));
                      chatInputRef.current?.focus();
                    }}
                  />
                ))
              ) : (
                <span className="text-xs text-neutral-400 italic whitespace-nowrap">{t('call.discoveryMatch', 'Discovery match')}</span>
              )}
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            {/* Mode Switcher when in video mode: Compact vs Expanded (Desktop only) */}
            {sessionMode === 'video' && (
              <div className="hidden lg:inline-flex p-0.5 rounded-xl bg-orange-50/80 dark:bg-[#111111]/80 border border-orange-200/80 dark:border-white/10 shadow-inner text-xs font-semibold mr-1">
                <button
                  type="button"
                  onClick={() => setLayoutMode('compact')}
                  title={t('call.compactView', 'Compact View')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    layoutMode === 'compact'
                      ? 'bg-[#EC5E27] text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('call.compactView', 'Compact View')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('expanded')}
                  title={t('call.expandedView', 'Expanded View')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    layoutMode === 'expanded'
                      ? 'bg-[#EC5E27] text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('call.expandedView', 'Expanded View')}</span>
                </button>
              </div>
            )}

            {/* Session Duration Tracker */}
            <div
              id="session-duration-tracker"
              title={
                partnerLeftReason
                  ? `Conversation concluded after ${formattedDuration}`
                  : `Active session duration: ${formattedDuration}`
              }
              className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-orange-50/80 dark:bg-[#111111]/80 border border-orange-200/80 dark:border-white/10 text-[11px] sm:text-xs font-mono font-medium flex items-center gap-1 text-slate-700 dark:text-neutral-300 shadow-inner select-none shrink-0"
            >
              <Clock className="w-3 h-3 text-[#EC5E27] shrink-0" />
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    partnerLeftReason ? 'bg-amber-400' : 'bg-emerald-400'
                  } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    partnerLeftReason ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </span>
              <span className="tabular-nums tracking-wider text-slate-800 dark:text-neutral-200">{formattedDuration}</span>
            </div>

            {/* Safety & Report Button */}
            <button
              id="block-and-report-btn"
              type="button"
              onClick={() => setIsBlockReportModalOpen(true)}
              title="Report or block this participant"
              className="p-1 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold bg-white/80 dark:bg-[#1A1A1A]/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-300 border border-orange-200/80 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">{t('call.report', 'Report')}</span>
            </button>

            {/* Leave / End Button in video mode header */}
            {sessionMode === 'video' && (
              <button
                type="button"
                onClick={onEndConversation}
                className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                title="Leave video call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            )}
          </div>
        </div>
        )}

        {/* Media Permission / Access Error Popup Modal */}
        {mediaError && !isMediaErrorDismissed && sessionMode === 'video' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-orange-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 max-w-sm w-full text-center space-y-4 animate-scaleUp">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
                <VideoOff className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  {t('call.cameraAccessTitle', 'Camera / Microphone Access')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  {t('call.cameraAccessDesc', 'Could not access camera or microphone. Please allow permissions in your browser.')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRetryCamera}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  {t('call.retryCamera', 'Retry Camera')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMediaErrorDismissed(true)}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t('call.dismiss', 'Dismiss')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Layout (Mobile reference layout < 768px, dedicated tablet layout 768px-1023px, desktop layout >= 1024px) */}
        <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
          {sessionMode === 'video' ? (
            deviceType === 'mobile' ? (
              renderMobileVideoLayout()
            ) : deviceType === 'tablet' ? (
              renderTabletVideoLayout()
            ) : (
              renderDesktopVideoLayout()
            )
          ) : sessionMode === 'voice' ? (
            renderAudioChatMode()
          ) : (
            renderMessageChatMode()
          )}
        </div>

        {/* Modals wrapped in Suspense for zero idle bundle weight */}
        <React.Suspense fallback={null}>
          {/* Live Affinity Breakdown Modal */}
          {isAffinityModalOpen && (
            <AffinityBreakdownModal
              score={room.score}
              breakdown={room.breakdown}
              sharedInterests={room.sharedInterests}
              sharedTopics={room.sharedTopics}
              partnerProfession={room.partnerProfession}
              partnerCountry={room.partnerCountry}
              onClose={() => setIsAffinityModalOpen(false)}
            />
          )}

          {/* Block & Report Modal */}
          <BlockAndReportModal
            isOpen={isBlockReportModalOpen}
            onClose={() => setIsBlockReportModalOpen(false)}
            onConfirmBlock={(reason) => {
              terminateConnection();
              onBlockAndReport(reason);
            }}
            partnerProfession={room.partnerProfession}
          />

          {/* Session Concluded Wrap-Up Modal */}
          {isSessionSummaryOpen && (
            <SessionSummaryModal
              durationSeconds={sessionDuration}
              messageCount={messages.length}
              sharedInterests={room.sharedInterests}
              partnerProfession={room.partnerProfession}
              onNextMatch={() => {
                setIsSessionSummaryOpen(false);
                onNextPerson();
              }}
              onChangeInterests={() => {
                setIsSessionSummaryOpen(false);
                onEndConversation();
              }}
              onGoHome={() => {
                setIsSessionSummaryOpen(false);
                onEndConversation();
              }}
            />
          )}
        </React.Suspense>
      </div>
    </div>
  );
};
