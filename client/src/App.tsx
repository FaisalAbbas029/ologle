/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from './services/userService.ts';
import { haylooSocket } from './services/haylooSocket.ts';
import { getVisitorId, getBlockedStrangers, addBlockedStranger } from './services/visitorService.ts';
import {
  AppView,
  ChatMessage,
  Active1on1Room,
  ActiveCommunityRoom,
  ActiveClassRoom,
  SafetyToast,
  RestrictionState,
  CommunityExploreItem,
  ClassExploreItem,
  ServerMessage,
} from './types/index.ts';
import { validateProfession } from './data/constants.ts';
import { Navbar } from './components/Navbar.tsx';
import { SafetyWarningBanner } from './components/SafetyWarningBanner.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { ConnectionBanner } from './components/ConnectionBanner.tsx';
import { ScrollProgressBar } from './components/ScrollProgressBar.tsx';
import { ScrollToTopButton } from './components/ScrollToTopButton.tsx';
import { CookieConsentBanner } from './components/CookieConsentBanner.tsx';
import { ConnectionStatus } from './services/haylooSocket.ts';
import { soundService } from './services/soundService.ts';

import { LandingView } from './components/LandingView.tsx';
import { SiteFooter } from './components/SiteFooter.tsx';

// Helper for type-safe named export lazy-loading
const lazyNamed = <T extends Record<string, any>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K
) => React.lazy(() => loader().then((m) => ({ default: m[key] })));

// Lazy-loaded route views (non-critical routes deferred)
const OnboardingView = lazyNamed(() => import('./components/OnboardingView.tsx'), 'OnboardingView');
const SmartMatchView = lazyNamed(() => import('./components/SmartMatchView.tsx'), 'SmartMatchView');
import { ProfileModal } from './components/ProfileModal.tsx';
const ProfileView = lazyNamed(() => import('./components/ProfileView.tsx'), 'ProfileView');
const SettingsView = lazyNamed(() => import('./components/SettingsView.tsx'), 'SettingsView');
const ProfessionSelectView = lazyNamed(() => import('./components/ProfessionSelectView.tsx'), 'ProfessionSelectView');
const InterestSelectView = lazyNamed(() => import('./components/InterestSelectView.tsx'), 'InterestSelectView');
const ModeSelectView = lazyNamed(() => import('./components/ModeSelectView.tsx'), 'ModeSelectView');
const MatchingView = lazyNamed(() => import('./components/MatchingView.tsx'), 'MatchingView');
const OneToOneChatView = lazyNamed(() => import('./components/OneToOneChatView.tsx'), 'OneToOneChatView');
const RestrictionView = lazyNamed(() => import('./components/RestrictionView.tsx'), 'RestrictionView');
const ConnectionLostView = lazyNamed(() => import('./components/ConnectionLostView.tsx'), 'ConnectionLostView');
const NoMatchView = lazyNamed(() => import('./components/NoMatchView.tsx'), 'NoMatchView');
const CommunityRulesView = lazyNamed(() => import('./components/CommunityRulesView.tsx'), 'CommunityRulesView');
const PrivacyView = lazyNamed(() => import('./components/PrivacyView.tsx'), 'PrivacyView');
const TermsView = lazyNamed(() => import('./components/TermsView.tsx'), 'TermsView');
const NotFoundView = lazyNamed(() => import('./components/NotFoundView.tsx'), 'NotFoundView');
const AdminModerationView = lazyNamed(() => import('./components/AdminModerationView.tsx'), 'AdminModerationView');

// Lazy-loaded heavy modals
const SettingsDrawer = lazyNamed(() => import('./components/SettingsDrawer.tsx'), 'SettingsDrawer');
const PrivacyInspectorModal = lazyNamed(() => import('./components/PrivacyInspectorModal.tsx'), 'PrivacyInspectorModal');
const FullSiteSearchModal = lazyNamed(() => import('./components/FullSiteSearchModal.tsx'), 'FullSiteSearchModal');
const ConfirmationModal = lazyNamed(() => import('./components/ConfirmationModal.tsx'), 'ConfirmationModal');
const ReportModal = lazyNamed(() => import('./components/ReportModal.tsx'), 'ReportModal');
const BlockModal = lazyNamed(() => import('./components/BlockModal.tsx'), 'BlockModal');

// Lightweight view suspense fallback
const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-neutral-400">
    <div className="w-8 h-8 border-2 border-[#EC5E27]/30 border-t-[#EC5E27] rounded-full animate-spin mb-4" />
    <span className="text-xs uppercase tracking-widest font-mono text-neutral-400">Loading Ologle Signal...</span>
  </div>
);

