import React from 'react';

interface SettingsViewProps {
  isPublic: boolean;
  allowConnections: boolean;
  blockedUsers: string[];
  onTogglePublic: (val: boolean) => void;
  onToggleConnections: (val: boolean) => void;
  onUnblockAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isPublic,
  allowConnections,
  blockedUsers,
  onTogglePublic,
  onToggleConnections,
  onUnblockAll,
}) => {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 flex-1 w-full space-y-6 text-white font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="rounded-xl border border-white/10 bg-[#141414] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-white/10 pb-4">
          <span className="rounded-full bg-[#EC5E27] px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white">
            SAFETY & PRIVACY
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
            Settings, Privacy & Permissions
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your discoverability, safety controls, and connection preferences.
          </p>
        </div>

        {/* Public Profile Visibility */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h3 className="text-sm font-bold text-white">Public Profile Card Visibility</h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              When enabled, matched peers can see your headline, verified discipline, and listed skills.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => onTogglePublic(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#262626] border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EC5E27]"></div>
          </label>
        </div>

        {/* Mutual Connection Requests */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h3 className="text-sm font-bold text-white">Post-Call Connection Requests</h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              Allow matched professionals to send a mutual exchange request during or after a conversation.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={allowConnections}
              onChange={(e) => onToggleConnections(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#262626] border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EC5E27]"></div>
          </label>
        </div>

        {/* Blocked Users Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Blocked Accounts ({blockedUsers.length})
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Blocked members will never be matched with you again.
              </p>
            </div>
            {blockedUsers.length > 0 && (
              <button
                type="button"
                onClick={onUnblockAll}
                className="text-xs font-bold text-[#EC5E27] hover:underline cursor-pointer"
              >
                Unblock All
              </button>
            )}
          </div>

          {blockedUsers.length === 0 ? (
            <div className="rounded-lg bg-black/50 border border-white/10 p-4 text-center text-xs text-neutral-400">
              No blocked users on your account.
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 divide-y divide-white/10 bg-black/50">
              {blockedUsers.map((uid) => (
                <div key={uid} className="flex items-center justify-between p-3 text-xs">
                  <span className="font-mono font-medium text-neutral-200">Account ID: {uid}</span>
                  <span className="rounded-full bg-[#EC5E27]/20 border border-[#EC5E27]/40 text-[#EC5E27] px-2 py-0.5 font-mono text-[10px] font-bold">
                    BLOCKED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Camera & Hardware Notice */}
        <div className="rounded-lg bg-[#1A1A1A] border border-white/10 p-4 text-xs text-neutral-300 space-y-1">
          <strong className="text-white font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EC5E27]" />
            Privacy Architecture
          </strong>
          <p className="leading-relaxed text-neutral-400">
            Ologle utilizes direct WebRTC peer connections. We never record audio or video streams in
            our servers, and media hardware is strictly activated only when inside an active call room.
          </p>
        </div>
      </div>
    </main>
  );
};
