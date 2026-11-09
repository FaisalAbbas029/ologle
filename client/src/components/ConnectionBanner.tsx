import React from 'react';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off.js';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.js';
import { ConnectionStatus } from '../services/haylooSocket.ts';

interface ConnectionBannerProps {
  status: ConnectionStatus;
  retrySecondsLeft: number;
  onReconnectNow: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  status,
  retrySecondsLeft,
  onReconnectNow,
}) => {
  if (status === 'connected') return null;

  return (
    <div
      id="connection-status-banner"
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-xl border transition-all duration-300 flex items-center justify-between gap-3 text-xs md:text-sm bg-[#141414]/90 border-amber-500/40 text-amber-200"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
        <div className="flex flex-col">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            {status === 'reconnecting'
              ? 'Reconnecting to privacy relay...'
              : 'Connecting to secure relay...'}
          </span>
          <span className="text-[11px] text-amber-300/80">
            {retrySecondsLeft > 0
              ? `Retrying in ${retrySecondsLeft}s`
              : 'Negotiating zero-persistence socket...'}
          </span>
        </div>
      </div>

      <button
        id="reconnect-now-btn"
        type="button"
        onClick={onReconnectNow}
        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        Retry Now
      </button>
    </div>
  );
};