export default function App() {
  // Unique persistent anonymous visitor ID in localStorage
  const visitorId = useRef<string>(getVisitorId());

  // Theme state (Midnight Neon vs Daylight Porcelain)
  const { theme, toggleTheme } = useTheme();

  // Socket Connection Status tracking
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [retrySecondsLeft, setRetrySecondsLeft] = useState<number>(0);

  // Settings & Privacy Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPrivacyInspectorOpen, setIsPrivacyInspectorOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState<boolean>(false);

  // Navigation & View state (URL-aware on page load and refresh)
  const [currentView, setCurrentView] = useState<AppView>(() => {
    return 'landing';
  });
  const [previousView, setPreviousView] = useState<AppView>('landing');

  // Dynamic Browser Tab Title Synchronization
  useEffect(() => {
    const titleMap: Record<AppView, string> = {
      onboarding: 'Onboarding Setup — Ologle',
      dashboard: 'Member Dashboard — Ologle',
      match: 'Smart Matchmaking — Ologle',
      conversation: 'Live Video Room — Ologle',
      voice_session: 'Live Voice Session — Ologle',
      profile: 'Professional Profile — Ologle',
      settings: 'Privacy & Settings — Ologle',
      admin: 'Trust & Safety Moderation — Ologle',
      landing: 'Ologle — Peer Conversations & Meet New People',
      history: 'History — Ologle',
      messages: 'Messages — Ologle',
      profession_select: 'Select Profession — Ologle',
      interest_select: 'Select Shared Interests — Ologle',
      mode_select: 'Search Scope & 1:1 Match — Ologle',
      matching: 'Matching Intellectual Peers — Ologle',
      '1on1_chat': '1:1 Text Messaging — Ologle',
      community_rules: 'Community Rules & Safety — Ologle',
      privacy_page: 'Privacy Policy & Zero Persistence — Ologle',
      terms_page: 'Terms of Service — Ologle',
      privacy_info: 'Privacy Specification — Ologle',
      no_match: 'No Active Peers Found — Ologle',
      connection_lost: 'Connection Interrupted — Ologle',
      restriction: 'Access Restriction — Ologle',
      not_found: 'Signal Not Found (404) — Ologle',
    };
    document.title = titleMap[currentView] || 'Ologle — Privacy-First Peer Conversations';
  }, [currentView]);

  // Global Keyboard Shortcut for Full-Site Search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Firebase Auth & Firestore Persistence State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isHumanVerified, setIsHumanVerified] = useState<boolean>(false);

  // User input criteria
  const [sessionId, setSessionId] = useState<string>('');
  const [profession, setProfession] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('GLOBAL');
  const [incomingSignal, setIncomingSignal] = useState<{ signal: any; id: number } | null>(null);

  // Active Session Rooms
  const [active1on1, setActive1on1] = useState<Active1on1Room | null>(null);

  // Message streams
  const [chat1on1Messages, setChat1on1Messages] = useState<ChatMessage[]>([]);

  // Partner status & rate limiting
  const [partnerLeftReason, setPartnerLeftReason] = useState<string | null>(null);
  const [skipCooldownSeconds, setSkipCooldownSeconds] = useState(0);

  // Modals & Safety
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toasts, setToasts] = useState<SafetyToast[]>([]);
  const [restriction, setRestriction] = useState<RestrictionState | null>(null);

  // Hayloo Full-Stack Preview State
  const [haylooProfile, setHaylooProfile] = useState({
    displayName: 'Guest',
    headline: '',
    professionId: '',
    experience: '',
    languages: [] as string[],
    skills: [] as string[],
    bio: '',
    isPublic: false,
    allowConnections: false,
  });
  const [blockedCandidateIds, setBlockedCandidateIds] = useState<string[]>(() => getBlockedStrangers());
  // Session Mode Source of Truth ('messaging' | 'voice' | 'video')
  const [sessionMode, setSessionMode] = useState<'video' | 'voice' | 'messaging'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/messages') return 'messaging';
      if (p === '/voice-call') return 'voice';
      if (p === '/video-call') return 'video';
      try {
        const s = localStorage.getItem('hayloo_session_mode');
        if (s === 'voice' || s === 'AUDIO') return 'voice';
        if (s === 'messaging' || s === 'TEXT') return 'messaging';
        if (s === 'video' || s === 'VIDEO') return 'video';
      } catch {}
    }
    return 'video';
  });

  const sessionModeRef = useRef(sessionMode);
  useEffect(() => {
    sessionModeRef.current = sessionMode;
  }, [sessionMode]);

  // Keep sessionMode in sync with URL pathname or saved preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/messages') {
        setSessionMode('messaging');
        return;
      }
      if (p === '/voice-call') {
        setSessionMode('voice');
        return;
      }
      if (p === '/video-call') {
        setSessionMode('video');
        return;
      }
    }
    const s = localStorage.getItem('hayloo_session_mode');
    if (s === 'voice' || s === 'AUDIO') {
      setSessionMode('voice');
    } else if (s === 'messaging' || s === 'TEXT') {
      setSessionMode('messaging');
    } else if (s === 'video' || s === 'VIDEO') {
      setSessionMode('video');
    }
  }, []);

  // Backwards compatibility alias for components expecting 'VIDEO' | 'AUDIO' | 'TEXT'
  const activeSessionMode: 'VIDEO' | 'AUDIO' | 'TEXT' =
    sessionMode === 'messaging' ? 'TEXT' : sessionMode === 'voice' ? 'AUDIO' : 'VIDEO';
  const setActiveSessionMode = (m: string) => {
    if (m === 'TEXT' || m === 'messaging') setSessionMode('messaging');
    else if (m === 'AUDIO' || m === 'voice') setSessionMode('voice');
    else setSessionMode('video');
  };

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Matching queue timer for fallback suggestions
  const matchTimeoutRef = useRef<any>(null);

  // Synthesized notification sound for incoming message/match
  const playChime = useCallback((freq = 587.33) => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, [isMuted]);

  const addToast = useCallback((type: 'warning' | 'blocked' | 'info', message: string) => {
    const id = `t_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  // Listen to Firebase Auth state after initial load or on first user interaction
  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let didInit = false;

    const initAuth = async () => {
      if (didInit) return;
      didInit = true;
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        const { auth } = await import('./services/firebase.ts');
        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);
          if (user) {
            setIsHumanVerified(true);
            try {
              const { fetchUserProfile } = await import('./services/userService.ts');
              const profile = await fetchUserProfile(user.uid);
              if (profile) {
                setUserProfile(profile);
                if (profile.profession && !profession) {
                  setProfession(profile.profession);
                }
                if (profile.interests && profile.interests.length > 0 && interests.length === 0) {
                  setInterests(profile.interests);
                }
              }
            } catch (err) {
              console.warn('Failed to load user profile:', err);
            }
          } else {
            setUserProfile(null);
          }
        });
      } catch (err) {
        console.warn('Failed to initialize Firebase Auth:', err);
      }
    };

    const handleGesture = () => {
      initAuth();
      cleanupListeners();
    };

    const cleanupListeners = () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('scroll', handleGesture);
    };

    window.addEventListener('pointerdown', handleGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleGesture, { once: true, passive: true });
    window.addEventListener('scroll', handleGesture, { once: true, passive: true });

    // Fallback timer well after initial paint metrics
    const authTimer = setTimeout(initAuth, 8000);

    return () => {
      cleanupListeners();
      clearTimeout(authTimer);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [profession, interests.length]);

  // Connect to WebSocket after initial paint or on interaction
  useEffect(() => {
    let socketStarted = false;
    const startSocket = () => {
      if (socketStarted) return;
      socketStarted = true;
      haylooSocket.connect();
    };

    const handleInteraction = () => {
      startSocket();
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('pointerdown', handleInteraction, { once: true, passive: true });
    window.addEventListener('keydown', handleInteraction, { once: true, passive: true });

    // Start socket after 3.5s if no user interaction
    const socketTimer = setTimeout(startSocket, 3500);

    const unsubscribeStatus = haylooSocket.subscribeStatus((status, secs) => {
      setConnectionStatus(status);
      setRetrySecondsLeft(secs);
    });

    const unsubscribe = haylooSocket.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case 'SESSION_REGISTERED':
          setSessionId(msg.sessionId);
          haylooSocket.send({
            type: 'REGISTER_SESSION',
            visitorId: visitorId.current,
            blockedStrangers: getBlockedStrangers(),
            profession: profession.trim(),
            interests,
          });
          haylooSocket.send({ type: 'GET_EXPLORE_DATA' });
          break;

        case 'MATCHING_STARTED':
          setCurrentView('matching');
          setPartnerLeftReason(null);
          setIncomingSignal(null);
          break;

        case 'MATCHING_CANCELED':
          if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
          setIncomingSignal(null);
          setCurrentView('mode_select');
          break;

        case 'MATCH_FOUND':
          if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
          setIncomingSignal(null);
          soundService.playMatchFound();
          setActive1on1({
            roomId: msg.roomId,
            sharedInterests: msg.sharedInterests,
            sharedTopics: msg.sharedTopics,
            score: msg.score,
            partnerProfession: msg.partnerProfession,
            partnerCountry: msg.partnerCountry,
            partnerVisitorId: msg.partnerVisitorId,
            breakdown: msg.breakdown,
          });
          setChat1on1Messages([]);
          setPartnerLeftReason(null);
          setCurrentView(
            sessionModeRef.current === 'voice'
              ? 'voice_session'
              : sessionModeRef.current === 'messaging'
              ? '1on1_chat'
              : 'conversation'
          );
          if (typeof window !== 'undefined') {
            const path = sessionModeRef.current === 'voice'
              ? '/voice-call'
              : sessionModeRef.current === 'messaging'
              ? '/messages'
              : '/video-call';
            if (window.location.pathname !== path) window.history.pushState({}, '', path);
          }
          break;

        case 'PARTNER_LEFT':
          setPartnerLeftReason(msg.reason);
          setIncomingSignal(null);
          playChime(392.0); // lower tone for exit
          break;

        case 'WEBRTC_SIGNAL':
          setIncomingSignal({ signal: msg.signal, id: Date.now() });
          break;

        case 'RECEIVE_1ON1_MESSAGE':
          setChat1on1Messages((prev) => [
            ...prev,
            {
              id: msg.id,
              text: msg.text,
              sender: msg.sender,
              timestamp: msg.timestamp,
              isRead: false,
            },
          ]);
          if (msg.sender === 'peer') {
            playChime(523.25);
          }
          break;

        case 'MESSAGE_READ':
          setChat1on1Messages((prev) =>
            prev.map((m) =>
              m.id === msg.messageId
                ? { ...m, isRead: true, readAt: msg.readAt }
                : m
            )
          );
          break;

        case 'MESSAGE_BLOCKED':
          addToast('blocked', msg.reason);
          playChime(220.0);
          break;

        case 'SAFETY_WARNING':
          addToast('warning', msg.message);
          break;

        case 'RATE_LIMIT_COOLDOWN':
          addToast('info', `${msg.reason} (${msg.cooldownSeconds}s cooldown)`);
          setSkipCooldownSeconds(msg.cooldownSeconds);
          break;

        case 'TEMPORARY_RESTRICTION':
          setRestriction({
            restrictedUntil: msg.restrictedUntil,
            reason: msg.reason,
          });
          setCurrentView('restriction');
          break;


        case 'ERROR':
          addToast('warning', msg.message);
          if (currentView === 'matching') setCurrentView('mode_select');
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addToast, playChime, currentView]);

  // Handle skip cooldown countdown timer
  useEffect(() => {
    if (skipCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setSkipCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [skipCooldownSeconds]);

  // URL and Path-based Navigation System
  // URL and Path-based Navigation System
  const navigate = (path: string) => {
    if (path === '/messages') {
      setSessionMode('messaging');
      try {
        localStorage.setItem('hayloo_session_mode', 'messaging');
      } catch {}
      setCurrentView('1on1_chat');
      if (typeof window !== 'undefined' && window.location.pathname !== '/messages') {
        window.history.pushState({}, '', '/messages');
      }
    } else if (path === '/voice-call') {
      setSessionMode('voice');
      try {
        localStorage.setItem('hayloo_session_mode', 'voice');
      } catch {}
      setCurrentView('voice_session');
      if (typeof window !== 'undefined' && window.location.pathname !== '/voice-call') {
        window.history.pushState({}, '', '/voice-call');
      }
    } else if (path === '/video-call') {
      setSessionMode('video');
      try {
        localStorage.setItem('hayloo_session_mode', 'video');
      } catch {}
      setCurrentView('conversation');
      if (typeof window !== 'undefined' && window.location.pathname !== '/video-call') {
        window.history.pushState({}, '', '/video-call');
      }
    } else if (path === '/' || path === '/landing') {
      setCurrentView('landing');
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    } else if (path === '/profile') {
      setIsProfileModalOpen(true);
    } else {
      setPreviousView(currentView);
      setCurrentView(path as AppView);
    }
  };

  // Browser Back & Forward URL synchronization
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/messages') {
        setSessionMode('messaging');
        try {
          localStorage.setItem('hayloo_session_mode', 'messaging');
        } catch {}
        setCurrentView('1on1_chat');
      } else if (path === '/voice-call') {
        setSessionMode('voice');
        try {
          localStorage.setItem('hayloo_session_mode', 'voice');
        } catch {}
        setCurrentView('voice_session');
      } else if (path === '/video-call') {
        setSessionMode('video');
        try {
          localStorage.setItem('hayloo_session_mode', 'video');
        } catch {}
        setCurrentView('conversation');
      } else if (path === '/' || path === '/landing') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // View navigation helper (maintains backwards compatibility)
  const navigateTo = (view: AppView) => {
    if (view === 'profile') {
      setIsProfileModalOpen(true);
      return;
    }
    if (view === '1on1_chat') {
      navigate('/messages');
      return;
    }
    if (view === 'voice_session') {
      navigate('/voice-call');
      return;
    }
    if (view === 'conversation') {
      navigate('/video-call');
      return;
    }
    if (view === 'landing') {
      navigate('/');
      return;
    }
    setPreviousView(currentView);
    setCurrentView(view);
  };

  function startSession() {
    switch (sessionMode) {
      case "messaging":
        navigate("/messages");
        break;
      case "voice":
        navigate("/voice-call");
        break;
      case "video":
        navigate("/video-call");
        break;
    }
  }

  // Mode selection from Filters (updates criteria without navigating away from landing page)
  const handleSelectSessionMode = (targetMode: string) => {
    const normalized: 'video' | 'voice' | 'messaging' =
      targetMode === 'voice' || targetMode === 'AUDIO'
        ? 'voice'
        : targetMode === 'messaging' || targetMode === 'TEXT'
        ? 'messaging'
        : 'video';
    setActiveSessionMode(normalized);
    setSessionMode(normalized);
    try {
      localStorage.setItem('hayloo_session_mode', normalized);
    } catch {}
    // Do NOT navigate! The user is configuring their filters on the home/landing page.
  };

  // Mode switching during an active session
  const handleSwitchMode = (targetMode: string) => {
    const normalized: 'video' | 'voice' | 'messaging' =
      targetMode === 'voice' || targetMode === 'AUDIO'
        ? 'voice'
        : targetMode === 'messaging' || targetMode === 'TEXT'
        ? 'messaging'
        : 'video';
    setActiveSessionMode(normalized);
    setSessionMode(normalized);
    try {
      localStorage.setItem('hayloo_session_mode', normalized);
    } catch {}
    if (normalized === 'voice') {
      navigate('/voice-call');
    } else if (normalized === 'messaging') {
      navigate('/messages');
    } else {
      navigate('/video-call');
    }
  };

  // Interest manipulation handlers
  const handleToggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests((prev) => prev.filter((i) => i !== interest));
    } else {
      setInterests((prev) => [...prev, interest]);
    }
  };

  const handleAddCustomInterest = (interest: string) => {
    if (!interests.includes(interest)) {
      setInterests((prev) => [...prev, interest]);
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests((prev) => prev.filter((i) => i !== interest));
  };

  // 1:1 Matching Flow Handlers (Direct to Finding Screen)
  const handleStart1on1 = async (
    customProf?: string,
    customInterests?: string[],
    customCountry?: string,
    customMode?: string
  ) => {
    let savedProfession = '';
    let savedInterests: string[] = [];
    let savedCountry = 'GLOBAL';
    try {
      savedProfession = localStorage.getItem('hayloo_user_profession') || '';
      savedCountry = localStorage.getItem('hayloo_selected_country') || 'GLOBAL';
      const parsed = JSON.parse(localStorage.getItem('hayloo_user_interests') || '[]');
      if (Array.isArray(parsed)) savedInterests = parsed.filter((value): value is string => typeof value === 'string');
    } catch {}

    const profToUse = (customProf || profession || savedProfession).trim();
    const interestsToUse = customInterests || (interests.length ? interests : savedInterests);
    const countryToUse = customCountry || selectedCountry || savedCountry;
    const rawMode = customMode || sessionMode || 'video';
    const modeToUse: 'video' | 'voice' | 'messaging' = (rawMode === 'TEXT' || rawMode === 'messaging')
      ? 'messaging'
      : (rawMode === 'AUDIO' || rawMode === 'voice')
      ? 'voice'
      : 'video';

    setActiveSessionMode(modeToUse);
    setSessionMode(modeToUse);
    try {
      localStorage.setItem('hayloo_session_mode', modeToUse);
    } catch {}

    const profValidation = validateProfession(profToUse);
    if (!profValidation.isValid) {
      addToast('warning', profValidation.error || 'Please enter a genuine profession before matching.');
      setCurrentView('profession_select');
      return;
    }

    if (interestsToUse.length < 3) {
      addToast('warning', 'Choose at least 3 interests before searching for a real member.');
      setInterests(interestsToUse);
      setCurrentView('interest_select');
      return;
    }

    if (!(await haylooSocket.waitUntilConnected())) {
      addToast('warning', 'Live matching could not connect. Please try again in a moment.');
      return;
    }

    setProfession(profToUse);
    setInterests(interestsToUse);
    setSelectedCountry(countryToUse);
    sessionModeRef.current = modeToUse;
    setActive1on1(null);
    setChat1on1Messages([]);
    setSessionMode(modeToUse);
    setActiveSessionMode(modeToUse);

    // Persist to Cloud Firestore if logged in with Google
    if (currentUser?.uid) {
      import('./services/userService.ts')
        .then(({ syncUserProfile }) => {
          syncUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            profession: profToUse,
            interests: interestsToUse,
          });
        })
        .catch((err) => console.warn('Firestore profile sync error:', err));
    }

    const queued = haylooSocket.send({
      type: 'START_MATCHING',
      visitorId: visitorId.current,
      blockedStrangers: getBlockedStrangers(),
      profession: profToUse,
      interests: interestsToUse,
      country: countryToUse,
      sessionMode: modeToUse,
    });
    if (!queued) {
      addToast('warning', 'Could not start matching because the live service is disconnected. Please try again.');
      return;
    }
    setCurrentView('matching');
  };

  const handleCancelMatching = () => {
    haylooSocket.send({ type: 'CANCEL_MATCHING' });
    setCurrentView('mode_select');
  };

  const handleNextPerson = () => {
    if (skipCooldownSeconds > 0) return;
    const queued = haylooSocket.send({ type: 'NEXT_PERSON' });
    if (queued) {
      setActive1on1(null);
      setChat1on1Messages([]);
      setPartnerLeftReason(null);
      setCurrentView('matching');
    }
  };

  const handleEndConversation = () => {
    haylooSocket.send({ type: 'END_CONVERSATION' });
    setActive1on1(null);
    setChat1on1Messages([]);
    setPartnerLeftReason(null);
    navigate('/');
  };

  const handleSend1on1Message = (text: string) => {
    haylooSocket.send({
      type: 'SEND_1ON1_MESSAGE',
      text,
    });
  };

  const handleUpdate1on1Message = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setChat1on1Messages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);


  // Safety actions & Anonymous Block/Report handler
  const handleBlockAndReport = (reason: string) => {
    const partnerVisitorId = active1on1?.partnerVisitorId || '';

    // 1. Save the blocked user's visitorId into localStorage.getItem('blocked_strangers')
    if (partnerVisitorId) {
      addBlockedStranger(partnerVisitorId);
      setBlockedCandidateIds((blocked) => [...new Set([...blocked, partnerVisitorId])]);
    }

    // 2. Send WebSocket event (block_partner) to backend with { blockerId, blockedId, reason }
    haylooSocket.send({
      type: 'block_partner',
      blockerId: visitorId.current,
      blockedId: partnerVisitorId,
      reason,
    });

    // 3. Provide visual feedback toast
    addToast('info', 'User blocked. You will not be paired with them again.');

    // 4. Immediately terminate current media stream and text socket room
    setActive1on1(null);
    setChat1on1Messages([]);
    setCurrentView('mode_select');

    // 5. Automatically trigger the "Find Next Match" process for the blocker
    handleStart1on1();
  };

  const handleSubmitReport = (category: string, details?: string) => {
    handleBlockAndReport(`${category}${details ? `: ${details}` : ''}`);
  };

  const handleConfirmBlock = () => {
    handleBlockAndReport('Blocked by user');
  };

  const isInActiveSession =
    currentView === '1on1_chat' ||
    currentView === 'voice_session' ||
    currentView === 'conversation';

  const handleLeaveCurrentSession = () => {
    if (currentView === '1on1_chat' || currentView === 'voice_session' || currentView === 'conversation') {
      setIsLeaveConfirmOpen(true);
    }
    else if (currentView === 'matching') handleCancelMatching();
  };

  return (
    <div
      className="w-full min-h-screen lg:h-screen lg:max-h-screen flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif] relative transition-colors duration-300 overflow-x-hidden lg:overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Scroll Progress Bar at very top */}
      <ScrollProgressBar />

      {/* Accessible Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-50 px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-xl focus:outline-none"
      >
        Skip to content
      </a>

      {/* Reconnecting / Connection Relay Banner */}
      <ConnectionBanner
        status={connectionStatus}
        retrySecondsLeft={retrySecondsLeft}
        onReconnectNow={() => haylooSocket.reconnectNow()}
      />

      {/* Universal Top Bar Header */}
      <Navbar
        currentView={currentView}
        sessionMode={sessionMode}
        onSwitchMode={handleSwitchMode}
        onNavigate={navigateTo}
        onStartFlow={() => navigateTo('landing')}
        isInActiveSession={isInActiveSession}
        onLeaveSession={handleLeaveCurrentSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrivacyInspector={() => setIsPrivacyInspectorOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenStartTalking={() => navigateTo('mode_select')}
        currentUser={currentUser}
        isHumanVerified={isHumanVerified}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Safety Warning and Block Notifications */}
      <SafetyWarningBanner
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Main Content Router */}
      <main
        id="main-content"
        className="flex-1 min-h-0 flex flex-col relative focus:outline-none w-full overflow-y-auto"
      >
        <React.Suspense fallback={<ViewLoadingFallback />}>
          {(currentView === 'landing' || currentView === 'history' || currentView === 'messages') && (
          <LandingView
            currentTab={currentView === 'history' ? 'history' : currentView === 'messages' ? 'messages' : 'video_chat'}
            onSelectTab={(tab) => navigateTo(tab === 'video_chat' ? 'landing' : tab)}
            onStart={() => navigateTo('landing')}
            onExplore={() => navigateTo('mode_select')}
            onNavigate={navigateTo}
            profession={profession}
            onProfessionChange={setProfession}
            selectedInterests={interests}
            onToggleInterest={handleToggleInterest}
            onAddCustomInterest={handleAddCustomInterest}
            onRemoveInterest={handleRemoveInterest}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            sessionMode={sessionMode}
            onSessionModeChange={handleSelectSessionMode}
            onOpenStartTalking={() => navigateTo('mode_select')}
            onStartMatchmaking={handleStart1on1}
          />
        )}

        {/* 2. ONBOARDING FLOW */}
        {currentView === 'onboarding' && (
          <OnboardingView
            initialProfile={haylooProfile}
            onComplete={(updated) => {
              setHaylooProfile((prev) => ({ ...prev, ...updated }));
              addToast('info', 'Professional profile setup complete!');
              navigateTo('landing');
            }}
          />
        )}

        {currentView === 'matching' && (
          <MatchingView
            profession={profession}
            interests={interests}
            sessionMode={sessionMode}
            connectionStatus={connectionStatus}
            onCancel={handleCancelMatching}
          />
        )}

        {active1on1 && ['conversation', 'voice_session', '1on1_chat'].includes(currentView) && (
          <OneToOneChatView
            room={active1on1}
            sessionId={sessionId}
            sessionMode={sessionMode}
            isInitiator={visitorId.current < (active1on1.partnerVisitorId || '')}
            messages={chat1on1Messages}
            partnerLeftReason={partnerLeftReason}
            incomingSignal={incomingSignal}
            onSendSignal={(signal) => haylooSocket.send({ type: 'WEBRTC_SIGNAL', signal })}
            onSendMessage={handleSend1on1Message}
            onNextPerson={handleNextPerson}
            onEndConversation={handleEndConversation}
            onOpenReport={() => setIsReportOpen(true)}
            onOpenBlock={() => setIsBlockOpen(true)}
            onBlockAndReport={handleBlockAndReport}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((muted) => !muted)}
            skipCooldownSeconds={skipCooldownSeconds}
            onUpdateMessage={handleUpdate1on1Message}
          />
        )}

        {/* 6. PROFILE */}
        {currentView === 'profile' && (
          <ProfileView
            onSave={(updated) => {
              if (updated.country) setSelectedCountry(updated.country);
              addToast('info', 'Profile changes saved!');
              navigateTo('landing');
            }}
            onBack={() => navigateTo('landing')}
          />
        )}

        {/* 7. SETTINGS */}
        {currentView === 'settings' && (
          <SettingsView
            isPublic={haylooProfile.isPublic}
            allowConnections={haylooProfile.allowConnections}
            blockedUsers={blockedCandidateIds}
            onTogglePublic={(val) => setHaylooProfile((prev) => ({ ...prev, isPublic: val }))}
            onToggleConnections={(val) => setHaylooProfile((prev) => ({ ...prev, allowConnections: val }))}
            onUnblockAll={() => {
              setBlockedCandidateIds([]);
              addToast('info', 'All blocked accounts cleared.');
            }}
          />
        )}

        {/* 7.1 LIVE EPHEMERAL ADMIN MODERATION */}
        {currentView === 'admin' && (
          <AdminModerationView onBackToApp={() => navigateTo('landing')} />
        )}

        {currentView === 'profession_select' && (
          <LandingView
            currentTab="video_chat"
            onSelectTab={(tab) => navigateTo(tab === 'video_chat' ? 'landing' : tab)}
            onStart={() => navigateTo('landing')}
            onExplore={() => navigateTo('mode_select')}
            onNavigate={navigateTo}
            profession={profession}
            onProfessionChange={setProfession}
            selectedInterests={interests}
            onToggleInterest={handleToggleInterest}
            onAddCustomInterest={handleAddCustomInterest}
            onRemoveInterest={handleRemoveInterest}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            sessionMode={sessionMode}
            onSessionModeChange={handleSelectSessionMode}
            onOpenStartTalking={() => navigateTo('mode_select')}
            onStartMatchmaking={handleStart1on1}
          />
        )}

        {currentView === 'interest_select' && (
          <InterestSelectView
            selectedInterests={interests}
            onToggleInterest={handleToggleInterest}
            onAddCustomInterest={handleAddCustomInterest}
            onRemoveInterest={handleRemoveInterest}
            profession={profession}
            onNext={() => navigateTo('mode_select')}
            onBack={() => navigateTo('profession_select')}
          />
        )}

        {currentView === 'mode_select' && (
          <ModeSelectView
            selectedProfession={profession}
            selectedInterests={interests}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            initialMode={sessionMode}
            onStart1on1={(mode) => handleStart1on1(undefined, undefined, undefined, mode)}
            onBack={() => navigateTo('interest_select')}
          />
        )}


        {currentView === 'restriction' && restriction && (
          <RestrictionView
            restriction={restriction}
            onReset={() => {
              setRestriction(null);
              setCurrentView('landing');
            }}
          />
        )}

        {currentView === 'connection_lost' && (
          <ConnectionLostView
            onReconnect={() => {
              haylooSocket.connect();
              setCurrentView('mode_select');
            }}
            onGoHome={() => setCurrentView('landing')}
          />
        )}

        {currentView === 'no_match' && (
          <NoMatchView
            onBroadenInterests={() => navigateTo('interest_select')}
            onRetryMatching={handleStart1on1}
          />
        )}

        {currentView === 'community_rules' && (
          <CommunityRulesView
            onStart={() => {
              navigateTo('landing');
              setTimeout(() => {
                const el = document.getElementById('hero-search-filter-form') || document.getElementById('hero-profession-input');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (document.getElementById('hero-profession-input') as HTMLInputElement)?.focus();
              }, 120);
            }}
            onBack={() => navigateTo(previousView === 'community_rules' ? 'landing' : previousView)}
          />
        )}

        {currentView === 'privacy_page' && (
          <PrivacyView
            onStart={() => {
              navigateTo('landing');
              setTimeout(() => {
                const el = document.getElementById('hero-search-filter-form') || document.getElementById('hero-profession-input');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (document.getElementById('hero-profession-input') as HTMLInputElement)?.focus();
              }, 120);
            }}
            onBack={() => navigateTo(previousView === 'privacy_page' ? 'landing' : previousView)}
          />
        )}

        {currentView === 'terms_page' && (
          <TermsView
            onStart={() => {
              navigateTo('landing');
              setTimeout(() => {
                const el = document.getElementById('hero-search-filter-form') || document.getElementById('hero-profession-input');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (document.getElementById('hero-profession-input') as HTMLInputElement)?.focus();
              }, 120);
            }}
            onBack={() => navigateTo(previousView === 'terms_page' ? 'landing' : previousView)}
          />
        )}

        {currentView === 'not_found' && (
          <NotFoundView onNavigate={navigateTo} />
        )}
        </React.Suspense>
      </main>

      {/* Site Footer matching Reference Design (hidden only during active full-screen calls) */}
      {!isInActiveSession && (
        <SiteFooter
          onNavigate={navigateTo}
          onOpenReport={() => setIsReportOpen(true)}
        />
      )}

      {/* Floating Utilities */}
      <ScrollToTopButton />
      <CookieConsentBanner />

      {/* Modals & Drawers wrapped in Suspense and conditionally rendered */}
      <React.Suspense fallback={null}>
        {/* Full-Site Search Modal */}
        {isSearchOpen && (
          <FullSiteSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onNavigate={navigateTo}
            onSelectProfession={(p) => setProfession(p)}
            onSelectInterest={(i) => handleAddCustomInterest(i)}
          />
        )}

        {/* Destructive Action Confirmation Modal for Active Session Exit */}
        {isLeaveConfirmOpen && (
          <ConfirmationModal
            isOpen={isLeaveConfirmOpen}
            onClose={() => setIsLeaveConfirmOpen(false)}
            onConfirm={handleEndConversation}
            title="Leave Active Conversation?"
            description="Leaving will permanently close the direct WebRTC peer connection. In accordance with our zero-persistence architecture, all transient chat messages will evaporate immediately."
            confirmLabel="End & Leave"
            cancelLabel="Stay in Chat"
            variant="destructive"
          />
        )}

        {/* Safety Modals */}
        {isReportOpen && (
          <ReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            onSubmitReport={handleSubmitReport}
          />
        )}

        {isBlockOpen && (
          <BlockModal
            isOpen={isBlockOpen}
            onClose={() => setIsBlockOpen(false)}
            onConfirmBlock={handleConfirmBlock}
          />
        )}

        {/* Preferences & Settings Drawer */}
        {isSettingsOpen && (
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            theme={theme}
            onToggleTheme={toggleTheme}
            onResetSession={() => {
              setProfession('');
              setInterests([]);
              setSelectedCountry('GLOBAL');
              addToast('info', 'Ephemeral criteria reset to defaults.');
            }}
            onOpenPrivacyInspector={() => setIsPrivacyInspectorOpen(true)}
          />
        )}

        {/* Zero-Persistence Privacy Inspector */}
        {isPrivacyInspectorOpen && (
          <PrivacyInspectorModal
            sessionId={sessionId}
            onClose={() => setIsPrivacyInspectorOpen(false)}
          />
        )}

        {/* Professional In-Place Start Talking Modal */}
        {/* Global Centered Profile Popup Modal */}
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onSaved={() => {
            addToast('info', 'Profile saved successfully!');
            navigateTo('landing');
          }}
        />
      </React.Suspense>
    </div>
  );
}
