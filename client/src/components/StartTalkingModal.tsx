import React, { useState, useEffect } from 'react';
import { 
  X, 
  Video, 
  Mic, 
  MessageSquare, 
  Sparkles, 
  Users, 
  Globe2, 
  ShieldCheck, 
  ArrowRight, 
  RotateCw, 
  Radio, 
  CheckCircle2,
  ChevronRight,
  Zap
} from 'lucide-react';
import { HAYLOO_PROFESSIONS, HAYLOO_PURPOSES, CANDIDATE_POOL } from '../data/constants.ts';
import { CandidatePeer } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { SUPPORTED_LANGUAGES } from '../data/languages.ts';

export interface StartTalkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (peer: CandidatePeer, mode: string) => void;
  blockedIds?: string[];
  initialProfession?: string;
  initialInterests?: string[];
}

export const StartTalkingModal: React.FC<StartTalkingModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  blockedIds = [],
  initialProfession,
  initialInterests = [],
}) => {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<string>(() => {
    const s = typeof window !== 'undefined' ? localStorage.getItem('hayloo_session_mode') : null;
    if (s === 'voice' || s === 'AUDIO') return 'voice';
    if (s === 'video' || s === 'VIDEO') return 'video';
    return 'messaging';
  });
  const [selectedProfession, setSelectedProfession] = useState<string>(initialProfession || 'ANY');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('EXCHANGE_IDEAS');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  // Search radar state inside the popup
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState<number>(0);
  const [foundPeer, setFoundPeer] = useState<CandidatePeer | null>(null);
  const [matchScore, setMatchScore] = useState<number>(94);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearching) {
          setIsSearching(false);
          setFoundPeer(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSearching, onClose]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setIsSearching(false);
      setFoundPeer(null);
      setSearchStep(0);
    }
  }, [isOpen]);

  // Radar search simulation
  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;

    if (isSearching) {
      setSearchStep(1); // scanning pool
      timer1 = setTimeout(() => {
        setSearchStep(2); // evaluating mutual interests
      }, 900);

      timer2 = setTimeout(() => {
        setSearchStep(3); // match candidate resolved
        
        // Pick peer from CANDIDATE_POOL matching criteria or fallback
        const available = CANDIDATE_POOL.filter((c) => !blockedIds.includes(c.id));
        let matched = available.find((c) => 
          selectedProfession === 'ANY' || c.professionId === selectedProfession
        );
        if (!matched && available.length > 0) {
          matched = available[Math.floor(Math.random() * available.length)];
        }
        setFoundPeer(matched || CANDIDATE_POOL[0]);
        setMatchScore(Math.floor(Math.random() * 8) + 91); // 91% - 98%
      }, 1900);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isSearching, selectedProfession, blockedIds]);

  if (!isOpen) return null;

  const handleStartSearch = () => {
    setIsSearching(true);
  };

  const handleConfirmConnect = () => {
    if (foundPeer) {
      onConnect(foundPeer, selectedMode);
      onClose();
    }
  };

  const handleSkipPeer = () => {
    setFoundPeer(null);
    setIsSearching(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-talking-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#0B0F17]/95 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(230,0,18,0.2)] text-white overflow-hidden animate-scaleUp flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="relative px-6 py-5 border-b border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EC5E27] flex items-center justify-center shadow-[0_0_15px_rgba(236,94,39,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="start-talking-title" className="text-base sm:text-lg font-black tracking-tight text-white">
                  {t('modal.title', 'Start Talking')}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('modal.onlineCount', '1,420+ Online')}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-medium">
                {t('modal.subtitle', 'Connect instantly with an intellectual peer without leaving your screen.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {!isSearching && !foundPeer ? (
            <>
              {/* 1. Conversation Mode */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-[#EC5E27]" />
                  {t('modal.chooseFormat', '1. Choose Conversation Format')}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'video', label: t('modal.video', 'Video Call'), desc: t('modal.videoDesc', 'Camera & Audio'), icon: Video },
                    { id: 'voice', label: t('modal.audio', 'Voice Call'), desc: t('modal.audioDesc', 'Microphone stream'), icon: Mic },
                    { id: 'messaging', label: t('modal.text', 'Messaging'), desc: t('modal.textDesc', 'Encrypted text chat'), icon: MessageSquare },
                  ].map((mode) => {
                    const active =
                      selectedMode === mode.id ||
                      (mode.id === 'messaging' && selectedMode === 'TEXT') ||
                      (mode.id === 'voice' && selectedMode === 'AUDIO') ||
                      (mode.id === 'video' && selectedMode === 'VIDEO');
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedMode(mode.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                          active
                            ? 'border-[#EC5E27] bg-[#EC5E27]/10 text-white shadow-[0_0_20px_rgba(236,94,39,0.25)]'
                            : 'border-white/[0.08] bg-[#141B26]/60 text-[#94A3B8] hover:border-white/20 hover:text-white hover:bg-[#141B26]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-5 h-5 ${active ? 'text-[#FF5500]' : 'text-[#64748B] group-hover:text-white'}`} />
                          {active && (
                            <span className="w-2 h-2 rounded-full bg-[#EC5E27] shadow-[0_0_8px_#EC5E27]" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-white">{mode.label}</div>
                        <div className="text-[10px] text-[#94A3B8]">{mode.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target Profession */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#EC5E27]" />
                  {t('modal.targetDomain', '2. Target Profession / Peer Domain')}
                </label>
                <select
                  value={selectedProfession}
                  onChange={(e) => setSelectedProfession(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#141B26] text-white text-sm font-semibold focus:outline-none focus:border-[#EC5E27] transition-colors cursor-pointer"
                >
                  <option value="ANY">{t('modal.anyProf', 'Any Profession (Instant & Open Discovery)')}</option>
                  {HAYLOO_PROFESSIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t(`prof.${p.id}.name`, p.name)} [{p.tag}]
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Conversation Focus & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#EC5E27]" />
                    {t('modal.purpose', '3. Discussion Purpose')}
                  </label>
                  <select
                    value={selectedPurpose}
                    onChange={(e) => setSelectedPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#141B26] text-white text-xs font-semibold focus:outline-none focus:border-[#EC5E27] transition-colors cursor-pointer"
                  >
                    {HAYLOO_PURPOSES.map((pur) => (
                      <option key={pur.id} value={pur.id}>
                        {pur.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                    <Globe2 className="w-3.5 h-3.5 text-[#EC5E27]" />
                    {t('modal.prefLang', '4. Preferred Language')}
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#141B26] text-white text-xs font-semibold focus:outline-none focus:border-[#EC5E27] transition-colors cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.englishName}>
                        {l.englishName} ({l.label})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ephemeral Guarantee Banner */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-[#94A3B8] leading-relaxed">
                  <span className="font-bold text-white">{t('modal.guaranteeTitle', 'Zero Persistence Guarantee:')}</span> {t('modal.guaranteeDesc', 'Video and audio are routed via encrypted peer-to-peer WebRTC. No recordings or conversations are saved.')}
                </div>
              </div>
            </>
          ) : isSearching && !foundPeer ? (
            /* Live Radar Matchmaking State */
            <div className="py-8 text-center space-y-6">
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[#EC5E27]/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-[#EC5E27]/50 animate-pulse" />
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#EC5E27] to-[#FF5500] flex items-center justify-center shadow-[0_0_30px_rgba(236,94,39,0.7)]">
                  <RotateCw className="w-6 h-6 text-white animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {t('modal.searchingTitle', 'Searching for a Compatible Peer...')}
                </h3>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  {searchStep === 1 && t('modal.searchStep1', 'Scanning active online professionals pool...')}
                  {searchStep === 2 && t('modal.searchStep2', 'Scoring mutual interests and professional affinity...')}
                  {searchStep >= 3 && t('modal.searchStep3', 'Finalizing secure peer-to-peer WebRTC channel...')}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#FF5500]">
                <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-ping" />
                FORMAT: {selectedMode} • DOMAIN: {selectedProfession.toUpperCase()}
              </div>
            </div>
          ) : (
            /* Found Peer Preview Card */
            <div className="py-2 space-y-5 animate-scaleUp">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('modal.connectedTitle', 'Compatible Peer Located!')}
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                  {matchScore}% {t('modal.compatibilityScore', 'Compatibility')}
                </span>
              </div>

              {foundPeer && (
                <div className="p-5 rounded-xl bg-[#141B26] border border-white/[0.08] space-y-4 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC5E27] to-[#FF5500] flex items-center justify-center font-black text-lg text-white shadow-lg">
                        {foundPeer.displayName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base">
                          {foundPeer.displayName}
                        </h4>
                        <p className="text-xs text-[#FF5500] font-semibold">
                          {foundPeer.headline}
                        </p>
                        <p className="text-[11px] text-[#94A3B8]">
                          {foundPeer.location || 'Global Peer'} • {foundPeer.experience}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-white text-xs font-bold border border-white/[0.08]">
                      {foundPeer.professionName}
                    </span>
                  </div>

                  <p className="text-xs text-[#CBD5E1] leading-relaxed italic border-l-2 border-[#EC5E27] pl-3">
                    "{foundPeer.bio}"
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {foundPeer.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[11px] text-[#94A3B8] font-medium border border-white/[0.06]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070A0F] flex items-center justify-between gap-3 shrink-0">
          {!isSearching && !foundPeer ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                {t('modal.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleStartSearch}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#FF5500] hover:to-[#EC5E27] text-white font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(236,94,39,0.45)] hover:shadow-[0_0_30px_rgba(236,94,39,0.65)] hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>{t('modal.findPeer', 'Find Peer Now')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : isSearching && !foundPeer ? (
            <>
              <button
                type="button"
                onClick={() => setIsSearching(false)}
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                {t('modal.stopSearching', 'Stop Searching')}
              </button>
              <span className="text-xs text-[#94A3B8] font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27] animate-ping" />
                {t('modal.liveActive', 'Live matchmaker active')}
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSkipPeer}
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{t('modal.skip', 'Skip & Find Another')}</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmConnect}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#FF5500] hover:to-[#EC5E27] text-white font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(236,94,39,0.5)] hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>{t('modal.enterCall', 'Connect & Enter Call')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
