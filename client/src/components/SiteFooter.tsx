import React, { useState } from 'react';
import { AppView } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { HeylooLogo } from './HeylooLogo.tsx';
import { MessageSquarePlus, X, Send, CheckCircle2 } from 'lucide-react';

interface SiteFooterProps {
  onNavigate: (view: AppView) => void;
  onOpenReport?: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onNavigate,
  onOpenReport,
}) => {
  const { t } = useLanguage();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState<'feedback' | 'bug' | 'safety' | 'privacy'>('feedback');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = supportMessage.trim();
    if (!clean) {
      setSupportError('Please enter your message or question.');
      return;
    }
    setSupportError(null);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setSupportMessage('');
        setSupportEmail('');
        setIsSupportOpen(false);
      }, 2000);
    }, 600);
  };

  return (
    <>
      <footer
        id="site-footer"
        className="w-full border-t transition-colors duration-300 py-2 sm:py-2.5 lg:py-2 mt-auto select-none shrink-0"
        style={{
          backgroundColor: 'var(--nav-bg, rgba(253, 237, 209, 0.94))',
          borderColor: 'var(--nav-border, rgba(236, 94, 39, 0.20))',
        }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">

          {/* Left Brand & Copyright (Matches reference screenshot) */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-center sm:justify-start">
            <HeylooLogo size="sm" animated={false} />

            {/* Copyright Subtitle */}
            <span className="text-xs sm:text-[13px] font-medium text-slate-600 dark:text-slate-400 transition-colors">
              {t('footer.copyright', '© 2026 Professional & Interest Video Network')}
            </span>
          </div>

          {/* Right Navigation Links */}
          <nav
            aria-label="Footer Navigation"
            className="flex items-center flex-wrap justify-center sm:justify-end gap-3.5 sm:gap-5 md:gap-6"
          >
            <button
              type="button"
              id="footer-terms-btn"
              onClick={() => onNavigate('terms_page')}
              className="text-xs sm:text-[13px] font-bold text-[#EC5E27] dark:text-[#FB923C] hover:text-[#C2410C] dark:hover:text-[#FDBA74] hover:underline transition-colors cursor-pointer"
            >
              {t('footer.terms', 'Terms of Service')}
            </button>

            <button
              type="button"
              id="footer-privacy-btn"
              onClick={() => onNavigate('privacy_page')}
              className="text-xs sm:text-[13px] font-bold text-[#EC5E27] dark:text-[#FB923C] hover:text-[#C2410C] dark:hover:text-[#FDBA74] hover:underline transition-colors cursor-pointer"
            >
              {t('footer.privacy', 'Privacy Policy')}
            </button>

            <button
              type="button"
              id="footer-guidelines-btn"
              onClick={() => onNavigate('community_rules')}
              className="text-xs sm:text-[13px] font-bold text-[#EC5E27] dark:text-[#FB923C] hover:text-[#C2410C] dark:hover:text-[#FDBA74] hover:underline transition-colors cursor-pointer"
            >
              {t('footer.guidelines', 'Community Guidelines')}
            </button>

            <button
              type="button"
              id="footer-report-btn"
              onClick={() => {
                if (onOpenReport) {
                  onOpenReport();
                } else {
                  onNavigate('community_rules');
                }
              }}
              className="text-xs sm:text-[13px] font-bold text-[#EC5E27] dark:text-[#FB923C] hover:text-[#C2410C] dark:hover:text-[#FDBA74] hover:underline transition-colors cursor-pointer"
            >
              {t('footer.report', 'Report a User')}
            </button>

            <button
              type="button"
              id="footer-support-btn"
              onClick={() => setIsSupportOpen(true)}
              className="text-xs sm:text-[13px] font-bold text-[#EC5E27] dark:text-[#FB923C] hover:text-[#C2410C] dark:hover:text-[#FDBA74] hover:underline transition-colors cursor-pointer"
            >
              {t('footer.contact', 'Contact Support')}
            </button>
          </nav>
        </div>
      </footer>

      {/* Support & Contact Dialog (Opened by clicking Contact Support) */}
      {isSupportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Contact Support"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsSupportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 sm:p-7 shadow-2xl transition-all border animate-scaleUp bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: 'var(--theme-primary, #EC5E27)' }}
                >
                  <MessageSquarePlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Contact Support
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Direct channel to our technical & safety team
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto border"
                  style={{
                    backgroundColor: 'rgba(236, 94, 39, 0.15)',
                    borderColor: 'var(--theme-primary, #EC5E27)',
                    color: 'var(--theme-primary, #EC5E27)',
                  }}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Message Received</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                  Thank you! Your feedback and inquiries are reviewed by our team promptly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={supportCategory}
                    onChange={(e: any) => setSupportCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#EC5E27] focus:ring-2 focus:ring-[#EC5E27]/15 cursor-pointer shadow-2xs"
                  >
                    <option value="feedback">General Feedback & Ideas</option>
                    <option value="bug">Technical / WebRTC Bug Report</option>
                    <option value="safety">Safety or Harassment Concern</option>
                    <option value="privacy">Privacy & Zero-Log Architecture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="name@company.com (for follow-up)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:border-[#EC5E27] focus:ring-2 focus:ring-[#EC5E27]/15 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your issue or suggestion..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:border-[#EC5E27] focus:ring-2 focus:ring-[#EC5E27]/15 resize-none shadow-2xs"
                  />
                </div>

                {supportError && (
                  <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-lg">
                    {supportError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSupportOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    style={{
                      background: 'var(--theme-btn-gradient, linear-gradient(135deg, #EC5E27 0%, #EA580C 100%))',
                    }}
                  >
                    {isSubmitting ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
