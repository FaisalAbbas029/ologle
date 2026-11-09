import React from 'react';
import { FileText, ShieldAlert, ArrowLeft, ArrowRight, CheckCircle2, Lock, Scale, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface TermsViewProps {
  onStart: () => void;
  onBack: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onStart, onBack }) => {
  const { t } = useLanguage();
  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 transition-colors duration-300"
      style={{ color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-sm border"
          style={{
            backgroundColor: 'var(--pill-bg)',
            borderColor: 'var(--pill-border)',
            color: 'var(--accent-color)',
          }}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-black tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Terms of Service & Conditions
        </h1>
        <div
          className="flex flex-wrap items-center gap-4 text-xs mt-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>Last updated: October 2026</span>
          <span>•</span>
          <span>Version 3.2.0 (Zero-Persistence Addendum)</span>
        </div>
        <p
          className="text-sm sm:text-base mt-3 leading-relaxed max-w-3xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          Please read these terms carefully before connecting to Remix Ologle. By accessing or interacting with the network, you acknowledge and agree to abide by these terms in their entirety.
        </p>
      </div>

      {/* Sections Container */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div
          className="p-6 rounded-2xl border shadow-xl space-y-3 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-mono" style={{ color: 'var(--accent-color)' }}>1.</span>
            <span>Accountless Architecture & Ephemeral Service Nature</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Ologle operates as an accountless, ephemeral matching platform. We do not require permanent email addresses, credit cards, or passwords for casual peer matchmaking. You acknowledge that all conversational state, ephemeral notes, and signaling tokens are volatile and terminate immediately upon session closure.
          </p>
        </div>

        {/* Section 2 */}
        <div
          className="p-6 rounded-2xl border shadow-xl space-y-3 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-mono" style={{ color: 'var(--accent-color)' }}>2.</span>
            <span>Acceptable Use & Code of Conduct</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Ologle exists to foster intellectual, professional, and technical discourse between peers. You expressly agree not to:
          </p>
          <ul
            className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <li>Broadcast nudity, sexually explicit material, violence, or predatory behavior.</li>
            <li>Harass, intimidate, stalk, dox, or threaten any peer connected through the service.</li>
            <li>Distribute malware, phishing links, reverse-engineered payloads, or unauthorized scripts.</li>
            <li>Deploy automated bots, headless scrapers, or simulated video streams without authorization.</li>
            <li>Impersonate individuals or organizations deceptively.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div
          className="p-6 rounded-2xl border shadow-xl space-y-3 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-mono" style={{ color: 'var(--accent-color)' }}>3.</span>
            <span>Direct Peer-to-Peer WebRTC Transmission</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Video and audio transmissions occur via direct WebRTC peer connections protected by DTLS/SRTP cryptography. Because these streams bypass persistent storage servers, Ologle neither records nor retains your audio/video frames. You are solely responsible for content you choose to broadcast to your peer.
          </p>
        </div>

        {/* Section 4 */}
        <div
          className="p-6 rounded-2xl border shadow-xl space-y-3 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-mono" style={{ color: 'var(--accent-color)' }}>4.</span>
            <span>Safety Moderation, Honeypots & Firewall Enforcement</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            To preserve community safety, all text payloads are evaluated in transient memory against real-time safety classification rules. Repeated violations trigger progressive penalties, including client mute, peer skip, and IP-level session bans. Automated bot traffic flagged by honeypot traps is redirected to challenge gates.
          </p>
        </div>

        {/* Section 5 */}
        <div
          className="p-6 rounded-2xl border shadow-xl space-y-3 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-mono" style={{ color: 'var(--accent-color)' }}>5.</span>
            <span>Intellectual Property & User-Generated Ephemera</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            You retain all rights to original thoughts, code, and insights you articulate during a conversation. Ologle claims zero ownership or intellectual property licenses over conversational transcripts, as none are ever captured to persistent disks.
          </p>
        </div>

        {/* Section 6 */}
        <div
          className="p-6 rounded-2xl border shadow-xl space-y-3 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-mono" style={{ color: 'var(--accent-color)' }}>6.</span>
            <span>Disclaimer of Warranties & Limitation of Liability</span>
          </h2>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            The platform is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind. Under no circumstances shall the operators of Ologle be held liable for indirect, incidental, or consequential damages resulting from user conduct or network interruptions.
          </p>
        </div>
      </div>

      {/* Navigation Footer */}
      <div
        className="flex items-center justify-between pt-8 mt-8 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
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
