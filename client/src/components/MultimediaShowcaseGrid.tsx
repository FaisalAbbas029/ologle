import React, { useState } from 'react';
import {
  Video,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Activity,
  X,
  Shield,
  Zap,
  Globe,
  Radio,
  Check,
} from 'lucide-react';
import { CountryFlag } from './CountryFlag.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

export interface PeerShowcaseItem {
  id: string;
  name: string;
  age: number;
  location: string;
  countryCode: string;
  flag: string;
  role: string;
  tags: string[];
  bio: string;
  synergy: number;
  photoUrl: string;
  isOnline: boolean;
  isAudioActive?: boolean;
}

export const SHOWCASE_PEERS: PeerShowcaseItem[] = [
  {
    id: 'peer-1',
    name: 'Tariq Al-Husseini',
    age: 32,
    location: 'Palestine',
    countryCode: 'PS',
    flag: '🇵🇸',
    role: 'Cloud & DevOps Architect',
    tags: ['Kubernetes', 'Distributed Systems', 'Zero-Trust'],
    bio: 'Architecting resilient multi-cloud infrastructures, low-latency edge computing clusters, and zero-trust microservice networks.',
    synergy: 99,
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=800&q=80',
    isOnline: true,
    isAudioActive: true,
  },
  {
    id: 'peer-2',
    name: 'Dr. Elena Rostova',
    age: 31,
    location: 'Germany',
    countryCode: 'DE',
    flag: '🇩🇪',
    role: 'AI & Neural Systems Researcher',
    tags: ['PyTorch', 'LLM Alignment', 'Neural Architectures'],
    bio: 'Investigating transformer representations, multi-modal reasoning models, and verifiable inference mechanisms.',
    synergy: 97,
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&h=800&q=80',
    isOnline: true,
    isAudioActive: true,
  },
  {
    id: 'peer-3',
    name: 'Marcus Vance',
    age: 34,
    location: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    role: 'Principal Systems Engineer',
    tags: ['Rust', 'WebRTC Pipelines', 'Low-Latency C++'],
    bio: 'Specializing in deterministic high-throughput network engines, real-time media transport, and memory-safe systems.',
    synergy: 95,
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=800&q=80',
    isOnline: true,
    isAudioActive: false,
  },
  {
    id: 'peer-4',
    name: 'Maya Patel',
    age: 29,
    location: 'United Kingdom',
    countryCode: 'GB',
    flag: '🇬🇧',
    role: 'Lead UX & Product Strategist',
    tags: ['Design Systems', 'Cognitive Ergonomics', 'Figma'],
    bio: 'Designing enterprise workflows, cognitive ergonomics, and fluid user experiences for next-generation developer tooling.',
    synergy: 94,
    photoUrl: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=600&h=800&q=80',
    isOnline: true,
    isAudioActive: true,
  },
  {
    id: 'peer-5',
    name: 'Kenji Takahashi',
    age: 33,
    location: 'Japan',
    countryCode: 'JP',
    flag: '🇯🇵',
    role: 'Robotics & Firmware Specialist',
    tags: ['Embedded Systems', 'ROS 2', 'Sensor Fusion'],
    bio: 'Developing autonomous navigation pipelines, micro-controller firmware, and real-time kinematic control algorithms.',
    synergy: 98,
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&h=800&q=80',
    isOnline: true,
    isAudioActive: true,
  },
  {
    id: 'peer-6',
    name: 'Sofia Silva',
    age: 30,
    location: 'Brazil',
    countryCode: 'BR',
    flag: '🇧🇷',
    role: 'Biomedical Data Scientist',
    tags: ['Bioinformatics', 'Python', 'Statistical Modeling'],
    bio: 'Analyzing neuroimaging biomarkers, genetic variance sequencing, and predictive statistical healthcare models.',
    synergy: 96,
    photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&h=800&q=80',
    isOnline: true,
    isAudioActive: false,
  },
];

interface MultimediaShowcaseGridProps {
  onSelectPeerToMatch?: (peer: PeerShowcaseItem) => void;
  onQuickStart?: () => void;
}

