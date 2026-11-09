import React from 'react';
import { Sparkles, X, Compass, Briefcase, Globe, Award } from 'lucide-react';
import { ScoreBreakdown } from '../types/index.ts';
import { CountryFlag } from './CountryFlag.tsx';

interface AffinityBreakdownModalProps {
  score: number;
  breakdown?: ScoreBreakdown;
  sharedInterests: string[];
  sharedTopics: string[];
  partnerProfession?: string;
  partnerCountry?: string;
  onClose: () => void;
}

export const AffinityBreakdownModal: React.FC<AffinityBreakdownModalProps> = ({
  score,
  breakdown,
  sharedInterests,
  sharedTopics,
  partnerProfession,
  partnerCountry,
  onClose,
}) => {
  const normalizedScore = Math.min(100, Math.max(20, score));

  return (
    <div
      id="affinity-breakdown-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md p-6 rounded-3xl bg-[#141414]/95 border border-white/10 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Ambient Blob */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#EC5E27]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/30 text-[#EC5E27]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Affinity Breakdown</h3>
              <p className="text-xs text-neutral-400">Algorithmic compatibility analysis</p>
            </div>
          </div>
          <button
            id="close-affinity-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Score Radial / Banner */}
        <div className="my-5 p-4 rounded-2xl bg-gradient-to-br from-[#EC5E27]/20 via-slate-900 to-amber-950/40 border border-[#EC5E27]/30 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#EC5E27]">
              Overall Affinity Match
            </div>
            <div className="text-3xl font-extrabold text-white mt-0.5 tracking-tight flex items-baseline gap-1">
              {normalizedScore}%
              <span className="text-xs font-normal text-neutral-400">/ 100%</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {normalizedScore >= 80
                ? 'Extremely high topic overlap'
                : normalizedScore >= 50
                ? 'Strong mutual interest alignment'
                : 'Curiosity-driven serendipity match'}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-[#EC5E27]/30 border-t-[#EC5E27] flex items-center justify-center text-white font-black text-lg shadow-[0_0_20px_rgba(236,94,39,0.3)]">
            <Award className="w-7 h-7 text-[#EC5E27]" />
          </div>
        </div>

        {/* Detailed Criteria List */}
        <div className="space-y-3 text-xs">
          {/* Shared Interests */}
          <div className="p-3 rounded-xl bg-[#1A1A1A]/50 border border-white/10/50 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-neutral-200">
              <span className="font-semibold flex items-center gap-1.5 text-white">
                <Compass className="w-4 h-4" /> Shared Core Interests
              </span>
              <span className="font-mono text-[#EC5E27] font-bold">
                {sharedInterests.length > 0 ? `+${sharedInterests.length * 20} pts` : '+0 pts'}
              </span>
            </div>
            {sharedInterests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {sharedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2 py-0.5 rounded-lg bg-[#EC5E27]/15 text-white border border-[#EC5E27]/30 text-[11px] font-medium"
                  >
                    #{interest}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-neutral-400 italic">Broadened discovery cluster</span>
            )}
          </div>

          {/* Profession Alignment */}
          <div className="p-3 rounded-xl bg-[#1A1A1A]/50 border border-white/10/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-neutral-300" />
              <div>
                <div className="font-semibold text-neutral-200">Profession Context</div>
                <div className="text-[11px] text-neutral-400">
                  {partnerProfession ? partnerProfession : 'Anonymous Professional'}
                </div>
              </div>
            </div>
            <span className="font-mono text-neutral-300 font-bold">
              {breakdown?.professionBonus ? '+5 pts (Synergy)' : '+0 pts'}
            </span>
          </div>

          {/* Country / Global Scope */}
          <div className="p-3 rounded-xl bg-[#1A1A1A]/50 border border-white/10/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-neutral-200">Location Scope</div>
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  {partnerCountry && partnerCountry !== 'GLOBAL' ? (
                    <>
                      <CountryFlag code={partnerCountry} className="w-3.5 h-2.5" />
                      <span>{partnerCountry}</span>
                    </>
                  ) : (
                    'Global Network'
                  )}
                </div>
              </div>
            </div>
            <span className="font-mono text-emerald-400 font-bold">
              {breakdown?.countryBonus ? '+25 pts (Local)' : '+0 pts'}
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Ephemeral calculation • Zero data stored</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-neutral-200 font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
