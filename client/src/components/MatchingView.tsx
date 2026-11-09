import React from 'react';
import { LoaderCircle, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '../services/haylooSocket.ts';

interface MatchingViewProps {
  profession?: string;
  interests?: string[];
  country?: string;
  isMatchReady?: boolean;
  connectionStatus: ConnectionStatus;
  onCancel?: () => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  profession = 'your profession',
  interests = [],
  country = 'GLOBAL',
  isMatchReady = false,
  connectionStatus,
  onCancel,
}) => {
  const isConnected = connectionStatus === 'connected';

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#141414] p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#EC5E27]/30 bg-[#EC5E27]/10">
          {isMatchReady ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-[#EC5E27]" />
          ) : isConnected ? (
            <Wifi className="h-8 w-8 text-[#EC5E27]" />
          ) : (
            <WifiOff className="h-8 w-8 text-amber-400" />
          )}
        </div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#EC5E27]">
          {isMatchReady ? 'Live matchmaking' : 'Real people only'}
        </p>
        <h1 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
          {isMatchReady
            ? 'Finding your conversation partner'
            : isConnected
              ? 'No active match yet'
              : 'Connecting to the match service'}
        </h1>
        <p className="mx-auto max-w-md text-sm leading-6 text-neutral-400">
          {isMatchReady
            ? `Searching for a real person who shares your interests${interests.length ? ` in ${interests.join(', ')}` : ''}.`
            : isConnected
              ? 'Return home and start a match to connect with another person.'
              : 'Your request will be sent as soon as the live matchmaking service is available.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
          <span className="rounded-full border border-white/10 px-3 py-1.5">{profession}</span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">{country}</span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-8 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:border-white/30 hover:bg-white/5"
          >
            {isMatchReady ? 'Cancel search' : 'Return home'}
          </button>
        )}
      </div>
    </section>
  );
};
