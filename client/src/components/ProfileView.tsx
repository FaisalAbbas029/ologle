import React, { useState, useEffect, useRef } from 'react';
import User from 'lucide-react/dist/esm/icons/user.js';
import Globe from 'lucide-react/dist/esm/icons/globe.js';
import Calendar from 'lucide-react/dist/esm/icons/calendar.js';
import Check from 'lucide-react/dist/esm/icons/check.js';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.js';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.js';
import Award from 'lucide-react/dist/esm/icons/award.js';
import { COUNTRIES_LIST } from '../data/countriesData.ts';
import { CountryFlag } from './CountryFlag.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import type { ProfessionLevel, UserProfileData } from './ProfileModal.tsx';

export type { ProfessionLevel, UserProfileData };

interface ProfileViewProps {
  initialProfile?: Partial<UserProfileData>;
  onSave?: (updated: UserProfileData) => void;
  onBack?: () => void;
}

const STORAGE_KEY = 'hayloo_user_profile';

export const ProfileView: React.FC<ProfileViewProps> = ({ onSave, onBack }) => {
  const { t } = useLanguage();

  const [name, setName] = useState<string>('');
  const [country, setCountry] = useState<string>('GLOBAL');
  const [age, setAge] = useState<string>('');
  const [professionLevel, setProfessionLevel] = useState<ProfessionLevel | undefined>(undefined);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [showCountryDropdown, setShowCountryDropdown] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const countryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      }
    } catch {}
  }, []);

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

  const selectedCountryObj = COUNTRIES_LIST.find((c) => c.code === country) || COUNTRIES_LIST[0];

  const filteredCountries = COUNTRIES_LIST.filter((c) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfileData = {
      name: name.trim() || undefined,
      country: country !== 'GLOBAL' ? selectedCountryObj.name : undefined,
      countryCode: country !== 'GLOBAL' ? selectedCountryObj.code : undefined,
      countryFlag: country !== 'GLOBAL' ? selectedCountryObj.flag : undefined,
      age: age.trim() ? Number(age.trim()) || age.trim() : undefined,
      professionLevel: professionLevel || undefined,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('hayloo_profile_updated', { detail: updated }));
    } catch {}

    setSavedSuccess(true);
    if (onSave) onSave(updated);

    setTimeout(() => {
      setSavedSuccess(false);
      if (onBack) onBack();
    }, 800);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Profile Details</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">All fields are optional. Leave blank to stay anonymous.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#EC5E27]" /> Name / Display Name
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex, Maya (or leave blank)"
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#EC5E27]/20 focus:border-[#EC5E27]"
            />
          </div>

          <div className="relative" ref={countryDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#EC5E27]" /> Country & Flag
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCountryDropdown((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#EC5E27]" /> Age
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
            </div>
            <input
              type="number"
              min="18"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 25 (or leave blank to hide)"
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#EC5E27]/20 focus:border-[#EC5E27]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#EC5E27]" /> Profession Level
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

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5 text-white"
              style={{
                background: savedSuccess
                  ? '#10B981'
                  : 'linear-gradient(135deg, #EC5E27 0%, #EA580C 100%)',
              }}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> <span>Saved!</span>
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
