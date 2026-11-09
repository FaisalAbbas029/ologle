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
            ? 'bg-[#232323] border-[#bb3131] text-[#ffffff] ring-1 ring-[#bb3131]'
            : 'bg-[#232323] hover:bg-[#232323] border-white/5 hover:border-[#bb3131] text-[#ffffff]'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#bb3131] group-hover:scale-125 transition-transform" />
        <span>{interest}</span>
        <HelpCircle className="w-3 h-3 text-[#bb3131] opacity-75 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Pop-Over Explaining Why Matched */}
      {isOpen && (
        <div
          ref={popoverRef}
          id={`interest-popover-${interest.replace(/\s+/g, '-').toLowerCase()}`}
          role="dialog"
          aria-label={`Match explanation for ${interest}`}
          className="absolute left-0 sm:left-auto top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#232323] border border-white/5 shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left chat-room-grid-dense"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/5">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#bb3131]" />
                <h4 className="text-xs font-bold text-[#ffffff] uppercase tracking-wide">
                  Shared Interest Match
                </h4>
              </div>
              <p className="text-sm font-bold text-[#bb3131] mt-0.5">{interest}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#ffffff]/60 hover:text-[#ffffff] hover:bg-[#232323] transition-colors cursor-pointer"
              aria-label="Close popover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-2.5 text-xs">
            {/* Category Pill */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#ffffff]/60 font-medium">Domain:</span>
              <span className="px-2 py-0.5 rounded-md bg-[#232323] border border-white/5 text-[#ffffff] font-semibold">
                {explanation.category}
              </span>
            </div>

            {/* Why You Matched */}
            <div className="rounded-xl bg-[#232323] border border-white/5 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#ffffff]/60 mb-1">
                Why You're Matched
              </div>
              <p className="text-xs text-[#ffffff]/90 leading-relaxed">
                {explanation.matchReason}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-[#bb3131]">
                <Zap className="w-3 h-3 text-[#bb3131] shrink-0 fill-current" />
                <span>{explanation.scoringWeight}</span>
              </div>
            </div>

            {/* Overall Compatibility if provided */}
            {compatibilityScore !== undefined && compatibilityScore > 0 && (
              <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-[#232323] text-[#bb3131] font-semibold border border-white/5">
                <span>Total Affinity Rating</span>
                <span>{compatibilityScore} / 100 pts</span>
              </div>
            )}

            {/* Suggested Icebreaker Conversation Starter */}
            <div className="rounded-xl bg-[#232323] border border-white/5 p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#bb3131] mb-1">
                <MessageCircle className="w-3 h-3 text-[#bb3131]" />
                <span>Conversation Starter</span>
              </div>
              <p className="text-xs italic text-[#ffffff]/80 leading-relaxed">
                "{explanation.icebreaker}"
              </p>

              {onUseIcebreaker && (
                <button
                  type="button"
                  onClick={handleApplyIcebreaker}
                  className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-[#bb3131] hover:bg-[#bb3131] text-[#ffffff] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#ffffff]" />
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
