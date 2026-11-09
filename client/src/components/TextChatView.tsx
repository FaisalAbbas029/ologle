import React, { useState, useEffect, useRef } from 'react';
import { CandidatePeer, ModerationReportItem } from '../types/index.ts';
import { validateChatMessage } from '../utils/chatSafety.ts';
import Send from 'lucide-react/dist/esm/icons/send.js';
import SkipForward from 'lucide-react/dist/esm/icons/skip-forward.js';
import Flag from 'lucide-react/dist/esm/icons/flag.js';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase.js';
import Globe from 'lucide-react/dist/esm/icons/globe.js';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js';
import Laptop from 'lucide-react/dist/esm/icons/laptop.js';
import Link2 from 'lucide-react/dist/esm/icons/link-2.js';
import Languages from 'lucide-react/dist/esm/icons/languages.js';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square.js';
import RotateCw from 'lucide-react/dist/esm/icons/rotate-cw.js';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert.js';
import PhoneOff from 'lucide-react/dist/esm/icons/phone-off.js';
import X from 'lucide-react/dist/esm/icons/x.js';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle.js';
import User from 'lucide-react/dist/esm/icons/user.js';
import { CountryFlag } from './CountryFlag.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface TextChatViewProps {
  partner: CandidatePeer;
  userProfile: {
    displayName: string;
    headline: string;
    skills: string[];
  };
  onNextMatch: () => void;
  onLeaveChat: () => void;
  onReportAndBlock: (report: ModerationReportItem) => void;
  onSwitchMode?: (mode: 'video' | 'voice' | 'messaging') => void;
}

