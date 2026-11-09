import React, { useState, useRef, useEffect } from 'react';
import Globe from 'lucide-react/dist/esm/icons/globe.js';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.js';
import Check from 'lucide-react/dist/esm/icons/check.js';
import { useLanguage } from '../context/LanguageContext.tsx';
import { SUPPORTED_LANGUAGES } from '../data/languages.ts';

interface SiteLanguageDropdownProps {
  idPrefix?: string;
  compact?: boolean;
}

export const SiteLanguageDropdown: React.FC<SiteLanguageDropdownProps> = ({
  idPrefix = 'nav-lang',
  compact = false,
}) => {
  const { language, setLanguage, currentLanguageOption } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center" id={`${idPrefix}-wrapper`}>
      <button
        type="button"
        id={`${idPrefix}-btn`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Select Site Language"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white dark:bg-[#1E293B] dark:hover:bg-[#283548] border border-[#FFD9C6] dark:border-[#EC5E27]/30 hover:border-[#EC5E27] text-xs font-bold text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-xs"
      >
        <Globe className="w-3.5 h-3.5 text-[#EC5E27]" />
        {!compact ? (
          <span className="font-semibold">{currentLanguageOption.label}</span>
        ) : (
          <span className="font-bold uppercase text-[11px]">{currentLanguageOption.shortCode}</span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#EC5E27]' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#1E293B] border border-[#FFD9C6] dark:border-[#EC5E27]/30 shadow-xl py-2 z-50 max-h-72 overflow-y-auto custom-scrollbar animate-scaleUp text-slate-800 dark:text-slate-100"
        >
          <div className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <span>Select Language</span>
            <span className="text-[#EC5E27] font-mono text-[9px]">{SUPPORTED_LANGUAGES.length} Available</span>
          </div>

          <div className="p-1 space-y-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = language.toLowerCase() === lang.shortCode.toLowerCase();
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setLanguage(lang.shortCode);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFF0E6] dark:bg-[#EC5E27]/20 text-[#EC5E27] border border-[#FFD9C6] dark:border-[#EC5E27]/40 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-[#FFF7ED] dark:hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="truncate font-semibold">{lang.label}</span>
                    <span className="text-[10px] text-slate-400">({lang.englishName})</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#EC5E27] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
