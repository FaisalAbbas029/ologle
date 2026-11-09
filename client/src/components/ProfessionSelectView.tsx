import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Plus,
  Check,
  X,
  Layers,
  Zap,
} from 'lucide-react';
import { validateProfession, searchProfessions } from '../data/constants.ts';
import { getSuggestedInterestsForProfession } from '../data/professionInterests.ts';

interface ProfessionSelectViewProps {
  selectedProfession: string;
  onSelectProfession: (profession: string) => void;
  selectedInterests?: string[];
  onToggleInterest?: (interest: string) => void;
  onAddCustomInterest?: (interest: string) => void;
  onRemoveInterest?: (interest: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ProfessionSelectView: React.FC<ProfessionSelectViewProps> = ({
  selectedProfession,
  onSelectProfession,
  selectedInterests = [],
  onToggleInterest,
  onAddCustomInterest,
  onRemoveInterest,
  onNext,
  onBack,
}) => {
  const [inputValue, setInputValue] = useState(selectedProfession || '');
  const [customInterestInput, setCustomInterestInput] = useState('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [hasValidated, setHasValidated] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with prop if changed externally
  useEffect(() => {
    setInputValue(selectedProfession || '');
    if (selectedProfession) {
      const res = validateProfession(selectedProfession);
      if (!res.isValid) {
        setErrorMessage(res.error || 'Please enter a valid profession.');
      } else {
        setErrorMessage(null);
      }
    }
  }, [selectedProfession]);

  // Autocomplete suggestions
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length >= 1 && isFocused) {
      const matches = searchProfessions(trimmed, 6);
      setSuggestions(matches);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, isFocused]);

  // Outside click handler
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute dynamic interests based on typed profession
  const { clusterTagline, suggestedInterests } = getSuggestedInterestsForProfession(inputValue);

  const runValidation = (value: string, showEmpty = false): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      if (showEmpty) {
        setErrorMessage('Please enter your profession to continue.');
      } else {
        setErrorMessage(null);
      }
      return false;
    }