export const MultimediaShowcaseGrid: React.FC<MultimediaShowcaseGridProps> = ({
  onSelectPeerToMatch,
  onQuickStart,
}) => {
  const { t } = useLanguage();
  const [selectedPeer, setSelectedPeer] = useState<PeerShowcaseItem | null>(null);
  const [hoveredPeerId, setHoveredPeerId] = useState<string | null>(null);

  const handleCardClick = (peer: PeerShowcaseItem) => {
    setSelectedPeer(peer);
  };

  const handleConnectWithPeer = (peer: PeerShowcaseItem) => {
    setSelectedPeer(null);
    if (onSelectPeerToMatch) {
      onSelectPeerToMatch(peer);
    } else if (onQuickStart) {
      onQuickStart();
    }
  };

  return (
    <div className="w-full relative">
      {/* 3-Column Video Discovery Grid matching Azar Live Reference Image 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5">
        {SHOWCASE_PEERS.map((peer, idx) => {
          const isHovered = hoveredPeerId === peer.id;
          return (
            <div
              key={peer.id}
              onClick={() => handleCardClick(peer)}
              onMouseEnter={() => setHoveredPeerId(peer.id)}
              onMouseLeave={() => setHoveredPeerId(null)}
              className={`peer-showcase-card group relative rounded-2xl bg-[#161616] overflow-hidden aspect-[3/4] cursor-pointer select-none transition-all duration-300 ${
                isHovered
                  ? 'border-2 border-[#EC5E27] shadow-[0_0_30px_rgba(236,94,39,0.6)] scale-[1.03] -translate-y-1 z-20'
                  : 'border border-white/10 hover:border-[#EC5E27] shadow-md'
              }`}
            >
              {/* Model Portrait Photo */}
              <img
                src={peer.photoUrl}
                alt={`${peer.name}, ${peer.age}`}
                width="300"
                height="400"
                decoding="async"
                className="peer-photo w-full h-full object-cover transition-transform duration-500 ease-out"
                style={{
                  transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                }}
                loading="lazy"
              />

              {/* Gradient Overlays for readable text and badges */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/30 pointer-events-none" />

              {/* Top-Left: Status / Verified Badge */}
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-black text-white border border-white/10 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="tracking-wider uppercase">{t('showcase.online', 'ONLINE')}</span>
              </div>

              {/* Top-Right: Synergy Match Pill */}
              <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-neutral-300 border border-white/10">
                <span className="text-[#EC5E27] font-extrabold">{peer.synergy}%</span> {t('showcase.match', 'match')}
              </div>

              {/* Bottom-Left: Flag + Professional Identity */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-0.5 text-white drop-shadow-md pointer-events-none">
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-wide truncate">
                  <CountryFlag
                    code={peer.countryCode}
                    name={peer.location}
                    flagEmoji={peer.flag}
                    className="w-3.5 h-2.5 shrink-0"
                  />
                  <span className="truncate">{peer.name}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#EC5E27] truncate tracking-tight">
                  {peer.role}
                </div>
                <div className="text-[9px] text-neutral-400 truncate font-medium">
                  {peer.tags[0]} • {peer.location}
                </div>
              </div>

              {/* Hover overlay hint: Connect CTA Button */}
              <div
                className={`peer-hover-overlay absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none flex items-center justify-center transition-all duration-300 ${
                  isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                }`}
              >
                <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] text-white text-xs font-black shadow-[0_0_20px_rgba(236,94,39,0.9)] tracking-wider uppercase flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 fill-white text-white" />
                  <span>{t('showcase.startMatch', 'Start Match')}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Peer Details & Instant Connect Modal */}
      {selectedPeer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedPeer(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-[#141414] border border-[#EC5E27]/40 p-6 shadow-2xl text-white animate-scaleUp overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedPeer(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Portrait Header */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 border border-white/10">
              <img
                src={selectedPeer.photoUrl}
                alt={selectedPeer.name}
                width="400"
                height="300"
                decoding="async"
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-0.5 text-white">
                <div className="flex items-center gap-2 font-black text-lg">
                  <CountryFlag
                    code={selectedPeer.countryCode}
                    name={selectedPeer.location}
                    flagEmoji={selectedPeer.flag}
                    className="w-5 h-3.5"
                  />
                  <span>{selectedPeer.name}</span>
                </div>
                <span className="text-xs font-bold text-[#EC5E27]">
                  {selectedPeer.role} • {selectedPeer.location}
                </span>
              </div>
            </div>

            {/* Role & Bio */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EC5E27]/15 border border-[#EC5E27]/30 text-xs font-bold text-[#EC5E27]">
                  <span>{selectedPeer.role}</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {selectedPeer.synergy}% {t('showcase.affinity', 'Affinity')}
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {selectedPeer.bio}
              </p>
            </div>

            {/* Topics Tags */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {selectedPeer.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-[#202020] text-[11px] font-semibold text-white border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Connect Action Button: Orange Brand style */}
            <button
              type="button"
              onClick={() => handleConnectWithPeer(selectedPeer)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-black text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95"
            >
              <Video className="w-4 h-4 fill-white text-white" />
              <span>{t('showcase.connectCall', `Connect with ${selectedPeer.name}`)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
