import React, { useState } from 'react';
import {
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Globe,
  Video,
  Mic,
  Check,
  Sparkles,
  Shield,
  Volume2,
  Subtitles,
  Zap,
} from 'lucide-react';
import { COUNTRIES_LIST, getCountryByCode } from '../data/countriesData.ts';
import { CountryFlag } from './CountryFlag.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface ModeSelectViewProps {
  selectedProfession: string;
  selectedInterests: string[];
  communities?: any[];
  classes?: any[];
  selectedCountry?: string;
  onSelectCountry?: (country: string) => void;
  onStart1on1: (mode?: 'video' | 'voice' | 'messaging') => void;
  onJoinCommunity?: (id: string) => void;
  onCreateCommunity?: (name: string, topic: string, category: string) => void;
  onJoinClass?: (id: string) => void;
  onCreateClass?: (name: string, topic: string) => void;
  onBack: () => void;
  initialMode?: 'video' | 'voice' | 'messaging';
}

export const ModeSelectView: React.FC<ModeSelectViewProps> = ({
  selectedProfession,
  selectedInterests,
  selectedCountry = 'GLOBAL',
  onSelectCountry,
  onStart1on1,
  onBack,
  initialMode = 'video',
}) => {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<'video' | 'voice' | 'messaging'>(initialMode);
  const [localCountry, setLocalCountry] = useState<string>(selectedCountry || 'GLOBAL');
  const [searchScopeMode, setSearchScopeMode] = useState<'global' | 'country'>(
    selectedCountry && selectedCountry !== 'GLOBAL' ? 'country' : 'global'
  );

  const handleCountrySelect = (code: string) => {
    setLocalCountry(code);
    if (code === 'GLOBAL') {
      setSearchScopeMode('global');
    } else {
      setSearchScopeMode('country');
    }
    if (onSelectCountry) onSelectCountry(code);
  };

  const MODES = [
    {
      id: 'video' as const,
      title: t('mode.videoTitle', 'Video Call'),
      badge: t('mode.videoBadge', 'Most Popular'),
      badgeColor: 'bg-[#EC5E27]/15 text-[#EC5E27] border-[#EC5E27]/30',
      description: t('mode.videoDesc', 'Real-time face-to-face video with live captions and dual stream layout.'),
      icon: Video,
      features: [
        { label: t('mode.videoFeature1', 'HD WebRTC Video'), icon: Video },
        { label: t('mode.videoFeature2', 'Live AI Captions (CC)'), icon: Subtitles },
        { label: t('mode.videoFeature3', 'Camera Flip & Mute'), icon: Zap },
      ],
    },
    {
      id: 'voice' as const,
      title: t('mode.audioTitle', 'Audio Call'),
      badge: t('mode.audioBadge', 'Voice + Chat'),
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description: t('mode.audioDesc', 'High-definition voice conversation with simultaneous real-time text messaging.'),
      icon: Mic,
      features: [
        { label: t('mode.audioFeature1', '48kHz HD Audio'), icon: Volume2 },
        { label: t('mode.audioFeature2', 'Live Equalizer Waveform'), icon: Zap },
        { label: t('mode.audioFeature3', 'Integrated Text Messaging'), icon: MessageSquare },
      ],
    },
    {
      id: 'messaging' as const,
      title: t('mode.messagesTitle', 'Messages Chat'),
      badge: t('mode.messagesBadge', 'Low Bandwidth'),
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      description: t('mode.messagesDesc', 'Clean, encrypted real-time text chat with rich emojis and attachments.'),
      icon: MessageSquare,
      features: [
        { label: t('mode.messagesFeature1', 'End-to-End Encrypted'), icon: Shield },
        { label: t('mode.messagesFeature2', 'Emoji & Attachment Support'), icon: Sparkles },
        { label: t('mode.messagesFeature3', 'Zero Storage Retention'), icon: Shield },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 text-slate-700 dark:text-[#94A3B8]">
      {/* Step Badge & Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0E6] dark:bg-[#EC5E27]/15 border border-[#FFD9C6] dark:border-[#EC5E27]/30 text-xs font-bold uppercase tracking-wider text-[#EC5E27] shadow-[0_0_15px_rgba(236,94,39,0.15)]">
          <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
          <span>{t('mode.stepBadge', 'Step 3 of 3 • Choose Session Mode')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('mode.title', 'Choose Your Conversation Mode')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          {t('mode.subtitle', 'Connect with intellectual peers worldwide through HD video, crystal-clear voice, or distraction-free text messaging.')}
        </p>

        {/* Active Criteria Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
          <span className="font-semibold text-slate-700 dark:text-neutral-300">
            {t('mode.activeCriteria', 'Active Criteria')}:
          </span>
          {selectedProfession.trim() ? (
            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFF0E6] dark:bg-[#1E1E20] border border-[#FFD9C6] dark:border-[#EC5E27]/40 text-[#EC5E27] font-bold">
              {selectedProfession.trim()}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1E1E20] border border-orange-100 dark:border-white/10 text-slate-500 dark:text-neutral-400 font-semibold">
              {t('mode.generalDomain', 'General Domain')}
            </span>
          )}

          <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1E1E20] border border-orange-100 dark:border-white/10 text-slate-700 dark:text-neutral-300 font-semibold">
            {selectedInterests.length} {t('mode.interestsCount', 'interests selected')}
          </span>

          {searchScopeMode === 'country' && localCountry !== 'GLOBAL' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1E1E20] border border-orange-100 dark:border-white/10 text-slate-700 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
              <CountryFlag code={localCountry} className="w-3.5 h-2.5 inline-block" />
              <span>{getCountryByCode(localCountry)?.name || localCountry}</span>
            </span>
          )}
        </div>
      </div>

      {/* THREE INTERACTIVE MODE CARDS (Messages, Audio Call, Video Call) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const Icon = mode.icon;

          return (
            <div
              key={mode.id}
              role="button"
              tabIndex={0}
              id={`mode-select-${mode.id === 'voice' ? 'audio' : mode.id}-btn`}
              data-testid={`mode-select-${mode.id === 'voice' ? 'audio' : mode.id}-btn`}
              onClick={() => setSelectedMode(mode.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMode(mode.id);
                }
              }}
              className={`p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative group ${
                isSelected
                  ? 'bg-gradient-to-b from-[#FFF5EE] to-white dark:from-[#1E1E24] dark:to-[#141416] border-[#EC5E27] shadow-[0_10px_30px_rgba(236,94,39,0.22)] scale-[1.02]'
                  : 'bg-white dark:bg-[#141416]/90 border-orange-100 dark:border-white/10 hover:border-[#EC5E27]/50 hover:shadow-lg dark:hover:bg-[#18181C]'
              }`}
            >
              {/* Top Row: Icon + Badge + Selection Checkmark */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#EC5E27] to-[#FF5500] text-white shadow-[0_0_20px_rgba(236,94,39,0.4)]'
                        : 'bg-orange-50 dark:bg-white/5 text-slate-700 dark:text-neutral-300 group-hover:text-[#EC5E27] group-hover:bg-[#FFF0E6]'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${mode.badgeColor}`}>
                      {mode.badge}
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#EC5E27] text-white shadow-sm'
                          : 'border-2 border-slate-300 dark:border-neutral-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <span>{mode.title}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed mb-4">
                  {mode.description}
                </p>
              </div>

              {/* Feature Bullet Chips */}
              <div className="space-y-2 pt-3 border-t border-orange-100 dark:border-white/10">
                {mode.features.map((feat, idx) => {
                  const FeatIcon = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-neutral-300"
                    >
                      <FeatIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#EC5E27]' : 'text-slate-400 dark:text-neutral-500'}`} />
                      <span>{feat.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Active selection bar indicator */}
              {isSelected && (
                <div className="absolute -bottom-0.5 left-6 right-6 h-1 rounded-full bg-gradient-to-r from-[#EC5E27] to-[#FF5500]" />
              )}
            </div>
          );
        })}
      </div>

      {/* SEARCH SCOPE CARD (Global vs Country-Wise) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#141416]/90 backdrop-blur-xl border border-orange-100 dark:border-white/10 shadow-lg mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-white/5 flex items-center justify-center text-[#EC5E27]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('mode.searchScope', 'Search Scope')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {searchScopeMode === 'global'
                  ? t('mode.matchingWorldwide', 'Matching intellectual peers worldwide across all active timezones.')
                  : `${t('mode.matchingCountry', 'Matching peers located exclusively in')} ${getCountryByCode(localCountry)?.name || localCountry}.`}
              </p>
            </div>
          </div>

          {/* Scope Toggle Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-orange-50/80 dark:bg-black/40 border border-orange-200/60 dark:border-white/10 self-start sm:self-auto shrink-0">
            <button
              type="button"
              id="scope-global-btn"
              onClick={() => handleCountrySelect('GLOBAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                searchScopeMode === 'global'
                  ? 'bg-[#EC5E27] text-white shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('mode.global', 'Global')}
            </button>
            <button
              type="button"
              id="scope-country-btn"
              onClick={() => {
                setSearchScopeMode('country');
                if (localCountry === 'GLOBAL') handleCountrySelect('US');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                searchScopeMode === 'country'
                  ? 'bg-[#EC5E27] text-white shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('mode.countryWise', 'Country-Wise')}
            </button>
          </div>
        </div>

        {/* Country-Wise Selection Controls */}
        {searchScopeMode === 'country' && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                {t('mode.selectCountry', 'Select Country')}:
              </span>
              <select
                id="country-scope-dropdown"
                value={localCountry}
                onChange={(e) => handleCountrySelect(e.target.value)}
                className="bg-white dark:bg-[#1E1E24] border border-orange-200 dark:border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#EC5E27] cursor-pointer shadow-xs"
              >
                {COUNTRIES_LIST.filter((c) => c.code !== 'GLOBAL').map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Country Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['PS', 'US', 'GB', 'CA', 'IN', 'DE', 'AU', 'JP', 'BR'].map((code) => {
                const item = getCountryByCode(code);
                const isSelected = localCountry === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleCountrySelect(code)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      isSelected
                        ? 'bg-[#EC5E27] text-white shadow-md'
                        : 'bg-white dark:bg-[#1E1E24] border border-orange-100 dark:border-white/10 text-slate-700 dark:text-neutral-300 hover:text-[#EC5E27] hover:border-[#EC5E27]/40'
                    }`}
                  >
                    <CountryFlag code={item.code} name={item.name} flagEmoji={item.flag} className="w-4 h-2.5 shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS: Back to Interests & Primary Start Match Button */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-orange-100 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-orange-200 dark:border-white/15 bg-white dark:bg-[#141416] text-slate-700 dark:text-neutral-300 hover:border-[#EC5E27] hover:text-[#EC5E27] text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('mode.changeInterests', 'Change Interests')}</span>
        </button>

        <button
          id="mode-select-start-match-btn"
          data-testid="mode-select-start-match-btn"
          type="button"
          onClick={() => onStart1on1(selectedMode)}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(236,94,39,0.4)] cursor-pointer hover:scale-[1.02] active:scale-95"
        >
          {selectedMode === 'video' ? (
            <Video className="w-4 h-4 text-white" />
          ) : selectedMode === 'voice' ? (
            <Mic className="w-4 h-4 text-white" />
          ) : (
            <MessageSquare className="w-4 h-4 text-white" />
          )}
          <span>
            {t('mode.startMatch', 'Start Match')} (
            {selectedMode === 'video'
              ? t('mode.videoTitle', 'Video Call')
              : selectedMode === 'voice'
              ? t('mode.audioTitle', 'Audio Call')
              : t('mode.messagesTitle', 'Messages Chat')}
            )
          </span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};
