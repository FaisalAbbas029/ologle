import React from 'react';
import { Volume2, Mic, Activity } from 'lucide-react';

export type AudioWaveAnimationMode = 'ripples' | 'equalizer' | 'halo' | 'off';

export interface AudioWaveVideoFrameProps {
  children: React.ReactNode;
  isSpeaking: boolean;
  audioLevel?: number; // 0 to 100
  isActive?: boolean;
  themeColor?: 'crimson' | 'emerald' | 'coral' | 'cyan';
  animationMode?: AudioWaveAnimationMode;
  className?: string;
  label?: string;
  showWaveform?: boolean;
}

const THEME_MAP = {
  crimson: {
    primary: '#EC5E27',
    primaryRgb: '236, 94, 39',
    ringGradient: 'radial-gradient(circle, rgba(236, 94, 39, 0.45) 0%, rgba(236, 94, 39, 0) 70%)',
    borderActive: 'rgba(236, 94, 39, 0.85)',
    glow: 'rgba(236, 94, 39, 0.5)',
  },
  emerald: {
    primary: '#10B981',
    primaryRgb: '16, 185, 129',
    ringGradient: 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(16, 185, 129, 0) 70%)',
    borderActive: 'rgba(16, 185, 129, 0.85)',
    glow: 'rgba(16, 185, 129, 0.5)',
  },
  coral: {
    primary: '#EC5E27',
    primaryRgb: '236, 94, 39',
    ringGradient: 'radial-gradient(circle, rgba(236, 94, 39, 0.45) 0%, rgba(236, 94, 39, 0) 70%)',
    borderActive: 'rgba(236, 94, 39, 0.85)',
    glow: 'rgba(236, 94, 39, 0.5)',
  },
  cyan: {
    primary: '#06B6D4',
    primaryRgb: '6, 182, 212',
    ringGradient: 'radial-gradient(circle, rgba(6, 182, 212, 0.45) 0%, rgba(6, 182, 212, 0) 70%)',
    borderActive: 'rgba(6, 182, 212, 0.85)',
    glow: 'rgba(6, 182, 212, 0.5)',
  },
};

