import React from 'react';
import { SafetyToast } from '../types/index.ts';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle.js';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert.js';
import X from 'lucide-react/dist/esm/icons/x.js';
import Info from 'lucide-react/dist/esm/icons/info.js';

interface SafetyWarningBannerProps {
  toasts: SafetyToast[];
  onDismiss: (id: string) => void;
}

export const SafetyWarningBanner: React.FC<SafetyWarningBannerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-18 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isBlocked = toast.type === 'blocked';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md ${
              isBlocked || isWarning
                ? 'bg-white/95 dark:bg-slate-900/95 border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 shadow-rose-500/10'
                : 'bg-white/95 dark:bg-slate-900/95 border-orange-300 dark:border-orange-800/60 text-slate-800 dark:text-slate-100 shadow-orange-500/10'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isBlocked ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-[#EC5E27] shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-bold block mb-0.5 uppercase tracking-wider text-slate-900 dark:text-white">
                  {isBlocked ? 'Message Blocked' : isWarning ? 'Safety Notice' : 'Notice'}
                </span>
                <p className="text-xs leading-relaxed opacity-95">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
