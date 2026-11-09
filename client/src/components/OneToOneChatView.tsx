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

const AudioTranscribeModal = lazyNamed(() => import('./AudioTranscribeModal.tsx'), 'AudioTranscribeModal');
const AffinityBreakdownModal = lazyNamed(() => import('./AffinityBreakdownModal.tsx'), 'AffinityBreakdownModal');
const EphemeralCodePad = lazyNamed(() => import('./EphemeralCodePad.tsx'), 'EphemeralCodePad');
const SessionSummaryModal = lazyNamed(() => import('./SessionSummaryModal.tsx'), 'SessionSummaryModal');
const BlockAndReportModal = lazyNamed(() => import('./BlockAndReportModal.tsx'), 'BlockAndReportModal');
import { AudioWaveVideoFrame, AudioWaveAnimationMode } from './AudioWaveVideoFrame.tsx';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer.ts';
import {
  Send,
  UserX,
  Flag,
  VolumeX,
  Volume2,
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
  Languages,
  Code2,
  Lightbulb,
  ShieldAlert,
  Activity,
  Waves,
} from 'lucide-react';

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
  const [inputText, setInputText] = useState('');
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
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
  const [isCodePadOpen, setIsCodePadOpen] = useState(false);
  const [remotePadContent, setRemotePadContent] = useState('');
  const [remotePadLanguage, setRemotePadLanguage] = useState('javascript');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [formattedDuration, setFormattedDuration] = useState<string>('00:00');
  const sessionStartTimeRef = useRef<number>(Date.now());

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
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);

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
    isEnabled: isVoiceTranscribeEnabled && isMicOn && !partnerLeftReason && connectionState === 'connected',
    onTranscript: ({ text, language, isFinal }) => {
      haylooSocket.send({
        type: 'VOICE_TRANSCRIPT',
        text,
        language,
        isFinal,
        timestamp: Date.now(),
      });
    },
  });

  // Camera / Video Audio Wave Frame Animation States
  const [audioWaveMode, setAudioWaveMode] = useState<AudioWaveAnimationMode>('ripples');
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
    isActive: connectionState === 'connected' && !partnerLeftReason,
    simulatedSpeaking: isPartnerSpeaking || !!remoteSubtitle,
  });

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
      } else if (msg.type === 'PAD_UPDATE') {
        if (msg.content !== undefined) setRemotePadContent(msg.content);
        if (msg.language) setRemotePadLanguage(msg.language);
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

  // Sync code pad
  const handleSyncPad = (content: string, language: string) => {
    haylooSocket.send({
      type: 'PAD_UPDATE',
      content,
      language,
    });
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
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

  return (
    <div
      id="one-to-one-chat-view"
      className="w-full flex-1 prism-grid-bg relative flex flex-col min-h-0 text-white"
    >
      <div className="max-w-7xl w-full mx-auto px-2 sm:px-4 py-3 h-[calc(100dvh-4.5rem)] flex flex-col">
        {/* Top Header / Context & Affinity Bar */}
        <div className="p-3 rounded-2xl bg-[#141414]/90 backdrop-blur-xl border border-white/10 shadow-xl mb-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Left: You both like + Affinity Badge */}
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Interactive Affinity Score Button */}
            <button
              id="open-affinity-modal-btn"
              type="button"
              onClick={() => setIsAffinityModalOpen(true)}
              title="Click to view detailed affinity breakdown"
              className="px-2.5 py-1 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#EC5E27]/25 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
              <span>{Math.min(100, Math.max(20, room.score))}% Affinity</span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5 overflow-visible py-0.5 max-w-md sm:max-w-xl">
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
                <span className="text-xs text-neutral-400 italic">Discovery match</span>
              )}
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Subtle Session Duration Tracker */}
            <div
              id="session-duration-tracker"
              title={
                partnerLeftReason
                  ? `Conversation concluded after ${formattedDuration}`
                  : `Active session duration: ${formattedDuration}`
              }
              className="px-2.5 py-1.5 rounded-xl bg-[#111111]/80 border border-white/10 text-xs font-mono font-medium flex items-center gap-1.5 text-neutral-300 shadow-inner select-none shrink-0"
            >
              <Clock className="w-3.5 h-3.5 text-[#EC5E27] shrink-0" />
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
              <span className="tabular-nums tracking-wider text-neutral-200">{formattedDuration}</span>
            </div>

            {/* Ephemeral Code Pad Button */}
            <button
              id="header-toggle-codepad-btn"
              type="button"
              onClick={() => setIsCodePadOpen((prev) => !prev)}
              title="Open Ephemeral Code & Notes Scratchpad"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isCodePadOpen
                  ? 'bg-[#EC5E27]/20 text-white border-[#EC5E27]/50'
                  : 'bg-[#1A1A1A]/80 text-neutral-300 hover:text-white border-white/10 hover:bg-[#1E1E1E]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#EC5E27]" />
              <span className="hidden sm:inline">Code Pad</span>
            </button>

            {/* Mute Audio */}
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute notification sounds' : 'Mute notification sounds'}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1E1E1E] border border-white/10/50 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Report Button */}
            <button
              type="button"
              onClick={onOpenReport}
              title="Report user"
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-[#1E1E1E] border border-white/10/50 transition-colors cursor-pointer"
            >
              <Flag className="w-4 h-4" />
            </button>

            {/* Block User */}
            <button
              type="button"
              onClick={onOpenBlock}
              title="Block user"
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-[#1E1E1E] border border-white/10/50 transition-colors cursor-pointer"
            >
              <UserX className="w-4 h-4" />
            </button>

            {/* Prominent Block & Report Button */}
            <button
              id="block-and-report-btn"
              type="button"
              onClick={() => setIsBlockReportModalOpen(true)}
              title="Block and report this user immediately"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1A1A1A]/80 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Block & Report</span>
            </button>

            {/* End Conversation Button beside Next Button */}
            <button
              type="button"
              onClick={onEndConversation}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1A1A1A]/90 hover:bg-[#262626] text-neutral-200 hover:text-white border border-white/10 transition-colors whitespace-nowrap cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span>End Call</span>
            </button>

            {/* Stop / Really? / Next Person Button */}
            <button
              id="skip-next-peer-btn"
              type="button"
              onClick={handleStopOrNextClick}
              disabled={skipCooldownSeconds > 0}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm cursor-pointer ${
                skipCooldownSeconds > 0
                  ? 'bg-[#1A1A1A] text-neutral-500 border border-white/10 cursor-not-allowed'
                  : partnerLeftReason
                  ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-white font-black shadow-[0_0_15px_rgba(236,94,39,0.5)] animate-pulse'
                  : stopConfirmState === 'really'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400 font-bold'
                  : 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-black shadow-[0_0_12px_rgba(236,94,39,0.35)]'
              }`}
            >
              {skipCooldownSeconds > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Wait {skipCooldownSeconds}s</span>
                </>
              ) : partnerLeftReason ? (
                <>
                  <span>Next Person (Esc)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : stopConfirmState === 'really' ? (
                <>
                  <span>Really? (Esc)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <span>Next (Esc)</span>
              )}
            </button>
          </div>
        </div>

        {/* Media Alert Banner */}
        {mediaError && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2 mb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{mediaError}</span>
            </div>
            <button
              type="button"
              onClick={() => startLocalMedia(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[11px] font-bold hover:bg-amber-400 whitespace-nowrap"
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Real-Time Voice Transcription & Language Bar */}
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
          />
        </div>

        {/* Main Layout: Video Stream on Left + Text Chat on Right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
          {/* LEFT / VIDEO AREA */}
          <div
            className={`${
              sessionMode === 'messaging'
                ? 'hidden'
                : isVideoExpanded ? 'lg:col-span-12' : 'lg:col-span-7 xl:col-span-8'
            } flex flex-col gap-2 rounded-2xl bg-[#141414] backdrop-blur-xl border border-white/10 p-2.5 shadow-xl min-h-[260px] lg:min-h-0 relative overflow-hidden`}
          >
            {/* Dual Video Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 relative min-h-0">
              {/* STRANGER VIDEO WITH AUDIO WAVE RIPPLES */}
              <AudioWaveVideoFrame
                isSpeaking={remoteAudio.isSpeaking || isPartnerSpeaking || !!remoteSubtitle}
                audioLevel={remoteAudio.audioLevel}
                isActive={connectionState === 'connected' && !partnerLeftReason}
                themeColor="emerald"
                animationMode={audioWaveMode}
                label="Partner Speaking"
              >
                <div className="relative w-full h-full bg-black flex items-center justify-center min-h-[160px]">
                  {/* Stranger Label Badge */}
                  <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141414]/90 text-white text-[11px] font-semibold border border-white/10 backdrop-blur-sm">
                    <Radio className="w-3 h-3 text-[#10B981] animate-pulse" />
                    <span>{room.partnerProfession ? room.partnerProfession : 'Stranger'}</span>
                    {room.partnerCountry && room.partnerCountry !== 'GLOBAL' && (
                      <span className="flex items-center gap-1 text-neutral-300">
                        <span>•</span>
                        <CountryFlag code={room.partnerCountry} className="w-3.5 h-2.5" />
                        <span>{room.partnerCountry}</span>
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2.5 right-2.5 z-20">
                    {partnerLeftReason ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        Disconnected
                      </span>
                    ) : connectionState === 'connected' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Live Stream</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-[#1A1A1A] text-neutral-300 text-[10px] font-bold animate-pulse">
                        Negotiating P2P...
                      </span>
                    )}
                  </div>

                  {/* Video Element */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isRemoteStreamBlurred ? 'blur-2xl scale-105' : ''
                    } ${
                      isRemoteVideoActive && !partnerLeftReason ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* On-Device ML Protective Blur Overlay */}
                  {isRemoteStreamBlurred && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-2xl text-center animate-fadeIn">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        Stream Blurred by On-Device Safety ML
                      </h4>
                      <p className="text-xs text-neutral-300 max-w-xs mb-4 leading-relaxed">
                        Inappropriate visual stream flagged in volatile memory. Under our strict Zero-Storage policy, zero frames are saved or recorded.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRemoteStreamBlurred(false)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
                        >
                          Unblur Stream
                        </button>
                        <button
                          type="button"
                          onClick={onNextPerson}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-xs font-bold text-white shadow-md transition-colors cursor-pointer"
                        >
                          Skip & Next Peer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Floating Live Subtitles Overlay */}
                  <LiveSubtitleOverlay
                    subtitle={remoteSubtitle}
                    isVisible={isCaptionsVisible && isVoiceTranscribeEnabled}
                    onDismiss={() => setRemoteSubtitle(null)}
                  />

                  {/* Placeholder when partner camera is off */}
                  {(!isRemoteVideoActive || partnerLeftReason) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#111111]/95">
                      <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center text-neutral-400 mb-2 shadow-inner">
                        <User className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {partnerLeftReason
                          ? 'Partner has disconnected'
                          : connectionState === 'connected'
                          ? 'Partner camera is off'
                          : 'Establishing secure tunnel...'}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {partnerLeftReason
                          ? 'Press "Next" or Esc to find someone new.'
                          : 'Audio, subtitles, and instant chat are active.'}
                      </p>
                    </div>
                  )}
                </div>
              </AudioWaveVideoFrame>

              {/* LOCAL SELF VIDEO (You) WITH AUDIO WAVE RIPPLES */}
              <AudioWaveVideoFrame
                isSpeaking={localAudio.isSpeaking || (isVoiceTranscribeEnabled && isListening && !!interimText)}
                audioLevel={localAudio.audioLevel}
                isActive={isMicOn}
                themeColor="coral"
                animationMode={audioWaveMode}
                label="You Speaking"
              >
                <div className="relative w-full h-full bg-black flex items-center justify-center min-h-[160px]">
                  <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141414]/90 text-white text-[11px] font-semibold border border-white/10 backdrop-blur-sm max-w-[85%] truncate">
                    <span className="w-2 h-2 rounded-full bg-[#EC5E27] shrink-0" />
                    <span>You</span>
                    {userProfileData && (userProfileData.name || userProfileData.countryFlag || userProfileData.country || userProfileData.countryCode || userProfileData.age || userProfileData.professionLevel) && (
                      <>
                        <span className="text-neutral-500">•</span>
                        {(userProfileData.countryCode || userProfileData.country) && (
                          <CountryFlag
                            code={userProfileData.countryCode || userProfileData.country || ''}
                            className="w-3.5 h-2.5 rounded-xs shrink-0 inline-block"
                          />
                        )}
                        {userProfileData.name && <span className="truncate">{userProfileData.name}</span>}
                        {userProfileData.age && <span className="text-neutral-400">({userProfileData.age})</span>}
                        {userProfileData.professionLevel && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#EC5E27]/25 text-[#EC5E27] border border-[#EC5E27]/40 shrink-0">
                            {userProfileData.professionLevel}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${
                      isCameraOn ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* Local Real-time Speech Transcription */}
                  {isVoiceTranscribeEnabled && isListening && interimText && (
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 px-2.5 py-1 rounded-lg bg-[#141414]/90 text-[11px] text-white flex items-center gap-1.5 border border-white/10 shadow-lg truncate">
                      <Mic className="w-3 h-3 text-[#EC5E27] animate-pulse shrink-0" />
                      <span className="font-semibold text-white shrink-0">You:</span>
                      <span className="truncate">{interimText}</span>
                    </div>
                  )}

                  {/* Placeholder when local camera is off */}
                  {!isCameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black">
                      <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center text-neutral-400 mb-2 shadow-inner">
                        <VideoOff className="w-8 h-8 text-[#EC5E27]" />
                      </div>
                      <p className="text-xs font-semibold text-white">Camera is off</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Click "Camera On" below to share video.</p>
                    </div>
                  )}
                </div>
              </AudioWaveVideoFrame>
            </div>

            {/* Video Control Toolbar */}
            <div className="p-2 rounded-xl bg-[#111111]/60 border border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Camera Toggle */}
                {sessionMode === 'video' && <button
                  type="button"
                  onClick={toggleCamera}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isCameraOn
                      ? 'bg-[#EC5E27] text-white font-bold hover:bg-[#D94E1A]'
                      : 'bg-[#1A1A1A] hover:bg-[#262626] text-neutral-300 border border-white/10'
                  }`}
                >
                  {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  <span>{isCameraOn ? 'Camera On' : 'Camera Off'}</span>
                </button>}

                {/* Mic Toggle */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isMicOn
                      ? 'bg-[#1A1A1A] hover:bg-[#262626] text-neutral-300 border border-white/10'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  }`}
                >
                  {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{isMicOn ? 'Mute' : 'Unmuted'}</span>
                </button>

                {/* Captions CC Toggle */}
                <button
                  type="button"
                  onClick={() => setIsCaptionsVisible(!isCaptionsVisible)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                    isCaptionsVisible && isVoiceTranscribeEnabled
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-[#1A1A1A] text-neutral-400 border-white/10'
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>{isCaptionsVisible ? 'Captions ON' : 'Captions OFF'}</span>
                </button>

                {/* AI Mic Transcribe Button */}
                <button
                  type="button"
                  onClick={() => setIsAudioModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] border border-white/10 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
                  <span>AI Transcribe</span>
                </button>

                {/* Audio Wave Frame Animation Mode Selector */}
                <button
                  type="button"
                  onClick={() => {
                    setAudioWaveMode((prev) => {
                      if (prev === 'ripples') return 'equalizer';
                      if (prev === 'equalizer') return 'halo';
                      if (prev === 'halo') return 'off';
                      return 'ripples';
                    });
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                    audioWaveMode !== 'off'
                      ? 'bg-[#EC5E27]/20 text-white border-[#EC5E27]/50 font-bold'
                      : 'bg-[#1A1A1A] text-neutral-400 border-white/10'
                  }`}
                  title="Click to cycle frame animation: Sound Wave Ripples → Equalizer Bars → Aura Halo → Off"
                >
                  <Activity className={`w-3.5 h-3.5 ${audioWaveMode !== 'off' ? 'text-[#EC5E27] animate-pulse' : 'text-neutral-400'}`} />
                  <span>
                    Wave Frame: {audioWaveMode === 'ripples' ? 'Ripples' : audioWaveMode === 'equalizer' ? 'Equalizer' : audioWaveMode === 'halo' ? 'Aura' : 'Off'}
                  </span>
                </button>

                {sessionMode === 'video' && hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={flipCamera}
                    title="Switch camera"
                    className="p-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] border border-white/10 text-neutral-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Split / Focus Toggle */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] border border-white/10 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors hidden sm:flex whitespace-nowrap cursor-pointer"
                >
                  {isVideoExpanded ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Split View</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Focus Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT / TEXT CHAT AREA */}
          <div
            className={`${
              sessionMode === 'messaging' ? 'lg:col-span-12 xl:col-span-12' : isVideoExpanded ? 'hidden' : 'lg:col-span-5 xl:col-span-4'
            } flex flex-col rounded-2xl bg-[#141414] backdrop-blur-xl border border-white/10 shadow-xl p-3 min-h-[300px] lg:min-h-0 relative overflow-hidden`}
          >
            {/* Chat Stream Header */}
            <div className="pb-2 mb-2 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-[#EC5E27]">
                  Live Conversation
                </span>
                <span className="text-[10px] text-neutral-400">
                  {messages.length} msg{messages.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="toggle-hover-time-btn"
                  onClick={toggleShowTimeOnHover}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border cursor-pointer ${
                    showTimeOnHover
                      ? 'bg-[#1A1A1A] text-white border-[#EC5E27]/40'
                      : 'bg-[#141414] text-neutral-400 border-white/10 hover:border-white/10'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">Time</span>
                </button>

                <ChatTranslationToggle
                  isAutoTranslateEnabled={isAutoTranslateEnabled}
                  onToggleAutoTranslate={toggleAutoTranslate}
                  targetLanguage={targetLanguage}
                  onSelectTargetLanguage={setTargetLanguage}
                  idPrefix="1on1-chat-trans"
                />
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-2 text-sm relative"
            >
              <div className="p-2.5 rounded-xl bg-[#111111]/60 border border-white/10 text-xs text-neutral-300 text-center space-y-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                <p className="font-semibold text-white">Zero-Persistence Room Established</p>
                <p className="text-[10px] text-neutral-400">
                  Direct encrypted tunnel. No chat logs or transcripts are saved.
                </p>
              </div>

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
              {isPartnerTyping && !partnerLeftReason && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-white/10 w-fit text-xs text-white animate-pulse">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27] animate-ping"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27]"></span>
                  </span>
                  <span>Partner is typing...</span>
                </div>
              )}

              {/* Partner Left Notice */}
              {partnerLeftReason && (
                <div className="p-3.5 rounded-xl bg-[#111111]/80 border border-white/10 text-center space-y-2 my-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Conversation Ended</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {partnerLeftReason === 'skipped' && 'Partner moved to the next conversation.'}
                      {partnerLeftReason === 'ended' && 'Partner left the session.'}
                      {partnerLeftReason === 'disconnected' && 'Partner disconnected.'}
                      {partnerLeftReason === 'reported' && 'Session separated following a report.'}
                      {partnerLeftReason === 'blocked' && 'User blocked.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onNextPerson}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-bold text-xs flex items-center justify-center gap-1.5 mx-auto shadow-md cursor-pointer"
                  >
                    <span>Find Next Person (Esc)</span>
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
                        ? `${newMessagesBelow} new message${newMessagesBelow > 1 ? 's' : ''}`
                        : 'Scroll to bottom'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Icebreaker Prompt Dropdown Popover */}
            {showIcebreakerDropdown && (
              <div className="p-2.5 mb-2 rounded-2xl bg-[#111111]/95 border border-[#EC5E27]/30 shadow-2xl text-xs">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[11px] font-semibold text-[#EC5E27]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Smart Icebreakers
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIcebreakerDropdown(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                {isIcebreakerLoading ? (
                  <div className="py-3 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-[#EC5E27]" />
                    Generating context-aware prompts...
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
                        className="w-full text-left p-2 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] text-neutral-200 hover:text-white border border-white/10 hover:border-[#EC5E27]/30 transition-colors text-xs cursor-pointer flex items-start gap-2"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text Input Bar with Icebreaker & Voice */}
            <form onSubmit={handleSend} className="relative shrink-0 pt-1">
              {/* In-Flight Zero-Storage Safety Warning Banner */}
              {inFlightWarning && (
                <div className="mb-2 p-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-xs text-red-200 flex items-center justify-between gap-2 animate-fadeIn shrink-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{inFlightWarning}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInFlightWarning(null)}
                    className="p-1 text-neutral-400 hover:text-white rounded-md cursor-pointer"
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
                  className="px-2.5 py-1 rounded-lg bg-orange-950/40 hover:bg-orange-900/60 border border-[#EC5E27]/30 text-[11px] font-semibold text-orange-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#EC5E27]" />
                  <span>Suggest Icebreaker</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <textarea
                  ref={chatInputRef}
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={!!partnerLeftReason}
                  placeholder={partnerLeftReason ? 'Conversation ended.' : 'Type a message... (Press Enter)'}
                  maxLength={1000}
                  className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-black border border-white/10 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27] resize-none disabled:opacity-50"
                />

                <div className="absolute right-2 flex items-center gap-1">
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
                    disabled={!inputText.trim() || !!partnerLeftReason}
                    className={`p-2 rounded-lg font-bold transition-all ${
                      inputText.trim() && !partnerLeftReason
                        ? 'bg-[#EC5E27] text-white hover:bg-[#D94E1A] shadow-md cursor-pointer'
                        : 'bg-[#1A1A1A] text-neutral-500 cursor-not-allowed'
                    }`}
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Modals wrapped in Suspense for zero idle bundle weight */}
        <React.Suspense fallback={null}>
          {/* Audio Transcription Modal */}
          <AudioTranscribeModal
            isOpen={isAudioModalOpen}
            onClose={() => setIsAudioModalOpen(false)}
            onInsertText={(text) => {
              setInputText((prev) => (prev ? `${prev} ${text}` : text));
            }}
            defaultLanguage={spokenLanguage}
          />

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

          {/* Ephemeral Synchronized Code & Notes Pad */}
          <EphemeralCodePad
            isOpen={isCodePadOpen}
            onClose={() => setIsCodePadOpen(false)}
            onSyncPad={handleSyncPad}
            remoteContent={remotePadContent}
            remoteLanguage={remotePadLanguage}
          />

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
