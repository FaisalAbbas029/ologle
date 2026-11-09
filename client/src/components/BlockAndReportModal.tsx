import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, EyeOff, MessageSquareX, Megaphone, HelpCircle } from 'lucide-react';

export const BLOCK_REASONS = [
  {
    id: 'Inappropriate Video / Nudity',
    label: 'Inappropriate Video / Nudity',
    desc: 'Unwanted nudity, sexual content, or suggestive behavior on camera.',
    icon: EyeOff,
  },
  {
    id: 'Harassment or Bullying',
    label: 'Harassment or Bullying',
    desc: 'Hostile remarks, intimidation, hate speech, or persistent badgering.',
    icon: MessageSquareX,
  },
  {
    id: 'Spam or Advertising',
    label: 'Spam or Commercial Promotion',
    desc: 'Automated bots, promotional links, solicitation, or scams.',
    icon: Megaphone,
  },
  {
    id: 'Threats or Violence',
    label: 'Threats or Violence',
    desc: 'Direct threats of physical harm, self-harm, or illegal activity.',
    icon: AlertTriangle,
  },
  {
    id: 'Other Unwanted Behavior',
    label: 'Other Unwanted Conduct',
    desc: 'Violated platform decorum, offensive trolling, or evasive behavior.',
    icon: HelpCircle,
  },
];

interface BlockAndReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBlock: (reason: string) => void;
  partnerProfession?: string;
}

export const BlockAndReportModal: React.FC<BlockAndReportModalProps> = ({
  isOpen,
  onClose,
  onConfirmBlock,
  partnerProfession,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(BLOCK_REASONS[0].id);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmBlock(selectedReason);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#EC5E27]/40 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#EC5E27] to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EC5E27]/20 border border-[#EC5E27]/40 flex items-center justify-center text-[#EC5E27] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="block-report-modal-title" className="text-lg font-black text-white tracking-tight">
                Block & Report User
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Immediate mutual disconnection with persistent pairing exclusion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason Selection */}
        <div className="mb-6 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block mb-2">
            Reason for Blocking {partnerProfession ? `(${partnerProfession})` : ''}
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
            {BLOCK_REASONS.map((reason) => {
              const Icon = reason.icon;
              const isSelected = selectedReason === reason.id;
              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => setSelectedReason(reason.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EC5E27]/15 border-[#EC5E27] text-white shadow-[0_0_15px_rgba(236,94,39,0.2)]'
                      : 'bg-[#1A1A1A] border-white/10 text-neutral-300 hover:border-white/25 hover:bg-[#202020]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                      isSelected ? 'text-[#EC5E27]' : 'text-neutral-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold leading-tight">{reason.label}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{reason.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reassurance Disclaimer */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-neutral-300 mb-6 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            The media stream will cut off instantly. Their visitor ID and network address are permanently saved to your blocklist to guarantee you are never rematched.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-block-report-btn"
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-[#EC5E27] hover:bg-[#D94E1A] text-white flex items-center gap-2 shadow-[0_0_15px_rgba(236,94,39,0.4)] transition-all cursor-pointer active:scale-95"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Confirm Block & Find Next</span>
          </button>
        </div>
      </div>
    </div>
  );
};
