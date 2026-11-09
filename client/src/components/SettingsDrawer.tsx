import React, { useState } from 'react';
import {
  X,
  User,
  Pencil,
  ChevronDown,
  ChevronRight,
  Globe,
  Volume2,
  VolumeX,
  Check,
  Moon,
  Sun,
} from 'lucide-react';
import { soundService } from '../services/soundService.ts';
import { AppTheme } from './ThemeToggle.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { SUPPORTED_LANGUAGES } from '../data/languages.ts';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  onResetSession: () => void;
  onOpenPrivacyInspector: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onResetSession,
}) => {
  const { t, language, setLanguage, currentLanguageOption } = useLanguage();
  const [userName, setUserName] = useState('Faisal');
  const [aboutMe, setAboutMe] = useState('');
  const [hashtag, setHashtag] = useState('hi');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundService.isEnabled());
  const [isEditingName, setIsEditingName] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const newState = soundService.toggle();
    setSoundEnabled(newState);
  };

  const handleComplete = () => {
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.title', 'Edit Profile')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container matching Reference Image 5 */}
      <div
        className="relative w-full max-w-sm rounded-3xl bg-[#1c1c1c] border border-white/5 p-6 sm:p-7 shadow-2xl text-white animate-scaleUp overflow-hidden max-h-[90vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto pr-1 space-y-5">
          {/* Header */}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('settings.title', 'Edit Profile')}
          </h2>

          {/* Avatar with Pencil */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full bg-[#2a2a2a] border-2 border-white/10 flex items-center justify-center text-neutral-300 overflow-hidden shadow-inner">
              <User className="w-10 h-10 text-neutral-400" />
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white text-black shadow-md hover:bg-slate-200 transition-transform cursor-pointer"
              title="Edit photo"
            >
              <Pencil className="w-3.5 h-3.5 fill-black" />
            </button>
          </div>

          {/* Moderation Guidance Text */}
          <p className="text-[11px] text-neutral-400 leading-snug text-center max-w-xs mx-auto">
            {t('settings.guidance', 'Please do not share inappropriate content or personal information (such as phone number or address) on your profile. All uploads are reviewed and moderated.')}
          </p>

          {/* Section: About me */}
          <div>
            <label className="block text-sm font-black text-white mb-2">
              {t('settings.aboutMe', 'About me')}
            </label>
            <div className="relative rounded-2xl bg-[#262626] p-3.5 border border-white/5">
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value.slice(0, 250))}
                placeholder={t('settings.aboutPlaceholder', 'Share a little something about yourself.')}
                rows={3}
                className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none resize-none leading-relaxed"
              />
              <div className="text-right text-[10px] text-neutral-500 font-mono mt-1">
                {250 - aboutMe.length}
              </div>
            </div>
          </div>

          {/* Section: Hashtag */}
          <div>
            <label className="block text-sm font-black text-white mb-2">
              {t('settings.hashtag', 'Hashtag')}
            </label>
            <div className="rounded-2xl bg-[#262626] px-4 py-3 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-bold text-xs">#</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#363636] text-xs font-bold text-white">
                  {hashtag}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Section: My info */}
          <div>
            <label className="block text-sm font-black text-white mb-2">
              {t('settings.myInfo', 'My info')}
            </label>
            <div className="space-y-2">
              {/* Name Row */}
              <div
                onClick={() => setIsEditingName(!isEditingName)}
                className="rounded-2xl bg-[#262626] px-4 py-3.5 border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#2c2c2c] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-neutral-400" />
                  {isEditingName ? (
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-black/60 px-2 py-0.5 rounded text-xs text-white border border-white/20 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs font-bold text-white">{userName}</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </div>

              {/* Language Row */}
              <div className="space-y-2">
                <div
                  onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                  className="rounded-2xl bg-[#262626] px-4 py-3.5 border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#2c2c2c] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-[#EC5E27]" />
                    <span className="text-xs font-bold text-white">
                      {currentLanguageOption.flag} {currentLanguageOption.label} <span className="text-neutral-400 font-normal">({currentLanguageOption.englishName})</span>
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${showLanguagePicker ? 'rotate-90' : ''}`} />
                </div>

                {showLanguagePicker && (
                  <div className="rounded-2xl bg-[#202020] border border-white/10 p-2 max-h-48 overflow-y-auto space-y-1">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = language.toLowerCase() === lang.shortCode.toLowerCase();
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.shortCode);
                            setShowLanguagePicker(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#EC5E27]/20 text-white font-bold border border-[#EC5E27]/30'
                              : 'text-neutral-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.label}</span>
                            <span className="text-[10px] text-neutral-400">({lang.englishName})</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#EC5E27]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sound Effect Toggle Row */}
              <div
                onClick={handleToggleSound}
                className="rounded-2xl bg-[#262626] px-4 py-3.5 border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#2c2c2c] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-[#EC5E27]" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-500" />
                  )}
                  <span className="text-xs font-bold text-white">{t('settings.audioSounds', 'Audio Sounds')}</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-400">
                  {soundEnabled ? t('settings.on', 'ON') : t('settings.off', 'OFF')}
                </span>
              </div>

              {/* Theme Toggle Row (White / Dark Mode) */}
              <div
                id="settings-theme-toggle-row"
                onClick={onToggleTheme}
                className="rounded-2xl bg-[#262626] px-4 py-3.5 border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#2c2c2c] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#EC5E27]" />
                  )}
                  <span className="text-xs font-bold text-white">Appearance</span>
                </div>
                <div
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-[#EC5E27] flex items-center justify-center transition-all shadow-xs"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#EC5E27]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Complete Action Button */}
        <div className="pt-4 border-t border-white/10 mt-4">
          <button
            type="button"
            onClick={handleComplete}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-extrabold text-sm text-center shadow-lg transition-all cursor-pointer active:scale-98"
          >
            {t('settings.complete', 'Complete')}
          </button>
        </div>
      </div>
    </div>
  );
};
