import { useState, useEffect } from 'react';
import { AppTheme } from '../components/ThemeToggle.tsx';

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === 'undefined') return 'white';
    try {
      const saved = localStorage.getItem('ologle_theme') || localStorage.getItem('hayloo_theme');
      if (saved === 'dark') {
        return 'dark';
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    // White mode is the default mode
    return 'white';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
        body.removeAttribute('data-theme');
      }
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'white');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.remove('dark');
        body.removeAttribute('data-theme');
      }
    }
    try {
      localStorage.setItem('ologle_theme', theme);
      localStorage.setItem('hayloo_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'white' : 'dark'));
  };

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };
}