export const AudioWaveVideoFrame: React.FC<AudioWaveVideoFrameProps> = ({
  children,
  isSpeaking,
  audioLevel = 0,
  isActive = true,
  themeColor = 'coral',
  animationMode = 'ripples',
  className = '',
  label,
  showWaveform = true,
}) => {
  const theme = THEME_MAP[themeColor] || THEME_MAP.crimson;
  const isAnimationEnabled = animationMode !== 'off' && isActive;
  const isRipplesActive = isAnimationEnabled && isSpeaking && animationMode === 'ripples';
  const isEqualizerActive = isAnimationEnabled && isSpeaking && animationMode === 'equalizer';
  const isHaloActive = isAnimationEnabled && isSpeaking && animationMode === 'halo';

  return (
    <div className={`audio-wave-frame-wrapper relative w-full h-full flex flex-col ${className}`}>
      {/* ── EXPANDING CONCENTRIC SOUND WAVE RIPPLES ── */}
      {isRipplesActive && (
        <>
          {/* Wave Ripple Ring 1 (Inner) */}
          <div
            className="pointer-events-none absolute -inset-2 rounded-2xl z-0"
            style={{
              border: `2px solid rgba(${theme.primaryRgb}, 0.65)`,
              animation: 'audio-wave-ripple-inner 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
            }}
          />
          {/* Wave Ripple Ring 2 (Middle) */}
          <div
            className="pointer-events-none absolute -inset-3.5 rounded-2xl z-0"
            style={{
              border: `1.5px solid rgba(${theme.primaryRgb}, 0.45)`,
              animation: 'audio-wave-ripple-mid 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.35s infinite',
            }}
          />
          {/* Wave Ripple Ring 3 (Outer) */}
          <div
            className="pointer-events-none absolute -inset-5 rounded-2xl z-0"
            style={{
              border: `1px solid rgba(${theme.primaryRgb}, 0.25)`,
              animation: 'audio-wave-ripple-outer 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.7s infinite',
            }}
          />
        </>
      )}

      {/* ── SOFT LIQUID SOUND AURA (HALO MODE) ── */}
      {isHaloActive && (
        <div
          className="pointer-events-none absolute -inset-4 rounded-3xl z-0 blur-xl opacity-60"
          style={{
            background: theme.ringGradient,
            animation: 'audio-halo-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* ── MAIN VIDEO FRAME CONTAINER (Breathing & Glowing) ── */}
      <div
        className={`audio-wave-frame-content relative w-full h-full flex-1 rounded-xl overflow-hidden z-10 transition-all duration-300 ${
          isSpeaking && isAnimationEnabled ? 'audio-frame-active-speaking' : 'border border-white/10'
        }`}
        style={{
          borderWidth: isSpeaking && isAnimationEnabled ? '2px' : '1px',
          borderColor: isSpeaking && isAnimationEnabled ? theme.borderActive : undefined,
          boxShadow: isSpeaking && isAnimationEnabled
            ? `0 0 20px rgba(${theme.primaryRgb}, 0.45), 0 0 45px rgba(${theme.primaryRgb}, 0.2)`
            : undefined,
          transform: isSpeaking && isAnimationEnabled ? 'scale(1.012)' : 'scale(1)',
        }}
      >
        {children}

        {/* ── ACTIVE SOUND WAVE EQUALIZER BAR OVERLAY ── */}
        {showWaveform && isSpeaking && isAnimationEnabled && (
          <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 shadow-lg">
            <span
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ background: theme.primary }}
            />
            {/* Animated Equalizer Waveform Bars */}
            <div className="flex items-center gap-0.5 h-3 px-0.5">
              <span
                className="w-0.5 rounded-full bg-white"
                style={{
                  height: '60%',
                  animation: 'soundwave-bar 0.6s ease-in-out infinite 0.1s',
                  backgroundColor: theme.primary,
                }}
              />
              <span
                className="w-0.5 rounded-full bg-white"
                style={{
                  height: '100%',
                  animation: 'soundwave-bar 0.6s ease-in-out infinite 0.3s',
                  backgroundColor: theme.primary,
                }}
              />
              <span
                className="w-0.5 rounded-full bg-white"
                style={{
                  height: '75%',
                  animation: 'soundwave-bar 0.6s ease-in-out infinite 0.15s',
                  backgroundColor: theme.primary,
                }}
              />
              <span
                className="w-0.5 rounded-full bg-white"
                style={{
                  height: '90%',
                  animation: 'soundwave-bar 0.6s ease-in-out infinite 0.4s',
                  backgroundColor: theme.primary,
                }}
              />
              <span
                className="w-0.5 rounded-full bg-white"
                style={{
                  height: '50%',
                  animation: 'soundwave-bar 0.6s ease-in-out infinite 0.25s',
                  backgroundColor: theme.primary,
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-white tracking-wide">
              {label || 'Speaking'}
            </span>
          </div>
        )}
      </div>

      {/* ── EMBEDDED CSS KEYFRAMES ── */}
      <style>{`
        /* Inner Ripple Ring */
        @keyframes audio-wave-ripple-inner {
          0% {
            transform: scale(0.98);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.05);
            opacity: 0;
          }
        }

        /* Middle Ripple Ring */
        @keyframes audio-wave-ripple-mid {
          0% {
            transform: scale(0.97);
            opacity: 0.75;
          }
          100% {
            transform: scale(1.08);
            opacity: 0;
          }
        }

        /* Outer Ripple Ring */
        @keyframes audio-wave-ripple-outer {
          0% {
            transform: scale(0.96);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.12);
            opacity: 0;
          }
        }

        /* Halo Ambient Pulse */
        @keyframes audio-halo-pulse {
          0%, 100% {
            transform: scale(0.98);
            opacity: 0.45;
          }
          50% {
            transform: scale(1.04);
            opacity: 0.8;
          }
        }

        /* Equalizer Waveform Bar Motion */
        @keyframes soundwave-bar {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
};
