import React from 'react';
import { SearchX, RotateCw, Sliders } from 'lucide-react';

interface NoMatchViewProps {
  onBroadenInterests: () => void;
  onExploreCommunities?: () => void;
  onRetryMatching: () => void;
}

export const NoMatchView: React.FC<NoMatchViewProps> = ({
  onBroadenInterests,
  onRetryMatching,
}) => {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="p-8 rounded-2xl bg-[#ffffff] border border-[#232323] shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#ffffff] border border-[#232323] text-[#bb3131] flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-8 h-8 text-[#bb3131]" />
        </div>

        <h1 className="text-2xl font-extrabold text-[#232323] mb-2">
          No one matching your interests is available right now.
        </h1>
        <p className="text-sm text-[#232323] mb-6 leading-relaxed">
          We never fabricate fake or simulated users. You can retry the 1-on-1 matching queue or modify your selected interests.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onRetryMatching}
            className="w-full py-3 rounded-xl bg-[#bb3131] hover:bg-[#bb3131] text-[#ffffff] font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bb3131]"
          >
            <RotateCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={onBroadenInterests}
            className="w-full py-3 rounded-xl bg-[#ffffff] hover:bg-[#bb3131] hover:text-[#ffffff] text-[#232323] font-semibold text-sm border border-[#232323] hover:border-[#bb3131] transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bb3131]"
          >
            <Sliders className="w-4 h-4 text-[#bb3131]" />
            <span>Change Interests</span>
          </button>
        </div>
      </div>
    </div>
  );
};
