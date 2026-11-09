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
      <div className="p-8 rounded-2xl bg-[#ffffff] border border-[#232323] shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#232323] text-[#bb3131] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-extrabold text-[#232323] mb-2">Temporary Session Restriction</h1>
        <p className="text-xs text-[#232323] mb-6 leading-relaxed">
          {restriction.reason || 'This session has been temporarily restricted due to policy violations.'}
        </p>

        {/* Countdown Box */}
        <div className="p-6 rounded-xl bg-[#ffffff] border border-[#232323] mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[#232323] mb-2 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-[#bb3131]" />
            <span>Restriction Expires In</span>
          </div>
          <div className="text-4xl font-mono font-extrabold text-[#bb3131] tracking-wider">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={remainingSeconds > 0}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
            remainingSeconds === 0
              ? 'bg-[#bb3131] hover:bg-[#bb3131] text-[#ffffff] shadow-xs'
              : 'bg-[#ffffff] text-[#232323] cursor-not-allowed border border-[#232323]'
          }`}
        >
          <span>{remainingSeconds === 0 ? 'Return to Main Menu' : 'Waiting for cooldown to finish...'}</span>
          {remainingSeconds === 0 && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
