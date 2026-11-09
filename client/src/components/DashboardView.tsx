import React from 'react';
import { SavedConnectionItem } from '../types/index.ts';

interface DashboardViewProps {
  profile: {
    displayName: string;
    headline: string;
    experience: string;
    skills: string[];
    bio: string;
  };
  savedConnections: SavedConnectionItem[];
  onStartConversation: () => void;
  onQuickMatch: () => void;
  onSelectDiscoveryMode: (purpose: string, professionId: string) => void;
  onEditProfile: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  savedConnections,
  onStartConversation,
  onQuickMatch,
  onSelectDiscoveryMode,
  onEditProfile,
}) => {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 flex-1 w-full space-y-8 animate-fadeIn text-white">
      {/* Hero Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl bg-[#141414] border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#EC5E27] font-bold">
              Signed In • Active Status
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back, {profile.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300">
            {profile.headline} • <span className="text-neutral-400">{profile.experience}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onQuickMatch}
            className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
          >
            Quick Match
          </button>
          <button
            type="button"
            onClick={onStartConversation}
            className="rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] px-6 py-2.5 text-xs sm:text-sm font-bold text-white tracking-wide transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            Start a Conversation →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Readiness & Skills */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight">Profile Readiness</h2>
              <span className="font-mono text-xs font-bold text-[#EC5E27]">90% COMPLETE</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="bg-[#EC5E27] h-full w-[90%] rounded-full shadow-[0_0_10px_#EC5E27]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                Active Skills & Domains
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg bg-[#202020] border border-white/10 px-2.5 py-1 text-xs font-semibold text-neutral-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onEditProfile}
            className="w-full rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer mt-4"
          >
            Edit Public Profile
          </button>
        </div>

        {/* Recommended Discovery Modes */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-3 shadow-xl">
          <h2 className="text-base font-bold text-white tracking-tight mb-1">Discovery Modes</h2>
          {[
            {
              title: 'Meet Someone Outside My Industry',
              desc: 'Cross-discipline ideation with creative specialists',
              purpose: 'EXCHANGE_IDEAS',
              prof: 'design-creative',
            },
            {
              title: 'Discuss a Technical or AI Project',
              desc: 'Deep-dive into architectures, models, and systems',
              purpose: 'DISCUSS_PROJECT',
              prof: 'data-ai',
            },
            {
              title: 'Share Expertise / Mentor a Peer',
              desc: 'Guide engineers, students, and early-stage builders',
              purpose: 'SHARE_EXPERTISE',
              prof: 'students-early-career',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDiscoveryMode(item.purpose, item.prof)}
              className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#1a1a1a] p-3.5 text-left text-xs font-bold hover:border-[#EC5E27] hover:bg-[#202020] transition-all cursor-pointer group"
            >
              <div>
                <span className="text-white group-hover:text-[#EC5E27] transition-colors block font-bold">
                  {item.title}
                </span>
                <span className="text-[11px] text-neutral-400 font-normal block mt-0.5">
                  {item.desc}
                </span>
              </div>
              <span className="text-[#EC5E27] font-black text-sm ml-2 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          ))}
        </div>

        {/* Saved Mutual Connections */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">Mutual Connections</h2>
            <span className="text-xs font-mono text-neutral-400 font-bold">
              {savedConnections.length} saved
            </span>
          </div>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {savedConnections.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center">
                No connections saved yet. Connect with a peer during a call!
              </p>
            ) : (
              savedConnections.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-xs space-y-0.5"
                >
                  <div className="flex justify-between font-bold text-white">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-neutral-400 font-normal">{c.date}</span>
                  </div>
                  <p className="text-neutral-300 text-[11px]">
                    {c.role} • <span className="text-[#EC5E27]">{c.topic}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
