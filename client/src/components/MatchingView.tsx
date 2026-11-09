import React from 'react';
import { AlertCircle, LoaderCircle, Search, X } from 'lucide-react';
import type { ConnectionStatus } from '../services/haylooSocket.ts';

interface MatchingViewProps {
  profession: string;
  interests: string[];
  sessionMode: 'video' | 'voice' | 'messaging';
  connectionStatus: ConnectionStatus;
  onCancel: () => void;
}

const modeLabels = {
  video: 'video conversation',
  voice: 'voice conversation',
  messaging: 'text conversation',
};

export const MatchingView: React.FC<MatchingViewProps> = ({
  profession,
  interests,
  sessionMode,
  connectionStatus,
  onCancel,
}) => {
  const isConnected = connectionStatus === 'connected';

  return (
    <section
      className="flex min-h-[65vh] flex-1 items-center justify-center px-4 py-12"
      aria-labelledby="matching-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-white/10 dark:bg-slate-900 sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
          {isConnected ? <Search className="h-7 w-7" aria-hidden="true" /> : <AlertCircle className="h-7 w-7" aria-hidden="true" />}
        </div>
        <h1 id="matching-title" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isConnected ? 'Waiting for a real person' : 'Matching service unavailable'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isConnected
            ? `You’re in the queue for a ${modeLabels[sessionMode]}. We’ll connect you when another member with compatible interests is available.`
            : 'Your request is no longer connected to the matching service. Please return and try again when the service is available.'}
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left dark:bg-white/5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{profession}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {interests.join(' · ')}
          </p>
        </div>

        {isConnected && (
          <p className="mt-5 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
            <LoaderCircle className="h-4 w-4 animate-spin text-orange-500" aria-hidden="true" />
            Still waiting — no profiles or automated participants are shown.
          </p>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {isConnected ? 'Cancel search' : 'Back to matching'}
        </button>
      </div>
    </section>
  );
};
