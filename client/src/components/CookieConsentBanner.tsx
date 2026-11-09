import { ShieldCheck, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

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
      className="fixed bottom-5 right-5 z-40 max-w-sm sm:max-w-md w-[calc(100%-2.5rem)] rounded-2xl bg-[#141414] border border-[#EC5E27]/40 p-5 shadow-2xl text-white animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#EC5E27] rounded-md flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">
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

      <p className="text-xs text-neutral-300 leading-relaxed mb-4">
        Heyloo uses privacy-preserving local storage for ephemeral session preferences with radical zero-logs data retention.
      </p>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-2 px-4 rounded-xl bg-[#EC5E27] hover:bg-[#D94E1A] text-white font-bold text-xs text-center transition-all cursor-pointer shadow-sm active:scale-95"
        >
          Accept & Continue
        </button>

        <button
          type="button"
          onClick={handleLearnMore}
          className="py-2 px-3 rounded-xl border border-white/20 hover:border-white text-white font-semibold text-xs text-center transition-all cursor-pointer"
        >
          Learn more
        </button>
      </div>
    </aside>
  );
};
