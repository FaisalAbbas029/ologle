/**
 * Language Selection Tags & Dropdown Component
 * Allows users to pick their spoken language and their preferred translation subtitle language.
 */

import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES, LanguageOption, getLanguageByCode } from '../data/languages.ts';
import { Languages, ChevronDown, Check, Sparkles, Mic, MicOff, Globe, AlertCircle } from 'lucide-react';

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
  const [isOpenSpokenDropdown, setIsOpenSpokenDropdown] = useState(false);
  const [isOpenSubtitleDropdown, setIsOpenSubtitleDropdown] = useState(false);

  const currentSpoken = getLanguageByCode(spokenLanguage);
  const currentSubtitle = getLanguageByCode(subtitleLanguage);

  // Top quick tag pills
  const popularPills = ['en-US', 'fa-IR', 'ru-RU', 'zh-CN', 'es-ES', 'ur-PK', 'ar-SA', 'fr-FR'];

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Primary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#232323] border border-white/5 text-[#ffffff] shadow-md">
        
        {/* Left: Spoken Language Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Captions Toggle Button */}
          <button
            onClick={onToggleVoiceTranscribe}
            title={isVoiceTranscribeEnabled ? 'Turn off live speech transcription' : 'Turn on live speech transcription'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-xs cursor-pointer ${
              isVoiceTranscribeEnabled
                ? isListening
                  ? 'bg-[#bb3131] hover:bg-[#bb3131] text-[#ffffff] ring-2 ring-[#bb3131]/40'
                  : 'bg-[#bb3131] text-[#ffffff]'
                : 'bg-[#232323] hover:bg-[#232323] text-[#ffffff]/60 border border-white/5 hover:text-[#ffffff]'
            }`}
          >
            {isVoiceTranscribeEnabled ? (
              <>
                <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-[#ffffff] animate-pulse' : 'text-[#ffffff]'}`} />
                <span>Live Captions: ON</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-[#ffffff]/50" />
                <span>Live Captions: OFF</span>
              </>
            )}
          </button>

          {/* Spoken Language Label & Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setIsOpenSpokenDropdown(!isOpenSpokenDropdown);
                setIsOpenSubtitleDropdown(false);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#232323] hover:bg-[#232323] border border-white/5 text-xs font-medium text-[#ffffff] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="text-[11px] text-[#ffffff]/60">I speak:</span>
              <span className="font-semibold">
                {currentSpoken.englishName}
              </span>
              <ChevronDown className="w-3 h-3 text-[#bb3131]" />
            </button>

            {/* Dropdown Menu for Spoken Language */}
            {isOpenSpokenDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-[#232323] border border-[#bb3131] shadow-2xl py-1.5 z-50 max-h-60 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-[#ffffff]/60 border-b border-white/5">
                  Select Spoken Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelectSpokenLanguage(lang.code);
                      setIsOpenSpokenDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-[#bb3131] hover:text-[#ffffff] transition-colors cursor-pointer ${
                      lang.code === currentSpoken.code ? 'text-[#bb3131] font-bold bg-[#232323]' : 'text-[#ffffff]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{lang.englishName}</span>
                      <span className="text-[11px] text-[#ffffff]/60">({lang.label})</span>
                    </span>
                    {lang.code === currentSpoken.code && <Check className="w-3.5 h-3.5 text-[#bb3131]" />}
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
                        ? 'bg-[#bb3131] text-[#ffffff] font-bold shadow-xs'
                        : 'bg-[#232323] hover:bg-[#232323] text-[#ffffff]/70 hover:text-[#ffffff] border border-white/5 hover:border-[#bb3131]'
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
          <div className="flex items-center gap-1 text-[11px] text-[#ffffff]/60">
            <Globe className="w-3.5 h-3.5 text-[#bb3131]" />
            <span className="hidden sm:inline">Translate subtitles to:</span>
            <span className="sm:hidden">To:</span>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsOpenSubtitleDropdown(!isOpenSubtitleDropdown);
                setIsOpenSpokenDropdown(false);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#232323] hover:bg-[#232323] border border-white/5 text-xs font-medium text-[#ffffff] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="font-semibold">
                {currentSubtitle.englishName}
              </span>
              <ChevronDown className="w-3 h-3 text-[#bb3131]" />
            </button>

            {/* Dropdown Menu for Subtitle Translation Language */}
            {isOpenSubtitleDropdown && (
              <div className="absolute top-full right-0 mt-1 w-56 rounded-xl bg-[#232323] border border-[#bb3131] shadow-2xl py-1.5 z-50 max-h-60 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-[#ffffff]/60 border-b border-white/5">
                  Translate Subtitles Into
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelectSubtitleLanguage(lang.code);
                      setIsOpenSubtitleDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-[#bb3131] hover:text-[#ffffff] transition-colors cursor-pointer ${
                      lang.code === currentSubtitle.code ? 'text-[#bb3131] font-bold bg-[#232323]' : 'text-[#ffffff]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{lang.englishName}</span>
                      <span className="text-[11px] text-[#ffffff]/60">({lang.label})</span>
                    </span>
                    {lang.code === currentSubtitle.code && <Check className="w-3.5 h-3.5 text-[#bb3131]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Speech Warning if permissions denied or not supported */}
      {speechError && isVoiceTranscribeEnabled && (
        <div className="px-3 py-1.5 rounded-lg bg-[#232323] border border-[#bb3131] text-[#bb3131] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#bb3131] shrink-0" />
          <span>{speechError}</span>
        </div>
      )}
    </div>
  );
};
