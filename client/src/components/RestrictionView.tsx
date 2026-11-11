import React, { useState, useEffect } from 'react';
import { RestrictionState } from '../types/index.ts';
import { ShieldAlert, Clock, ArrowRight } from 'lucide-react';

interface RestrictionViewProps {
  restriction: RestrictionState;
  onReset: () => void;
}

export const RestrictionView: React.FC<RestrictionViewProps> = ({
  restriction,
  onReset,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.max(0, Math.ceil((restriction.restrictedUntil - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((restriction.restrictedUntil - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [restriction.restrictedUntil]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="p-8 rounded-2xl bg-white dark:bg-[#1E293B] border border-orange-200/80 dark:border-white/10 shadow-xl text-slate-900 dark:text-white">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-white/10 border border-orange-200/80 dark:border-white/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Temporary Session Restriction</h1>
        <p className="text-xs text-slate-600 dark:text-neutral-300 mb-6 leading-relaxed">
          {restriction.reason || 'This session has been temporarily restricted due to policy violations.'}
        </p>

        {/* Countdown Box */}
        <div className="p-6 rounded-xl bg-orange-50/60 dark:bg-white/5 border border-orange-200/60 dark:border-white/10 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-[#EC5E27]" />
            <span>Restriction Expires In</span>
          </div>
          <div className="text-4xl font-mono font-extrabold text-[#EC5E27] tracking-wider">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={remainingSeconds > 0}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            remainingSeconds === 0
              ? 'bg-gradient-to-r from-[#EC5E27] to-[#EA580C] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white shadow-md cursor-pointer'
              : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-neutral-500 cursor-not-allowed border border-slate-200 dark:border-white/10'
          }`}
        >
          <span>{remainingSeconds === 0 ? 'Return to Main Menu' : 'Waiting for cooldown to finish...'}</span>
          {remainingSeconds === 0 && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
