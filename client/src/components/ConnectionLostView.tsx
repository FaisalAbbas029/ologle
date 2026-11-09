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
      <div className="p-8 sm:p-10 rounded-2xl bg-[#232323] border border-[#ffffff]/20 shadow-2xl transition-all duration-300 hover:border-[#ffffff]/40">
        <div className="w-16 h-16 rounded-2xl bg-[#232323] border border-[#bb3131] text-[#bb3131] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(187,49,49,0.3)]">
          <WifiOff className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-[#ffffff] mb-2 tracking-tight">Connection Interrupted</h1>
        <p className="text-sm text-[#ffffff]/70 mb-8 leading-relaxed">
          The ephemeral signaling tunnel disconnected. Because Ologle retains zero persistent state on disk, your session was closed safely.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onReconnect}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#bb3131] hover:bg-[#bb3131] text-[#ffffff] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-[0_0_20px_rgba(187,49,49,0.3)] hover:shadow-[0_0_25px_rgba(187,49,49,0.45)] hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bb3131]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reconnect Signaling</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#232323] hover:border-[#bb3131] hover:text-[#bb3131] text-[#ffffff] font-semibold text-sm border border-[#ffffff]/25 transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bb3131]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
