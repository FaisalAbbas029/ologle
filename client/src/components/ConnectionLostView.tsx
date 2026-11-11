import React from 'react';
import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';

interface ConnectionLostViewProps {
  onReconnect: () => void;
  onGoHome: () => void;
}

export const ConnectionLostView: React.FC<ConnectionLostViewProps> = ({
  onReconnect,
  onGoHome,
}) => {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-[#1E293B] border border-orange-200/80 dark:border-white/10 shadow-2xl transition-all duration-300">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-white/10 border border-[#EC5E27]/40 text-[#EC5E27] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(236,94,39,0.25)]">
          <WifiOff className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Connection Interrupted</h1>
        <p className="text-sm text-slate-600 dark:text-neutral-300 mb-8 leading-relaxed">
          The ephemeral signaling tunnel disconnected. Because Ologle retains zero persistent state on disk, your session was closed safely.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onReconnect}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#EA580C] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-[0_0_20px_rgba(236,94,39,0.3)] hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC5E27]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reconnect Signaling</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:border-[#EC5E27] hover:text-[#EC5E27] text-slate-700 dark:text-white font-semibold text-sm border border-slate-200 dark:border-white/15 transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC5E27]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
