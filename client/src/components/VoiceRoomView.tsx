import React, { useState, useEffect, useRef } from 'react';
import { CandidatePeer, ModerationReportItem } from '../types/index.ts';
import { validateChatMessage } from '../utils/chatSafety.ts';
import Mic from 'lucide-react/dist/esm/icons/mic.js';
import MicOff from 'lucide-react/dist/esm/icons/mic-off.js';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2.js';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x.js';
import Flag from 'lucide-react/dist/esm/icons/flag.js';
import SkipForward from 'lucide-react/dist/esm/icons/skip-forward.js';
import Send from 'lucide-react/dist/esm/icons/send.js';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase.js';
import Laptop from 'lucide-react/dist/esm/icons/laptop.js';
import Link2 from 'lucide-react/dist/esm/icons/link-2.js';
import Radio from 'lucide-react/dist/esm/icons/radio.js';
import Globe from 'lucide-react/dist/esm/icons/globe.js';
import RotateCw from 'lucide-react/dist/esm/icons/rotate-cw.js';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert.js';
import PhoneOff from 'lucide-react/dist/esm/icons/phone-off.js';
import X from 'lucide-react/dist/esm/icons/x.js';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle.js';
import User from 'lucide-react/dist/esm/icons/user.js';
import { CountryFlag } from './CountryFlag.tsx';

interface VoiceRoomViewProps {
  partner: CandidatePeer;
  userProfile: {
    displayName: string;
    headline: string;
    skills: string[];
  };
  onNextMatch: () => void;
  onLeaveCall: () => void;
  onSaveConnection?: (partner: CandidatePeer) => void;
  onReportAndBlock: (report: ModerationReportItem) => void;
  onSwitchMode?: (mode: 'video' | 'voice' | 'messaging') => void;
}

