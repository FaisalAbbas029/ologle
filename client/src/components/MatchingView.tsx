import React from 'react';
import {
  AlertTriangle,
  LoaderCircle,
  MessageSquare,
  Mic,
  Radio,
  Search,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import type { ConnectionStatus } from '../services/haylooSocket.ts';
import {
  AI_PRACTICE_PARTNERS,
  AIPracticePartner,
} from '../data/aiPracticePartners.ts';
import { CountryFlag } from './CountryFlag.tsx';

interface MatchingViewProps {
  profession?: string;
  interests?: string[];
  country?: string;
  sessionMode?: 'video' | 'voice' | 'messaging';
  isMatchReady?: boolean;
  connectionStatus: ConnectionStatus;
  realUsersCount?: number;
  onCancel?: () => void;
  onSelectAIPartner?: (partner: AIPracticePartner, mode: 'video' | 'voice' | 'messaging') => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  profession = 'General',
  interests = [],
  country = 'GLOBAL',
  sessionMode = 'messaging',
  isMatchReady = false,
  connectionStatus,
  realUsersCount = 0,
  onCancel,
  onSelectAIPartner,
}) => {
  const isConnected = connectionStatus === 'connected';
  const isDisconnected = connectionStatus === 'disconnected' || connectionStatus === 'reconnecting';
  const hasRealUsers = realUsersCount > 0;

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start px-3 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto animate-fadeIn">
      {/* Top Header / Criteria Bar */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EC5E27]/15 border border-[#EC5E27]/30 flex items-center justify-center text-[#EC5E27]">
            {isMatchReady && isConnected ? (
              <LoaderCircle className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Peer Matching & Discovery
              </h1>
              {isConnected && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Queue
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              {isConnected
                ? isMatchReady
                  ? 'Searching for matching real members in queue...'
                  : 'Ready to connect'
                : 'Offline discovery mode'}
            </p>
          </div>
        </div>

        {/* Selected Criteria */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-neutral-300 font-semibold">
            {profession || 'Any Profession'}
          </span>
          {country && country !== 'GLOBAL' && (
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-neutral-300 flex items-center gap-1.5">
              <CountryFlag code={country} className="w-3.5 h-2.5" />
              <span>{country}</span>
            </span>
          )}
          {interests.slice(0, 2).map((item) => (
            <span
              key={item}
              className="px-2.5 py-1 rounded-lg bg-[#EC5E27]/10 border border-[#EC5E27]/25 text-[#EC5E27] font-medium"
            >
              #{item}
            </span>
          ))}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-white/15 text-neutral-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SAFETY NOTICE (When fewer than 3 interests are selected) ── */}
      {interests.length < 3 && (
        <div
          role="alert"
          className="w-full mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left shadow-lg backdrop-blur-sm animate-fadeIn"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-amber-400">Safety Notice</h2>
              <p className="mt-0.5 text-xs text-amber-200/90 leading-relaxed font-medium">
                Please select at least 3 interests to match.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SAFETY NOTICE (Shown when live matching service is disconnected) ── */}
      {isDisconnected && (
        <div
          role="alert"
          className="w-full mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-amber-400">Safety Notice</h2>
              <p className="mt-0.5 text-xs text-amber-200/90 leading-relaxed font-medium">
                Live matching could not connect. Please try again in a moment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CASE 1: Real users available ── */}
      {hasRealUsers && isConnected && (
        <div className="w-full mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Available Real Members</span>
            </h2>
            <span className="text-xs text-emerald-400 font-semibold">Prioritized Matching</span>
          </div>
          {/* Real user results render here without AI bots mixed in */}
        </div>
      )}

      {/* ── CASE 2 & 3: AI Practice Partners (Shown when 0 real users or disconnected) ── */}
      {(!hasRealUsers || isDisconnected) && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#EC5E27]" />
                <span>AI Practice Partners</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EC5E27]/15 border border-[#EC5E27]/30 text-[#EC5E27] text-[10px] font-bold">
                  Instant Warm-Up
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isDisconnected
                  ? 'Practice conversations with dedicated AI peers while live matching reconnects.'
                  : 'No real members in queue matching your criteria right now. Practice with labeled AI partners.'}
              </p>
            </div>
            <span className="text-xs text-neutral-400">
              {AI_PRACTICE_PARTNERS.length} Partners Online
            </span>
          </div>

          {/* Discovery Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {AI_PRACTICE_PARTNERS.map((partner) => (
              <div
                key={partner.id}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#141414] hover:border-[#EC5E27]/50 p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(236,94,39,0.12)] relative overflow-hidden"
              >
                {/* Card Top / Avatar + Badges */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="relative">
                      <img
                        src={partner.avatar}
                        alt={partner.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Animated Online Indicator */}
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#141414]" />
                      </span>
                    </div>

                    {/* AI Identification Badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-[#EC5E27] text-[10px] font-extrabold tracking-wide uppercase shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>AI Partner</span>
                    </span>
                  </div>

                  {/* Name & Profession */}
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white group-hover:text-[#EC5E27] transition-colors truncate">
                        {partner.name}
                      </h3>
                      <CountryFlag code={partner.country} className="w-3.5 h-2.5" />
                    </div>
                    <p className="text-xs font-semibold text-[#EC5E27] truncate">
                      {partner.profession}
                    </p>
                  </div>

                  {/* Description / Bio */}
                  <p className="text-xs text-neutral-300 leading-relaxed mb-3 line-clamp-3">
                    {partner.bio}
                  </p>

                  {/* Interest Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {partner.interests.slice(0, 3).map((item) => (
                      <span
                        key={item}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-neutral-300 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interactive Action Buttons */}
                <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectAIPartner?.(partner, 'messaging')}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-[#EC5E27] hover:text-white text-neutral-200 text-xs font-bold transition-all cursor-pointer group/btn"
                    title="Start messaging conversation"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#EC5E27] group-hover/btn:text-white" />
                    <span className="text-[11px]">Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectAIPartner?.(partner, 'voice')}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-[#EC5E27] hover:text-white text-neutral-200 text-xs font-bold transition-all cursor-pointer group/btn"
                    title="Start AI voice call"
                  >
                    <Mic className="w-3.5 h-3.5 text-emerald-400 group-hover/btn:text-white" />
                    <span className="text-[11px]">Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectAIPartner?.(partner, 'video')}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-[#EC5E27] hover:text-white text-neutral-200 text-xs font-bold transition-all cursor-pointer group/btn"
                    title="Start AI video call"
                  >
                    <Video className="w-3.5 h-3.5 text-sky-400 group-hover/btn:text-white" />
                    <span className="text-[11px]">Video</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
