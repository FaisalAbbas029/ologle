import { BookOpen, ChevronRight, Compass, FileText, Menu, MessageSquare, Mic, ShieldCheck, User, CircleUser as UserCircle, Video, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { AppView } from '../types/index.ts';
import { HeylooLogo } from './HeylooLogo.tsx';
import { SiteLanguageDropdown } from './SiteLanguageDropdown.tsx';
import { ProfileModal } from './ProfileModal.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { CountryFlag } from './CountryFlag.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onStartFlow?: () => void;
  isInActiveSession?: boolean;
  onLeaveSession?: () => void;
  onOpenSettings?: () => void;
  onOpenPrivacyInspector?: () => void;
  onOpenSearch?: () => void;
  onOpenStartTalking?: () => void;
  currentUser?: FirebaseUser | null;
  isHumanVerified?: boolean;
  theme?: string;
  onToggleTheme?: () => void;
  sessionMode?: string;
  onSwitchMode?: (mode: 'video' | 'voice' | 'messaging') => void;
  onOpenReport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isInActiveSession = false,
  onLeaveSession,
  sessionMode,
  onSwitchMode,
  theme = 'white',
  onToggleTheme,
}) => {
  const { t } = useLanguage();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    name?: string;
    country?: string;
    countryCode?: string;
    professionLevel?: string;
  } | null>(null);

  useEffect(() => {
    const loadProfile = () => {
      try {
        const saved = localStorage.getItem('hayloo_user_profile');
        if (saved) {
          setProfileData(JSON.parse(saved));
        }
      } catch {}
    };
    loadProfile();
    window.addEventListener('hayloo_profile_updated', loadProfile);
    return () => window.removeEventListener('hayloo_profile_updated', loadProfile);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleNavClick = (view: AppView) => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  return (
    <>
      <header
        id="main-navbar"
        className="sticky top-0 z-40 w-full backdrop-blur-xl border-b transition-all duration-300 shadow-sm shrink-0"
        style={{
          backgroundColor: 'var(--nav-bg, rgba(253, 237, 209, 0.94))',
          color: 'var(--nav-text, #0F172A)',
          borderColor: 'var(--nav-border, rgba(236, 94, 39, 0.20))',
        }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-14 sm:h-16 lg:h-15 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <button
              id="navbar-logo-btn"
              type="button"
              onClick={() => onNavigate('landing')}
              className="group flex items-center text-left cursor-pointer select-none"
              title="Ologle Home"
              aria-label="Ologle Home"
            >
              <HeylooLogo size="md" />
            </button>
          </div>

          {/* Desktop Controls (Tablet & Desktop: sm and up) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Dark & White Mode Switcher */}
            {onToggleTheme && (
              <ThemeToggle
                theme={theme === 'dark' ? 'dark' : 'white'}
                onToggleTheme={onToggleTheme}
              />
            )}

            {/* Site Language Switcher */}
            <SiteLanguageDropdown idPrefix="navbar-lang" />

            {/* Profile Icon Button */}
            <button
              id="navbar-profile-icon-btn"
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              aria-label="Open profile"
              title="Your Profile"
              className="flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EC5E27]"
              style={{
                backgroundColor: isProfileModalOpen ? 'var(--accent-color, #EC5E27)' : 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--accent-color, #EC5E27)',
                color: isProfileModalOpen ? '#FFFFFF' : 'var(--accent-color, #EC5E27)',
              }}
            >
              <UserCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Right Controls: Hamburger Menu Button (< sm) */}
          <div className="sm:hidden flex items-center ml-auto">
            {/* Mobile Hamburger Button */}
            <button
              id="navbar-mobile-hamburger-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              title="Menu"
              className="flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer active:scale-95 shadow-xs"
              style={{
                backgroundColor: isMobileMenuOpen ? 'var(--accent-color, #EC5E27)' : 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--accent-color, #EC5E27)',
                color: isMobileMenuOpen ? '#FFFFFF' : 'var(--accent-color, #EC5E27)',
              }}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Hamburger Drawer (Slide-in Menu) ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div
            id="navbar-mobile-drawer"
            className="fixed top-0 bottom-0 right-0 z-50 w-[295px] max-w-[85vw] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between p-5 overflow-y-auto animate-slideLeft text-slate-900 dark:text-slate-100"
          >
            {/* Drawer Top */}
            <div className="space-y-4">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <HeylooLogo size="sm" animated={false} />
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Profile Card Snippet */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/30 flex items-center justify-center text-[#EC5E27] shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        {profileData?.countryCode && (
                          <CountryFlag code={profileData.countryCode} className="w-3.5 h-2.5 rounded-xs" />
                        )}
                        <span>{profileData?.name || 'Anonymous User'}</span>
                      </div>
                      {profileData?.professionLevel && (
                        <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#EC5E27]">
                          {profileData.professionLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full py-1.5 px-2.5 text-xs font-bold rounded-xl bg-[#EC5E27] text-white hover:bg-[#EA580C] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <UserCircle className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleNavClick('landing')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    currentView === 'landing'
                      ? 'bg-[#FFF7ED] dark:bg-[#EC5E27]/20 text-[#EC5E27]'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-[#EC5E27]" />
                    <span>Home & Match Filters</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Session Mode Selector inside menu */}
                {onSwitchMode && (
                  <div className="py-2 border-y border-slate-100 dark:border-slate-800 my-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 px-3">
                      Call Mode
                    </span>
                    <div className="grid grid-cols-3 gap-1 px-1">
                      {[
                        { id: 'video', label: 'Video', icon: Video },
                        { id: 'voice', label: 'Voice', icon: Mic },
                        { id: 'messaging', label: 'Chat', icon: MessageSquare },
                      ].map((m) => {
                        const isSel = sessionMode === m.id;
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onSwitchMode(m.id as any);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                              isSel
                                ? 'bg-[#EC5E27] text-white border-[#EC5E27] shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleNavClick('community_rules')}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#EC5E27]" />
                    <span>Community Guidelines</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('privacy_page')}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#EC5E27]" />
                    <span>Privacy Policy</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('terms_page')}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#EC5E27]" />
                    <span>Terms of Service</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </nav>
            </div>

            {/* Drawer Bottom Controls */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Theme Appearance
                </span>
                {onToggleTheme && (
                  <ThemeToggle
                    theme={theme === 'dark' ? 'dark' : 'white'}
                    onToggleTheme={onToggleTheme}
                  />
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Language
                </span>
                <SiteLanguageDropdown idPrefix="mobile-menu-lang" />
              </div>

              <div className="text-[10px] text-slate-400 text-center font-medium pt-2">
                © 2026 Ologle • All Rights Reserved
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Profile Popup Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
