import React, { useState } from 'react';
import Mail from 'lucide-react/dist/esm/icons/mail.js';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.js';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js';
import { useLanguage } from '../context/LanguageContext.tsx';

export const NewsletterSection: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmed) {
      setStatus('error');
      setErrorMessage('Please enter an email address.');
      return;
    }

    if (!emailRegex.test(trimmed)) {
      setStatus('error');
      setErrorMessage('Please provide a valid email format.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    setTimeout(() => {
      setStatus('success');
      setEmail('');
    }, 800);
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-12 border-t border-orange-100 dark:border-white/[0.08]">
      <div className="rounded-2xl bg-white dark:bg-[#0F172A]/70 backdrop-blur-xl border border-orange-100 dark:border-white/[0.08] hover:border-[#EC5E27]/40 p-8 sm:p-10 shadow-xl relative overflow-hidden transition-all">
        {/* Soft Orange Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#EC5E27]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="ai-badge-crimson mb-3">
            <Mail className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>{t('news.badge', 'Heyloo Innovation Dispatch')}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 ai-gradient-text">
            {t('news.title', 'Stay Updated on Smarter Technology & P2P Engineering')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 mb-6 leading-relaxed">
            {t('news.subtitle', 'Monthly technical writeups on low-latency WebRTC architectures, hardware-accelerated streams, and radical zero-logs privacy.')}
          </p>

          {status === 'success' ? (
            <div className="p-4 rounded-xl bg-[#FFF0E6] dark:bg-[#EC5E27]/15 border border-[#FFD9C6] dark:border-[#EC5E27] text-[#EC5E27] dark:text-white flex items-center justify-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-[#EC5E27] shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                {t('news.subscribed', 'Subscribed! You will receive the monthly Heyloo Innovation Dispatch.')}
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2.5 max-w-md mx-auto">
              <div className="relative w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={t('news.placeholder', 'Enter your email address...')}
                  disabled={status === 'loading'}
                  className="w-full px-4 py-3 rounded-xl bg-[#FFFDFB] dark:bg-[#070A0F] border border-orange-200 dark:border-white/[0.1] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-400 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27] transition-all shadow-inner"
                />
              </div>

              {/* Orange CTA Button */}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(236,94,39,0.35)] shrink-0 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <span>Subscribing...</span>
                ) : (
                  <>
                    <span>{t('news.subscribe', 'Subscribe Now')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="text-xs text-[#FF4D52] mt-2 font-medium">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 mt-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>Zero spam. Unsubscribe anytime with 1-click.</span>
          </div>
        </div>
      </div>
    </section>
  );
};
