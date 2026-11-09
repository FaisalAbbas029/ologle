import React from 'react';
import { Shield, Lock, Eye, CheckCircle2, ArrowLeft, ArrowRight, UserCheck, MessageSquare, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface PrivacyViewProps {
  onStart: () => void;
  onBack: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({
  onStart,
  onBack,
}) => {
  const { t } = useLanguage();
  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 transition-colors duration-300"
      style={{ color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div className="mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-sm border"
          style={{
            backgroundColor: 'var(--pill-bg)',
            borderColor: 'var(--pill-border)',
            color: 'var(--accent-color)',
          }}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Trust & Transparency</span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-black tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Privacy Policy
        </h1>
        <p
          className="text-xs sm:text-sm mt-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          Effective Date: October 2026 • Version 2.4
        </p>
        <p
          className="text-sm sm:text-base mt-4 leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          At Ologle, we believe genuine professional connections require mutual trust and uncompromising privacy. This policy explains how our platform operates, how your communications are secured, and how we protect your personal rights.
        </p>
      </div>

      {/* Structured Policy Cards */}
      <div className="space-y-6 mb-10">
        {/* Section 1: Core Principles */}
        <div
          className="p-6 sm:p-8 rounded-2xl border backdrop-blur-xl shadow-xl space-y-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            <Lock className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            <span>1. Core Privacy Commitments</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Ologle is engineered to facilitate direct peer-to-peer discovery without intrusive tracking or invasive profiling. We do not sell your personal information, operate tracking networks, or share your private conversations with third-party advertisers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div
              className="p-3.5 rounded-xl border flex items-start gap-2.5"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <strong className="block mb-0.5" style={{ color: 'var(--text-primary)' }}>No Commercial Ad Tracking</strong>
                Zero advertising SDKs, data brokers, or marketing surveillance tools.
              </div>
            </div>
            <div
              className="p-3.5 rounded-xl border flex items-start gap-2.5"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <strong className="block mb-0.5" style={{ color: 'var(--text-primary)' }}>User Confidentiality</strong>
                Direct peer communications remain between you and your conversation partner.
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Real-Time Media & P2P Security */}
        <div
          className="p-6 sm:p-8 rounded-2xl border backdrop-blur-xl shadow-xl space-y-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            <Eye className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            <span>2. Video & Audio Communication Security</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Video and audio calls on Ologle utilize industry-standard peer-to-peer WebRTC protocols with DTLS/SRTP encryption. Communication streams travel directly between peer browsers, and our servers do not record, store, or monitor your live audiovisual feeds.
          </p>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Camera and microphone permissions are requested explicitly by your browser and are active only while you are in an ongoing conversation session. You can mute your microphone or disable your camera at any moment using on-screen room controls.
          </p>
        </div>

        {/* Section 3: Information Collected & Processed */}
        <div
          className="p-6 sm:p-8 rounded-2xl border backdrop-blur-xl shadow-xl space-y-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            <UserCheck className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            <span>3. Information You Provide</span>
          </h2>
          <ul
            className="list-disc pl-5 space-y-2 text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Matchmaking Preferences:</strong> Your selected professional domain, industry topics, and conversation focus are processed in real time solely to calculate compatibility with prospective peers.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Session Communications:</strong> Real-time text and ephemeral code sharing are transmitted directly between active peers during active sessions.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Local Device Storage:</strong> We use your browser's local storage solely to preserve your application preferences (such as Dark/Light theme, sound effects, and mute status) between visits.
            </li>
          </ul>
        </div>

        {/* Section 4: Safety & Community Moderation */}
        <div
          className="p-6 sm:p-8 rounded-2xl border backdrop-blur-xl shadow-xl space-y-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            <MessageSquare className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            <span>4. Trust, Safety & Community Standards</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            To protect our community from harassment, abuse, spam, and malicious behavior, automated trust & safety mechanisms evaluate incoming connection signals and reports. If you encounter someone violating our community standards, you can block or report them immediately with a single click.
          </p>
        </div>

        {/* Section 5: Your Rights & Contact */}
        <div
          className="p-6 sm:p-8 rounded-2xl border backdrop-blur-xl shadow-xl space-y-4"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            <Shield className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            <span>5. Your Rights & Questions</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            You maintain full autonomy over your platform participation. You may end any call, switch matchmaking criteria, or disconnect at any time. For questions regarding privacy, trust, or community guidelines, contact our Trust & Safety team.
          </p>
        </div>
      </div>

      {/* Footer Navigation Controls */}
      <div
        className="flex items-center justify-between pt-6 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onStart}
          className="px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 text-white"
          style={{
            background: 'var(--theme-btn-gradient, linear-gradient(135deg, #EC5E27 0%, #EA580C 100%))',
          }}
        >
          <Zap className="w-4 h-4 text-amber-200 fill-current" />
          <span>{t('hero.findMatchBtn', 'Find Match')}</span>
        </button>
      </div>
    </div>
  );
};