export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({
  partner,
  userProfile,
  onNextMatch,
  onLeaveCall,
  onReportAndBlock,
  onSwitchMode,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);

  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Unprofessional conduct');
  const [chatInput, setChatInput] = useState('');
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

  const [chatMessages, setChatMessages] = useState<Array<{ id: number; sender: 'partner' | 'user'; text: string; time: string }>>([]);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const searchTimerRef = useRef<any>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initial radar search on mount
  useEffect(() => {
    startRadarSearch(1800);
    startAudioStream();
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      stopAudioStream();
    };
  }, []);

  const startAudioStream = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioStreamRef.current = stream;
      }
    } catch {
      // Audio stream optional / mocked
    }
  };

  const stopAudioStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
  };

  const startRadarSearch = (duration = 1800) => {
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

  const toggleMic = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    }
    setMicOn(!micOn);
  };

  const toggleSpeaker = () => {
    setSpeakerOn(!speakerOn);
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

  const partnerInitials = partner.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const matchPercentage = partner.matchScore || 96;
  const firstName = partner.displayName.split(' ')[0];

  return (
    <div id="voice-room-view" className="flex-1 w-full bg-[var(--bg-primary,#fdedd1)] py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 flex items-center justify-center transition-colors">
      <div className="max-w-[1360px] w-full grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* ================= LEFT CARD: VOICE CALL STAGE ================= */}
        <div className="lg:col-span-7 xl:col-span-7 relative rounded-[28px] overflow-hidden bg-[#0A0D14] shadow-xl border border-black/10 min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] flex flex-col justify-between select-none">
          {/* Radar Search State */}
          {isSearching ? (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-[#0F1422] via-[#0A0D14] to-[#06080D]">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping opacity-25" />
                <div className="absolute inset-4 rounded-full border border-orange-500/30" />
                <div className="absolute inset-12 rounded-full border border-orange-500/40" />
                <div className="absolute inset-20 rounded-full border border-orange-500/60" />

                <div className="absolute inset-x-0 top-1/2 h-px bg-orange-500/25" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-orange-500/25" />

                <div className="relative z-10 w-16 h-16 rounded-full bg-[#151B2B] border-2 border-[#FF5500] flex items-center justify-center shadow-[0_0_30px_rgba(255,85,0,0.5)]">
                  <Radio className="w-8 h-8 text-[#FF5500] animate-pulse" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                Connecting Voice Stream...
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-4">
                Routing encrypted P2P audio channels with active intellectual peers.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
                <span className="bg-white/10 text-slate-300 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#FF5500]" />
                  <span>Voice Session</span>
                </span>
                <span className="bg-[#FFF0E6]/15 text-[#FF8540] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#FF5500]/30">
                  {partner.professionName || 'Software Development'}
                </span>
              </div>
            </div>
          ) : (
            /* Connected Voice Call Center Stage */
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#111624] via-[#0D111A] to-[#07090E]">
              {/* Voice-reactive animated ring around peer avatar */}
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute -inset-8 rounded-full bg-emerald-500/15 animate-ping opacity-35" />
                <div className="absolute -inset-4 rounded-full border-2 border-emerald-500/40 animate-pulse" />

                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#161C2C] to-[#252E48] border-3 border-emerald-500 text-white flex flex-col items-center justify-center shadow-[0_0_45px_rgba(16,185,129,0.4)] z-10">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight">{partnerInitials}</span>
                  <span className="text-[11px] font-bold text-emerald-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Voice Live</span>
                  </span>
                </div>
              </div>

              {/* Remote Peer Identity */}
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{partner.displayName}</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                {partner.headline} • {partner.location || 'Global'}
              </p>

              {/* Dynamic Voice Waves Simulation */}
              <div className="flex items-center gap-1.5 mt-5 h-10">
                {[8, 16, 28, 22, 36, 26, 14, 32, 20, 10, 24, 18].map((height, i) => (
                  <span
                    key={i}
                    style={{ height: `${height}px` }}
                    className="w-1.5 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full animate-pulse"
                  />
                ))}
              </div>

              <span className="text-xs text-slate-400 mt-4 font-semibold flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice Stream Active • Encrypted WebRTC Audio</span>
              </span>
            </div>
          )}

          {/* Top-Left: Floating Partner Badge */}
          <div className="absolute top-4 sm:top-5 left-4 sm:left-5 z-20">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-xl border border-white/60 max-w-[280px] sm:max-w-[340px] text-slate-800 transition-all">
              <div className="flex items-center gap-2 flex-wrap justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSearching ? 'bg-[#FF5500] animate-ping' : 'bg-emerald-500 ring-4 ring-emerald-500/20'}`} />
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                    {isSearching ? 'Finding Peer...' : partner.displayName}
                  </h3>
                </div>
                {!isSearching && (
                  <span className="bg-[#FFF0E6] text-[#FF5500] text-[11px] font-bold px-2 py-0.5 rounded-lg border border-[#FFD9C6]">
                    {matchPercentage}% Match
                  </span>
                )}
              </div>

              {!isSearching && (
                <>
                  {/* Row 2: Profession Headline & Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1.5 truncate">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {partner.headline} • {partner.location || 'Global'}
                    </span>
                  </div>

                  {/* Row 3: Skills / Topic Hashtags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {partner.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="bg-[#F4F3EE] text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60"
                      >
                        #{skill}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top-Right: User Profile Badge (Name, Country Flag, Age, Profession Level) */}
          {userProfileData && (userProfileData.name || userProfileData.countryFlag || userProfileData.country || userProfileData.countryCode || userProfileData.age || userProfileData.professionLevel) && (
            <div className="absolute top-4 sm:top-5 right-4 sm:right-5 z-20 bg-slate-900/90 backdrop-blur-md rounded-2xl px-3 py-2 shadow-xl border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2 max-w-[280px] truncate">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              {(userProfileData.countryCode || userProfileData.country) && (
                <CountryFlag
                  code={userProfileData.countryCode || userProfileData.country || ''}
                  className="w-4 h-2.5 rounded-xs shrink-0"
                />
              )}
              {userProfileData.name && <span className="truncate">{userProfileData.name}</span>}
              {userProfileData.age && <span className="text-slate-400">({userProfileData.age})</span>}
              {userProfileData.professionLevel && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#EC5E27]/25 text-[#EC5E27] border border-[#EC5E27]/40 shrink-0">
                  {userProfileData.professionLevel}
                </span>
              )}
            </div>
          )}

          {/* Bottom-Left: Audio Controls Bar (Mic & Speaker, NO Camera button) */}
          <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-5 z-20">
            <div className="bg-[#1A202C]/90 backdrop-blur-md rounded-2xl p-2 flex items-center gap-2 border border-white/10 shadow-2xl">
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

              {/* Speaker Toggle */}
              <button
                type="button"
                onClick={toggleSpeaker}
                title={speakerOn ? 'Mute audio' : 'Unmute audio'}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  speakerOn ? 'text-white hover:bg-white/15' : 'bg-red-600 text-white'
                }`}
              >
                {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Report Flag */}
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                title="Report partner"
                className="p-2.5 rounded-xl text-white/80 hover:text-red-500 hover:bg-white/15 transition cursor-pointer"
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom-Right: High-Contrast End Call & Next Match Buttons */}
          <div className="absolute bottom-4 sm:bottom-5 right-4 sm:right-5 z-20 flex items-center gap-2.5 sm:gap-3">
            <button
              id="voice-room-end-call-btn"
              type="button"
              onClick={onLeaveCall}
              className="bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-white font-bold px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl flex items-center gap-2 shadow-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer text-sm sm:text-base backdrop-blur-md"
              title="End the Call"
            >
              <PhoneOff className="w-4 h-4 text-slate-300" />
              <span>End Call</span>
            </button>

            <button
              id="voice-room-next-match-btn"
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
        <div className="lg:col-span-5 xl:col-span-5 rounded-[28px] bg-[var(--card-bg,#ffffff)] dark:bg-slate-900 border border-orange-100/80 dark:border-slate-800 shadow-xl p-4 sm:p-6 flex flex-col justify-between min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] relative transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isSearching ? (
                    <span>Finding Your Voice Match...</span>
                  ) : (
                    <>
                      Voice Chat with <span className="text-[#FF5500]">{firstName}</span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isSearching ? 'Routing peer...' : `Matched via ${partner.professionName}`}
                </p>
              </div>

              <button
                type="button"
                onClick={onLeaveCall}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Leave
              </button>
            </div>

            {/* Banner */}
            <div className="bg-[#FFF9F3] dark:bg-slate-800/70 border border-orange-200/90 dark:border-slate-700 rounded-2xl p-3 text-center my-3 shadow-xs">
              <span className="text-[11px] font-black tracking-wider text-[#FF5500] uppercase block">
                {isSearching ? 'CALCULATING SEMANTIC MATRIX' : 'SMART VOICE MATCH CONNECTED'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {isSearching
                  ? 'Finding active peers in voice mode...'
                  : `Discussing ${partner.skills.map((s) => `#${s}`).join(', ')}`}
              </p>
            </div>
          </div>

          {/* Interactive Chat Stream */}
          <div className="flex-1 overflow-y-auto space-y-3 my-2 pr-1 max-h-[300px] lg:max-h-[340px]">
            {isSearching ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <RotateCw className="w-6 h-6 animate-spin text-[#FF5500] mb-2" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Connecting stream...</span>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <span className="text-xs font-semibold text-slate-400">
                  Voice connected. Type here if you wish to share links or notes...
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
                      <div className="w-8 h-8 rounded-full bg-[#1C202B] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {partnerInitials}
                      </div>
                    )}
                    <div className="max-w-[85%]">
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                          isPartner
                            ? 'bg-[#F6F5EE] dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/40 dark:border-slate-700'
                            : 'bg-[#FF5500] text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className={`text-[10px] text-slate-400 mt-1 block font-medium ${isPartner ? 'text-left pl-1' : 'text-right pr-1'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Prompt chips and Input Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar">
              <span className="text-slate-400 font-medium shrink-0">Ask:</span>
              <button
                type="button"
                disabled={isSearching}
                onClick={() => handleSendMessage('What is your current tech stack?')}
                className="bg-[#F4F3EE] dark:bg-slate-800 hover:bg-[#FFF0E6] dark:hover:bg-slate-700 hover:text-[#FF5500] text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Current tech stack?</span>
              </button>
              <button
                type="button"
                disabled={isSearching}
                onClick={() => handleSendMessage('Could you share your portfolio?')}
                className="bg-[#F4F3EE] dark:bg-slate-800 hover:bg-[#FFF0E6] dark:hover:bg-slate-700 hover:text-[#FF5500] text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
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
                placeholder="Type a note..."
                className="flex-1 bg-[#F8F7F2] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF5500] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSearching || !chatInput.trim()}
                className="bg-[#FF5500] hover:bg-[#E04B00] text-white p-3 rounded-2xl shadow-md transition disabled:opacity-40 cursor-pointer"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <ShieldAlert className="w-5 h-5" />
                <span>Report Partner</span>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Reporting <span className="font-bold text-slate-900 dark:text-slate-100">{partner.displayName}</span> immediately drops the audio stream and skips to the next candidate peer.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for report</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="Unprofessional conduct">Unprofessional conduct</option>
                  <option value="Inappropriate language">Inappropriate language</option>
                  <option value="Spam / Solicitation">Spam / Solicitation</option>
                  <option value="Audio disruption">Audio disruption / noise</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md"
                >
                  Report & Next Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
