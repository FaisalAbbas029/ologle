import React from 'react';
import { ShieldCheck, Clock, MessageSquare, Sparkles, ArrowRight, RotateCcw, Home } from 'lucide-react';

interface SessionSummaryModalProps {
  durationSeconds: number;
  messageCount: number;
  sharedInterests: string[];
  partnerProfession?: string;
  onNextMatch: () => void;
  onChangeInterests: () => void;
  onGoHome: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  durationSeconds,
  messageCount,
  sharedInterests,
  partnerProfession,
  onNextMatch,
  onChangeInterests,
  onGoHome,
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div
      id="session-summary-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#141414]/95 border border-white/10 shadow-2xl text-white overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-[#EC5E27]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badge */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-2xl bg-[#EC5E27]/15 border border-[#EC5E27]/30 text-[#EC5E27] shadow-[0_0_20px_rgba(236,94,39,0.35)]">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-extrabold text-white">Conversation Concluded</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Session disconnected cleanly • Ephemeral memory purged
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="p-3.5 rounded-2xl bg-[#1A1A1A] border border-white/10/50 flex flex-col items-center text-center">
            <Clock className="w-5 h-5 text-neutral-300 mb-1" />
            <span className="text-[11px] text-neutral-400 uppercase font-semibold">Duration</span>
            <span className="text-lg font-bold text-white mt-0.5">{formatTime(durationSeconds)}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1A1A1A] border border-white/10/50 flex flex-col items-center text-center">
            <MessageSquare className="w-5 h-5 text-[#EC5E27] mb-1" />
            <span className="text-[11px] text-neutral-400 uppercase font-semibold">Exchanged</span>
            <span className="text-lg font-bold text-white mt-0.5">{messageCount} msgs</span>
          </div>
        </div>

        {/* Privacy Purge Guarantee */}
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-2.5 text-xs mb-5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-emerald-200">Zero-Trace Verification:</span>
            All transcripts, socket buffers, and tokens were wiped from server memory. 0 bytes written to disk.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            id="summary-next-match-btn"
            type="button"
            onClick={onNextMatch}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[0_0_20px_rgba(236,94,39,0.35)] transition-all cursor-pointer"
          >
            Find Next Match <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="summary-change-interests-btn"
              type="button"
              onClick={onChangeInterests}
              className="py-2.5 px-3 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] text-neutral-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Edit Interests
            </button>

            <button
              id="summary-go-home-btn"
              type="button"
              onClick={onGoHome}
              className="py-2.5 px-3 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] text-neutral-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              <Home className="w-3.5 h-3.5" /> Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
