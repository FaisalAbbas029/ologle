import React, { useState, useEffect } from 'react';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up.js';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      id="scroll-to-top-btn"
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top of page"
      className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-[#141414] text-white border border-white/20 shadow-xl hover:bg-[#EC5E27] hover:text-white hover:border-[#EC5E27] hover:shadow-[0_0_20px_rgba(236,94,39,0.5)] transition-all duration-200 transform hover:-translate-y-1 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC5E27]"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};
