import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Active1on1Room } from '../types/index.ts';
import { useWebRTC } from '../hooks/useWebRTC.ts';
import { useLiveSpeechRecognition } from '../hooks/useLiveSpeechRecognition.ts';
import { LanguageSelector } from './LanguageSelector.tsx';
import { LiveSubtitleOverlay, SubtitleData } from './LiveSubtitleOverlay.tsx';
import { ChatMessageBubble } from './ChatMessageBubble.tsx';
import { ChatTranslationToggle } from './ChatTranslationToggle.tsx';
import { SharedInterestBadgePopover } from './SharedInterestBadgePopover.tsx';
import { InputVoiceTranscribeButton } from './InputVoiceTranscribeButton.tsx';
import { CountryFlag } from './CountryFlag.tsx';
import { soundService } from '../services/soundService.ts';
import { useChatTranslation } from '../hooks/useChatTranslation.ts';
import { haylooSocket } from '../services/haylooSocket.ts';
import { translateCaption } from '../services/translationService.ts';
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
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCw,
  Maximize2,
  Minimize2,
  User,
  Radio,
  AlertCircle,
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
  onSendSignal: (signal: any) => void;
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
  sessionMode,
  isInitiator,
}) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  // Default to compact layout as required
  const [layoutMode, setLayoutMode] = useState<'compact' | 'expanded'>('compact');
  const [isCompactChatOpen, setIsCompactChatOpen] = useState(false);
  const [stopConfirmState, setStopConfirmState] = useState<'idle' | 'really'>('idle');
  const [isBlockReportModalOpen, setIsBlockReportModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const isUserScrolledUpRef = useRef(false);
  const previousMessagesCountRef = useRef(messages.length);

  // High-Impact Feature States
  const [isAffinityModalOpen, setIsAffinityModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'split' | 'video' | 'chat'>('split');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [formattedDuration, setFormattedDuration] = useState<string>('00:00');
  const sessionStartTimeRef = useRef<number>(Date.now());

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
    const textarea = chatInputRef.current;
    if (!textarea) {
      setInputText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? inputText.length;
    const end = textarea.selectionEnd ?? inputText.length;
    const updated = inputText.substring(0, start) + emoji + inputText.substring(end);
    setInputText(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

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
      const saved = localStorage.getItem('hayloo_user_profile');
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
    const now = Date.now();
    sessionStartTimeRef.current = now;
    setSessionStartTime(now);
    setFormattedDuration('00:00');
  }, [room.roomId]);

  // RequestAnimationFrame loop for fluid, drift-free duration updates
  useEffect(() => {
    let animFrameId: number;
    let lastSecond = -1;

    const tick = () => {
      if (!partnerLeftReason) {
        const now = Date.now();
        const diffMs = Math.max(0, now - sessionStartTimeRef.current);
        const totalSec = Math.floor(diffMs / 1000);

        if (totalSec !== lastSecond) {
          lastSecond = totalSec;
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
    return localStorage.getItem('hayloo_spoken_lang') || 'en-US';
  });
  const [subtitleLanguage, setSubtitleLanguage] = useState<string>(() => {
    return localStorage.getItem('hayloo_subtitle_lang') || 'en-US';
  });
  const [isVoiceTranscribeEnabled, setIsVoiceTranscribeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hayloo_captions_on') !== 'false';
  });
  const [isCaptionsVisible, setIsCaptionsVisible] = useState<boolean>(true);
  const [remoteSubtitle, setRemoteSubtitle] = useState<SubtitleData | null>(null);

  const handleToggleCaptions = () => {
    setIsCaptionsVisible((prev) => {
      const next = !prev;
      if (next && !isVoiceTranscribeEnabled) {
        setIsVoiceTranscribeEnabled(true);
        try {
          localStorage.setItem('hayloo_captions_on', 'true');
        } catch {}
      }
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
    storagePrefix: 'hayloo_1on1',
    defaultTargetLanguage: subtitleLanguage || 'en-US',
  });

  const readMessagesReportedRef = useRef<Set<string>>(new Set());

  const [showTimeOnHover, setShowTimeOnHover] = useState<boolean>(() => {
    return localStorage.getItem('hayloo_hover_time') !== 'false';
  });

  const toggleShowTimeOnHover = () => {
    setShowTimeOnHover((prev) => {
      const next = !prev;
      localStorage.setItem('hayloo_hover_time', next ? 'true' : 'false');
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

      haylooSocket.send({
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
    connectionState,
    isCameraOn,
    isMicOn,
    hasMultipleCameras,
    isRemoteVideoActive,
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

  const [isMediaErrorDismissed, setIsMediaErrorDismissed] = useState(false);
  useEffect(() => {
    if (mediaError) {
      setIsMediaErrorDismissed(false);
    }
  }, [mediaError]);

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
        haylooSocket.send({
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
        haylooSocket.send({
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
    const unsubscribe = haylooSocket.subscribe((msg: any) => {
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

        if (sCode !== tCode) {
          translateCaption(msg.text, sLang, tLang).then((translated) => {
            setRemoteSubtitle({
              text: msg.text,
              sourceLanguage: msg.language,
              translatedText: translated,
              targetLanguage: subtitleLanguage,
              isFinal: msg.isFinal,
              speakerName: 'Stranger',
              timestamp: msg.timestamp,
            });
          });
        } else {
          setRemoteSubtitle({
            text: msg.text,
            sourceLanguage: msg.language,
            targetLanguage: subtitleLanguage,
            isFinal: msg.isFinal,
            speakerName: 'Stranger',
            timestamp: msg.timestamp,
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
    localStorage.setItem('hayloo_spoken_lang', code);
  };

  const handleSelectSubtitleLanguage = (code: string) => {
    setSubtitleLanguage(code);
    localStorage.setItem('hayloo_subtitle_lang', code);
  };

  const handleToggleVoiceTranscribe = () => {
    setIsVoiceTranscribeEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('hayloo_captions_on', next ? 'true' : 'false');
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
      const res = await fetch('/api/suggest-icebreaker', {
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
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    // Emit typing indicator
    if (!typingTimeoutRef.current) {
      haylooSocket.send({ type: 'TYPING_INDICATOR', isTyping: true });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      haylooSocket.send({ type: 'TYPING_INDICATOR', isTyping: false });
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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      haylooSocket.send({ type: 'TYPING_INDICATOR', isTyping: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleStopOrNextClick = () => {
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

  // Helper to render the dual video feeds (Stranger + Self) with WebRTC, AudioWave, Subtitles, and Safety ML blur
  const renderDualVideoFeeds = () => (
    <div className="flex-1 min-h-0 h-full grid grid-cols-1 sm:grid-cols-2 gap-2 relative overflow-hidden">
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
            ) : connectionState === 'connected' ? (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="hidden sm:inline">{t('call.live', 'Live')}</span>
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
              isRemoteVideoActive && !partnerLeftReason ? 'opacity-100' : 'opacity-0'
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
                  src={room.aiAvatar || '/ai-portraits/hero_mia_v1.jpg'}
                  alt={room.partnerName || 'AI Partner'}
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
          ) : (!isRemoteVideoActive || partnerLeftReason || !room.partnerVisitorId) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#111111]/95">
              <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center text-neutral-400 mb-1.5 shadow-inner">
                {!room.partnerVisitorId ? (
                  <LoaderCircle className="w-6 h-6 animate-spin text-[#EC5E27]" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-semibold text-white truncate max-w-[160px]">
                {!room.partnerVisitorId
                  ? t('call.searchingPeer', 'Searching peer...')
                  : partnerLeftReason
                  ? t('call.partnerDisconnected', 'Partner disconnected')
                  : connectionState === 'connected'
                  ? t('call.partnerCameraOff', 'Partner camera off')
                  : t('call.establishingP2P', 'Connecting P2P...')}
              </p>
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

          {/* Placeholder when local camera is off */}
          {!isCameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black">
              <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center text-neutral-400 mb-1.5 shadow-inner">
                <VideoOff className="w-6 h-6 text-[#EC5E27]" />
              </div>
              <p className="text-xs font-semibold text-white">{t('call.cameraOff', 'Camera Off')}</p>
            </div>
          )}
        </div>
      </AudioWaveVideoFrame>
    </div>
  );

  // Helper to render the video control toolbar (Below video feeds)
  const renderVideoToolbar = (mode: 'compact' | 'expanded') => (
    <div className="p-1.5 sm:p-2 rounded-xl bg-orange-50/70 dark:bg-[#111111]/70 border border-orange-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {/* Live indicator in compact mode */}
        {mode === 'compact' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-black/50 border border-orange-200/70 dark:border-white/10 text-xs font-semibold">
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
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            isCameraOn
              ? 'bg-[#EC5E27] text-white font-bold hover:bg-[#D94E1A]'
              : 'bg-white dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
          }`}
        >
          {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isCameraOn ? t('call.cameraOn', 'Camera On') : t('call.cameraOff', 'Camera Off')}</span>
        </button>

        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMic}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            isMicOn
              ? 'bg-white dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
              : 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/40 font-bold'
          }`}
        >
          {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          <span>{isMicOn ? t('call.mute', 'Mute') : t('call.unmuted', 'Unmuted')}</span>
        </button>

        {/* Functional Captions (CC) Button */}
        <button
          type="button"
          onClick={handleToggleCaptions}
          title={isCaptionsVisible ? t('call.captionsOn', 'CC ON') : t('call.captionsOff', 'CC OFF')}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            isCaptionsVisible
              ? 'bg-[#EC5E27] text-white ring-2 ring-[#EC5E27]/40 shadow-[0_0_12px_rgba(236,94,39,0.3)]'
              : 'bg-white/90 dark:bg-[#1A1A1A]/90 hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
          }`}
        >
          <Subtitles className={`w-3.5 h-3.5 ${isCaptionsVisible ? 'text-white' : 'text-slate-500 dark:text-neutral-400'}`} />
          <span>{isCaptionsVisible ? t('call.captionsOn', 'CC ON') : t('call.captionsOff', 'CC OFF')}</span>
        </button>

        {/* Flip Camera (for mobile/multi-cam) */}
        {hasMultipleCameras && (
          <button
            type="button"
            onClick={flipCamera}
            title={t('call.flipCamera', 'Switch Camera')}
            className="p-1 sm:p-1.5 rounded-lg bg-white/80 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right controls: Chat Drawer Toggle (compact), Layout switcher, End, Next */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        {mode === 'compact' && (
          <button
            type="button"
            onClick={() => setIsCompactChatOpen(!isCompactChatOpen)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
              isCompactChatOpen
                ? 'bg-[#EC5E27] text-white shadow-md'
                : 'bg-white/90 dark:bg-[#1A1A1A]/90 hover:bg-orange-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200 border border-orange-200/80 dark:border-white/10'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t('call.chat', 'Chat')}</span>
            {messages.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isCompactChatOpen ? 'bg-white text-[#EC5E27]' : 'bg-[#EC5E27] text-white'}`}>
                {messages.length}
              </span>
            )}
          </button>
        )}

        {/* Mode switch button */}
        {mode === 'compact' ? (
          <button
            type="button"
            onClick={() => setLayoutMode('expanded')}
            className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/80 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-300 text-xs font-semibold hidden md:flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title={t('call.expandedView', 'Expanded View')}
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>{t('call.expandedView', 'Expanded View')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLayoutMode('compact')}
            className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/80 dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-300 text-xs font-semibold hidden md:flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title={t('call.compactView', 'Compact View')}
          >
            <Minimize2 className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>{t('call.compactView', 'Compact View')}</span>
          </button>
        )}

        {/* End Conversation Button below video */}
        <button
          type="button"
          onClick={onEndConversation}
          className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-[#1A1A1A]/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-neutral-200 hover:text-rose-600 dark:hover:text-rose-400 border border-orange-200/80 dark:border-white/10 transition-colors whitespace-nowrap cursor-pointer shadow-xs flex items-center gap-1"
        >
          <span>{t('call.endCall', 'End')}</span>
        </button>

        {/* Next (Esc) Button below video */}
        <button
          id="video-skip-next-peer-btn"
          type="button"
          onClick={handleStopOrNextClick}
          disabled={skipCooldownSeconds > 0}
          className={`px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm cursor-pointer ${
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
        <div className="p-2.5 rounded-xl bg-orange-50/70 dark:bg-[#111111]/60 border border-orange-200/60 dark:border-white/10 text-xs text-slate-600 dark:text-neutral-300 text-center space-y-1">
          <Shield className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
          <p className="font-semibold text-slate-800 dark:text-white">{t('call.zeroPersistence', 'Zero-Persistence Room Established')}</p>
          <p className="text-[10px] text-slate-500 dark:text-neutral-400">
            {t('call.zeroPersistenceDesc', 'Direct encrypted tunnel. No chat logs or transcripts are saved.')}
          </p>
        </div>

        {/* Empty State with Clickable Icebreakers */}
        {messages.length === 0 && !partnerLeftReason && (
          <div className="p-4 my-auto rounded-2xl bg-orange-50/40 dark:bg-white/[0.02] border border-orange-200/60 dark:border-white/10 text-center space-y-3 animate-fadeIn">
            <div className="w-10 h-10 rounded-2xl bg-[#EC5E27]/10 border border-[#EC5E27]/20 flex items-center justify-center text-[#EC5E27] mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                {t('call.emptyChatTitle', 'Encrypted Conversation Active')}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 max-w-xs mx-auto">
                {t('call.emptyChatDesc', 'Say hello or tap one of the icebreakers below to break the ice.')}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 pt-1 text-left max-w-sm mx-auto">
              {[
                "👋 Hey there! How is your day going?",
                "🚀 What interesting project are you working on lately?",
                "💡 If you could master any new technology, what would it be?"
              ].map((ice, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setInputText(ice);
                    chatInputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1A1A] hover:bg-orange-50 dark:hover:bg-[#252525] border border-orange-200/70 dark:border-white/10 text-xs text-slate-700 dark:text-neutral-200 text-left transition-all hover:border-[#EC5E27]/40 flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <span className="truncate">{ice}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-[#EC5E27] shrink-0 ml-1 transition-colors" />
                </button>
              ))}
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
        <div className="flex items-center gap-1.5 mb-1.5">
          <button
            type="button"
            id="fetch-icebreaker-btn"
            onClick={handleFetchIcebreakers}
            className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-[#EC5E27]/30 text-[11px] font-semibold text-[#EC5E27] dark:text-orange-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#EC5E27]" />
            <span>{t('call.suggestIcebreaker', 'Suggest Icebreaker')}</span>
          </button>
        </div>

        <div className="relative flex items-end gap-1.5 sm:gap-2">
          {/* Reference 1 Style: Stop / Next Button on left of input in Expanded Video view */}
          {!isDrawer && sessionMode === 'video' && (
            <button
              type="button"
              onClick={handleStopOrNextClick}
              disabled={skipCooldownSeconds > 0}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm cursor-pointer mb-1 ${
                skipCooldownSeconds > 0
                  ? 'bg-slate-200 dark:bg-[#1A1A1A] text-neutral-400 border border-black/10 dark:border-white/10 cursor-not-allowed'
                  : partnerLeftReason
                  ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-white shadow-md animate-pulse'
                  : stopConfirmState === 'really'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                  : 'bg-slate-200/90 dark:bg-[#222224] hover:bg-slate-300 dark:hover:bg-[#2c2c30] text-slate-800 dark:text-white border border-black/10 dark:border-white/10'
              }`}
            >
              {skipCooldownSeconds > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{skipCooldownSeconds}s</span>
                </>
              ) : partnerLeftReason ? (
                <span>{t('call.nextEsc', 'Next (Esc)')}</span>
              ) : stopConfirmState === 'really' ? (
                <span>{t('call.really', 'Really?')}</span>
              ) : (
                <span>{t('call.stop', 'Stop')}</span>
              )}
            </button>
          )}

          {/* Comfortable Input Box with Textarea, Emoji Button, Attachment Button, Transcribe & Send */}
          <div className="relative flex-1 bg-white dark:bg-black/80 rounded-2xl border border-orange-200/80 dark:border-white/10 shadow-inner focus-within:border-[#EC5E27] focus-within:ring-1 focus-within:ring-[#EC5E27] transition-all flex flex-col p-1.5 sm:p-2">
            <textarea
              ref={chatInputRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={!!partnerLeftReason}
              placeholder={partnerLeftReason ? 'Conversation ended.' : t('call.typeMessage', 'Type a message... (Press Enter)')}
              maxLength={1000}
              className="w-full bg-transparent px-2 py-1 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none resize-none max-h-28 overflow-y-auto disabled:opacity-50"
            />

            <div className="flex items-center justify-between pt-1 border-t border-orange-100/60 dark:border-white/5 mt-1">
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
                    className="absolute bottom-10 left-0 z-50 w-72 sm:w-80 bg-white/95 dark:bg-[#18181A]/95 backdrop-blur-xl rounded-2xl border border-orange-200/90 dark:border-white/15 shadow-2xl p-2.5 animate-scaleUp text-slate-800 dark:text-white"
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
                  className={`p-2 rounded-xl font-bold transition-all flex items-center justify-center ${
                    (inputText.trim() || pendingAttachment) && !partnerLeftReason
                      ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white shadow-md hover:scale-105 active:scale-95 cursor-pointer'
                      : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-neutral-600 cursor-not-allowed'
                  }`}
                  aria-label={t('call.send', 'Send')}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );

  // Dedicated Audio Chat Mode Interface (Side-by-side voice centerpiece and live messaging stream)
  const renderAudioChatMode = () => {
    const baseLevel = remoteAudio.audioLevel || (isPartnerSpeaking ? 0.6 : 0.05);
    const bars = [0.3, 0.6, 0.9, 0.4, 0.8, 1.0, 0.5, 0.7, 0.4];

    return (
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 relative">
        {/* Hidden video elements so browser native WebRTC tracks keep playing through speakers */}
        <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
        <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />

        {/* Left Column: Voice Call Centerpiece (Avatar, Speaking Ripples, Audio Waveform, Call Status, Controls) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 p-4 sm:p-6 shadow-xl relative overflow-hidden">
          {/* Top Info Bar inside Voice Card */}
          <div className="flex items-center justify-between pb-3 border-b border-orange-100 dark:border-white/10 shrink-0">
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
          <div className="my-auto py-6 flex flex-col items-center justify-center text-center">
            {/* Concentric Speaking Ripple Rings */}
            <div className="relative flex items-center justify-center mb-5">
              {(remoteAudio.isSpeaking || isPartnerSpeaking) && (
                <>
                  <span className="absolute -inset-4 rounded-full bg-emerald-400/20 animate-ping" />
                  <span className="absolute -inset-8 rounded-full bg-emerald-500/10 animate-pulse" />
                </>
              )}

              {room.isAI ? (
                <img
                  src={room.aiAvatar || '/ai-portraits/hero_mia_v1.jpg'}
                  alt={room.partnerName || 'AI Partner'}
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 transition-all duration-300 relative z-10 shadow-2xl ${
                    remoteAudio.isSpeaking || isPartnerSpeaking
                      ? 'border-emerald-500 ring-8 ring-emerald-500/25 scale-105 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                      : 'border-orange-300 dark:border-white/20'
                  }`}
                />
              ) : (
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#EC5E27] to-[#FF5500] flex items-center justify-center text-white font-black text-3xl sm:text-4xl border-4 transition-all duration-300 relative z-10 shadow-2xl ${
                    remoteAudio.isSpeaking || isPartnerSpeaking
                      ? 'border-emerald-500 ring-8 ring-emerald-500/25 scale-105 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                      : 'border-orange-300 dark:border-white/20'
                  }`}
                >
                  {room.partnerProfession ? room.partnerProfession[0].toUpperCase() : 'P'}
                </div>
              )}

              {/* Status Dot */}
              <span className="absolute bottom-1 right-2 z-20 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-white dark:border-black" />
              </span>
            </div>

            {/* Partner Info */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                  {room.isAI ? (room.partnerName || 'AI Partner') : (room.partnerProfession || 'Stranger')}
                </h2>
                {room.partnerCountry && room.partnerCountry !== 'GLOBAL' && (
                  <CountryFlag code={room.partnerCountry} className="w-5 h-3.5 inline-block shrink-0 shadow-xs" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {room.isAI ? t('call.aiVoicePartner', 'Interactive AI Voice Partner') : (room.partnerProfession || 'Peer')}
              </p>
            </div>

            {/* Speaking Status Pill */}
            <div className="mt-3">
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
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5">
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#EC5E27]" />
                  <span>{t('call.establishingAudio', 'Establishing encrypted voice tunnel...')}</span>
                </span>
              )}
            </div>

            {/* Dynamic Animated Audio Equalizer Waveform */}
            <div className="flex items-center justify-center gap-1.5 h-10 mt-5">
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
          <div className="pt-3 border-t border-orange-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Left Controls: Mic Toggle, Speaker Output Toggle, CC */}
            <div className="flex items-center gap-2">
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
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
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
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
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
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
            <div className="flex items-center gap-2 ml-auto">
              {/* Mobile Chat Drawer Toggle (visible on small/medium screens) */}
              <button
                type="button"
                onClick={() => setIsAudioChatOpen(!isAudioChatOpen)}
                className={`lg:hidden px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isAudioChatOpen
                    ? 'bg-[#EC5E27] text-white shadow-md'
                    : 'bg-white/90 dark:bg-[#1A1A1A] text-slate-700 dark:text-neutral-200 border border-orange-200/80 dark:border-white/10'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t('call.chat', 'Chat')}</span>
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
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/90 dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-neutral-200 hover:text-rose-600 dark:hover:text-rose-400 border border-orange-200/80 dark:border-white/10 transition-colors cursor-pointer shadow-xs flex items-center gap-1"
              >
                <PhoneOff className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">{t('call.endCall', 'End')}</span>
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleStopOrNextClick}
                disabled={skipCooldownSeconds > 0}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0 shadow-md cursor-pointer ${
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
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 shadow-xl p-0 min-h-0 relative overflow-hidden">
          {renderChatContent(false)}
        </div>

        {/* Mobile Slide-Over Chat Drawer */}
        {isAudioChatOpen && (
          <div className="lg:hidden absolute inset-0 z-30 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl border border-orange-200/80 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            {renderChatContent(true)}
          </div>
        )}
      </div>
    );
  };

  // Dedicated Message Chat Mode Interface (Professional, distraction-free messaging view)
  const renderMessageChatMode = () => (
    <div className="flex-1 min-h-0 max-w-4xl w-full mx-auto flex flex-col rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 shadow-xl min-h-0 relative overflow-hidden">
      {/* Top Header for Message Chat Mode */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-orange-100 dark:border-white/10 flex items-center justify-between gap-2 shrink-0 bg-orange-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="relative shrink-0">
            {room.isAI ? (
              <img
                src={room.aiAvatar || '/ai-portraits/hero_mia_v1.jpg'}
                alt={room.partnerName || 'AI Partner'}
                className="w-10 h-10 rounded-xl object-cover border border-[#EC5E27]/40 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EC5E27] to-[#FF5500] flex items-center justify-center text-white font-black text-sm shadow-xs">
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
              <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white truncate">
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
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-[#1A1A1A] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-neutral-200 hover:text-rose-600 dark:hover:text-rose-400 border border-orange-200/80 dark:border-white/10 transition-colors cursor-pointer shadow-xs"
          >
            {t('call.endCall', 'End')}
          </button>

          <button
            type="button"
            onClick={handleStopOrNextClick}
            disabled={skipCooldownSeconds > 0}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap shrink-0 shadow-md cursor-pointer ${
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
      <div className="flex-1 min-h-0 flex flex-col">
        {renderChatContent(false, true)}
      </div>
    </div>
  );

  return (
    <div
      id="one-to-one-chat-view"
      className="w-full flex-1 h-full min-h-0 prism-grid-bg relative flex flex-col text-slate-900 dark:text-white overflow-hidden"
    >
      <div className="max-w-7xl w-full mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex-1 h-full min-h-0 flex flex-col overflow-hidden">
        {/* Top Header / Context & Affinity Bar */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-white/80 dark:bg-[#141414]/90 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 shadow-sm mb-1.5 sm:mb-2 flex items-center justify-between gap-2 shrink-0 text-slate-900 dark:text-white">
          {/* Left: Partner / Affinity Badge + Shared Interests */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
            {/* Interactive Affinity Score Button or AI Partner Badge */}
            {room.isAI ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-[#EC5E27] text-xs font-bold shrink-0">
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
                className="px-2 sm:px-2.5 py-1 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-[#EC5E27] dark:text-white text-xs font-bold flex items-center gap-1 hover:bg-[#EC5E27]/25 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
                <span>{Math.min(100, Math.max(20, room.score))}%</span>
                <span className="hidden sm:inline">Affinity</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[120px] sm:max-w-xs md:max-w-md shrink">
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
            {/* Mode Switcher when in video mode: Compact vs Expanded */}
            {sessionMode === 'video' && (
              <div className="inline-flex p-0.5 rounded-xl bg-orange-50/80 dark:bg-[#111111]/80 border border-orange-200/80 dark:border-white/10 shadow-inner text-xs font-semibold mr-1">
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
              className="px-2 sm:px-2.5 py-1 rounded-xl bg-orange-50/80 dark:bg-[#111111]/80 border border-orange-200/80 dark:border-white/10 text-[11px] sm:text-xs font-mono font-medium flex items-center gap-1 text-slate-700 dark:text-neutral-300 shadow-inner select-none shrink-0"
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
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold bg-white/80 dark:bg-[#1A1A1A]/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-300 border border-orange-200/80 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">{t('call.report', 'Report')}</span>
            </button>
          </div>
        </div>

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

        {/* Real-Time Voice Transcription & Language Bar (Video mode only; Audio mode has CC integrated in its toolbar) */}
        {sessionMode === 'video' && (
          <div className="mb-2 shrink-0">
            <LanguageSelector
              spokenLanguage={spokenLanguage}
              onSelectSpokenLanguage={handleSelectSpokenLanguage}
              subtitleLanguage={subtitleLanguage}
              onSelectSubtitleLanguage={handleSelectSubtitleLanguage}
              isVoiceTranscribeEnabled={isVoiceTranscribeEnabled}
              onToggleVoiceTranscribe={handleToggleVoiceTranscribe}
              isListening={isListening}
              speechError={speechError}
              compact={true}
            />
          </div>
        )}

        {/* Main Workspace Layout (Compact default or Expanded full-screen for Video, dedicated Audio Chat mode, dedicated Message Chat mode) */}
        <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
          {sessionMode === 'video' ? (
            layoutMode === 'compact' ? (
              /* COMPACT / SMALL-SCREEN LAYOUT (DEFAULT - Inspired by Reference 2 "VidCo") */
              <div className="flex-1 min-h-0 h-full flex flex-col rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 p-2 sm:p-2.5 shadow-xl relative overflow-hidden">
                {/* Dual video feeds take center stage */}
                {renderDualVideoFeeds()}

                {/* Slide-over floating chat drawer when opened */}
                {isCompactChatOpen && (
                  <div className="absolute inset-y-2 right-2 w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-[#141414]/95 backdrop-blur-2xl rounded-2xl border border-orange-200/80 dark:border-white/15 shadow-2xl z-30 flex flex-col overflow-hidden animate-fadeIn">
                    {renderChatContent(true)}
                  </div>
                )}

                {/* Sleek bottom glassmorphic toolbar */}
                {renderVideoToolbar('compact')}
              </div>
            ) : (
              /* EXPANDED / FULL-SCREEN LAYOUT (Inspired by Reference 1 "Omegle") */
              <div className="flex-1 min-h-0 h-full grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 overflow-hidden">
                {/* Left Column: Video feeds + bottom toolbar */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/80 dark:border-white/10 p-2 sm:p-2.5 shadow-xl min-h-0 h-full relative overflow-hidden">
                  {renderDualVideoFeeds()}
                  {renderVideoToolbar('expanded')}
                </div>

                {/* Right Column: Persistent Live Chat with Stop / Next button beside message input */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col rounded-2xl bg-white/85 dark:bg-[#141414]/95 backdrop-blur-xl border border-orange-200/70 dark:border-white/10 shadow-xl p-0 min-h-0 h-full relative overflow-hidden">
                  {renderChatContent(false)}
                </div>
              </div>
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
