import React, { useState, useEffect } from 'react';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off.js';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.js';
import { ConnectionStatus } from '../services/ologleSocket.ts';

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
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // When fully connected and online, banner is never needed
  if (status === 'connected' && isOnline) return null;

  // On initial page load while online, allow silent background connection without flashing alarms
  if (isOnline && (status === 'connecting' || status === 'disconnected') && retrySecondsLeft === 0) {
    return null;
  }

  const isActuallyOffline = !isOnline;
  const isReconnecting = status === 'reconnecting';
  const isExhausted = status === 'disconnected' && retrySecondsLeft < 0;

  const headline = isActuallyOffline
    ? 'You appear to be offline'
    : isExhausted
    ? 'Connection to signaling server failed'
    : isReconnecting
    ? 'Reconnecting to signaling server...'
    : 'Connecting to signaling server...';

  const subtext = isActuallyOffline
    ? 'Check your device internet or Wi-Fi connection.'
    : isExhausted
    ? 'Could not reach the server after multiple attempts. Click Retry Now to try again.'
    : retrySecondsLeft > 0
    ? `Retrying in ${retrySecondsLeft}s — server waking up (first connect can take ~20s)`
    : 'Waiting for server response...';

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
            {headline}
          </span>
          <span className="text-[11px] text-amber-300/80">
            {subtext}
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
