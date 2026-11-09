import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type AppTheme = 'white' | 'dark' | 'natural';

interface ThemeToggleProps {
  theme: string;
  onToggleTheme: () => void;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={onToggleTheme}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      className={`relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-300 select-none cursor-pointer hover:scale-105 active:scale-95 shadow-xs overflow-hidden ${
        isDark
          ? 'bg-[#1E293B] text-[#EC5E27] border border-[#EC5E27]/40 hover:border-[#EC5E27] shadow-[0_0_14px_rgba(236,94,39,0.3)] hover:bg-[#283548]'
          : 'bg-white text-slate-700 border border-orange-200 hover:border-[#EC5E27] shadow-xs hover:shadow-md hover:bg-orange-50/50'
      }`}
    >
      <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center pointer-events-none">
        {/* Sun Icon (shown in dark mode to switch to light) */}
        <Sun
          className={`w-4 h-4 sm:w-5 sm:h-5 text-amber-400 absolute transition-all duration-300 ease-in-out ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0'
          }`}
        />
        {/* Moon Icon (shown in light mode to switch to dark) */}
        <Moon
          className={`w-4 h-4 sm:w-5 sm:h-5 text-[#EC5E27] absolute transition-all duration-300 ease-in-out ${
            isDark
              ? 'rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        />
      </div>
    </button>
  );
};

