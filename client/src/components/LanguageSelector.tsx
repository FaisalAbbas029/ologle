/**
 * Language Selection Tags & Dropdown Component
 * Allows users to pick their spoken language and their preferred translation subtitle language.
 */

import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES, LanguageOption, getLanguageByCode } from '../data/languages.ts';
import { Languages, ChevronDown, Check, Sparkles, Mic, MicOff, Globe, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface LanguageSelectorProps {
  spokenLanguage: string;
  onSelectSpokenLanguage: (code: string) => void;
  subtitleLanguage: string;
  onSelectSubtitleLanguage: (code: string) => void;
  isVoiceTranscribeEnabled: boolean;
  onToggleVoiceTranscribe: () => void;
  isListening: boolean;
  speechError?: string | null;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  spokenLanguage,
  onSelectSpokenLanguage,
  subtitleLanguage,
  onSelectSubtitleLanguage,
  isVoiceTranscribeEnabled,
  onToggleVoiceTranscribe,
  isListening,
  speechError,
  compact = false,
}) => {
  const { t } = useLanguage();
  const [isOpenSpokenDropdown, setIsOpenSpokenDropdown] = useState(false);
  const [isOpenSubtitleDropdown, setIsOpenSubtitleDropdown] = useState(false);

  const currentSpoken = getLanguageByCode(spokenLanguage);
  const currentSubtitle = getLanguageByCode(subtitleLanguage);

  // Top quick tag pills
  const popularPills = ['en-US', 'fa-IR', 'ru-RU', 'zh-CN', 'es-ES', 'ur-PK', 'ar-SA', 'fr-FR'];

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Primary Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-1.5 ${compact ? 'px-2.5 py-1 rounded-xl' : 'p-2.5 rounded-xl'} bg-white/80 dark:bg-[#1C1C1E] border border-orange-200/80 dark:border-white/10 text-slate-800 dark:text-white shadow-xs backdrop-blur-md`}>
        
        {/* Left: Spoken Language Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Live Captions Toggle Button (shown when not compact, since compact has CC in toolbar) */}
          {!compact && (
            <button
              onClick={onToggleVoiceTranscribe}
              title={isVoiceTranscribeEnabled ? 'Turn off live speech transcription' : 'Turn on live speech transcription'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-xs cursor-pointer ${
                isVoiceTranscribeEnabled
                  ? isListening
                    ? 'bg-[#EC5E27] hover:bg-[#D94E1A] text-white ring-2 ring-[#EC5E27]/40'
                    : 'bg-[#EC5E27] text-white'
                  : 'bg-white/80 dark:bg-white/10 hover:bg-white text-slate-700 dark:text-neutral-300 border border-orange-200/80 dark:border-white/10'
              }`}
            >
              {isVoiceTranscribeEnabled ? (
                <>
                  <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-white animate-pulse' : 'text-white'}`} />
                  <span>{t('call.captionsOn', 'CC ON')}</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                  <span>{t('call.captionsOff', 'CC OFF')}</span>
                </>
              )}
            </button>
          )}

          {/* Spoken Language Label & Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setIsOpenSpokenDropdown(!isOpenSpokenDropdown);
                setIsOpenSubtitleDropdown(false);
              }}
              className={`px-2 py-1 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-orange-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer`}
            >
              <span className="text-[11px] text-slate-400 dark:text-neutral-400">{t('call.iSpeak', 'I speak')}:</span>
              <span className="font-semibold text-xs">
                {currentSpoken.englishName}
              </span>
              <ChevronDown className="w-3 h-3 text-[#EC5E27]" />
            </button>

            {/* Dropdown Menu for Spoken Language */}
            {isOpenSpokenDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-white dark:bg-[#1C1C1E] border border-orange-200/80 dark:border-white/10 shadow-2xl py-1.5 z-50 max-h-60 overflow-y-auto text-slate-900 dark:text-white">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-neutral-400 border-b border-orange-100 dark:border-white/10">
                  Select Spoken Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelectSpokenLanguage(lang.code);
                      setIsOpenSpokenDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-orange-50 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                      lang.code === currentSpoken.code ? 'text-[#EC5E27] font-bold bg-orange-50/60 dark:bg-white/10' : 'text-slate-700 dark:text-neutral-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{lang.englishName}</span>
                      <span className="text-[11px] text-slate-400 dark:text-neutral-400">({lang.label})</span>
                    </span>
                    {lang.code === currentSpoken.code && <Check className="w-3.5 h-3.5 text-[#EC5E27]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Clickable Tag Pills for Spoken Language */}
          {!compact && (
            <div className="hidden sm:flex items-center gap-1 overflow-x-auto py-0.5">
              {popularPills.map((pCode) => {
                const lang = getLanguageByCode(pCode);
                const isSelected = lang.code === currentSpoken.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => onSelectSpokenLanguage(lang.code)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#EC5E27] text-white font-bold shadow-xs'
                        : 'bg-white/70 dark:bg-white/10 hover:bg-white text-slate-600 dark:text-neutral-300 border border-orange-200/60 dark:border-white/10 hover:border-[#EC5E27]'
                    }`}
                  >
                    <span>{lang.englishName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Subtitle Target Language (Translate Incoming Subtitles to...) */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-neutral-400">
            <Globe className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span className="hidden sm:inline">{t('call.translateSubtitlesTo', 'Translate subtitles to')}:</span>
            <span className="sm:hidden">To:</span>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsOpenSubtitleDropdown(!isOpenSubtitleDropdown);
                setIsOpenSpokenDropdown(false);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-orange-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="font-semibold">
                {currentSubtitle.englishName}
              </span>
              <ChevronDown className="w-3 h-3 text-[#EC5E27]" />
            </button>

            {/* Dropdown Menu for Subtitle Translation Language */}
            {isOpenSubtitleDropdown && (
              <div className="absolute top-full right-0 mt-1 w-56 rounded-xl bg-white dark:bg-[#1C1C1E] border border-orange-200/80 dark:border-white/10 shadow-2xl py-1.5 z-50 max-h-60 overflow-y-auto text-slate-900 dark:text-white">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-neutral-400 border-b border-orange-100 dark:border-white/10">
                  Translate Subtitles Into
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelectSubtitleLanguage(lang.code);
                      setIsOpenSubtitleDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-orange-50 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                      lang.code === currentSubtitle.code ? 'text-[#EC5E27] font-bold bg-orange-50/60 dark:bg-white/10' : 'text-slate-700 dark:text-neutral-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{lang.englishName}</span>
                      <span className="text-[11px] text-slate-400 dark:text-neutral-400">({lang.label})</span>
                    </span>
                    {lang.code === currentSubtitle.code && <Check className="w-3.5 h-3.5 text-[#EC5E27]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Speech Warning if permissions denied or not supported */}
      {speechError && isVoiceTranscribeEnabled && (
        <div className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-white/10 border border-orange-200/80 dark:border-white/10 text-[#EC5E27] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#EC5E27] shrink-0" />
          <span>{speechError}</span>
        </div>
      )}
    </div>
  );
};
