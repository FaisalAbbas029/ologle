import React, { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../data/languages.ts';
import { Languages, ChevronDown, Check, Sparkles } from 'lucide-react';

interface ChatTranslationToggleProps {
  isAutoTranslateEnabled: boolean;
  onToggleAutoTranslate: () => void;
  targetLanguage: string;
  onSelectTargetLanguage: (code: string) => void;
  compact?: boolean;
  idPrefix?: string;
}

export const ChatTranslationToggle: React.FC<ChatTranslationToggleProps> = ({
  isAutoTranslateEnabled,
  onToggleAutoTranslate,
  targetLanguage,
  onSelectTargetLanguage,
  compact = false,
  idPrefix = 'chat-trans',
}) => {
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = getLanguageByCode(targetLanguage);
  const currentShort = targetLanguage.split('-')[0].toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };
    if (isOpenDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpenDropdown]);

  return (
    <div
      id={`${idPrefix}-container`}
      ref={dropdownRef}
      className="relative inline-flex items-center gap-1.5"
    >
      {/* Real-time Translation Toggle Button */}
      <button
        type="button"
        id={`${idPrefix}-toggle-btn`}
        onClick={onToggleAutoTranslate}
        title={
          isAutoTranslateEnabled
            ? `Real-time translation is ON (translating to ${currentLang.englishName}). Click to turn OFF.`
            : 'Real-time translation is OFF. Click to turn ON.'
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer border ${
          isAutoTranslateEnabled
            ? 'bg-[#ffffff] hover:bg-[#ffffff] border-[#232323] text-[#bb3131]'
            : 'bg-[#ffffff] hover:bg-[#ffffff] border-[#232323] text-[#232323]'
        }`}
      >
        <Languages
          className={`w-3.5 h-3.5 transition-transform ${
            isAutoTranslateEnabled ? 'text-[#bb3131]' : 'text-[#232323]'
          }`}
        />
        {compact ? (
          <span className="font-bold">
            {isAutoTranslateEnabled ? `${currentShort}` : 'Off'}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <span>{isAutoTranslateEnabled ? 'Translate: ON' : 'Translate: OFF'}</span>
            {isAutoTranslateEnabled && (
              <Sparkles className="w-2.5 h-2.5 text-[#bb3131] animate-pulse" />
            )}
          </span>
        )}
      </button>

      {/* Target Language Dropdown Trigger */}
      {isAutoTranslateEnabled && (
        <div className="relative">
          <button
            type="button"
            id={`${idPrefix}-lang-trigger`}
            onClick={() => setIsOpenDropdown(!isOpenDropdown)}
            title={`Select target language (currently ${currentLang.englishName})`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ffffff] hover:bg-[#ffffff] border border-[#232323] text-xs font-medium text-[#232323] transition-colors cursor-pointer shadow-2xs"
          >
            <span className="text-[11px] font-semibold hidden sm:inline">
              {currentLang.englishName}
            </span>
            <span className="text-[11px] font-semibold sm:hidden">
              {currentShort}
            </span>
            <ChevronDown className="w-3 h-3 text-[#232323]" />
          </button>

          {/* Dropdown Menu */}
          {isOpenDropdown && (
            <div
              id={`${idPrefix}-dropdown-menu`}
              className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[#ffffff] border border-[#232323] shadow-xl py-1.5 z-50 max-h-60 overflow-y-auto"
            >
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-[#232323] border-b border-[#232323]">
                Translate Messages Into
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected =
                  lang.code.toLowerCase() === targetLanguage.toLowerCase() ||
                  lang.shortCode.toLowerCase() === currentShort.toLowerCase();

                return (
                  <button
                    key={lang.code}
                    type="button"
                    id={`${idPrefix}-lang-opt-${lang.shortCode}`}
                    onClick={() => {
                      onSelectTargetLanguage(lang.code);
                      setIsOpenDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-[#ffffff] transition-colors cursor-pointer ${
                      isSelected
                        ? 'text-[#bb3131] font-bold bg-[#ffffff]'
                        : 'text-[#232323]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{lang.englishName}</span>
                      <span className="text-[10px] text-[#232323]">({lang.label})</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#bb3131]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
