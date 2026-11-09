import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PRESET_INTERESTS } from '../data/constants.ts';
import { getSuggestedInterestsForProfession } from '../data/professionInterests.ts';
import {
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Tag,
  Sparkles,
  Check,
  AlertCircle,
  Briefcase,
  Layers,
  Compass,
} from 'lucide-react';

interface InterestSelectViewProps {
  selectedInterests: string[];
  onToggleInterest: (interest: string) => void;
  onAddCustomInterest: (interest: string) => void;
  onRemoveInterest: (interest: string) => void;
  onNext: () => void;
  onBack: () => void;
  profession?: string;
}

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 10;

export const InterestSelectView: React.FC<InterestSelectViewProps> = ({
  selectedInterests,
  onToggleInterest,
  onAddCustomInterest,
  onRemoveInterest,
  onNext,
  onBack,
  profession = '',
}) => {
  const [customInput, setCustomInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const isSatisfied = selectedInterests.length >= MIN_INTERESTS;
  const isMaxReached = selectedInterests.length >= MAX_INTERESTS;

  // Dynamic suggested interests derived from user's chosen profession
  const { clusterTagline, suggestedInterests } = useMemo(() => {
    return getSuggestedInterestsForProfession(profession);
  }, [profession]);

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;

    if (isMaxReached) {
      setInputError(`Maximum of ${MAX_INTERESTS} interests reached.`);
      return;
    }

    // Safety checks against script tags or excessive lengths
    if (clean.length < 2 || clean.length > 35 || /[<>{}[\]\\]/.test(clean)) {
      setInputError('Please enter a standard topic title (2–35 characters).');
      return;
    }

    // Check against sexual/adult/inappropriate topics
    const adultCheck = /\b(sex|porn|nude|escort|camgirl|sugar\s*baby|sugar\s*daddy|onlyfans|nsfw|dating|singles|hookup|erotic|fetish)\b/i;
    if (adultCheck.test(clean)) {
      setInputError('Adult and dating topics are not permitted.');
      return;
    }

    setInputError(null);
    if (!selectedInterests.some((i) => i.toLowerCase() === clean.toLowerCase())) {
      onAddCustomInterest(clean);
      setCustomInput('');
    } else {
      setInputError('This topic is already in your selected list.');
    }
  };

  const handleChipClick = (interest: string) => {
    const isSelected = selectedInterests.some((i) => i.toLowerCase() === interest.toLowerCase());
    if (!isSelected && isMaxReached) {
      setInputError(`Maximum of ${MAX_INTERESTS} interests reached.`);
      return;
    }
    if (inputError) setInputError(null);
    onToggleInterest(interest);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 text-slate-800 dark:text-white">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0E6] dark:bg-[#EC5E27]/15 border border-[#FFD9C6] dark:border-[#EC5E27]/40 text-xs font-bold uppercase tracking-wider text-[#EC5E27] mb-3 shadow-[0_0_15px_rgba(236,94,39,0.15)]">
          <Layers className="w-3.5 h-3.5" />
          <span>Step 2 of 3: Conversation Topics</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Select at least 3 conversation interests
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-300 mt-2 leading-relaxed max-w-3xl">
          Ologle connects you directly with peers who share your selected topics. Choose from suggestions tailored to your background, select preset themes, or add your own custom interests.
        </p>
      </div>

      {/* Bento Box Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Main Column (8 cols): Profession-Derived Suggestions & Preset Cloud */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Dynamic Profession-to-Interest Card */}
          {profession && (
            <div className="rounded-2xl bg-white dark:bg-[#141414] backdrop-blur-xl border border-orange-100 dark:border-white/10 p-6 sm:p-8 shadow-xl transition-all duration-300 ease-in-out hover:border-[#EC5E27]/40 hover:-translate-y-0.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-orange-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#EC5E27]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                    Suggested for {profession}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  {clusterTagline}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedInterests.map((interest) => {
                  const isSelected = selectedInterests.some(
                    (i) => i.toLowerCase() === interest.toLowerCase()
                  );
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleChipClick(interest)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[#EC5E27] hover:bg-[#D94E1A] text-white shadow-[0_0_15px_rgba(236,94,39,0.35)]'
                          : 'bg-[#FFF9F3] dark:bg-black text-slate-700 dark:text-neutral-300 border border-orange-200/60 dark:border-white/10 hover:border-[#EC5E27]/50 hover:text-[#EC5E27] dark:hover:text-white hover:-translate-y-0.5'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400" />
                      )}
                      <span>{interest}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preset Topics Cloud Card */}
          <div className="rounded-2xl bg-white dark:bg-[#141414] backdrop-blur-xl border border-orange-100 dark:border-white/10 p-6 sm:p-8 shadow-xl transition-all duration-300 ease-in-out hover:border-[#EC5E27]/40 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#EC5E27]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Universal Discussion Topics
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                {selectedInterests.length} / {MAX_INTERESTS} Maximum
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {PRESET_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.some(
                  (i) => i.toLowerCase() === interest.toLowerCase()
                );
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleChipClick(interest)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#EC5E27] hover:bg-[#D94E1A] text-white shadow-[0_0_15px_rgba(236,94,39,0.35)] font-bold'
                        : 'bg-[#FFF9F3] dark:bg-black text-slate-700 dark:text-neutral-300 border border-orange-200/60 dark:border-white/10 hover:border-[#EC5E27]/50 hover:text-[#EC5E27] dark:hover:text-white hover:-translate-y-0.5'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Column (4 cols): Selected Queue & Custom Input Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Selection Tracker Card */}
          <div className="rounded-2xl bg-white dark:bg-[#141414] backdrop-blur-xl border border-orange-100 dark:border-white/10 p-6 sm:p-8 shadow-xl transition-all duration-300 ease-in-out hover:border-[#EC5E27]/40 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-100 dark:border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#EC5E27]" />
                <span>Selected Queue</span>
              </span>

              {isSatisfied ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EC5E27] dark:text-white bg-[#FFF0E6] dark:bg-[#EC5E27]/15 px-2.5 py-1 rounded-full border border-[#FFD9C6] dark:border-[#EC5E27]/40">
                  <Check className="w-3 h-3 text-[#EC5E27]" />
                  <span>{selectedInterests.length} Ready</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#EC5E27]">
                  {MIN_INTERESTS - selectedInterests.length} more needed
                </span>
              )}
            </div>

            {/* Selected Tags List */}
            {selectedInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {selectedInterests.map((interest) => (
                    <motion.span
                      key={interest}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF0E6] dark:bg-black border border-[#FFD9C6] dark:border-[#EC5E27]/40 text-[#EC5E27] dark:text-white text-xs font-bold shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27]" />
                      <span className="truncate max-w-[150px]">{interest}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveInterest(interest)}
                        className="hover:text-rose-500 rounded ml-0.5 cursor-pointer transition-colors"
                        aria-label={`Remove ${interest}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-neutral-400 italic py-2 leading-relaxed">
                0 topics chosen. Click any topic or add your own custom field below to fulfill the 3-topic requirement.
              </p>
            )}
          </div>

          {/* Add Custom Interest Form Card */}
          <div className="rounded-2xl bg-white dark:bg-[#141414] backdrop-blur-xl border border-orange-100 dark:border-white/10 p-6 sm:p-8 shadow-xl transition-all duration-300 ease-in-out hover:border-[#EC5E27]/40 hover:-translate-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#EC5E27]" />
              <span>Add Custom Topic</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed mb-4">
              Enter any niche intellectual passion, programming framework, or field of study.
            </p>

            <form onSubmit={handleAddCustom} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="e.g. Distributed Systems, Bioethics, Rust..."
                  maxLength={35}
                  disabled={isMaxReached}
                  className="w-full px-4 py-3 rounded-xl bg-[#FFFDFB] dark:bg-black border border-orange-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27] disabled:opacity-50 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={!customInput.trim() || isMaxReached}
                className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${
                  customInput.trim() && !isMaxReached
                    ? 'bg-[#EC5E27] hover:bg-[#D94E1A] text-white shadow-[0_0_15px_rgba(236,94,39,0.3)] cursor-pointer'
                    : 'bg-slate-100 dark:bg-black text-slate-400 dark:text-neutral-500 border border-orange-100 dark:border-white/10 opacity-50 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4 text-white" />
                <span>+ Add to Queue</span>
              </button>

              {inputError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{inputError}</span>
                </div>
              )}
            </form>
          </div>

        </div>

      </div>

      {/* Footer Navigation Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-orange-100 dark:border-white/10">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-orange-200 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-orange-50 dark:hover:bg-[#1E1E1E] text-slate-700 dark:text-neutral-200 hover:text-[#EC5E27] text-sm font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profession</span>
        </button>

        <button
          onClick={onNext}
          disabled={!isSatisfied}
          className={`px-8 py-3.5 rounded-xl text-sm font-extrabold tracking-wide transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap shrink-0 ${
            isSatisfied
              ? 'bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#FF5500] hover:to-[#EC5E27] text-white shadow-[0_0_20px_rgba(236,94,39,0.4)] active:scale-95 cursor-pointer'
              : 'bg-slate-200 dark:bg-[#181818] text-slate-400 dark:text-neutral-500 border border-slate-300 dark:border-white/10 opacity-50 cursor-not-allowed'
          }`}
        >
          <span>Continue to 1:1 Match</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
