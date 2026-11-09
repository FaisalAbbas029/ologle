import React, { useState } from 'react';
import { MessageSquare, ArrowRight, ArrowLeft, Globe, Video, Mic } from 'lucide-react';
import { COUNTRIES_LIST, getCountryByCode } from '../data/countriesData.ts';
import { CountryFlag } from './CountryFlag.tsx';

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 text-slate-700 dark:text-[#94A3B8]">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0E6] dark:bg-[#EC5E27]/15 border border-[#FFD9C6] dark:border-[#EC5E27]/30 text-xs font-bold uppercase tracking-wider text-[#EC5E27] mb-2 shadow-[0_0_15px_rgba(236,94,39,0.15)]">
          <span>Step 3 of 3 • Search Scope</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">1-on-1 High Synergy Match</h1>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600 dark:text-[#94A3B8]">
          <span className="font-semibold text-slate-700 dark:text-neutral-300">Active Criteria:</span>
          {selectedProfession.trim() ? (
            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFF0E6] dark:bg-[#0F172A] border border-[#FFD9C6] dark:border-[#EC5E27]/40 text-[#EC5E27] font-semibold">
              {selectedProfession.trim()}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#0F172A] border border-orange-100 dark:border-white/[0.08] text-slate-500 dark:text-neutral-400 font-semibold">
              General Domain
            </span>
          )}
          <span>with {selectedInterests.length} interest{selectedInterests.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Main 1-on-1 High Synergy Match Card */}
      <div className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#0F172A]/70 backdrop-blur-xl border border-orange-100 dark:border-white/[0.08] shadow-xl mb-8 relative hover:border-[#EC5E27]/40 transition-all">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF0E6] dark:bg-[#EC5E27]/15 border border-[#FFD9C6] dark:border-[#EC5E27]/30 text-[#EC5E27] flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(236,94,39,0.2)]">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">1-on-1 High Synergy Match</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed mb-6">
            Connect directly with an intellectual peer who shares your exact professional background and active technical interests. Powered by real-time WebRTC media streams with zero server data retention.
          </p>

          {/* Scope Selector */}
          <div className="p-4 rounded-xl bg-[#FFF9F3] dark:bg-[#05070B] border border-orange-200/60 dark:border-white/[0.08] text-left mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#EC5E27]" />
                <span>Search Scope</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCountrySelect('GLOBAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    searchScopeMode === 'global'
                      ? 'bg-[#EC5E27] text-white shadow-[0_0_10px_rgba(236,94,39,0.3)]'
                      : 'bg-white dark:bg-[#0F172A] border border-orange-100 dark:border-white/[0.08] text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Global
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchScopeMode('country');
                    if (localCountry === 'GLOBAL') handleCountrySelect('US');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    searchScopeMode === 'country'
                      ? 'bg-[#EC5E27] text-white shadow-[0_0_10px_rgba(236,94,39,0.3)]'
                      : 'bg-white dark:bg-[#0F172A] border border-orange-100 dark:border-white/[0.08] text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Country-Wise
                </button>
              </div>
            </div>

            {searchScopeMode === 'global' ? (
              <div className="text-xs text-slate-600 dark:text-neutral-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Matching peers <strong className="text-slate-900 dark:text-white">worldwide</strong> across all active timezones.</span>
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t border-orange-200/50 dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-neutral-400 font-semibold">Country:</span>
                  <select
                    value={localCountry}
                    onChange={(e) => handleCountrySelect(e.target.value)}
                    className="bg-white dark:bg-[#0B0F17] border border-orange-200 dark:border-white/[0.12] rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#EC5E27] cursor-pointer"
                  >
                    {COUNTRIES_LIST.filter((c) => c.code !== 'GLOBAL').map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {['PS', 'US', 'GB', 'CA', 'IN', 'DE', 'AU', 'JP', 'BR'].map((code) => {
                    const item = getCountryByCode(code);
                    const isSelected = localCountry === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleCountrySelect(code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#EC5E27] text-white shadow-md'
                            : 'bg-white dark:bg-[#0B0F17] border border-orange-100 dark:border-white/[0.08] text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-[#0F172A]'
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

          {/* Mode Selector */}
          <div className="p-4 rounded-xl bg-[#FFF9F3] dark:bg-[#05070B] border border-orange-200/60 dark:border-white/[0.08] text-left mb-6 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
              <span>Conversation Mode</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="mode-select-video-btn"
                data-testid="mode-select-video"
                type="button"
                onClick={() => setSelectedMode('video')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedMode === 'video'
                    ? 'border-[#EC5E27] bg-[#FFF0E6] dark:bg-[#EC5E27]/15 text-[#EC5E27] dark:text-white shadow-[0_0_15px_rgba(236,94,39,0.25)]'
                    : 'border-orange-100 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] text-slate-600 dark:text-neutral-400 hover:text-[#EC5E27] dark:hover:text-white'
                }`}
              >
                <Video className={`w-5 h-5 mb-1 ${selectedMode === 'video' ? 'text-[#EC5E27]' : 'text-neutral-400'}`} />
                <span className="text-xs font-bold">Video Mode</span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400">Camera & Audio</span>
              </button>

              <button
                id="mode-select-audio-btn"
                data-testid="mode-select-audio"
                type="button"
                onClick={() => setSelectedMode('voice')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedMode === 'voice'
                    ? 'border-[#EC5E27] bg-[#FFF0E6] dark:bg-[#EC5E27]/15 text-[#EC5E27] dark:text-white shadow-[0_0_15px_rgba(236,94,39,0.25)]'
                    : 'border-orange-100 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] text-slate-600 dark:text-neutral-400 hover:text-[#EC5E27] dark:hover:text-white'
                }`}
              >
                <Mic className={`w-5 h-5 mb-1 ${selectedMode === 'voice' ? 'text-[#EC5E27]' : 'text-neutral-400'}`} />
                <span className="text-xs font-bold">Audio Mode</span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400">Voice Only</span>
              </button>

              <button
                id="mode-select-messages-btn"
                data-testid="mode-select-messages"
                type="button"
                onClick={() => setSelectedMode('messaging')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedMode === 'messaging'
                    ? 'border-[#EC5E27] bg-[#FFF0E6] dark:bg-[#EC5E27]/15 text-[#EC5E27] dark:text-white shadow-[0_0_15px_rgba(236,94,39,0.25)]'
                    : 'border-orange-100 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] text-slate-600 dark:text-neutral-400 hover:text-[#EC5E27] dark:hover:text-white'
                }`}
              >
                <MessageSquare className={`w-5 h-5 mb-1 ${selectedMode === 'messaging' ? 'text-[#EC5E27]' : 'text-neutral-400'}`} />
                <span className="text-xs font-bold">Messages Mode</span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400">Text Chat</span>
              </button>
            </div>
          </div>

          <button
            id="mode-select-start-match-btn"
            type="button"
            onClick={() => onStart1on1(selectedMode)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#FF5500] hover:to-[#EC5E27] text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 mx-auto shadow-[0_0_25px_rgba(236,94,39,0.4)] cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            {selectedMode === 'video' ? (
              <Video className="w-4 h-4 fill-white text-white" />
            ) : selectedMode === 'voice' ? (
              <Mic className="w-4 h-4 text-white" />
            ) : (
              <MessageSquare className="w-4 h-4 text-white" />
            )}
            <span>
              Start {selectedMode === 'video' ? 'Video' : selectedMode === 'voice' ? 'Audio' : 'Messages'} Match
            </span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Footer Back */}
      <div className="pt-6 border-t border-orange-100 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-orange-200 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-neutral-300 hover:border-[#EC5E27] hover:text-[#EC5E27] text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Interests</span>
        </button>
      </div>
    </div>
  );
};
