import { Award, Calendar, Check, ChevronDown, Globe, User, X } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { COUNTRIES_LIST } from '../data/countriesData.ts';
import { CountryFlag } from './CountryFlag.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

export type ProfessionLevel = 'Basic' | 'Intermediate' | 'Advance' | 'Professional';

export interface UserProfileData {
  name?: string;
  country?: string;
  countryCode?: string;
  countryFlag?: string;
  age?: number | string;
  professionLevel?: ProfessionLevel;
}

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (profile: UserProfileData) => void;
}

export const STORAGE_KEY = 'hayloo_user_profile';

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { t } = useLanguage();

  const [name, setName] = useState<string>('');
  const [country, setCountry] = useState<string>('GLOBAL');
  const [age, setAge] = useState<string>('');
  const [professionLevel, setProfessionLevel] = useState<ProfessionLevel | undefined>(undefined);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [showCountryDropdown, setShowCountryDropdown] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setName(parsed.name || '');
          setCountry(parsed.country || 'GLOBAL');
          setAge(parsed.age ? String(parsed.age) : '');
          setProfessionLevel(
            parsed.professionLevel && ['Basic', 'Intermediate', 'Advance', 'Professional'].includes(parsed.professionLevel)
              ? parsed.professionLevel
              : undefined
          );
        } else {
          setName('');
          setCountry('GLOBAL');
          setAge('');
          setProfessionLevel(undefined);
        }
      } catch {}
      setSavedSuccess(false);
      setShowCountryDropdown(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside country dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showCountryDropdown]);

  if (!isOpen) return null;

  const selectedCountryObj = COUNTRIES_LIST.find((c) => c.code === country) || COUNTRIES_LIST[0];

  const filteredCountries = COUNTRIES_LIST.filter((c) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const profileData: UserProfileData = {
      name: name.trim() || undefined,
      country: country !== 'GLOBAL' ? selectedCountryObj.name : undefined,
      countryCode: country !== 'GLOBAL' ? selectedCountryObj.code : undefined,
      countryFlag: country !== 'GLOBAL' ? selectedCountryObj.flag : undefined,
      age: age.trim() ? Number(age.trim()) || age.trim() : undefined,
      professionLevel: professionLevel || undefined,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
      window.dispatchEvent(new CustomEvent('hayloo_profile_updated', { detail: profileData }));
    } catch {}

    setSavedSuccess(true);
    if (onSaved) onSaved(profileData);

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div
      id="profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div
        ref={modalRef}
        id="profile-modal-card"
        className="relative w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden animate-scaleUp transition-all duration-300"
        style={{
          background: 'var(--card-bg, #FFFFFF)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderColor: 'var(--border-color, rgba(236, 94, 39, 0.35))',
          boxShadow: 'var(--card-shadow, 0 25px 60px -15px rgba(236, 94, 39, 0.25))',
          color: 'var(--text-primary, #0F172A)',
        }}
      >
        {/* Header Bar */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--border-subtle, rgba(236, 94, 39, 0.18))' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #EC5E27 0%, #EA580C 100%)' }}
            >
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t('profile.title', 'Your Profile Details')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t('profile.subtitle', 'All fields are optional. Details are visible only when provided.')}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            id="profile-modal-close-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            aria-label="Close profile modal"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* 1. Name Field (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#EC5E27]" />
                  Name / Display Name
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
            </div>
            <input
              id="profile-modal-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex, Maya, or leave blank to stay anonymous"
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EC5E27]/20 focus:border-[#EC5E27] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* 2. Country Field with Flag (Optional) */}
          <div className="relative" ref={countryDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#EC5E27]" />
                  Country & Flag
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
            </div>

            <button
              type="button"
              onClick={() => setShowCountryDropdown((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EC5E27]/20 focus:border-[#EC5E27] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <CountryFlag code={selectedCountryObj.code} name={selectedCountryObj.name} className="w-5 h-3.5 rounded-xs shrink-0" />
                <span className="truncate">
                  {selectedCountryObj.code === 'GLOBAL' ? 'Global / Worldwide (Optional)' : selectedCountryObj.name}
                </span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCountryDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden max-h-52 overflow-y-auto p-1 text-xs">
                <div className="p-1 mb-1">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#EC5E27]"
                  />
                </div>
                {filteredCountries.map((c) => {
                  const isSel = c.code === country;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c.code);
                        setShowCountryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-[#FFF7ED] dark:bg-[#EC5E27]/20 text-[#EC5E27] font-bold'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <CountryFlag code={c.code} name={c.name} className="w-5 h-3.5 rounded-xs shrink-0" />
                        <span className="truncate">{c.name}</span>
                      </span>
                      {isSel && <Check className="w-3.5 h-3.5 text-[#EC5E27]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Age Field (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#EC5E27]" />
                  Age
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
            </div>
            <input
              id="profile-modal-age-input"
              type="number"
              min="18"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 24 (or leave blank to hide)"
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EC5E27]/20 focus:border-[#EC5E27] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* 4. Profession Level (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#EC5E27]" />
                  Profession Level
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Basic', 'Intermediate', 'Advance', 'Professional'] as const).map((level) => {
                const isSelected = professionLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setProfessionLevel(isSelected ? undefined : level)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-[#EC5E27] text-white border-[#EC5E27] shadow-sm shadow-[#EC5E27]/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#EC5E27]/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{level}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              No level is selected by default. Tap to select, or tap again to deselect.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200/60 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="profile-modal-save-btn"
              type="submit"
              className="px-6 py-2 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
              style={{
                background: savedSuccess
                  ? '#10B981'
                  : 'linear-gradient(135deg, #EC5E27 0%, #EA580C 100%)',
                color: '#FFFFFF',
              }}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
