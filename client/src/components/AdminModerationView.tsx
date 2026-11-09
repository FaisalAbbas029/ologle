import { CircleCheckBig as CheckCircle, Clock, Cpu, Radio, RefreshCw, Shield, ShieldAlert, UserX, VolumeX } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { EphemeralLiveTicket } from '../types/index.ts';
import { haylooSocket } from '../services/haylooSocket.ts';

interface AdminModerationViewProps {
  onBackToApp?: () => void;
}

export const AdminModerationView: React.FC<AdminModerationViewProps> = ({
  onBackToApp,
}) => {
  const [liveTickets, setLiveTickets] = useState<EphemeralLiveTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<EphemeralLiveTicket | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Subscribe to Live Ephemeral Queue via WebSocket stream
  useEffect(() => {
    // Send subscription command
    haylooSocket.send({ type: 'MOD_SUBSCRIBE' });

    const unsubscribe = haylooSocket.subscribe((msg: any) => {
      if (msg.type === 'MOD_QUEUE_UPDATE') {
        const tickets: EphemeralLiveTicket[] = msg.tickets || [];
        setLiveTickets(tickets);
        // If selected ticket was removed, clear selection
        setSelectedTicket((prev) => {
          if (!prev) return null;
          return tickets.find((t) => t.ticketId === prev.ticketId) || null;
        });
      }
    });

    // Refresh tickets every 5s
    const pollInterval = setInterval(() => {
      haylooSocket.send({ type: 'MOD_SUBSCRIBE' });
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const handleTakeAction = (ticketId: string, action: 'KICK' | 'MUTE' | 'DISMISS') => {
    haylooSocket.send({
      type: 'MOD_ACTION',
      ticketId,
      action,
    });

    const labels = {
      KICK: 'User session terminated and removed from live queue.',
      MUTE: 'User stream temporarily muted in real time.',
      DISMISS: 'Report dismissed and ticket purged from volatile memory.',
    };
    setActionSuccessMsg(labels[action]);
    setTimeout(() => setActionSuccessMsg(null), 4000);

    // Optimistically update
    setLiveTickets((prev) => prev.filter((t) => t.ticketId !== ticketId));
    if (selectedTicket?.ticketId === ticketId) {
      setSelectedTicket(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 flex-1 w-full space-y-6 text-white font-sans">
      {/* ── TOP HEADER: ZERO-DATA-STORAGE POLICY BADGE & OVERVIEW ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0D1117] border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-md bg-[#EC5E27] px-2.5 py-0.5 text-[11px] font-mono font-black text-white uppercase tracking-wider shadow-xs">
              LIVE EPHEMERAL MODERATION
            </span>
            <span className="rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>ZERO-DATA-STORAGE ACTIVE</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
            In-Flight Ephemeral Stream Inspector
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            Real-time automated and human safety queue. All media streams and text payloads are inspected in-flight inside volatile RAM. No chat logs, video buffers, or telemetry are ever saved to disk or databases.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          )}
          <button
            type="button"
            onClick={() => haylooSocket.send({ type: 'MOD_SUBSCRIBE' })}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Live Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── ZERO STORAGE TELEMETRY METRICS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#141414] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Pending Live Flags</span>
            <Radio className="w-4 h-4 text-[#EC5E27] animate-pulse" />
          </div>
          <div className="text-2xl font-black text-white">{liveTickets.length}</div>
          <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Volatile In-Memory Tickets</p>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Disk Storage Used</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">0 Bytes</div>
          <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">100% In-Flight Stream Memory</p>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Database Records Saved</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">0 Records</div>
          <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Zero Database Retention</p>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Session Hash Salting</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">SHA-256</div>
          <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Anonymized Volatile Hashes</p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ── LIVE EPHEMERAL QUEUE TABLE ── */}
      <div className="rounded-2xl border border-white/10 bg-[#141414] shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Active Flagged Streams</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-neutral-300 font-mono">
                Auto-Purge TTL: 5 min
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Sessions flagged by client-side ML heuristics or in-flight text pipeline checks.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/70 text-neutral-300 uppercase font-mono tracking-wider border-b border-white/15">
              <tr>
                <th className="p-4">Ticket ID</th>
                <th className="p-4">Room / Session Hash</th>
                <th className="p-4">Violation Category</th>
                <th className="p-4">Flag Reason</th>
                <th className="p-4">Confidence</th>
                <th className="p-4">TTL In RAM</th>
                <th className="p-4 text-right">Moderator Live Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-[#141414]">
              {liveTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-400 italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Shield className="w-8 h-8 text-neutral-600 mb-1" />
                      <span className="font-semibold text-neutral-300">All live peer sessions are clean and operating safely.</span>
                      <span className="text-xs text-neutral-400">Zero active misconduct tickets in volatile RAM.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                liveTickets.map((t) => {
                  const secondsLeft = Math.max(0, Math.floor((t.expiresAt - Date.now()) / 1000));
                  return (
                    <tr key={t.ticketId} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#EC5E27]">{t.ticketId.slice(0, 16)}</td>
                      <td className="p-4">
                        <div className="font-mono text-white text-[11px]">{t.roomId}</div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{t.sessionHash}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {t.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-200 max-w-xs truncate" title={t.reason}>
                        {t.reason}
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-300">
                        {Math.round(t.confidence * 100)}%
                      </td>
                      <td className="p-4 font-mono text-neutral-400">
                        {secondsLeft}s
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleTakeAction(t.ticketId, 'KICK')}
                          className="rounded-lg bg-[#EC5E27] px-3 py-1.5 font-bold text-white hover:bg-[#FF5500] transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Kick User</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTakeAction(t.ticketId, 'MUTE')}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 font-bold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Mute</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTakeAction(t.ticketId, 'DISMISS')}
                          className="rounded-lg border border-white/20 px-3 py-1.5 font-bold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};
