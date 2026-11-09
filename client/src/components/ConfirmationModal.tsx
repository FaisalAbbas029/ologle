import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning' | 'info';
  confirmDisabled?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  confirmDisabled = false,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    destructive: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40',
    },
    warning: {
      icon: AlertCircle,
      iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40',
    },
    info: {
      icon: Info,
      iconBg: 'bg-[#EC5E27]/15 text-[#EC5E27] border border-[#EC5E27]/30',
      btnBg: 'bg-[#EC5E27] hover:bg-[#D94E1A] text-white shadow-[#EC5E27]/25',
    },
  }[variant];

  const IconComponent = variantStyles.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#141414] border border-white/10 p-6 space-y-4 shadow-2xl text-white animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${variantStyles.iconBg}`}>
              <IconComponent className="w-5 h-5 shrink-0" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed pl-1">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${variantStyles.btnBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
