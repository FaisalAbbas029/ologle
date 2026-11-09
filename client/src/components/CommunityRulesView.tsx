import React from 'react';
import { COMMUNITY_RULES_CONTENT } from '../data/constants.ts';
import { BookOpen, ShieldCheck, ArrowRight, ArrowLeft, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface CommunityRulesViewProps {
  onStart: () => void;
  onBack: () => void;
}

export const CommunityRulesView: React.FC<CommunityRulesViewProps> = ({
  onStart,
  onBack,
}) => {
  const { t } = useLanguage();
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 transition-colors duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EC5E27]/15 border border-[#EC5E27]/30 text-xs font-bold uppercase tracking-wider text-[#EC5E27] mb-3 shadow-xs">
          <BookOpen className="w-3.5 h-3.5 text-[#EC5E27]" />
          <span>Ologle Standards</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Community Rules & Safety
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
          <span>Last updated: October 2026</span>
          <span>•</span>
          <span>Zero-Tolerance Conduct Policy</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          Ologle is a space for intellectual curiosity, debate, and respectful interest-based exchange. We enforce zero tolerance for harm, harassment, and abusive behavior.
        </p>
      </div>

      {/* Rules Cards */}
      <div className="space-y-4 mb-8">
        {COMMUNITY_RULES_CONTENT.map((rule, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1.5 transition-all hover:border-[#EC5E27]/40 backdrop-blur-sm"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-[#EC5E27] font-mono">#{idx + 1}</span>
              <span>{rule.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
              {rule.description}
            </p>
          </div>
        ))}
      </div>

      {/* Enforcement disclosure */}
      <div className="p-6 rounded-2xl bg-orange-50/70 dark:bg-slate-800/60 border border-orange-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-8 space-y-2 backdrop-blur-sm">
        <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>How Moderation Works</span>
        </div>
        <p className="leading-relaxed">
          Every message is evaluated in memory prior to relay. High-confidence violations are blocked automatically. Repeated violations trigger progressive penalties: 60-second temporary mute, followed by immediate conversation termination and a 5-minute session restriction.
        </p>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200/80 dark:border-white/10">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#EC5E27] dark:hover:text-[#EC5E27] text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={onStart}
          className="px-6 py-2.5 rounded-xl text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md cursor-pointer active:scale-95"
          style={{
            background: 'var(--theme-btn-gradient, linear-gradient(135deg, #EC5E27 0%, #EA580C 100%))',
          }}
        >
          <Zap className="w-4 h-4 text-amber-200 fill-current" />
          <span>{t('hero.findMatchBtn', 'Find Match')}</span>
        </button>
      </div>
    </div>
  );
};
