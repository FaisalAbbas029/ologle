import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageCircle, X, Check, ArrowUpRight, HelpCircle, Zap } from 'lucide-react';
import { getInterestExplanation, InterestExplanation } from '../data/interestExplanations.ts';

interface SharedInterestBadgePopoverProps {
  interest: string;
  onUseIcebreaker?: (text: string) => void;
  compatibilityScore?: number;
}

export const SharedInterestBadgePopover: React.FC<SharedInterestBadgePopoverProps> = ({
  interest,
  onUseIcebreaker,
  compatibilityScore,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const explanation: InterestExplanation = getInterestExplanation(interest);

  // Close on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleApplyIcebreaker = () => {
    if (onUseIcebreaker) {
      onUseIcebreaker(explanation.icebreaker);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 700);
    }
  };

  return (
    <div className="relative inline-block">
      {/* Clickable Interest Badge */}
      <button
        ref={triggerRef}
        type="button"
        id={`interest-badge-${interest.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Click to see why "${interest}" matched`}
        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shadow-2xs ${
          isOpen
            ? 'bg-[#EC5E27]/15 border-[#EC5E27] text-[#EC5E27] ring-1 ring-[#EC5E27]'
            : 'bg-[#EC5E27]/10 hover:bg-[#EC5E27]/20 border-[#EC5E27]/30 hover:border-[#EC5E27] text-[#EC5E27]'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#EC5E27] group-hover:scale-125 transition-transform" />
        <span>{interest}</span>
        <HelpCircle className="w-3 h-3 text-[#EC5E27] opacity-75 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Pop-Over Explaining Why Matched */}
      {isOpen && (
        <div
          ref={popoverRef}
          id={`interest-popover-${interest.replace(/\s+/g, '-').toLowerCase()}`}
          role="dialog"
          aria-label={`Match explanation for ${interest}`}
          className="absolute left-0 sm:left-auto top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-orange-200/80 dark:border-white/10 shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left chat-room-grid-dense text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-orange-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                  Shared Interest Match
                </h4>
              </div>
              <p className="text-sm font-bold text-[#EC5E27] mt-0.5">{interest}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close popover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-2.5 text-xs">
            {/* Category Pill */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 dark:text-white/60 font-medium">Domain:</span>
              <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-white/10 border border-orange-200/60 dark:border-white/10 text-slate-800 dark:text-white font-semibold">
                {explanation.category}
              </span>
            </div>

            {/* Why You Matched */}
            <div className="rounded-xl bg-orange-50/50 dark:bg-white/5 border border-orange-200/50 dark:border-white/10 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 mb-1">
                Why You're Matched
              </div>
              <p className="text-xs text-slate-700 dark:text-white/90 leading-relaxed">
                {explanation.matchReason}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-[#EC5E27]">
                <Zap className="w-3 h-3 text-[#EC5E27] shrink-0 fill-current" />
                <span>{explanation.scoringWeight}</span>
              </div>
            </div>

            {/* Overall Compatibility if provided */}
            {compatibilityScore !== undefined && compatibilityScore > 0 && (
              <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-[#EC5E27]/10 text-[#EC5E27] font-semibold border border-[#EC5E27]/25">
                <span>Total Affinity Rating</span>
                <span>{compatibilityScore} / 100 pts</span>
              </div>
            )}

            {/* Suggested Icebreaker Conversation Starter */}
            <div className="rounded-xl bg-orange-50/50 dark:bg-white/5 border border-orange-200/50 dark:border-white/10 p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#EC5E27] mb-1">
                <MessageCircle className="w-3 h-3 text-[#EC5E27]" />
                <span>Conversation Starter</span>
              </div>
              <p className="text-xs italic text-slate-600 dark:text-white/80 leading-relaxed">
                "{explanation.icebreaker}"
              </p>

              {onUseIcebreaker && (
                <button
                  type="button"
                  onClick={handleApplyIcebreaker}
                  className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-[#EC5E27] to-[#EA580C] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Inserted into Chat!</span>
                    </>
                  ) : (
                    <>
                      <span>Ask This Question</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