export const TextChatView: React.FC<TextChatViewProps> = ({
  partner,
  userProfile,
  onNextMatch,
  onLeaveChat,
  onReportAndBlock,
  onSwitchMode,
}) => {
  const { t } = useLanguage();
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: number; sender: 'partner' | 'user'; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatWarning, setChatWarning] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Unprofessional conduct');
  const [translationActive, setTranslationActive] = useState(false);

  // Optional profile details (Name, Country with flag, Age, Profession Level)
  const [userProfileData, setUserProfileData] = useState<{
    name?: string;
    country?: string;
    countryCode?: string;
    countryFlag?: string;
    age?: number | string;
    professionLevel?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hayloo_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.countryFlag || parsed.country || parsed.countryCode || parsed.age || parsed.professionLevel)) {
          setUserProfileData(parsed);
        }
      }
    } catch {}
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend || chatInput).trim();
    if (!content || isSearching) return;

    // Strict safety check (banning external links, phone numbers, emails, sensitive info)
    const check = validateChatMessage(content);
    if (!check.isAllowed) {
      setChatWarning(check.reason || 'Sharing external links, phone numbers, or emails is banned.');
      return;
    }
    setChatWarning(null);

    const userMsg = {
      id: Date.now(),
      sender: 'user' as const,
      text: content,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
  };

  const handleTriggerNext = () => {
    setIsSearching(true);
    setMessages([]);
    onNextMatch();
    setTimeout(() => {
      setIsSearching(false);
    }, 1200);
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reportItem: ModerationReportItem = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter: userProfile.displayName,
      target: partner.displayName,
      targetId: partner.id,
      category: reportReason,
      status: 'NEW',
      time: 'Just now',
    };
    onReportAndBlock(reportItem);
    setReportModalOpen(false);
    handleTriggerNext();
  };

  const partnerInitials = partner.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const matchPercentage = partner.matchScore || 96;
  const firstName = partner.displayName.split(' ')[0];

  return (
    <div id="text-chat-view" className="flex-1 w-full bg-[var(--bg-primary,#fdedd1)] py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 flex items-center justify-center transition-colors">
      <div className="max-w-[1360px] w-full grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* ================= LEFT COLUMN: PEER IDENTITY & CONNECTION CARD ================= */}
        <div className="lg:col-span-4 xl:col-span-4 rounded-[28px] bg-[var(--card-bg,#ffffff)] dark:bg-slate-900 border border-orange-100/90 dark:border-slate-800 shadow-xl p-5 sm:p-6 flex flex-col justify-between min-h-[460px] sm:min-h-[540px]">
          <div>
            {/* Top Bar with Status Tag */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Connected</span>
              </div>
              <span className="bg-[#FFF0E6] dark:bg-orange-950/40 text-[#FF5500] text-xs font-black px-2.5 py-1 rounded-xl border border-[#FFD9C6] dark:border-orange-800/60">
                {matchPercentage}% Match
              </span>
            </div>

            {/* Peer Avatar & Details */}
            <div className="text-center pt-6 pb-4">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-[#161C2C] to-[#252E48] text-white flex items-center justify-center text-3xl font-black shadow-lg mb-4 border-2 border-emerald-500/40">
                {partnerInitials}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {partner.displayName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                {partner.headline}
              </p>

              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium mt-2">
                <Globe className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>{partner.location || 'Global Discovery'}</span>
              </div>
            </div>

            {/* Profession & Skills Tags */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3] dark:bg-slate-800/70 border border-orange-200/70 dark:border-slate-700 my-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                <Briefcase className="w-4 h-4 text-[#FF5500]" />
                <span>{partner.professionName}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {partner.skills.map((s) => (
                  <span
                    key={s}
                    className="bg-white/90 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-orange-200/60 dark:border-slate-600 shadow-2xs"
                  >
                    #{s}
                  </span>
                ))}
              </div>
            </div>

            {/* Privacy indicator */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero-Storage Encryption: Session exists purely in volatile RAM.</span>
            </div>

            {/* Optional User Profile Badge (Name, Country Flag, Age, Profession Level) */}
            {userProfileData && (userProfileData.name || userProfileData.countryFlag || userProfileData.country || userProfileData.countryCode || userProfileData.age || userProfileData.professionLevel) && (
              <div className="mt-3 flex items-center flex-wrap gap-2 p-2.5 rounded-xl bg-[#FFF0E6] dark:bg-slate-800 border border-[#FFD9C6] dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <User className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Your profile:</span>
                {(userProfileData.countryCode || userProfileData.country) && (
                  <CountryFlag
                    code={userProfileData.countryCode || userProfileData.country || ''}
                    className="w-4 h-2.5 rounded-xs shrink-0"
                  />
                )}
                {userProfileData.name && <span className="font-bold text-slate-900 dark:text-white">{userProfileData.name}</span>}
                {userProfileData.age && <span className="text-slate-500 dark:text-slate-400">({userProfileData.age})</span>}
                {userProfileData.professionLevel && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#EC5E27]/25 text-[#EC5E27] border border-[#EC5E27]/40 shrink-0">
                    {userProfileData.professionLevel}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Next Match & Leave */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLeaveChat}
                className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md border border-slate-700 transition cursor-pointer text-sm"
                title="End the Chat"
              >
                <PhoneOff className="w-4 h-4 text-slate-300" />
                <span>End Chat</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerNext}
                className="flex-1 bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer text-sm"
              >
                <span>Next Peer</span>
                <SkipForward className="w-4 h-4 fill-white" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-slate-600 dark:text-slate-400 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report Peer</span>
            </button>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: MESSAGING CHAT WINDOW ================= */}
        <div className="lg:col-span-8 xl:col-span-8 rounded-[28px] bg-[var(--card-bg,#ffffff)] dark:bg-slate-900 border border-orange-100/90 dark:border-slate-800 shadow-xl p-4 sm:p-6 flex flex-col justify-between min-h-[460px] sm:min-h-[540px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/25 flex items-center justify-center text-[#FF5500]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Conversation with {firstName}
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  Direct Text Messaging • Peer Verified
                </span>
              </div>
            </div>

            {/* Translation Toggle */}
            <button
              type="button"
              onClick={() => setTranslationActive(!translationActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                translationActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{translationActive ? 'Live Translation ON' : 'Translate'}</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1 max-h-[360px] sm:max-h-[400px]">
            {isSearching ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <RotateCw className="w-7 h-7 animate-spin text-[#FF5500] mb-2" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Connecting text chat with next peer...</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isPartner = msg.sender === 'partner';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isPartner ? 'justify-start' : 'justify-end'}`}
                  >
                    {isPartner && (
                      <div className="w-8 h-8 rounded-full bg-[#1C202B] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {partnerInitials}
                      </div>
                    )}
                    <div className="max-w-[80%]">
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xs ${
                          isPartner
                            ? 'bg-[#F6F5EE] dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/50 dark:border-slate-700'
                            : 'bg-[#FF5500] text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span
                        className={`text-[10px] text-slate-400 mt-1 block font-medium ${
                          isPartner ? 'text-left pl-1' : 'text-right pr-1'
                        }`}
                      >
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions & Input */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar">
              <span className="text-slate-400 font-medium shrink-0">Prompts:</span>
              <button
                type="button"
                onClick={() => handleSendMessage('What tech stack are you utilizing currently?')}
                className="bg-[#F4F3EE] dark:bg-slate-800 hover:bg-[#FFF0E6] dark:hover:bg-slate-700 hover:text-[#FF5500] text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Tech stack?</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Would love to learn about your current projects!')}
                className="bg-[#F4F3EE] dark:bg-slate-800 hover:bg-[#FFF0E6] dark:hover:bg-slate-700 hover:text-[#FF5500] text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Current projects</span>
              </button>
            </div>

            {/* Safety Alert Warning Banner */}
            {chatWarning && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{chatWarning}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatWarning(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  if (chatWarning) setChatWarning(null);
                }}
                placeholder="Type your message..."
                className="flex-1 bg-[#F8F7F2] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSearching}
                className="bg-[#FF5500] hover:bg-[#E04B00] text-white p-3.5 rounded-2xl shadow-md transition disabled:opacity-40 cursor-pointer"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <ShieldAlert className="w-5 h-5" />
                <span>Report Partner</span>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Reporting <span className="font-bold text-slate-900 dark:text-slate-100">{partner.displayName}</span> will immediately close this conversation and advance to the next peer.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for report</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="Unprofessional conduct">Unprofessional conduct</option>
                  <option value="Inappropriate language">Inappropriate language</option>
                  <option value="Spam / Solicitation">Spam / Solicitation</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md"
                >
                  Report & Next Peer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
