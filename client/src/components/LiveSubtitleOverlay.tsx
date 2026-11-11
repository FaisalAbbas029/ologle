/**
 * Live Floating Subtitle Overlay for Video Chat
 * Floats on top of the remote peer's video feed.
 * Displays real-time speech transcription and cross-language translation with
 * smooth typographic styling, language badges, and auto-dimming.
 */

import React, { useEffect, useState } from 'react';
import { getLanguageByCode } from '../data/languages.ts';
import { Languages, Volume2, Sparkles, X } from 'lucide-react';

export interface SubtitleData {
  text: string;
  sourceLanguage: string;
  translatedText?: string;
  targetLanguage?: string;
  isFinal: boolean;
  speakerName?: string;
  timestamp: number;
}

interface LiveSubtitleOverlayProps {
  subtitle: SubtitleData | null;
  isVisible: boolean;
  onDismiss?: () => void;
}

export const LiveSubtitleOverlay: React.FC<LiveSubtitleOverlayProps> = ({
  subtitle,
  isVisible,
  onDismiss,
}) => {
  const [currentDisplay, setCurrentDisplay] = useState<SubtitleData | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!subtitle || !subtitle.text.trim()) {
      return;
    }

    setCurrentDisplay(subtitle);
    setIsFadingOut(false);

    // If packet is final, fade out after 5.5 seconds of silence
    if (subtitle.isFinal) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const clearTimer = setTimeout(() => {
          setCurrentDisplay(null);
          setIsFadingOut(false);
        }, 600);
        return () => clearTimeout(clearTimer);
      }, 5500);

      return () => clearTimeout(timer);
    }
  }, [subtitle]);

  if (!isVisible || !currentDisplay || !currentDisplay.text.trim()) {
    return null;
  }

  const srcLang = getLanguageByCode(currentDisplay.sourceLanguage);
  const targetLang = currentDisplay.targetLanguage
    ? getLanguageByCode(currentDisplay.targetLanguage)
    : null;

  const isCrossLanguage =
    targetLang &&
    srcLang.shortCode.toLowerCase() !== targetLang.shortCode.toLowerCase() &&
    Boolean(currentDisplay.translatedText);

  return (
    <div
      className={`absolute bottom-3 sm:bottom-5 left-3 right-3 sm:left-6 sm:right-6 z-30 pointer-events-none flex justify-center transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="pointer-events-auto max-w-2xl w-full bg-slate-900/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md border border-orange-500/30 rounded-2xl p-3 sm:p-3.5 shadow-2xl text-white flex flex-col gap-1.5 transition-all">
        
        {/* Caption Header: Speaker & Language Translation Flow */}
        <div className="flex items-center justify-between gap-2 text-[11px] pb-1 border-b border-white/10">
          <div className="flex items-center gap-1.5 font-semibold text-[#EC5E27]">
            <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-pulse" />
            <Volume2 className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span className="text-white font-bold">{currentDisplay.speakerName || 'Stranger'}</span>
            
            {/* Language Flow Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white font-medium border border-white/10 ml-1">
              <span>{srcLang.englishName}</span>
              {isCrossLanguage && targetLang && (
                <>
                  <span className="text-[#EC5E27]">→</span>
                  <span className="text-white font-bold">{targetLang.englishName}</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isCrossLanguage && (
              <span className="flex items-center gap-1 text-[10px] text-amber-200 font-medium bg-[#EC5E27]/30 px-1.5 py-0.5 rounded border border-[#EC5E27]/50">
                <Sparkles className="w-2.5 h-2.5" />
                <span>AI Translated</span>
              </span>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Hide caption"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Caption Body */}
        <div className="flex flex-col gap-1">
          {/* If cross-language: show translated text prominently */}
          {isCrossLanguage && currentDisplay.translatedText ? (
            <>
              <p className="text-sm sm:text-base font-semibold text-[#ffffff] leading-snug drop-shadow-sm tracking-wide">
                {currentDisplay.translatedText}
                {!currentDisplay.isFinal && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#ffffff] animate-pulse align-middle" />
                )}
              </p>
              <p className="text-xs text-neutral-300 dark:text-neutral-400 italic leading-tight">
                "{currentDisplay.text}"
              </p>
            </>
          ) : (
            /* Same language: show transcribed text */
            <p className="text-sm sm:text-base font-medium text-[#ffffff] leading-snug drop-shadow-sm">
              {currentDisplay.text}
              {!currentDisplay.isFinal && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#ffffff] animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
