import React, { useState, useEffect, useRef } from 'react';
import { CandidatePeer, ModerationReportItem } from '../types/index.ts';
import { validateChatMessage } from '../utils/chatSafety.ts';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Wand2,
  Flag,
  SkipForward,
  Send,
  Briefcase,
  Laptop,
  Link2,
  X,
  ShieldAlert,
  Radio,
  Globe,
  RotateCw,
  User,
  Volume2,
  MessageSquare,
  PhoneOff,
  AlertCircle,
} from 'lucide-react';
import { CountryFlag } from './CountryFlag.tsx';

interface VideoRoomViewProps {
  partner: CandidatePeer;
  userProfile: {
    displayName: string;
    headline: string;
    skills: string[];
  };
  sessionMode: 'VIDEO' | 'AUDIO' | 'TEXT';
  onNextMatch: () => void;
  onLeaveCall: () => void;
  onSaveConnection?: (partner: CandidatePeer) => void;
  onReportAndBlock: (report: ModerationReportItem) => void;
  onSwitchMode?: (mode: 'video' | 'voice' | 'messaging') => void;
}

export const VideoRoomView: React.FC<VideoRoomViewProps> = ({
  partner,
  userProfile,
  sessionMode,
  onNextMatch,
  onLeaveCall,
  onReportAndBlock,
  onSwitchMode,
}) => {
  // Live in-frame search states
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [camStatus, setCamStatus] = useState<'IDLE' | 'GRANTED' | 'DENIED'>('IDLE');
  const [isWandActive, setIsWandActive] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Unprofessional conduct');
  const [chatInput, setChatInput] = useState('');

  // Real user chat messages stream (starts empty with zero dummy text)
  const [chatMessages, setChatMessages] = useState<Array<{ id: number; sender: 'partner' | 'user'; text: string; time: string }>>([]);
  const [chatWarning, setChatWarning] = useState<string | null>(null);

  // Optional profile details (Name, Country with flag, Age, Profession Level)
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

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const searchTimerRef = useRef<any>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initial brief radar search on mount (e.g. 1.8s) so user sees active discovery happening here
  useEffect(() => {
    startInFrameSearch(1800);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const startInFrameSearch = (duration = 1800) => {
    setIsSearching(true);
    setSearchSeconds(0);
    setChatMessages([]);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(() => {
      setIsSearching(false);
    }, duration);
  };

  // Searching seconds ticker
  useEffect(() => {
    let interval: any;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  // Handle Next Match: Trigger in-frame radar search and cycle partner cleanly
  const handleTriggerNextMatch = () => {
    setIsSearching(true);
    setSearchSeconds(0);
    setChatMessages([]);
    onNextMatch();

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 1800);
  };

  useEffect(() => {
    if (sessionMode === 'VIDEO') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [sessionMode]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setCamStatus('GRANTED');
      } else {
        setCamStatus('DENIED');
      }
    } catch {
      setCamStatus('DENIED');
    }
  };

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    }
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    }
    setCamOn(!camOn);
  };

  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend || chatInput).trim();
    if (!content || isSearching) return;

    // Validate chat message against DLP / safety rules (links, phone, email, sensitive info)
    const check = validateChatMessage(content);
    if (!check.isAllowed) {
      setChatWarning(check.reason || 'Sharing external links, phone numbers, or emails is banned.');
      return;
    }
    setChatWarning(null);

    const userMsg = {
      id: Date.now(),
      sender: 'user' as const,
      text: content,
      time: 'Just now',
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reportItem: ModerationReportItem = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter: userProfile.displayName,
      target: partner.displayName,
      targetId: partner.id,
      category: reportReason,
      status: 'NEW',
      time: 'Just now',
    };
    onReportAndBlock(reportItem);
    setReportModalOpen(false);
    handleTriggerNextMatch();
  };

  // Partner initials
  const partnerInitials = partner.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const matchPercentage = partner.matchScore || 96;
  const firstName = partner.displayName.split(' ')[0];

  return (
    <div id="video-room-view" className="flex-1 w-full bg-[#fdedd1] dark:bg-[#121316] py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 flex items-center justify-center transition-colors">
      <div className="max-w-[1360px] w-full grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        
        {/* ================= LEFT CARD: LIVE RADAR SEARCH & VIDEO STAGE ================= */}
        <div className="lg:col-span-7 xl:col-span-7 relative rounded-[28px] overflow-hidden bg-[#0A0D14] shadow-xl border border-black/10 min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] flex flex-col justify-between select-none">
          
          {/* ──────── LIVE RADAR SEARCH STATE (SEARCHES RIGHT HERE) ──────── */}
          {isSearching ? (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-[#0F1422] via-[#0A0D14] to-[#06080D]">
              
              {/* Radar Rings & Rotating Sweep Animation */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
                {/* Outer concentric rings */}
                <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping opacity-25" />
                <div className="absolute inset-3 rounded-full border border-orange-500/30" />
                <div className="absolute inset-10 rounded-full border border-orange-500/40" />
                <div className="absolute inset-18 rounded-full border border-orange-500/50" />
                <div className="absolute inset-26 rounded-full border border-orange-500/70" />

                {/* Crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-orange-500/25" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-orange-500/25" />

                {/* Rotating Conic Radar Beam */}
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none animate-spin [animation-duration:3s]">
                  <div
                    className="w-1/2 h-1/2 origin-bottom-right"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(255, 85, 0, 0.45) 360deg)',
                    }}
                  />
                </div>

                {/* Pulsing Random Peer Blips */}
                <div className="absolute top-12 right-14 w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping opacity-80" />
                <div className="absolute bottom-16 left-12 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75 [animation-delay:1.2s]" />

                {/* Center Core Node */}
                <div className="relative z-10 w-16 h-16 rounded-full bg-[#151B2B] border-2 border-[#FF5500] flex items-center justify-center shadow-[0_0_30px_rgba(255,85,0,0.5)]">
                  <Radio className="w-8 h-8 text-[#FF5500] animate-pulse" />
                </div>
              </div>

              {/* Status Header */}
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                Traversing Topic Constellations...
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-4">
                Our zero-persistence routing algorithm is calculating semantic affinity with online peers.
              </p>

              {/* Active Matrix Criteria Chips */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
                <span className="bg-white/10 text-slate-300 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#FF5500]" />
                  <span>Global Network</span>
                </span>
                <span className="bg-[#FFF0E6]/15 text-[#FF8540] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#FF5500]/30">
                  {partner.professionName || 'Software Development'}
                </span>
                {partner.skills.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="bg-white/5 text-slate-300 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/5"
                  >
                    #{s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* ──────── CONNECTED PEER VIDEO STAGE (NO STATIC STOCK PHOTO) ──────── */
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#111624] via-[#0D111A] to-[#07090E]">
              
              {/* Audio-reactive pulsating frame around peer initials avatar */}
              <div className="relative flex items-center justify-center mb-5">
                <div className="absolute -inset-6 rounded-full bg-[#FF5500]/10 animate-ping opacity-40" />
                <div className="absolute -inset-3 rounded-full border-2 border-emerald-500/40 animate-pulse" />

                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#161C2C] to-[#252E48] border-3 border-emerald-500 text-white flex flex-col items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.35)] z-10">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight">{partnerInitials}</span>
                  <span className="text-[10px] font-bold text-emerald-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{sessionMode === 'TEXT' ? 'Messaging Mode' : sessionMode === 'AUDIO' ? 'Voice Call' : 'Live Audio'}</span>
                  </span>
                </div>
              </div>

              {/* Remote Peer Identity & Connection Status */}
              <h3 className="text-2xl font-black text-white tracking-tight">{partner.displayName}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {partner.headline} • {partner.location || 'Dubai'}
              </p>

              {/* Real-time speaking soundwaves simulation */}
              {sessionMode !== 'TEXT' && (
                <div className="flex items-center gap-1 mt-4">
                  {[6, 14, 24, 18, 30, 22, 12, 28, 16, 8].map((height, i) => (
                    <span
                      key={i}
                      style={{ height: `${height}px` }}
                      className="w-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full animate-pulse"
                    />
                  ))}
                </div>
              )}

              <span className="text-[11px] text-slate-400 mt-3 font-medium flex items-center gap-1.5">
                {sessionMode === 'TEXT' ? (
                  <>
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Text-Only Mode • Real-time Encrypted Messaging Active</span>
                  </>
                ) : sessionMode === 'AUDIO' ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Voice Stream Active • Encrypted WebRTC Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Camera Standby • Encrypted WebRTC Audio Streaming</span>
                  </>
                )}
              </span>
            </div>
          )}

          {/* Top-Left: Floating Status Badge */}
          <div className="absolute top-4 sm:top-5 left-4 sm:left-5 z-20">
            {isSearching ? (
              <div className="bg-[#101522]/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xl border border-white/10 text-white flex items-center gap-2.5 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping" />
                <span className="text-xs font-bold text-slate-200">
                  Scanning ({searchSeconds}s)
                </span>
              </div>
            ) : (
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-xl border border-white/60 dark:border-white/10 max-w-[280px] sm:max-w-[340px] text-slate-800 dark:text-slate-100 transition-all">
                {/* Row 1: Online Status Dot + Name + Match Badge */}
                <div className="flex items-center gap-2 flex-wrap justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight truncate">
                      {partner.displayName}
                    </h3>
                  </div>
                  <span className="bg-[#FFF0E6] text-[#FF5500] text-[11px] font-bold px-2 py-0.5 rounded-lg border border-[#FFD9C6]">
                    {matchPercentage}% Match
                  </span>
                </div>

                {/* Row 2: Profession Headline & Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium mt-1.5 truncate">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {partner.headline} • {partner.location || 'Dubai'}
                  </span>
                </div>

                {/* Row 3: Skills / Topic Hashtags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {partner.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="bg-[#F4F3EE] dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/5"
                    >
                      #{skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top-Right: User PiP (Picture-in-Picture) Frame */}
          <div className="absolute top-4 sm:top-5 right-4 sm:right-5 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl border-2 border-white/70 shadow-2xl overflow-hidden z-20 bg-slate-800">
            {sessionMode === 'VIDEO' && camStatus === 'GRANTED' && camOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-[#151924]">
                <User className="w-7 h-7 text-slate-400 mb-1" />
                <span className="text-[10px] font-bold text-slate-300">Camera Off</span>
              </div>
            )}
            {/* "You" Indicator Tag */}
            <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 shadow-sm">
              You
            </span>
          </div>

          {/* Optional User Profile Badge (Name, Country Flag, Age, Profession Level) */}
          {userProfileData && (userProfileData.name || userProfileData.countryFlag || userProfileData.country || userProfileData.countryCode || userProfileData.age || userProfileData.professionLevel) && (
            <div className="absolute top-[108px] sm:top-[124px] md:top-[140px] right-4 sm:right-5 z-20 bg-slate-900/90 backdrop-blur-md rounded-xl px-2.5 py-1 shadow-lg border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 max-w-[240px] truncate">
              {(userProfileData.countryCode || userProfileData.country) && (
                <CountryFlag
                  code={userProfileData.countryCode || userProfileData.country || ''}
                  className="w-4 h-2.5 rounded-xs shrink-0"
                />
              )}
              {userProfileData.name && <span className="truncate">{userProfileData.name}</span>}
              {userProfileData.age && <span className="text-slate-400">({userProfileData.age})</span>}
              {userProfileData.professionLevel && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#EC5E27]/25 text-[#EC5E27] border border-[#EC5E27]/40 shrink-0">
                  {userProfileData.professionLevel}
                </span>
              )}
            </div>
          )}

          {/* Bottom-Left: Floating Dark Controls Bar */}
          <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-5 z-20">
            <div className="bg-[#1A202C]/85 backdrop-blur-md rounded-2xl p-1.5 sm:p-2 flex items-center gap-1 sm:gap-1.5 border border-white/10 shadow-2xl">
              {/* Video Camera Toggle */}
              <button
                type="button"
                onClick={toggleCam}
                title={camOn ? 'Disable camera' : 'Enable camera'}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  camOn ? 'text-white hover:bg-white/15' : 'bg-red-600 text-white'
                }`}
              >
                {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {/* Mic Toggle */}
              <button
                type="button"
                onClick={toggleMic}
                title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  micOn ? 'text-white hover:bg-white/15' : 'bg-red-600 text-white'
                }`}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Magic Wand / Visual Filter Effect Toggle */}
              <button
                type="button"
                onClick={() => setIsWandActive(!isWandActive)}
                title="Toggle studio filter effect"
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  isWandActive ? 'bg-[#FF5500] text-white shadow-md' : 'text-white hover:bg-white/15'
                }`}
              >
                <Wand2 className="w-5 h-5" />
              </button>

              {/* Report / Safety Flag */}
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                title="Report or flag partner"
                className="p-2.5 rounded-xl text-white/80 hover:text-red-500 hover:bg-white/15 transition cursor-pointer"
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom-Right: High-Contrast End Call & Next Match Buttons */}
          <div className="absolute bottom-4 sm:bottom-5 right-4 sm:right-5 z-20 flex items-center gap-2.5 sm:gap-3">
            <button
              id="video-room-end-call-btn"
              type="button"
              onClick={onLeaveCall}
              className="bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-white font-bold px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl flex items-center gap-2 shadow-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer text-sm sm:text-base backdrop-blur-md"
              title="End the Call"
            >
              <PhoneOff className="w-4 h-4 text-slate-300" />
              <span>End Call</span>
            </button>

            <button
              id="video-room-next-match-btn"
              type="button"
              onClick={handleTriggerNextMatch}
              className="bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-bold px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl flex items-center gap-2 shadow-xl hover:shadow-orange-500/25 transition-all cursor-pointer text-sm sm:text-base"
            >
              <span>{isSearching ? 'Searching...' : 'Next Match'}</span>
              <SkipForward className={`w-4 h-4 fill-white ${isSearching ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        {/* ================= RIGHT CARD: CHAT PANEL ================= */}
        <div className="lg:col-span-5 xl:col-span-5 rounded-[28px] bg-white dark:bg-[#18191E] border border-orange-100/80 dark:border-white/10 shadow-xl p-4 sm:p-6 flex flex-col justify-between min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] relative transition-colors">
          
          {/* Header Row (Connect button removed as requested) */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isSearching ? (
                    <span>Finding Your Match...</span>
                  ) : (
                    <>
                      Chat with <span className="text-[#FF5500]">{firstName}</span>{' '}
                      <span className="text-slate-400 font-normal">• Verified Peer</span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isSearching ? (
                    'Calculating mutual affinity...'
                  ) : (
                    <>
                      Matched via <span className="font-semibold text-slate-700 dark:text-slate-200">{partner.professionName}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Smart Match Connected Banner */}
            <div className="bg-[#FFF9F3] dark:bg-orange-950/20 border border-orange-200/90 dark:border-orange-500/30 rounded-2xl p-3 sm:p-3.5 text-center my-3.5 shadow-xs">
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-[#FF5500] uppercase block">
                {isSearching ? 'CALCULATING SEMANTIC MATRIX' : 'SMART MATCH CONNECTED'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {isSearching ? (
                  'Scanning active intellectual peers across your selected technical topics...'
                ) : (
                  <>
                    Matched with <span className="font-bold text-slate-900 dark:text-white">{partner.displayName}</span> based on{' '}
                    <span className="text-slate-700 dark:text-slate-200 font-medium">
                      {partner.skills.map((s) => `#${s}`).join(', ')}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Interactive Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-3.5 my-2 pr-1 max-h-[300px] lg:max-h-[340px]">
            {isSearching ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <RotateCw className="w-6 h-6 animate-spin text-[#FF5500] mb-2" />
                <span className="text-xs font-semibold text-slate-500">Connecting chat stream with active peer...</span>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <span className="text-xs font-semibold text-slate-400">
                  No messages yet. Send a message to start chatting...
                </span>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isPartner = msg.sender === 'partner';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isPartner ? 'justify-start' : 'justify-end'}`}
                  >
                    {isPartner && (
                      <div className="w-8 h-8 rounded-full bg-[#1C202B] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                        {partnerInitials}
                      </div>
                    )}

                    <div className="max-w-[85%]">
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                          isPartner
                            ? 'bg-[#F6F5EE] dark:bg-[#23242A] text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200/40 dark:border-white/5'
                            : 'bg-[#FF5500] text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span
                        className={`text-[10px] text-slate-400 mt-1 block font-medium ${
                          isPartner ? 'text-left pl-1' : 'text-right pr-1'
                        }`}
                      >
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Area: Icebreaker Prompt Chips & Input Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2.5">
            {/* Quick Ask Suggestion Chips */}
            <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar">
              <span className="text-slate-400 font-medium shrink-0">Ask:</span>
              <button
                type="button"
                disabled={isSearching}
                onClick={() => handleSendMessage('What is your current tech stack?')}
                className="bg-[#F4F3EE] dark:bg-white/5 hover:bg-[#FFF0E6] hover:text-[#FF5500] hover:border-[#FFD9C6] text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-white/10 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 disabled:opacity-50"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Current tech stack?</span>
              </button>
              <button
                type="button"
                disabled={isSearching}
                onClick={() => handleSendMessage('Could you share your portfolio or latest project?')}
                className="bg-[#F4F3EE] dark:bg-white/5 hover:bg-[#FFF0E6] hover:text-[#FF5500] hover:border-[#FFD9C6] text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-white/10 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 disabled:opacity-50"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Share portfolio</span>
              </button>
            </div>

            {/* Safety Alert Warning Banner */}
            {chatWarning && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{chatWarning}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatWarning(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Message Input & Send Button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                disabled={isSearching}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  if (chatWarning) setChatWarning(null);
                }}
                placeholder={isSearching ? 'Waiting for connection...' : 'Type a message to your match...'}
                className="bg-[#F4F3EE] dark:bg-[#202228] focus:bg-white dark:focus:bg-[#262830] focus:ring-2 focus:ring-[#FF5500]/25 focus:border-[#FF5500]/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm px-4 py-3 sm:py-3.5 rounded-2xl flex-1 border border-slate-200/70 dark:border-white/10 outline-none transition shadow-xs disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-bold px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-sm flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-orange-500/25 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Safety Report & Block Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleBlockSubmit}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#1A1C23] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-500">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Report & Block {partner.displayName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This immediately disconnects the peer session, prevents future matching, and submits a trust report to our moderation system.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Reason
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-[#F8F7F4] dark:bg-[#23242A] px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/30"
              >
                <option>Unprofessional conduct</option>
                <option>Unsolicited sales pitch / spam</option>
                <option>Harassment or offensive language</option>
                <option>Impersonation or false credentials</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-white/15 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold shadow-md transition"
              >
                Confirm Block & Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
