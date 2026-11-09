import React from 'react';
import { AppView } from '../types/index.ts';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js';
import { useLanguage } from '../context/LanguageContext.tsx';
import { HeroSection } from './HeroSection.tsx';

interface LandingViewProps {
  currentTab?: 'video_chat' | 'history' | 'messages';
  onSelectTab?: (tab: 'video_chat' | 'history' | 'messages') => void;
  onStart: () => void;
  onExplore: () => void;
  onNavigate: (view: AppView) => void;
  profession?: string;
  onProfessionChange?: (profession: string) => void;
  selectedInterests?: string[];
  onToggleInterest?: (interest: string) => void;
  onAddCustomInterest?: (interest: string) => void;
  onRemoveInterest?: (interest: string) => void;
  selectedCountry?: string;
  onSelectCountry?: (country: string) => void;
  onOpenStartTalking?: () => void;
  onStartMatchmaking?: (prof?: string, interests?: string[], country?: string, sessionMode?: string) => void;
  sessionMode?: string;
  onSessionModeChange?: (mode: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  currentTab = 'video_chat',
  onStart,
  onNavigate,
  profession = '',
  onProfessionChange,
  selectedCountry = 'GLOBAL',
  onSelectCountry,
  onStartMatchmaking,
  sessionMode,
  onSessionModeChange,
}) => {
  const { t } = useLanguage();

  // -------------------------------------------------------------
  // TAB 2: HISTORY VIEW
  // -------------------------------------------------------------
  if (currentTab === 'history') {
    return (
      <div
        className="relative w-full min-h-[calc(100vh-4.5rem)] flex flex-col justify-between transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6 md:py-8 flex-1 flex flex-col">
          {/* History Page Title */}
          <h1
            className="text-3xl sm:text-4xl font-black tracking-tight mb-16 sm:mb-24"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('tabs.history', 'History')}
          </h1>

          {/* Centered Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center text-center -mt-8 sm:-mt-12 pb-16">
            <div className="w-24 h-24 mb-6 flex items-center justify-center select-none">
              <svg
                viewBox="0 0 100 80"
                className="w-24 h-24 drop-shadow-md"
                style={{ color: 'var(--accent-color)' }}
                fill="currentColor"
              >
                <path d="M72 56c0 7.7-6.3 14-14 14H30C17.8 70 8 60.2 8 48c0-10.8 7.8-19.8 18.3-21.6C28.4 14.5 38.6 6 51 6c13.2 0 24.3 9.6 26.5 22.5C84.8 30.1 90 36.4 90 44c0 6.6-4.4 12.2-10.5 13.9.3 1.1.5 2.3.5 3.5 0 7.7-6.3 14-14 14z" />
                <circle cx="76" cy="74" r="3.5" />
              </svg>
            </div>

            <p
              className="text-base sm:text-lg font-bold mb-8 max-w-md"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('tabs.noHistory', 'No history yet. Start a video chat and connect with an intellectual peer!')}
            </p>

            {/* CTA Button */}
            <button
              onClick={onStart}
              className="px-8 py-3.5 rounded-xl font-black text-base tracking-wide transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              style={{
                background: 'var(--btn-gradient)',
                color: 'var(--btn-text)',
              }}
            >
              {t('tabs.startChatting', 'Start Chatting')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TAB 3: MESSAGES VIEW
  // -------------------------------------------------------------
  if (currentTab === 'messages') {
    return (
      <div
        className="relative w-full min-h-[calc(100vh-4.5rem)] flex flex-col justify-between transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6 md:py-8 flex-1 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
            {/* Left Column Card */}
            <div
              className="lg:col-span-4 rounded-2xl p-6 sm:p-8 flex flex-col justify-between border shadow-xl backdrop-blur-xl"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-black mb-6 tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('tabs.messages', 'Messages')}
                </h2>

                <div className="mb-8">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm font-bold transition-colors cursor-pointer"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    <span>Follow</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <p
                    className="text-xs mt-2 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('tabs.notFollowing', "You're not following anyone yet.")}
                  </p>
                </div>

                <div>
                  <h3
                    className="text-sm font-bold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('tabs.directThreads', 'Direct Threads')}
                  </h3>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={onStart}
                className="w-fit px-6 py-3.5 rounded-xl font-black text-sm tracking-wide transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                style={{
                  background: 'var(--btn-gradient)',
                  color: 'var(--btn-text)',
                }}
              >
                {t('tabs.meetSomeone', 'Meet Someone New!')}
              </button>
            </div>

            {/* Right Column Card */}
            <div
              className="lg:col-span-8 rounded-2xl p-8 sm:p-12 flex items-center justify-center text-center border shadow-xl backdrop-blur-xl"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <p
                className="text-lg sm:text-xl font-bold max-w-lg leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('tabs.zeroPersistenceDesc', 'Connect with peers you respect and start discussions with radical zero persistence!')}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TAB 1: VIDEO CHAT VIEW - HERO ONLY (Clean, streamlined)
  // -------------------------------------------------------------
  return (
    <div
      id="landing-view-root"
      className="relative w-full min-h-full flex-1 flex flex-col justify-center font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300 overflow-x-hidden overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <div className="absolute inset-0 ai-mesh-grid pointer-events-none opacity-20 z-0" />
      <main className="relative z-10 w-full min-h-full flex-1 flex flex-col justify-center">
        {/* ── HERO SECTION (Split-Screen: Left Stream + Right Configure & Match Card) ── */}
        <HeroSection
          sessionMode={sessionMode}
          onSessionModeChange={onSessionModeChange}
          onFindMatch={(prof, tags, cCode, sMode) => {
            const savedCountry = cCode || localStorage.getItem('hayloo_selected_country') || selectedCountry || 'GLOBAL';
            if (onSelectCountry) {
              onSelectCountry(savedCountry);
            }
            const savedProf = prof || localStorage.getItem('hayloo_user_profession') || profession || '';
            if (onProfessionChange) {
              onProfessionChange(savedProf);
            }
            const rawMode = sMode || sessionMode || localStorage.getItem('hayloo_session_mode') || 'video';
            const normalizedMode: 'video' | 'voice' | 'messaging' =
              rawMode === 'voice' || rawMode === 'AUDIO'
                ? 'voice'
                : rawMode === 'messaging' || rawMode === 'TEXT'
                ? 'messaging'
                : 'video';
            if (onStartMatchmaking) {
              onStartMatchmaking(savedProf, tags, savedCountry, normalizedMode);
            } else {
              if (normalizedMode === 'voice') onNavigate('voice_session');
              else if (normalizedMode === 'messaging') onNavigate('1on1_chat');
              else onNavigate('conversation');
            }
          }}
          onStartExploring={() => {
            const rawMode = sessionMode || localStorage.getItem('hayloo_session_mode') || 'video';
            const normalizedMode: 'video' | 'voice' | 'messaging' =
              rawMode === 'voice' || rawMode === 'AUDIO'
                ? 'voice'
                : rawMode === 'messaging' || rawMode === 'TEXT'
                ? 'messaging'
                : 'video';
            if (onStartMatchmaking) {
              onStartMatchmaking(profession, undefined, selectedCountry, normalizedMode);
            } else {
              if (normalizedMode === 'voice') onNavigate('voice_session');
              else if (normalizedMode === 'messaging') onNavigate('1on1_chat');
              else onNavigate('conversation');
            }
          }}
          selectedCountry={selectedCountry}
          onSelectCountry={onSelectCountry}
          userProfession={profession}
        />
      </main>
    </div>
  );
};
