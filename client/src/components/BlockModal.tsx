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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#232323]/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-[#ffffff] border border-[#232323] p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#232323] mb-4">
          <div className="flex items-center gap-2 text-[#bb3131]">
            <UserX className="w-5 h-5" />
            <h3 className="text-lg font-bold text-[#232323]">Block This Session?</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#232323] hover:text-[#232323] hover:bg-[#ffffff] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#232323] mb-3 leading-relaxed">
          Blocking this stranger will immediately end the conversation and prevent both of you from being rematched during this session lifetime.
        </p>

        <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#232323] text-xs text-[#232323] mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#bb3131] shrink-0 mt-0.5" />
          <span>
            Because Ologle does not use accounts, blocks are enforced on active session identifiers in server memory.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#232323] hover:text-[#232323] hover:bg-[#ffffff] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmBlock();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#bb3131] hover:bg-[#bb3131] text-[#ffffff] transition-colors shadow-xs"
          >
            Block & Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
