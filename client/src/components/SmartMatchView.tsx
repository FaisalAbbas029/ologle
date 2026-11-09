import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { HAYLOO_PROFESSIONS, HAYLOO_PURPOSES } from '../data/constants.ts';

interface SmartMatchViewProps {
  initialConfig?: {
    professionId?: string;
    purpose?: string;
    mode?: string;
    language?: string;
  };
  onStartMatch: (config: {
    professionId: string;
    purpose: string;
    mode: string;
    language: string;
  }) => void;
  onInstantConnectTest?: () => void;
  onCancel?: () => void;
}

export const SmartMatchView: React.FC<SmartMatchViewProps> = ({
  initialConfig,
  onStartMatch,
  onInstantConnectTest,
  onCancel,
}) => {
  const [professionId, setProfessionId] = useState(initialConfig?.professionId || 'ANY');
  const [purpose, setPurpose] = useState(initialConfig?.purpose || 'EXCHANGE_IDEAS');
  const [mode, setMode] = useState(initialConfig?.mode || 'VIDEO');
  const [language, setLanguage] = useState(initialConfig?.language || 'English');

  const [isSearching, setIsSearching] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);

  useEffect(() => {
    if (!isSearching) {
      setWaitSeconds(0);
      return;
    }
    const timer = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isSearching]);

  const handleStart = () => {
    setIsSearching(true);
  };

  const handleConnectNow = () => {
    setIsSearching(false);
    if (onInstantConnectTest) {
      onInstantConnectTest();
    } else {
      onStartMatch({ professionId, purpose, mode, language });
    }
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    if (onCancel) onCancel();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 flex-1 w-full animate-fadeIn text-white">
      {!isSearching ? (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Configure Your Match
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                Select target profession, conversation intention, and call mode.
              </p>
            </div>
            <span className="rounded-xs bg-[#EC5E27] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
              SMART QUEUE
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              1. Target Profession
            </label>
            <select
              value={professionId}
              onChange={(e) => setProfessionId(e.target.value)}
              className="mt-2 w-full rounded-sm border border-white/20 bg-black px-3.5 py-2.5 text-sm font-medium text-white focus:border-[#EC5E27] focus:outline-none transition-colors cursor-pointer"
            >
              <option value="ANY">Any Profession (Open Discovery)</option>
              {HAYLOO_PROFESSIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tag})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              2. Conversation Purpose
            </label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {HAYLOO_PURPOSES.map((p) => {
                const active = purpose === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPurpose(p.id)}
                    className={`flex items-center justify-between rounded-sm border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'border-[#EC5E27] bg-[#EC5E27] text-white shadow-md'
                        : 'border-white/10 bg-[#1A1A1A] text-neutral-200 hover:border-white/30 hover:bg-[#202020]'
                    }`}
                  >
                    <span>{p.label}</span>
                    {active && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                3. Session Mode
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {['VIDEO', 'AUDIO', 'TEXT'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-sm border py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                      mode === m
                        ? 'border-[#EC5E27] bg-[#EC5E27] text-white shadow-md'
                        : 'border-white/10 bg-[#1A1A1A] text-neutral-300 hover:text-white hover:bg-[#202020]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                4. Primary Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-2 w-full rounded-sm border border-white/20 bg-black px-3.5 py-2.5 text-sm font-medium text-white focus:border-[#EC5E27] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="English">English</option>
                <option value="Urdu">Urdu</option>
                <option value="Spanish">Spanish</option>
                <option value="German">German</option>
                <option value="Arabic">Arabic</option>
              </select>
            </div>
          </div>

          <div className="border-t border-white/10 pt-5 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Zero self-matches or blocked users. Verified compatibility routing.
            </span>
            <button
              type="button"
              onClick={handleStart}
              className="rounded-sm bg-[#EC5E27] hover:bg-[#D94E1A] px-6 py-3 text-xs sm:text-sm font-bold text-white transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              Find My Match →
            </button>
          </div>
        </div>
      ) : (
        /* Real-Time Waiting Queue State */
        <div className="rounded-lg border border-white/10 bg-[#141414] p-8 text-center shadow-2xl space-y-5 animate-scaleUp">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#EC5E27] relative">
            <span className="h-4 w-4 animate-ping rounded-full bg-[#EC5E27]" />
            <span className="absolute h-3 w-3 rounded-full bg-[#EC5E27] shadow-[0_0_10px_#EC5E27]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Searching for a compatible professional...
          </h2>
          <p className="text-xs font-mono text-[#EC5E27] font-bold">
            ELAPSED: {waitSeconds}s • MODE: {mode} • PURPOSE: {purpose.replace('_', ' ')}
          </p>
          <p className="mx-auto max-w-md text-xs text-neutral-400 leading-relaxed">
            Scanning active online peers. You can immediately pair with a compatible candidate from the verified pool or continue searching.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={handleConnectNow}
              className="rounded-sm bg-[#EC5E27] hover:bg-[#D94E1A] px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer active:scale-95"
            >
              Connect Compatible Match Now →
            </button>
            <button
              type="button"
              onClick={handleCancelSearch}
              className="rounded-sm border border-white/20 hover:bg-white/10 px-5 py-2.5 text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel Queue
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
