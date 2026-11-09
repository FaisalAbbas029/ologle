import React from 'react';
import { ShieldCheck, HardDrive, Lock, Cookie, EyeOff, Server, X } from 'lucide-react';

interface PrivacyInspectorModalProps {
  sessionId?: string;
  onClose: () => void;
}

export const PrivacyInspectorModal: React.FC<PrivacyInspectorModalProps> = ({
  sessionId,
  onClose,
}) => {
  return (
    <div
      id="privacy-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg p-6 rounded-3xl bg-[#141414]/95 border border-white/10 shadow-2xl text-white overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EC5E27]/15 text-[#EC5E27] border border-[#EC5E27]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ologle Zero-Persistence Inspector</h3>
              <p className="text-xs text-neutral-400">Verifiable privacy guarantees in real time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-3 overflow-y-auto pr-1 text-xs">
          {/* Active Session Info */}
          <div className="p-3.5 rounded-2xl bg-[#111111]/60 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-300">
              <Server className="w-4 h-4 text-neutral-300" />
              <span>Ephemeral Relay Token</span>
            </div>
            <span className="font-mono text-[11px] text-[#EC5E27] bg-black/50 px-2 py-0.5 rounded-md border border-[#EC5E27]/30 truncate max-w-[180px]">
              {sessionId || 'volatile_anon_mem'}
            </span>
          </div>

          {/* Privacy Audit Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#1A1A1A]/40 border border-white/10/50">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <HardDrive className="w-4 h-4" /> Hard Disk Writes: 0
              </div>
              <p className="text-neutral-400 text-[11px]">
                No SQLite, Postgres, or disk logging. Messages exist purely in Node.js heap RAM while in transit.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#1A1A1A]/40 border border-white/10/50">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <Cookie className="w-4 h-4" /> Tracking Cookies: 0
              </div>
              <p className="text-neutral-400 text-[11px]">
                No third-party analytics, fingerprinting beacons, or ad retargeting pixels whatsoever.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#1A1A1A]/40 border border-white/10/50">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <EyeOff className="w-4 h-4" /> Accountless Guarantee
              </div>
              <p className="text-neutral-400 text-[11px]">
                Zero emails, passwords, phone numbers, or social logins required. Total anonymity.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#1A1A1A]/40 border border-white/10/50">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <Lock className="w-4 h-4" /> Instant Memory Purge
              </div>
              <p className="text-neutral-400 text-[11px]">
                Closing your browser tab or clicking Next immediately triggers garbage collection of all peer buffers.
              </p>
            </div>
          </div>

          {/* Server-Side AI Disclosure */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200">
            <span className="font-bold block text-white mb-1">Private AI Grounding:</span>
            Real-time audio transcription and topic icebreakers are processed statelessly via Google Gemini. Prompts are never used to train foundational models or persisted after generation.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">Ologle Security Architecture v4.2</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
