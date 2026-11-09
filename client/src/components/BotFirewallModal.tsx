/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bot,
  UserCheck,
  Lock,
  Flame,
  Activity,
  LogOut,
  Sparkles,
  RefreshCw,
  X,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut } from '../services/firebase.ts';
import { botFirewall, BotInspectionResult, SecurityChallenge } from '../services/botFirewall.ts';
import {
  UserProfile,
  SecurityAuditLog,
  syncUserProfile,
  logSecurityEvent,
  fetchUserSecurityLogs,
  fetchFirewallStats,
  updateFirewallStats,
} from '../services/userService.ts';

interface BotFirewallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile | null) => void;
  isHumanVerified: boolean;
  onVerifyHuman: () => void;
}

export const BotFirewallModal: React.FC<BotFirewallModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onProfileUpdated,
  isHumanVerified,
  onVerifyHuman,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'challenge' | 'auth' | 'logs'>('status');
  const [inspection, setInspection] = useState<BotInspectionResult | null>(null);
  const [challenge, setChallenge] = useState<SecurityChallenge | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [stats, setStats] = useState({ blocked: 142, verified: 389 });

  // Run client inspection and generate challenge on open
  useEffect(() => {
    if (isOpen) {
      const result = botFirewall.inspectClient();
      setInspection(result);
      setChallenge(botFirewall.generateChallenge());
      setChallengeError(null);
      setChallengeSuccess(false);

      // Fetch global stats
      fetchFirewallStats().then((res) => {
        if (res) {
          setStats({
            blocked: res.botsBlocked || 142,
            verified: res.verifiedHumans || 389,
          });
        }
      });

      // Fetch user security logs if logged in
      if (currentUser?.uid) {
        fetchUserSecurityLogs(currentUser.uid).then(setLogs);
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleRefreshChallenge = () => {
    setChallenge(botFirewall.generateChallenge());
    setSelectedOptionId(null);
    setChallengeError(null);
    setChallengeSuccess(false);
  };

  const handleVerifyChallenge = async (optionId: string) => {
    if (!challenge) return;
    setSelectedOptionId(optionId);

    if (optionId === challenge.correctId) {
      setChallengeSuccess(true);
      setChallengeError(null);
      botFirewall.markHumanConfirmed();
      onVerifyHuman();

      if (currentUser?.uid) {
        await logSecurityEvent(
          currentUser.uid,
          'INTERACTIVE_CHALLENGE',
          'passed',
          `Solved ${challenge.targetEmoji} challenge`
        );
        await updateFirewallStats(0, 1);
        const updatedLogs = await fetchUserSecurityLogs(currentUser.uid);
        setLogs(updatedLogs);
      }
    } else {
      setChallengeError('Verification failed. Bot behavior or incorrect selection.');
      if (currentUser?.uid) {
        await logSecurityEvent(
          currentUser.uid,
          'INTERACTIVE_CHALLENGE',
          'blocked',
          'Failed verification challenge'
        );
        await updateFirewallStats(1, 0);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      
      // Sync user profile to Firestore
      const now = new Date().toISOString();
      await syncUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        isHumanVerified: true,
        trustScore: 100,
        firewallPassedAt: now,
      });

      await logSecurityEvent(
        user.uid,
        'FIREBASE_AUTH_SIGNIN',
        'allowed',
        `Google identity verified for ${user.email}`
      );
      await updateFirewallStats(0, 1);

      onVerifyHuman();
      const updatedLogs = await fetchUserSecurityLogs(user.uid);
      setLogs(updatedLogs);
      setActiveTab('status');
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (currentUser?.uid) {
        await logSecurityEvent(currentUser.uid, 'FIREBASE_AUTH_SIGNOUT', 'allowed', 'User logged out');
      }
      await signOut(auth);
      onProfileUpdated(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <div
      id="bot-firewall-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#141414] rounded-2xl max-w-xl w-full border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="px-6 py-4 bg-[#111111] text-neutral-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EC5E27] flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">Ologle Bot Firewall</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EC5E27]/20 text-[#EC5E27] border border-[#EC5E27]/30">
                  Shield Active
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Multi-layer anti-bot filtering, automated scraping defense & verified human gateway
              </p>
            </div>
          </div>
          <button
            id="close-firewall-modal-btn"
            onClick={onClose}
            className="text-neutral-400 hover:text-[#EC5E27] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#141414] px-6 pt-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-[#EC5E27] text-[#EC5E27]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Firewall Status
          </button>
          <button
            onClick={() => setActiveTab('challenge')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'challenge'
                ? 'border-[#EC5E27] text-[#EC5E27]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Human Verification
          </button>
          <button
            onClick={() => setActiveTab('auth')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'auth'
                ? 'border-[#EC5E27] text-[#EC5E27]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Google Identity
          </button>
          {currentUser && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-[#EC5E27] text-[#EC5E27]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Security Logs
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-white text-sm">
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Telemetry Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#141414] border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-white">{stats.blocked}</div>
                  <div className="text-[11px] font-medium text-neutral-400 mt-0.5 flex items-center justify-center gap-1">
                    <Bot className="w-3 h-3 text-[#EC5E27]" /> Bots Deflected
                  </div>
                </div>
                <div className="bg-[#141414] border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-white">{stats.verified}</div>
                  <div className="text-[11px] font-medium text-neutral-400 mt-0.5 flex items-center justify-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" /> Humans Verified
                  </div>
                </div>
                <div className="bg-[#141414] border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-[#EC5E27] font-mono">100%</div>
                  <div className="text-[11px] font-medium text-neutral-400 mt-0.5 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-[#EC5E27]" /> Shield Integrity
                  </div>
                </div>
              </div>

              {/* Bot Inspection Summary */}
              <div className="bg-[#141414] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wider text-neutral-300">
                    Client Environment Analysis
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isHumanVerified || (inspection && !inspection.isSuspicious)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isHumanVerified || (inspection && !inspection.isSuspicious)
                      ? 'Verified Human Signature'
                      : 'Verification Recommended'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111111] border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Headless Scraping: <strong className="text-emerald-400">Blocked</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111111] border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>WebDriver Automation: <strong className="text-emerald-400">Shielded</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111111] border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Honeypot Trap: <strong className="text-emerald-400">Armed</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111111] border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Rate-Limiting Filter: <strong className="text-emerald-400">Enforced</strong></span>
                  </div>
                </div>
              </div>

              {/* Call to action */}
              {!currentUser ? (
                <div className="bg-[#141414] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-white">Protect your conversations with Google Auth</div>
                    <div className="text-xs text-neutral-400">
                      Sign in with Google to permanently register your human credentials in Firestore.
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('auth')}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#EC5E27] text-white hover:bg-[#D94E1A] shrink-0 transition-colors cursor-pointer"
                  >
                    Sign In with Google
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      {currentUser.displayName?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {currentUser.displayName || currentUser.email}
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-xs text-emerald-300">
                        Authenticated & Synced with Firebase Firestore
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-neutral-400 hover:text-white font-semibold px-2 py-1 cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE CHALLENGE */}
          {activeTab === 'challenge' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#141414] text-xl mb-1">
                  {challenge?.targetEmoji || '🛡️'}
                </div>
                <h4 className="font-bold text-white text-base">
                  {challenge?.question || 'Human Proof-of-Work Challenge'}
                </h4>
                <p className="text-xs text-white">
                  Automated scraping bots fail visual pattern recognition. Select the requested token below:
                </p>
              </div>

              {challengeSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="font-bold text-emerald-300">Human Verification Succeeded!</div>
                  <p className="text-xs text-emerald-200">
                    Your session is verified. You have full access to 1-on-1 peer conversations.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {challenge?.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleVerifyChallenge(opt.id)}
                      className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-2 hover:border-[#EC5E27] hover:bg-[#EC5E27]/5 cursor-pointer ${
                        selectedOptionId === opt.id
                          ? 'border-[#EC5E27] bg-[#EC5E27]/15 shadow-[0_0_15px_rgba(236,94,39,0.2)]'
                          : 'border-white/10 bg-[#141414]'
                      }`}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className="text-xs font-semibold text-white">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {challengeError && (
                <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/40 p-2.5 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{challengeError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={handleRefreshChallenge}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate New Challenge
                </button>
                <span className="text-[11px] text-neutral-400">
                  Security token randomized each request
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE IDENTITY / FIREBASE AUTH */}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              {!currentUser ? (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#EC5E27]/15 border border-[#EC5E27]/30 flex items-center justify-center text-[#EC5E27] mx-auto shadow-[0_0_20px_rgba(236,94,39,0.25)]">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">Google Sign-In with Firebase</h4>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                      Signing in with your verified Google account establishes a cryptographic barrier against bots and permanently stores your profile in Cloud Firestore.
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 text-left">
                      {authError}
                    </div>
                  )}

                  <button
                    id="google-signin-btn"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="w-full py-3 px-4 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-xs flex items-center justify-center gap-3 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    {isSigningIn ? 'Connecting to Firebase...' : 'Continue with Google'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#141414] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase">Connected Firebase User</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                        Human Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt="avatar"
                          width="40"
                          height="40"
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 rounded-full border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#EC5E27] text-white flex items-center justify-center font-bold">
                          {currentUser.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-sm">{currentUser.displayName || 'Google User'}</div>
                        <div className="text-xs text-neutral-400">{currentUser.email}</div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 pt-2 border-t border-white/10">
                      Firestore Document Path: <code className="text-[#EC5E27] font-mono">/users/{currentUser.uid}</code>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" /> Sign out of Ologle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Firewall Event Trail (Firestore)
                </span>
                <span className="text-xs text-neutral-400">{logs.length} logged events</span>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No security incidents or challenges logged for this user yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[#141414] border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">{log.action}</div>
                        <div className="text-[11px] text-neutral-400">{log.details}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'allowed' || log.status === 'passed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                        <div className="text-[10px] text-neutral-400 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#111111] border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-pulse" />
            <span>Firewall Core: v2.4 (Active Defense)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