    const result = validateProfession(trimmed);
    if (!result.isValid) {
      setErrorMessage(result.error || 'Please enter a valid profession.');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onSelectProfession(val);
    setHasValidated(true);

    if (val.trim()) {
      runValidation(val, false);
    } else {
      setErrorMessage(null);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    onSelectProfession(suggestion);
    setSuggestions([]);
    setErrorMessage(null);
    setIsFocused(false);
    setHasValidated(true);
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    setTimeout(() => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        setErrorMessage('Please enter your profession to continue.');
      } else {
        runValidation(trimmed, true);
      }
      setHasValidated(true);
    }, 150);
  };

  const handleContinue = () => {
    setHasValidated(true);
    const clean = inputValue.trim();
    if (!clean) {
      setErrorMessage('Please enter your profession to continue.');
      inputRef.current?.focus();
      return;
    }

    const isValid = runValidation(clean, true);
    if (!isValid) {
      inputRef.current?.focus();
      return;
    }

    onSelectProfession(clean);
    onNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === 'Enter' && selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleContinue();
    }
  };

  const handleToggleTag = (tag: string) => {
    if (onToggleInterest) {
      onToggleInterest(tag);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInterestInput.trim();
    if (!clean) return;

    if (selectedInterests.length >= 10) {
      setCustomInputError('Maximum of 10 interests reached.');
      return;
    }

    if (clean.length < 2 || clean.length > 35 || /[<>{}[\]\\]/.test(clean)) {
      setCustomInputError('Please enter a standard topic title (2–35 characters).');
      return;
    }

    const adultCheck = /\b(sex|porn|nude|escort|camgirl|sugar\s*baby|sugar\s*daddy|onlyfans|nsfw|dating|singles|hookup|erotic|fetish)\b/i;
    if (adultCheck.test(clean)) {
      setCustomInputError('Adult and dating topics are not permitted.');
      return;
    }

    if (selectedInterests.some((i) => i.toLowerCase() === clean.toLowerCase())) {
      setCustomInputError('This topic is already in your selected list.');
      return;
    }

    setCustomInputError(null);
    if (onAddCustomInterest) {
      onAddCustomInterest(clean);
    } else if (onToggleInterest) {
      onToggleInterest(clean);
    }
    setCustomInterestInput('');
  };

  const trimmed = inputValue.trim();
  const validationResult = trimmed ? validateProfession(trimmed) : null;
  const isInputStrictlyValid = trimmed.length > 0 && validationResult?.isValid === true;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10 text-slate-700 dark:text-[#94A3B8]">
      {/* Header with Step Indicator */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0E6] dark:bg-[#EC5E27]/15 border border-[#FFD9C6] dark:border-[#EC5E27]/30 text-xs font-bold uppercase tracking-wider text-[#EC5E27] mb-2.5 shadow-xs">
          <Layers className="w-3.5 h-3.5" />
          <span>Step 1 of 3: Identity & Dialogue Context</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          What is your profession or role?
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-1.5 leading-relaxed max-w-2xl mx-auto">
          Enter your current field or vocation. Our matching engine correlates your professional background with intellectual topics to connect you with peers who match your depth.
        </p>
      </div>

      {/* Main Container styled exactly like Hero Section Search Tab */}
      <div className="rounded-[22px] bg-white dark:bg-[#1E293B] border border-orange-200/80 dark:border-slate-700/80 p-5 sm:p-7 shadow-xl space-y-6 transition-all duration-300">
        
        {/* Row 1: Profession Input + Autocomplete */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="profession-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#EC5E27]" />
              <span>Job Title, Vocation, or Role</span>
              <span className="text-[#EC5E27]">*</span>
            </label>

            {isInputStrictlyValid && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#EC5E27] dark:text-white font-bold bg-[#FFF0E6] dark:bg-[#EC5E27]/15 border border-[#FFD9C6] dark:border-[#EC5E27]/40 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3 text-[#EC5E27]" />
                <span>Verified Role</span>
              </span>
            )}
          </div>

          {/* Profession Input */}
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              id="profession-input"
              type="text"
              value={inputValue}
              onChange={handleChange}
              onFocus={() => {
                setIsFocused(true);
                if (inputValue.trim()) {
                  setSuggestions(searchProfessions(inputValue.trim(), 6));
                }
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Software Engineer, Neuroscientist, High School Teacher, Product Designer..."
              maxLength={60}
              autoComplete="off"
              autoFocus
              className={`w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-[10px] bg-white dark:bg-slate-800 border text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 ${
                errorMessage && hasValidated
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : isInputStrictlyValid
                  ? 'border-[#EC5E27]/60 focus:border-[#EC5E27] focus:ring-[#EC5E27]/20'
                  : 'border-slate-200/90 dark:border-slate-700/80 focus:border-[#EC5E27] focus:ring-[#EC5E27]/20'
              }`}
            />

            {inputValue.trim() && (
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  onSelectProfession('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#EC5E27] p-1 cursor-pointer transition-colors"
                aria-label="Clear profession"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {isFocused && suggestions.length > 0 && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 overflow-hidden py-1 max-h-56 overflow-y-auto"
                >
                  <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-700">
                    Recognized Professions
                  </div>
                  {suggestions.map((item, idx) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(item);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        idx === selectedSuggestionIndex
                          ? 'bg-[#FFF0E6] dark:bg-[#EC5E27]/25 text-[#EC5E27] dark:text-white font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-[#FFF7ED] dark:hover:bg-slate-700 hover:text-[#EC5E27]'
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-[10px] text-slate-400">Select</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Validation Feedback or Guidance */}
          {errorMessage && hasValidated ? (
            <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">Supported:</span> Job titles, vocational trades, or academic fields (e.g. <em>Data Scientist</em>, <em>Physician</em>, <em>Product Designer</em>, <em>Student</em>, <em>Architect</em>).
            </p>
          )}
        </div>

        {/* Dynamic Interest Topics Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {clusterTagline}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Tap to add to your interests
            </span>
          </div>

          {/* Dynamic Suggested Topic Chips */}
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {suggestedInterests.slice(0, 8).map((interest, idx) => {
                const isSelected = selectedInterests.some(
                  (i) => i.toLowerCase() === interest.toLowerCase()
                );
                return (
                  <motion.button
                    key={`${interest}-${idx}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    type="button"
                    onClick={() => handleToggleTag(interest)}
                    className={`px-2.5 py-1 rounded-[8px] text-xs font-semibold transition-all duration-200 flex items-center gap-1 cursor-pointer select-none border ${
                      isSelected
                        ? 'bg-[#EC5E27] text-white border-[#EC5E27] shadow-xs'
                        : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#EC5E27] hover:text-[#EC5E27]'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <Plus className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{interest}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected Topics & Quick Add Custom Topic */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Pre-Selected Topics ({selectedInterests.length})
            </span>
            <span className="text-[10px] text-slate-400">Step 2 lets you add more</span>
          </div>

          {selectedInterests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedInterests.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#FFF0E6] dark:bg-slate-800 border border-[#FFD9C6] dark:border-slate-700 text-xs font-bold text-[#EC5E27] dark:text-orange-400 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27]" />
                  <span>{item}</span>
                  {onRemoveInterest && (
                    <button
                      type="button"
                      onClick={() => onRemoveInterest(item)}
                      className="hover:text-red-500 p-0.5 ml-0.5 cursor-pointer transition-colors"
                      aria-label={`Remove ${item}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-[10px] bg-[#FFF9F3] dark:bg-slate-800/60 border border-orange-200/60 dark:border-slate-700 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                No topics selected yet. Tap any tag above or add a custom topic below.
              </p>
            </div>
          )}

          {/* Add Niche Custom Topic Input */}
          <form onSubmit={handleAddCustomTag} className="pt-1">
            <div className="flex gap-2">
              <input
                id="quick-custom-topic"
                type="text"
                value={customInterestInput}
                onChange={(e) => {
                  setCustomInterestInput(e.target.value);
                  if (customInputError) setCustomInputError(null);
                }}
                placeholder="Add niche custom topic (e.g. Astrophysics, Rust, UI Typography)..."
                maxLength={35}
                className="flex-1 px-3 py-2 rounded-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27]"
              />
              <button
                type="submit"
                disabled={!customInterestInput.trim()}
                className={`px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-1 ${
                  customInterestInput.trim()
                    ? 'bg-[#EC5E27] hover:bg-[#d94f1b] text-white shadow-xs cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            {customInputError && (
              <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span>{customInputError}</span>
              </div>
            )}
          </form>

          {/* Engine note */}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#EC5E27] shrink-0" />
            <span>Encrypted zero-log ephemeral matching engine</span>
          </div>
        </div>

      </div>

      {/* Footer Navigation Controls */}
      <div className="flex items-center justify-between pt-5">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#EC5E27] text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </button>

        <button
          onClick={handleContinue}
          disabled={!isInputStrictlyValid}
          className={`px-6 py-2.5 rounded-[10px] text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 ${
            isInputStrictlyValid
              ? 'bg-[#EC5E27] hover:bg-[#d94f1b] text-white shadow-md active:scale-95 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 opacity-50 cursor-not-allowed'
          }`}
        >
          <span>Continue to Interests</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
