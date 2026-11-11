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
      <div className="p-8 rounded-2xl bg-white dark:bg-[#1E293B] border border-orange-200/80 dark:border-white/10 shadow-xl text-slate-900 dark:text-white">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-white/10 border border-[#EC5E27]/40 text-[#EC5E27] flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-8 h-8 text-[#EC5E27]" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
          No one matching your interests is available right now.
        </h1>
        <p className="text-sm text-slate-600 dark:text-neutral-300 mb-6 leading-relaxed">
          We never fabricate fake or simulated users. You can retry the 1-on-1 matching queue or modify your selected interests.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onRetryMatching}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#EA580C] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC5E27]"
          >
            <RotateCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={onBroadenInterests}
            className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 hover:border-[#EC5E27] hover:text-[#EC5E27] text-slate-700 dark:text-white font-semibold text-sm border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC5E27]"
          >
            <Sliders className="w-4 h-4 text-[#EC5E27]" />
            <span>Change Interests</span>
          </button>
        </div>
      </div>
    </div>
  );
};
