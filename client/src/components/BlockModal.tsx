import React from 'react';
import { UserX, X, AlertCircle } from 'lucide-react';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBlock: () => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  onClose,
  onConfirmBlock,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1C1E] border border-orange-200/80 dark:border-white/10 p-6 shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-orange-100 dark:border-white/10 mb-4">
          <div className="flex items-center gap-2 text-rose-500">
            <UserX className="w-5 h-5" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Block This Session?</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-neutral-300 mb-3 leading-relaxed">
          Blocking this stranger will immediately end the conversation and prevent both of you from being rematched during this session lifetime.
        </p>

        <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-white/5 border border-orange-200/60 dark:border-white/10 text-xs text-slate-700 dark:text-neutral-300 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#EC5E27] shrink-0 mt-0.5" />
          <span>
            Because Ologle does not use accounts, blocks are enforced on active session identifiers in server memory.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmBlock();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer"
          >
            Block & Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
