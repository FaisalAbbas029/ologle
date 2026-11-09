import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Sparkles,
  Plus,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getSuggestedInterestsForProfession,
  POPULAR_UNIVERSAL_TOPICS,
} from '../data/professionInterests.ts';
import { searchProfessions, validateProfession } from '../data/constants.ts';

interface DynamicProfessionInterestEngineProps {
  profession: string;
  onProfessionChange: (profession: string) => void;
  selectedInterests: string[];
  onToggleInterest: (interest: string) => void;
  onAddCustomInterest?: (interest: string) => void;
  onRemoveInterest?: (interest: string) => void;
  onStartMatching?: () => void;
  showContinueCTA?: boolean;
  ctaText?: string;
  className?: string;
}

export const DynamicProfessionInterestEngine: React.FC<DynamicProfessionInterestEngineProps> = ({
  profession,
  onProfessionChange,
  selectedInterests,
  onToggleInterest,
  onAddCustomInterest,
  onRemoveInterest,
  onStartMatching,
  showContinueCTA = false,
  ctaText = 'Start Talking with Selected Topics',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(profession || '');
  const [customInterestInput, setCustomInterestInput] = useState('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [isProfessionFocused, setIsProfessionFocused] = useState(false);
  const [professionSuggestions, setProfessionSuggestions] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal input value if prop updates externally
  useEffect(() => {
    setInputValue(profession || '');
  }, [profession]);

  // Autocomplete suggestions for profession
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length >= 1 && isProfessionFocused) {
      const matches = searchProfessions(trimmed, 6);
      setProfessionSuggestions(matches);
    } else {
      setProfessionSuggestions([]);
    }
  }, [inputValue, isProfessionFocused]);

  // Outside click listener to dismiss profession autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsProfessionFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute dynamic interests derived from current profession input
  const { clusterTagline, suggestedInterests } = useMemo(() => {
    return getSuggestedInterestsForProfession(inputValue);
  }, [inputValue]);

  // Validation
  const validation = useMemo(() => {
    const trimmed = inputValue.trim();
    return trimmed ? validateProfession(trimmed) : null;
  }, [inputValue]);

  const handleProfessionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onProfessionChange(val);
  };

  const handleSelectProfessionSuggestion = (selected: string) => {
    setInputValue(selected);
    onProfessionChange(selected);
    setProfessionSuggestions([]);
    setIsProfessionFocused(false);
    inputRef.current?.focus();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInterestInput.trim();
    if (!clean) return;

    if (selectedInterests.length >= 12) {
      setCustomInputError('Maximum of 12 active topics reached.');
      return;
    }

    if (clean.length < 2 || clean.length > 35 || /[<>{}[\]\\]/.test(clean)) {
      setCustomInputError('Please enter a valid topic title (2–35 characters).');
      return;
    }

    const adultCheck = /\b(sex|porn|nude|escort|camgirl|sugar\s*baby|sugar\s*daddy|onlyfans|nsfw|dating|singles|hookup|erotic|fetish)\b/i;
    if (adultCheck.test(clean)) {
      setCustomInputError('Adult and dating topics are not permitted.');
      return;
    }

    if (selectedInterests.some((i) => i.toLowerCase() === clean.toLowerCase())) {
      setCustomInputError('This topic is already selected.');
      return;
    }

    setCustomInputError(null);
    if (onAddCustomInterest) {
      onAddCustomInterest(clean);
    } else {
      onToggleInterest(clean);
    }
    setCustomInterestInput('');
  };

  return (
    <div
      className={`rounded-2xl bg-[#141414] border border-white/10 p-6 sm:p-8 lg:p-10 shadow-2xl transition-all duration-300 ease-in-out hover:border-white/10 text-white ${className}`}
    >
      {/* Engine Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EC5E27]/15 border border-[#EC5E27]/30 text-[11px] font-bold text-[#EC5E27] mb-2 uppercase tracking-wider shadow-[0_0_15px_rgba(236,94,39,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-[#EC5E27] animate-pulse" />
            <span>Dynamic Profession-to-Interest Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Tailor Your Conversation Synergy
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed max-w-2xl">
            Type your role, vocation, or field. The matching engine dynamically extracts correlated intellectual themes and discussion topics.
          </p>
        </div>

        {/* Live Active Topics Counter */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="px-3.5 py-1.5 rounded-xl bg-black border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-pulse" />
            <span className="text-xs font-mono font-bold text-white">
              {selectedInterests.length} Selected
            </span>
          </div>
        </div>
      </div>

      {/* Input Field for Profession */}
      <div className="mb-6 relative">
        <label
          htmlFor="engine-profession-input"
          className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2 flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>Your Profession or Field</span>
          </span>
          {validation?.isValid && (
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
              <Check className="w-3.5 h-3.5" />
              <span>Verified Role</span>
            </span>
          )}
        </label>

        <div className="relative">
          <input
            ref={inputRef}
            id="engine-profession-input"
            type="text"
            value={inputValue}
            onChange={handleProfessionChange}
            onFocus={() => setIsProfessionFocused(true)}
            placeholder="Type any role (e.g., Software Architect, Neuroscientist, UI Designer, High School Teacher)..."
            maxLength={60}
            autoComplete="off"
            className="w-full pl-4 pr-11 py-3.5 rounded-xl bg-black border border-white/10 text-sm font-medium text-white placeholder-neutral-500 transition-all duration-300 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27]"
          />

          {inputValue.trim() && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                onProfessionChange('');
                inputRef.current?.focus();
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1 cursor-pointer"
              aria-label="Clear profession input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {isProfessionFocused && professionSuggestions.length > 0 && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 bg-[#141414] border border-white/10/80 rounded-xl shadow-2xl z-40 overflow-hidden py-1 max-h-56 overflow-y-auto"
              >
                <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider border-b border-white/10">
                  Recognized Roles
                </div>
                {professionSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectProfessionSuggestion(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-neutral-200 hover:bg-[#EC5E27]/15 hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold">{item}</span>
                    <span className="text-[10px] text-neutral-400">Select</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Suggested Interest Tags Section */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              {clusterTagline}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            Click tags to toggle into your active match filter
          </span>
        </div>

        {/* Animated Clickable Tags Container */}
        <div className="flex flex-wrap gap-2.5">
          <AnimatePresence mode="popLayout">
            {suggestedInterests.map((interest, idx) => {
              const isSelected = selectedInterests.some(
                (i) => i.toLowerCase() === interest.toLowerCase()
              );
              return (
                <motion.button
                  key={`${interest}-${idx}`}
                  layout
                  initial={{ opacity: 0, scale: 0.85, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  onClick={() => onToggleInterest(interest)}
                  type="button"
                  className={`group px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#EC5E27] text-white shadow-[0_0_15px_rgba(236,94,39,0.4)] hover:scale-105'
                      : 'bg-black text-neutral-300 border border-white/10 hover:border-[#EC5E27]/50 hover:text-white hover:-translate-y-0.5'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-black shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#EC5E27] shrink-0 transition-colors" />
                  )}
                  <span>{interest}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Custom Interest Input (Type Custom Interests) */}
      <div className="pt-4 border-t border-white/10">
        <form onSubmit={handleAddCustom} className="space-y-2">
          <label
            htmlFor="custom-interest-input"
            className="block text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>Add Custom Interest or Niche Topic</span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="custom-interest-input"
              type="text"
              value={customInterestInput}
              onChange={(e) => {
                setCustomInterestInput(e.target.value);
                if (customInputError) setCustomInputError(null);
              }}
              placeholder="e.g. Distributed Consensus, Bioethics, Modular Synths..."
              maxLength={35}
              className="flex-1 px-4 py-3 rounded-xl bg-black border border-white/10 text-sm font-medium text-white placeholder-neutral-500 transition-all duration-300 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27]"
            />

            <button
              type="submit"
              disabled={!customInterestInput.trim()}
              className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-300 shadow-md ${
                customInterestInput.trim()
                  ? 'bg-[#EC5E27] hover:bg-[#D94E1A] text-white cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(236,94,39,0.3)]'
                  : 'bg-black text-neutral-500 border border-white/10 opacity-60 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Topic</span>
            </button>
          </div>

          {customInputError && (
            <p className="text-xs font-semibold text-rose-400 pt-1">
              {customInputError}
            </p>
          )}
        </form>
      </div>

      {/* Active Selected Tags Display */}
      {selectedInterests.length > 0 && (
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Active Match Filters ({selectedInterests.length})
            </span>
            <span className="text-[11px] text-neutral-500">
              Exact and correlated matches prioritized
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedInterests.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black border border-[#EC5E27]/40 text-xs font-bold text-white shadow-xs animate-in fade-in duration-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27]" />
                <span className="truncate max-w-[200px]">{item}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onRemoveInterest) onRemoveInterest(item);
                    else onToggleInterest(item);
                  }}
                  className="hover:text-rose-400 p-0.5 ml-1 transition-colors cursor-pointer"
                  aria-label={`Remove ${item}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Optional CTA to immediately jump into session */}
      {showContinueCTA && onStartMatching && (
        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-neutral-400">
            {selectedInterests.length < 3 ? (
              <span>Select at least 3 topics to maximize match accuracy.</span>
            ) : (
              <span className="text-white font-semibold">
                High matching compatibility ready.
              </span>
            )}
          </div>

          <button
            onClick={onStartMatching}
            disabled={selectedInterests.length < 1}
            className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg ${
              selectedInterests.length >= 1
                ? 'bg-[#EC5E27] hover:bg-[#D94E1A] text-white cursor-pointer hover:shadow-[0_0_20px_rgba(236,94,39,0.4)] active:scale-98'
                : 'bg-black text-neutral-500 border border-white/10 cursor-not-allowed opacity-60'
            }`}
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};
