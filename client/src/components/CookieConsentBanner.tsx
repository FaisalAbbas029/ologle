import React, { useState, useEffect } from 'react';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js';
import X from 'lucide-react/dist/esm/icons/x.js';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('hayloo_cookie_consent');
      if (!consent) {
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleConfirm = () => {
    try {
      localStorage.setItem('hayloo_cookie_consent', 'confirmed');
    } catch {}
    setIsVisible(false);
  };

  const handleLearnMore = () => {
    window.location.hash = '#privacy';
    handleConfirm();
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie and Privacy Consent Banner"
      className="fixed bottom-2 right-2 z-40 max-w-sm sm:bottom-5 sm:right-5 sm:max-w-md w-[calc(100%-1rem)] sm:w-[calc(100%-2.5rem)] rounded-2xl bg-[#141414] border border-[#EC5E27]/40 p-3 sm:p-5 shadow-2xl text-white animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5 sm:mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#EC5E27] rounded-md flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
            Privacy & Cookie Policy
          </h3>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] leading-tight text-neutral-300 mb-2 sm:text-xs sm:leading-relaxed sm:mb-4">
        <span className="sm:hidden">Local preferences only; no chat logs are stored.</span>
        <span className="hidden sm:inline">
          Heyloo uses privacy-preserving local storage for ephemeral session preferences with radical zero-logs data retention.
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-1.5 px-3 sm:py-2 sm:px-4 rounded-xl bg-[#EC5E27] hover:bg-[#D94E1A] text-white font-bold text-xs text-center transition-all cursor-pointer shadow-sm active:scale-95"
        >
          Accept & Continue
        </button>

        <button
          type="button"
          onClick={handleLearnMore}
          className="py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl border border-white/20 hover:border-white text-white font-semibold text-xs text-center transition-all cursor-pointer"
        >
          Learn more
        </button>
      </div>
    </aside>
  );
};
