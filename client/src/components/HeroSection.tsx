import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal.js';
import X from 'lucide-react/dist/esm/icons/x.js';
import Check from 'lucide-react/dist/esm/icons/check.js';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle.js';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.js';
import Video from 'lucide-react/dist/esm/icons/video.js';
import Mic from 'lucide-react/dist/esm/icons/mic.js';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square.js';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js';
import Crown from 'lucide-react/dist/esm/icons/crown.js';
import Globe from 'lucide-react/dist/esm/icons/globe.js';
import Zap from 'lucide-react/dist/esm/icons/zap.js';
import { CountryFlag } from './CountryFlag.tsx';
import { searchProfessions, validateProfession, validateTargetInterest, HAYLOO_PROFESSIONS, HAYLOO_PURPOSES } from '../data/constants.ts';
import { COUNTRIES_LIST } from '../data/countriesData.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { SUPPORTED_LANGUAGES } from '../data/languages.ts';
import { getSuggestedInterestsForProfession } from '../data/professionInterests.ts';

export type FrameAnimationType = 'stream' | 'wave' | 'shimmer';

/* ─────────────────────────────────────────────────────────────────
   Photo sources — 100% locally served AI portraits + Founder Portrait
   (Every single image is unique with zero repetitions across all cards)
───────────────────────────────────────────────────────────────── */
const AI_PORTRAITS = {
  faisalFounder:     '/ai-portraits/faisal_abbas_founder.jpg',
  miaDesigner:       '/ai-portraits/hero_mia_v1.jpg',
  aminaCyber:        '/ai-portraits/hero_amina_cyber.jpg',
  sofiaScientist:    '/ai-portraits/hero_sofia_v2.jpg',
  sofiaSurgeon:      '/ai-portraits/hero_sofia_v1.jpg',
  alexBlockchain:    '/ai-portraits/hero_alex_blockchain.jpg',
  kenjiGameDev:      '/ai-portraits/hero_kenji_gamedev.jpg',

  marcusAiLead:      '/ai-portraits/hero_marcus_v1.jpg',
  davidAgritech:     '/ai-portraits/hero_david_agritech.jpg',
  liamAutomotive:    '/ai-portraits/hero_liam_v1.jpg',
  elenaAerospace:    '/ai-portraits/hero_mia_v2.jpg',
  zainabQuantum:     '/ai-portraits/hero_zainab_quantum.jpg',

  priyaCloud:        '/ai-portraits/hero_priya_v1.jpg',
  oliverWebDev:      '/ai-portraits/hero_oliver_developer.jpg',
  chloeCreative:     '/ai-portraits/hero_chloe_creative.jpg',
  tariqDataScience:  '/ai-portraits/hero_tariq_datascience.jpg',
  mateoRobotics:     '/ai-portraits/hero_mateo_robotics.jpg',
  yunaBroker:        '/ai-portraits/hero_yuna_v1.jpg',
};

interface Card {
  id: string;
  name: string;
  age?: number;
  profession: string;
  tags?: string[];
  photo: string;
  isFounder?: boolean;
  hasPagination?: boolean;
}

/* ─────────────────────────────────────────────────────────────────
   3 Columns with 18 Distinct Professions & Unique AI Portraits
   Centerpiece: Faisal Abbas — Founder of Ologle
───────────────────────────────────────────────────────────────── */
const COL0: Card[] = [
  { id: 'c0-1', name: 'Mia Lin',           age: 26, profession: 'UI/UX Designer',                 tags: ['Design Systems', 'Figma'],      photo: AI_PORTRAITS.miaDesigner },
  { id: 'c0-2', name: 'Amina Diallo',      age: 27, profession: 'Cybersecurity Specialist',       tags: ['Zero-Trust', 'Firewalls'],      photo: AI_PORTRAITS.aminaCyber },
  { id: 'c0-3', name: 'Sofia Al-Mansoor',  age: 31, profession: 'Biotech Scientist',              tags: ['Genomics', 'Bioinformatics'],   photo: AI_PORTRAITS.sofiaScientist },
  { id: 'c0-4', name: 'Dr. Sofia Vance',   age: 35, profession: 'Chief Surgeon & Medical Dir.',   tags: ['Surgical AI', 'Oncology'],      photo: AI_PORTRAITS.sofiaSurgeon },
  { id: 'c0-5', name: 'Alex Rivera',       age: 29, profession: 'Blockchain Infrastructure Lead', tags: ['Solidity', 'Smart Contracts'], photo: AI_PORTRAITS.alexBlockchain },
  { id: 'c0-6', name: 'Kenji Sato',        age: 28, profession: 'Game Developer & 3D Artist',     tags: ['Unreal Engine 5', 'Shaders'],   photo: AI_PORTRAITS.kenjiGameDev },
];

const COL1: Card[] = [
  { id: 'c1-1', name: 'Marcus Chen',       age: 28, profession: 'AI & Neural Systems Lead',       tags: ['Python', 'Neural Networks'],    photo: AI_PORTRAITS.marcusAiLead },
  {
    id: 'c1-faisal',
    name: 'Faisal Abbas',
    profession: 'Founder of Ologle',
    tags: ['Plant Science', 'Web Development', 'AI'],
    photo: AI_PORTRAITS.faisalFounder,
    isFounder: true,
  },
  { id: 'c1-3', name: 'David Njoroge',     age: 31, profession: 'Agricultural & Farm Manager',    tags: ['Agritech', 'Precision Crops'],  photo: AI_PORTRAITS.davidAgritech, hasPagination: true },
  { id: 'c1-4', name: 'Thomas Liam',       age: 33, profession: 'Automotive EV Systems Lead',     tags: ['EV Powertrain', 'Diagnostics'], photo: AI_PORTRAITS.liamAutomotive },
  { id: 'c1-5', name: 'Elena Rostova',     age: 34, profession: 'Aerospace & Mechanical Eng.',    tags: ['CAD / FEA', 'Aerospace'],       photo: AI_PORTRAITS.elenaAerospace },
  { id: 'c1-6', name: 'Zainab Al-Fassi',   age: 32, profession: 'Quantum Computing Researcher',   tags: ['Qubits', 'Quantum AI'],         photo: AI_PORTRAITS.zainabQuantum },
];

const COL2: Card[] = [
  { id: 'c2-1', name: 'Priya Sharma',      age: 26, profession: 'Cloud Infrastructure Architect', tags: ['Kubernetes', 'AWS Cloud'],      photo: AI_PORTRAITS.priyaCloud },
  { id: 'c2-2', name: 'Oliver Bennett',    age: 25, profession: 'Full Stack Web Developer',       tags: ['React', 'Next.js'],             photo: AI_PORTRAITS.oliverWebDev },
  { id: 'c2-3', name: 'Chloe Dupont',      age: 32, profession: 'Creative Director & Filmmaker',  tags: ['Cinema 4D', 'Directing'],       photo: AI_PORTRAITS.chloeCreative },
  { id: 'c2-4', name: 'Dr. Tariq Mansoor', age: 34, profession: 'Data Scientist & Quant Analyst', tags: ['Financial AI', 'Python'],     photo: AI_PORTRAITS.tariqDataScience },
  { id: 'c2-5', name: 'Mateo Silva',       age: 30, profession: 'Robotics & Automation Engineer', tags: ['ROS', 'Computer Vision'],      photo: AI_PORTRAITS.mateoRobotics },
  { id: 'c2-6', name: 'Yuna Takahashi',    age: 30, profession: 'Commercial Real Estate Broker',  tags: ['REITs', 'Asset Valuation'],     photo: AI_PORTRAITS.yunaBroker },
];

/* ─────────────────────────────────────────────────────────────────
   Single Portrait Card (Matches user reference mockup)
───────────────────────────────────────────────────────────────── */
const PortraitCard: React.FC<{ card: Card; animMode?: FrameAnimationType; index?: number }> = ({
  card,
  animMode = 'stream',
  index = 0,
}) => (
  <div
    className={`hcard ${card.isFounder ? 'hcard-founder' : ''} ${
      animMode === 'shimmer' ? 'hcard-shimmer' : ''
    } ${animMode === 'wave' ? 'hcard-wave' : ''}`}
    style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '9 / 16',
      borderRadius: 18,
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: '0 4px 18px rgba(15, 23, 42, 0.12)',
      cursor: 'pointer',
      background: 'rgb(248, 250, 252)',
      animationDelay: `${index * 0.12}s`,
    }}
  >
    {/* Animated Shimmer Light Sweep (Active in Neon Shimmer Mode) */}
    {animMode === 'shimmer' && <div className="hcard-shimmer-sweep" />}
    {/* Photo */}
    <img
      src={card.photo}
      alt={`${card.name} – ${card.profession}`}
      width={450}
      height={800}
      loading="lazy"
      className="hcard-img"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: card.isFounder ? 'center 15%' : 'center 20%',
      }}
    />

    {/* Vignette Scrim */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(15,23,42,0.22) 0%, transparent 35%, transparent 50%, rgba(15,23,42,0.92) 100%)',
        pointerEvents: 'none',
      }}
    />

    {/* Top Badges Bar: ONLINE (left) + FOUNDER (right) */}
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      {/* ONLINE pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4.5,
          padding: '3px 8px',
          borderRadius: 9999,
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          fontSize: 9.5,
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '0.04em',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 5,
            height: 5,
            borderRadius: '50%',
            flexShrink: 0,
            background: '#22C55E',
            boxShadow: '0 0 6px #22C55E',
            animation: 'hero-blink 2s ease-in-out infinite',
          }}
        />
        ONLINE
      </div>

      {/* Founder Badge */}
      {card.isFounder && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '3px 8px',
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #EC5E27, #F94E0A)',
            fontSize: 9,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            boxShadow: '0 2px 10px rgba(236,94,39,0.50)',
          }}
        >
          <Crown className="w-2.5 h-2.5 text-amber-200 shrink-0 inline-block" /> FOUNDER
        </div>
      )}
    </div>

    {/* Bottom Info Overlay */}
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '28px 12px 12px',
        background: 'linear-gradient(to top, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.65) 60%, transparent 100%)',
        zIndex: 2,
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: 14.5,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {card.name}{card.age ? `, ${card.age}` : ''}
      </p>
      <p
        style={{
          margin: '2px 0 0',
          color: card.isFounder ? '#FF8A50' : 'rgba(255,255,255,0.90)',
          fontSize: 11.5,
          fontWeight: card.isFounder ? 700 : 500,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {card.isFounder ? 'Founder of Ologle' : `(${card.profession})`}
      </p>

      {/* Tags matching user's design (green Python, purple Figma, orange, etc.) */}
      {card.tags && card.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, marginTop: 5, overflow: 'hidden' }}>
          {card.tags.slice(0, 3).map(tag => {
            const bg = tag.toLowerCase().includes('python') ? '#10B981'
                     : tag.toLowerCase().includes('figma') ? '#8B5CF6'
                     : card.isFounder ? 'linear-gradient(135deg, #EC5E27, #D94E1A)'
                     : '#EC5E27';
            return (
              <span
                key={tag}
                style={{
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 9.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: bg,
                  color: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}
    </div>

    {/* Bottom Pagination Pill Indicator (as seen in bottom center card of screenshot) */}
    {card.hasPagination && (
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4.5,
          padding: '3px 8px',
          borderRadius: 9999,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(6px)',
          zIndex: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <span style={{ width: 14, height: 4.5, borderRadius: 9999, background: '#0F172A' }} />
        <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: '#94A3B8' }} />
        <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: '#94A3B8' }} />
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   Kinetic Stream Column (Continuous Ultra-Smooth Forward Loop)
   - 100% seamless infinite linear motion without any reversal or jump
───────────────────────────────────────────────────────────────── */
interface KineticStreamColProps {
  cards: Card[];
  duration: number;
  gap?: number;
  animMode?: FrameAnimationType;
}

const KineticStreamCol: React.FC<KineticStreamColProps> = ({
  cards,
  duration,
  gap = 14,
  animMode = 'stream',
}) => {
  return (
    <div className={`kinetic-stream-col ${animMode === 'wave' ? 'wave-perspective' : ''}`}>
      <div
        className="kinetic-stream-track"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${gap}px`,
          animation: `stream-continuous-up ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {/* Set 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, flexShrink: 0 }}>
          {cards.map((card, i) => (
            <div key={`set1-${card.id}-${i}`} style={{ flexShrink: 0, width: '100%' }}>
              <PortraitCard card={card} animMode={animMode} index={i} />
            </div>
          ))}
        </div>
        {/* Set 2 (Exact duplicate for seamless infinite linear loop) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, flexShrink: 0 }} aria-hidden="true">
          {cards.map((card, i) => (
            <div key={`set2-${card.id}-${i}`} style={{ flexShrink: 0, width: '100%' }}>
              <PortraitCard card={card} animMode={animMode} index={i} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Portrait Grid (9:16 Aspect Ratio Frames with Continuous Smooth Loop)
───────────────────────────────────────────────────────────────── */
const PortraitGrid: React.FC = () => {
  const animMode: FrameAnimationType = 'stream';
  const gap = 14;

  return (
    <div className="hero-grid-wrapper flex-col">
      <div className={`hero-grid-showcase anim-mode-${animMode}`}>
        {/* Left Column: Streams smoothly forward at 34s */}
        <KineticStreamCol
          cards={COL0}
          duration={34}
          gap={gap}
          animMode={animMode}
        />
        {/* Center Column: Streams smoothly forward at 40s (features Founder Faisal Abbas) */}
        <KineticStreamCol
          cards={COL1}
          duration={40}
          gap={gap}
          animMode={animMode}
        />
        {/* Right Column: Streams smoothly forward at 30s */}
        <KineticStreamCol
          cards={COL2}
          duration={30}
          gap={gap}
          animMode={animMode}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Filter card (Right Column)
   - Allows users to enter/customize their profession directly
   - Validates against 18+, abusive, social media, and non-profession words
   - Clean, unblocked Target Interest tag input without obstructive background blocks
───────────────────────────────────────────────────────────────── */
const POPULAR_PROFESSIONS = [
  'Software Engineering & AI',
  'UI/UX Design',
  'Data Science & Analytics',
  'Product Management',
  'Cybersecurity Specialist',
  'Blockchain Architect',
  'Quantum Computing Researcher',
  'Cloud Solutions Architect',
  'Robotics Engineer',
  'Creative Director',
  'Agritech Manager',
  'Biotech Scientist',
  'Chief Surgeon',
];


const PRESET_OPTIONS = [
  {
    name: 'Software Engineering & AI',
    profession: 'Software Engineering & AI',
    tags: ['Plant Science', 'Web Development', 'AI'],
    icon: 'code',
  },
  {
    name: 'UI/UX & Product Design',
    profession: 'UI/UX Design',
    tags: ['Design Systems', 'Figma', 'Product Strategy'],
    icon: 'palette',
  },
  {
    name: 'Data Science & Analytics',
    profession: 'Data Science & Analytics',
    tags: ['Python', 'Deep Learning', 'Data Pipelines'],
    icon: 'chart',
  },
  {
    name: 'Biotech & Plant Science',
    profession: 'Plant Science Researcher',
    tags: ['Plant Science', 'Agritech', 'Genetics'],
    icon: 'leaf',
  },
];

interface FilterCardProps {
  sessionMode?: string;
  onSessionModeChange?: (mode: string) => void;
  onFindMatch: (profession?: string, tags?: string[], country?: string, sessionMode?: string) => void;
  selectedCountry?: string;
  onSelectCountry?: (country: string) => void;
  userProfession?: string;
}

const FilterCard: React.FC<FilterCardProps> = ({
  sessionMode: propSessionMode,
  onSessionModeChange,
  onFindMatch,
  selectedCountry,
  onSelectCountry,
  userProfession,
}) => {
  const { t, language, setLanguage, currentLanguageOption } = useLanguage();
  const [profession, setProfession] = useState<string>(() => {
    return userProfession || localStorage.getItem('hayloo_user_profession') || '';
  });
  const [professionSuggestions, setProfessionSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [professionError, setProfessionError] = useState<string | null>(null);

  // Real-time synchronization with User Profile updates
  useEffect(() => {
    const handleProfileSync = (e: any) => {
      const updatedProf = e?.detail || localStorage.getItem('hayloo_user_profession');
      if (updatedProf) {
        setProfession(updatedProf);
        setProfessionError(null);
      }
    };
    window.addEventListener('hayloo_profile_updated', handleProfileSync);
    window.addEventListener('storage', handleProfileSync);
    return () => {
      window.removeEventListener('hayloo_profile_updated', handleProfileSync);
      window.removeEventListener('storage', handleProfileSync);
    };
  }, []);

  useEffect(() => {
    if (userProfession) {
      setProfession(userProfession);
      setProfessionError(null);
    }
  }, [userProfession]);

  const [tags, setTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hayloo_user_interests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  // Country Selection & "Match in my country only" filter state
  const [country, setCountry] = useState<string>(() => {
    return selectedCountry || localStorage.getItem('hayloo_selected_country') || 'GLOBAL';
  });
  const [matchCountryOnly, setMatchCountryOnly] = useState<boolean>(() => {
    return localStorage.getItem('hayloo_match_country_only') === 'true';
  });

  // Searchable Country Dropdown state (Placed just below profession)
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');
  const [showCountryDropdown, setShowCountryDropdown] = useState<boolean>(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countryInputRef = useRef<HTMLInputElement>(null);

  // Smart Match Configuration State (Configured via "Configure Your Match" popover)
  const [targetProfession, setTargetProfession] = useState<string>(() => {
    return localStorage.getItem('hayloo_target_profession') || 'ANY';
  });
  const [targetProfQuery, setTargetProfQuery] = useState<string>(() => {
    const saved = localStorage.getItem('hayloo_target_profession') || 'ANY';
    return saved === 'ANY' ? '' : saved;
  });
  const [showTargetProfDropdown, setShowTargetProfDropdown] = useState<boolean>(false);
  const targetProfDropdownRef = useRef<HTMLDivElement>(null);
  const [matchPurpose, setMatchPurpose] = useState<string>(() => {
    return localStorage.getItem('hayloo_match_purpose') || 'EXCHANGE_IDEAS';
  });
  const [sessionMode, setSessionMode] = useState<'video' | 'voice' | 'messaging'>(() => {
    if (propSessionMode) {
      const p = propSessionMode.toLowerCase();
      if (p === 'voice' || p === 'audio') return 'voice';
      if (p === 'messaging' || p === 'text') return 'messaging';
      return 'video';
    }
    const saved = localStorage.getItem('hayloo_session_mode');
    if (saved === 'voice' || saved === 'AUDIO') return 'voice';
    if (saved === 'messaging' || saved === 'TEXT') return 'messaging';
    return 'video';
  });

  useEffect(() => {
    if (propSessionMode) {
      const p = propSessionMode.toLowerCase();
      const norm = p === 'voice' || p === 'audio' ? 'voice' : p === 'messaging' || p === 'text' ? 'messaging' : 'video';
      if (norm !== sessionMode) {
        setSessionMode(norm);
      }
    }
  }, [propSessionMode]);

  const handleModeChange = (mode: string) => {
    const normalized: 'video' | 'voice' | 'messaging' =
      mode === 'voice' || mode === 'AUDIO'
        ? 'voice'
        : mode === 'messaging' || mode === 'TEXT'
        ? 'messaging'
        : 'video';
    setSessionMode(normalized);
    try {
      localStorage.setItem('hayloo_session_mode', normalized);
    } catch {}
    if (onSessionModeChange) {
      onSessionModeChange(normalized);
    }
  };
  const [primaryLanguage, setPrimaryLanguage] = useState<string>(() => {
    return currentLanguageOption?.englishName || localStorage.getItem('hayloo_primary_language') || 'English';
  });

  useEffect(() => {
    if (currentLanguageOption?.englishName) {
      setPrimaryLanguage(currentLanguageOption.englishName);
    }
  }, [currentLanguageOption]);

  // Interactive dropdown state (opened by clicking the starting icon)
  const [showFilterSettings, setShowFilterSettings] = useState<boolean>(false);
  const [filtersSavedToast, setFiltersSavedToast] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const professionContainerRef = useRef<HTMLDivElement>(null);

  const handleSaveFilters = () => {
    try {
      localStorage.setItem('hayloo_target_profession', targetProfession);
      localStorage.setItem('hayloo_match_purpose', matchPurpose);
      localStorage.setItem('hayloo_session_mode', sessionMode);
      localStorage.setItem('hayloo_primary_language', primaryLanguage);
    } catch {}
    setLanguage(primaryLanguage);
    setShowFilterSettings(false);
    setFiltersSavedToast(true);
    setTimeout(() => {
      setFiltersSavedToast(false);
    }, 4500);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        const btn = document.getElementById('hero-filter-settings-btn');
        if (btn && btn.contains(event.target as Node)) return;
        setShowFilterSettings(false);
      }
    };
    if (showFilterSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterSettings]);

  // Close filter settings on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFilterSettings(false);
      }
    };
    if (showFilterSettings) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFilterSettings]);

  // Close profession suggestions on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (professionContainerRef.current && !professionContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showSuggestions]);

  // Close country dropdown on click outside
  useEffect(() => {
    const handleOutsideCountryClick = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleOutsideCountryClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideCountryClick);
    };
  }, [showCountryDropdown]);

  // Close target profession dropdown on click outside
  useEffect(() => {
    const handleOutsideTargetProfClick = (e: MouseEvent) => {
      if (targetProfDropdownRef.current && !targetProfDropdownRef.current.contains(e.target as Node)) {
        setShowTargetProfDropdown(false);
      }
    };
    if (showTargetProfDropdown) {
      document.addEventListener('mousedown', handleOutsideTargetProfClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideTargetProfClick);
    };
  }, [showTargetProfDropdown]);

  // Filtered countries for type-and-search dropdown
  const filteredCountries = useMemo(() => {
    const q = countrySearchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES_LIST;
    return COUNTRIES_LIST.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearchQuery]);

  const handleSelectCountry = (cCode: string) => {
    setCountry(cCode);
    setCountrySearchQuery('');
    setShowCountryDropdown(false);
    if (onSelectCountry) onSelectCountry(cCode);
    try {
      localStorage.setItem('hayloo_selected_country', cCode);
    } catch {}
  };

  // Sync country when selectedCountry prop changes
  useEffect(() => {
    if (selectedCountry) {
      setCountry(selectedCountry);
    }
  }, [selectedCountry]);

  // Reset filters to empty / clean state
  const handleResetFilters = () => {
    setProfession('');
    setTags([]);
    setCountry('GLOBAL');
    setCountrySearchQuery('');
    setShowCountryDropdown(false);
    setMatchCountryOnly(false);
    setTargetProfession('ANY');
    setTargetProfQuery('');
    setMatchPurpose('EXCHANGE_IDEAS');
    setPrimaryLanguage('English');
    setProfessionError(null);
    setTagError(null);
    setShowFilterSettings(false);
    try {
      localStorage.removeItem('hayloo_user_profession');
      localStorage.removeItem('hayloo_user_interests');
      localStorage.setItem('hayloo_selected_country', 'GLOBAL');
      localStorage.setItem('hayloo_match_country_only', 'false');
      localStorage.setItem('hayloo_target_profession', 'ANY');
      localStorage.setItem('hayloo_match_purpose', 'EXCHANGE_IDEAS');
      localStorage.setItem('hayloo_session_mode', sessionMode);
      localStorage.setItem('hayloo_primary_language', 'English');
    } catch {}
    if (onSelectCountry) onSelectCountry('GLOBAL');
  };

  const applyPreset = (preset: typeof PRESET_OPTIONS[0]) => {
    setProfession(preset.profession);
    setTags(preset.tags);
    setProfessionError(null);
    setTagError(null);
    setShowFilterSettings(false);
    try {
      localStorage.setItem('hayloo_user_profession', preset.profession);
      localStorage.setItem('hayloo_user_interests', JSON.stringify(preset.tags));
    } catch {}
  };

  // Immediate profession validation logic
  const handleProfessionChange = (val: string) => {
    setProfession(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setProfessionError('Please enter your profession to continue.');
    } else {
      const res = validateProfession(val);
      if (!res.isValid) {
        setProfessionError(res.error || 'Irrelevant text. Please enter a genuine profession or occupation.');
      } else {
        setProfessionError(null);
      }
    }

    if (trimmed.length >= 1) {
      const matches = searchProfessions(val, 6);
      setProfessionSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setProfessionSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggested: string) => {
    setProfession(suggested);
    setShowSuggestions(false);
    setProfessionError(null);
  };

  // Compute strictly verified state and active error message
  const isProfValid = useMemo(() => {
    if (!profession.trim()) return false;
    return validateProfession(profession).isValid;
  }, [profession]);

  const activeProfError = useMemo(() => {
    if (!profession.trim()) return professionError;
    const res = validateProfession(profession);
    return res.isValid ? null : (res.error || 'Irrelevant text. Please enter a genuine profession or occupation.');
  }, [profession, professionError]);

  const removeTag = (t: string) => {
    setTags((p) => p.filter((x) => x !== t));
    setTagError(null);
  };

  const addQuickTag = (quick: string) => {
    if (tags.length >= 4) {
      setTagError('Maximum 4 interest tags allowed.');
      return;
    }
    if (!tags.includes(quick)) {
      setTags((p) => [...p, quick]);
      setTagError(null);
    }
  };

  // Dynamic popular topics that adapt to user's profession
  const dynamicPopularTopics = useMemo(() => {
    if (profession && profession.trim()) {
      const res = getSuggestedInterestsForProfession(profession);
      if (res && res.suggestedInterests && res.suggestedInterests.length > 0) {
        return res.suggestedInterests.slice(0, 6);
      }
    }
    return ['AI', 'Web Dev', 'Plant Science', 'Data Science', 'Robotics', 'Design'];
  }, [profession]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const raw = input.trim().replace(/,$/, '');
      if (!raw) return;

      if (tags.length >= 4) {
        setTagError('Maximum 4 interest tags allowed.');
        return;
      }

      // Validate target interest against 18+, abusive, social media, and non-topic terms
      const validation = validateTargetInterest(raw);
      if (!validation.isValid) {
        setTagError(validation.error || 'Invalid interest topic. Please enter professional or technical topics only.');
        return;
      }

      if (!tags.includes(raw)) {
        setTags((p) => [...p, raw]);
      }
      setInput('');
      setTagError(null);
    }
    if (e.key === 'Backspace' && !input) {
      setTags((p) => p.slice(0, -1));
      setTagError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profValidation = validateProfession(profession);
    if (!profValidation.isValid) {
      const errMsg = profValidation.error || 'Irrelevant text. Please enter a genuine profession before matching.';
      setProfessionError(errMsg);
      const profInput = document.getElementById('hero-profession-input');
      profInput?.focus();
      return;
    }

    if (tags.length < 1) {
      setTagError('At least 1 interest topic is required.');
      return;
    }

    if (tags.length > 4) {
      setTagError('Maximum 4 interest tags allowed.');
      return;
    }

    try {
      localStorage.setItem('hayloo_user_profession', profession.trim());
      localStorage.setItem('hayloo_user_interests', JSON.stringify(tags));
      localStorage.setItem('hayloo_selected_country', country);
      localStorage.setItem('hayloo_match_country_only', matchCountryOnly ? 'true' : 'false');
    } catch {}

    if (onSelectCountry) {
      onSelectCountry(country);
    }

    onFindMatch(profession.trim(), tags, country, sessionMode);
  };

  const selectedCountryObj = COUNTRIES_LIST.find((c) => c.code === country);

  return (
    /* ── TRANSLUCENT GLASSMORPHIC CONTAINER (No solid white block) ── */
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-[22px] p-3 sm:p-4 lg:p-3 xl:p-4 relative transition-all duration-300 dark:bg-slate-900/95 dark:bg-none"
      style={{
        background: 'var(--theme-card-bg, rgba(255, 255, 255, 0.42))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid var(--theme-card-border, rgba(245, 208, 197, 0.65))',
        boxShadow: 'var(--theme-card-shadow, 0 12px 40px rgba(236, 94, 39, 0.08)), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
      }}
    >
      {/* ── HEADER WITH INTERACTIVE USABLE FILTER ICON BUTTONS ── */}
      <div className="flex items-center justify-between mb-2 lg:mb-1.5 flex-wrap gap-2 relative">
        <div className="flex items-center gap-2">
          {/* User-actionable filter icon button (Click to open dropdown with Worldwide, Same Country & Presets) */}
          <button
            type="button"
            id="hero-filter-settings-btn"
            onClick={() => setShowFilterSettings((prev) => !prev)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm group border ${
              showFilterSettings
                ? 'scale-105'
                : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border-slate-200/80 dark:border-white/10 hover:scale-105 active:scale-95'
            }`}
            style={{
              backgroundColor: showFilterSettings ? 'var(--theme-primary, #EC5E27)' : undefined,
              borderColor: 'var(--theme-primary, #EC5E27)',
              color: showFilterSettings ? 'var(--theme-btn-text, #ffffff)' : 'var(--theme-primary, #EC5E27)',
              boxShadow: showFilterSettings ? '0 0 14px var(--theme-primary-glow, rgba(236,94,39,0.45))' : undefined,
            }}
            title="Click icon to open matching scope (Worldwide, Same Country) & presets"
            aria-label="Filter options and presets"
          >
            <SlidersHorizontal className={`w-4 h-4 transition-transform duration-300 ${showFilterSettings ? 'rotate-90' : 'group-hover:rotate-45'}`} />
          </button>

          {/* Clickable Header Text */}
          <button
            type="button"
            onClick={() => setShowFilterSettings((prev) => !prev)}
            className="text-left bg-transparent border-0 p-0 cursor-pointer group"
            title="Click to configure match filters"
          >
            <span
              className="uppercase font-black tracking-widest text-[11px] group-hover:underline transition-colors"
              style={{ color: 'var(--theme-primary, #EC5E27)' }}
            >
              {t('hero.configureFilters', 'Configure Your Match Filters')}
            </span>
          </button>
        </div>

        {/* Right Corner: Circular Arrow Reset Button (Shifted here in place of text button) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="hero-filter-reset-btn"
            onClick={handleResetFilters}
            className="w-8 h-8 rounded-xl bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#EC5E27] dark:hover:text-[#EC5E27] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs group"
            title={t('hero.resetFilters', 'Reset match filters to default')}
            aria-label="Reset match filters"
          >
            <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-180 transition-transform duration-500 text-slate-500 dark:text-slate-400 group-hover:text-[#EC5E27]" />
          </button>
        </div>

        {/* ── "CONFIGURE YOUR MATCH" SMART QUEUE MODAL (Portaled to document.body to prevent containing block trap) ── */}
        {showFilterSettings && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFilterSettings(false);
            }}
          >
            <div
              ref={popoverRef}
              id="hero-filter-settings-popover"
              className="w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl shadow-2xl border text-slate-900 dark:text-slate-100 animate-scaleUp bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              style={{
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
              }}
            >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {t('hero.configureFilters', 'Configure Your Match Filters')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {t('hero.configureSubtitle', 'Select target profession, conversation intention, and language.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterSettings(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                title="Close match configuration"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields: 1. Target Profession, 2. Purpose, 3. Language */}
            <div className="space-y-3">
              {/* 1. Target Profession (Typeable with autocomplete & instant suggestions) */}
              <div className="relative" ref={targetProfDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="hero-modal-target-profession-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('hero.targetProfession', '1. Target Profession')}
                  </label>
                  {targetProfession && targetProfession !== 'ANY' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetProfession('ANY');
                        setTargetProfQuery('');
                        try {
                          localStorage.setItem('hayloo_target_profession', 'ANY');
                        } catch {}
                      }}
                      className="text-[10px] text-[#EC5E27] font-semibold hover:underline cursor-pointer"
                    >
                      Reset to Any
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    id="hero-modal-target-profession-input"
                    type="text"
                    value={targetProfQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetProfQuery(val);
                      const cleaned = val.trim();
                      setTargetProfession(cleaned || 'ANY');
                      try {
                        localStorage.setItem('hayloo_target_profession', cleaned || 'ANY');
                      } catch {}
                      setShowTargetProfDropdown(true);
                    }}
                    onFocus={() => setShowTargetProfDropdown(true)}
                    placeholder={t('hero.anyProfession', 'Any Profession (Open Discovery) — or type custom...')}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#EC5E27] focus:ring-2 focus:ring-[#EC5E27]/15 focus:outline-none transition-all shadow-2xs"
                  />
                  {targetProfQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetProfQuery('');
                        setTargetProfession('ANY');
                        try {
                          localStorage.setItem('hayloo_target_profession', 'ANY');
                        } catch {}
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                      Type target
                    </span>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showTargetProfDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetProfQuery('');
                        setTargetProfession('ANY');
                        setShowTargetProfDropdown(false);
                        try {
                          localStorage.setItem('hayloo_target_profession', 'ANY');
                        } catch {}
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between font-bold cursor-pointer transition-colors ${
                        targetProfession === 'ANY'
                          ? 'bg-[#FFF7ED] dark:bg-[#EC5E27]/20 text-[#EC5E27]'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#EC5E27] shrink-0" />
                        <span>{t('hero.anyProfession', 'Any Profession (Open Discovery)')}</span>
                      </span>
                      {targetProfession === 'ANY' && <Check className="w-3.5 h-3.5 text-[#EC5E27]" />}
                    </button>
                    <div className="px-3 py-1 text-[9.5px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider border-t border-slate-100 dark:border-white/5 mt-1">
                      Suggested Recognized Professions
                    </div>
                    {(targetProfQuery ? searchProfessions(targetProfQuery, 8) : POPULAR_PROFESSIONS.slice(0, 8)).map((p) => {
                      const isSel = targetProfession.toLowerCase() === p.toLowerCase();
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setTargetProfQuery(p);
                            setTargetProfession(p);
                            setShowTargetProfDropdown(false);
                            try {
                              localStorage.setItem('hayloo_target_profession', p);
                            } catch {}
                          }}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between font-semibold cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-[#FFF7ED] dark:bg-[#EC5E27]/20 text-[#EC5E27]'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{p}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-[#EC5E27]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Conversation Purpose */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('hero.conversationPurpose', '2. Conversation Purpose')}
                </label>
                <div className="relative">
                  <select
                    value={matchPurpose}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMatchPurpose(val);
                      try {
                        localStorage.setItem('hayloo_match_purpose', val);
                      } catch {}
                    }}
                    className="w-full appearance-none rounded-xl border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#EC5E27] focus:ring-2 focus:ring-[#EC5E27]/15 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    {HAYLOO_PURPOSES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {t(`purpose.${p.id}`, p.label)}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    className="absolute pointer-events-none text-slate-500 dark:text-slate-400"
                    style={{
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%) rotate(90deg)',
                      width: 14,
                      height: 14,
                    }}
                  />
                </div>
              </div>

              {/* 3. Primary Language */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('hero.primaryLanguage', '3. Primary Language')}
                </label>
                <div className="relative">
                  <select
                    value={primaryLanguage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrimaryLanguage(val);
                      setLanguage(val);
                      try {
                        localStorage.setItem('hayloo_primary_language', val);
                      } catch {}
                    }}
                    className="w-full appearance-none rounded-xl border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#EC5E27] focus:ring-2 focus:ring-[#EC5E27]/15 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.englishName}>
                        {l.englishName} ({l.label})
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    className="absolute pointer-events-none text-slate-500 dark:text-slate-400"
                    style={{
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%) rotate(90deg)',
                      width: 14,
                      height: 14,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer - Save only (Does NOT direct to match) */}
            <div className="border-t border-slate-200/90 dark:border-white/10 pt-3 mt-3 flex items-center justify-between gap-3">
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                {t('hero.zeroSelfMatches', 'Zero self-matches. Verified routing.')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilterSettings(false)}
                  className="rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                >
                  {t('hero.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  id="hero-modal-save-filters-btn"
                  onClick={handleSaveFilters}
                  className="rounded-xl bg-[#EC5E27] hover:bg-[#D94E1A] px-4 py-1.5 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  style={{
                    background: 'var(--theme-btn-gradient, linear-gradient(135deg, #EC5E27 0%, #EA580C 100%))',
                  }}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('hero.saveAndClose', 'Save')}</span>
                </button>
              </div>
            </div>
          </div>
          </div>,
          document.body
        )}
      </div>

      {/* ── FILTERS SAVED CONFIRMATION BANNER ── */}
      {filtersSavedToast && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50/95 border border-emerald-300/80 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
            <span>
              Filters saved! Mode: <strong>{sessionMode === 'video' || sessionMode === 'VIDEO' ? 'Video Call' : sessionMode === 'voice' || sessionMode === 'AUDIO' ? 'Voice Call' : 'Messaging'}</strong>. Start matching whenever ready below.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFiltersSavedToast(false)}
            className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── SESSION MODE TAGS BAR (Accessible directly on home page) ── */}
      <div className="mb-2.5 p-1.5 sm:p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 shadow-2xs backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('hero.sessionModeLabel', 'Session Mode')}
            </span>
            <span className="text-[9.5px] text-slate-400 font-medium hidden sm:inline">
              {t('hero.chooseMode', '(Choose Call or Messaging)')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {t('hero.activeMode', 'Active')}: <span className="font-extrabold text-[#EC5E27]">{sessionMode === 'video' || sessionMode === 'VIDEO' ? t('hero.videoCall', 'Video Call') : sessionMode === 'voice' || sessionMode === 'AUDIO' ? t('hero.voiceCall', 'Voice Call') : t('hero.messaging', 'Messaging')}</span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'messaging', label: t('hero.messaging', 'Messaging'), title: 'Messaging', icon: MessageSquare },
            { id: 'voice', label: t('hero.voiceCall', 'Voice Call'), title: 'Voice Call', icon: Mic },
            { id: 'video', label: t('hero.videoCall', 'Video Call'), title: 'Video Call', icon: Video },
          ].map((mode) => {
            const active =
              sessionMode === mode.id ||
              (mode.id === 'messaging' && sessionMode === 'TEXT') ||
              (mode.id === 'voice' && sessionMode === 'AUDIO') ||
              (mode.id === 'video' && sessionMode === 'VIDEO');
            const ModeIcon = mode.icon;
            return (
              <button
                key={mode.id}
                id={`hero-mode-${mode.id}-btn`}
                data-testid={`hero-mode-${mode.id}`}
                title={mode.title}
                type="button"
                onClick={() => handleModeChange(mode.id)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-2.5 rounded-xl border text-[11.5px] font-bold transition-all cursor-pointer ${
                  active
                    ? 'shadow-xs ring-1 ring-[#EC5E27]'
                    : 'border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
                style={{
                  backgroundColor: active ? 'var(--theme-pill-bg, #FFF7ED)' : undefined,
                  borderColor: active ? 'var(--theme-primary, #EC5E27)' : undefined,
                  color: active ? 'var(--theme-primary, #EC5E27)' : undefined,
                }}
              >
                <ModeIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STRAIGHT LINEAR INPUTS (Linear to each other, side-by-side) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-2 lg:mb-1.5 items-start">
        {/* ── LEFT COLUMN: PROFESSION + COUNTRY SELECTION (Below Profession) ── */}
        <div className="flex flex-col gap-2.5">
          {/* 1. YOUR PROFESSION / FIELD */}
          <div className="relative" ref={professionContainerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="hero-profession-input" className="block font-semibold text-xs text-slate-700 dark:text-slate-300">
                {t('hero.professionLabel', 'Your Profession / Field')}
              </label>
              {isProfValid && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/85 dark:border-emerald-800 shadow-xs transition-all">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  {t('hero.verified', 'Verified')}
                </span>
              )}
            </div>

            {/* Custom Typed Profession Input with Instant Autocomplete (Translucent) */}
            <div className="relative">
              <input
                id="hero-profession-input"
                type="text"
                value={profession}
                onChange={(e) => handleProfessionChange(e.target.value)}
                onFocus={() => {
                  if (profession.trim()) setProfessionSuggestions(searchProfessions(profession, 6));
                  setShowSuggestions(true);
                }}
                placeholder={t('hero.professionPlaceholder', 'e.g. Software Engineer, AI Researcher, UI/UX Designer...')}
                className={`w-full font-semibold focus:outline-none transition-all px-3 py-2 rounded-[10px] text-xs text-slate-900 dark:text-slate-100 bg-white/70 dark:bg-slate-800/80 placeholder:text-slate-400 dark:placeholder:text-slate-500 border ${
                  activeProfError || professionError
                    ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-950/40'
                    : isProfValid
                    ? 'border-emerald-300 dark:border-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#EC5E27] focus:ring-2 focus:ring-[#EC5E27]/15'
                }`}
                style={{
                  borderRadius: '10px',
                  backdropFilter: 'blur(8px)',
                }}
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions && professionSuggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 shadow-xl z-50 py-1"
                  style={{
                    borderRadius: '10px',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    {t('hero.suggestedOccupations', 'Suggested Recognized Occupations')}
                  </div>
                  {professionSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-[#FFF7ED] dark:hover:bg-slate-700/60 hover:text-[#EC5E27] dark:hover:text-[#EC5E27] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>{item}</span>
                      <Check className="w-3 h-3 text-emerald-500 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inline Validation Warning for Profession */}
            {(activeProfError || professionError) && (
              <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 dark:text-red-400" />
                <span>{activeProfError || professionError}</span>
              </div>
            )}
          </div>

          {/* 2. COUNTRY FILTER (Placed directly below Profession) */}
          <div className="relative mt-2" ref={countryDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="hero-country-search-input" className="block font-semibold text-xs text-slate-700 dark:text-slate-300">
                {t('filters.country', 'Country / Region')}
              </label>
            </div>
            {/* Type & Search Country Input */}
            <div className="relative">
              <div
                onClick={() => {
                  setShowCountryDropdown(true);
                  countryInputRef.current?.focus();
                }}
                className="w-full flex items-center justify-between font-semibold px-3 py-2 rounded-[10px] text-xs text-slate-900 dark:text-slate-100 bg-white/70 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus-within:border-[#EC5E27] focus-within:ring-2 focus-within:ring-[#EC5E27]/15 transition-all cursor-text shadow-2xs"
                style={{
                  borderRadius: '10px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CountryFlag
                    code={selectedCountryObj?.code || 'GLOBAL'}
                    name={selectedCountryObj?.name}
                    className="w-5 h-3.5 rounded-xs shrink-0"
                  />
                  <input
                    ref={countryInputRef}
                    id="hero-country-search-input"
                    type="text"
                    value={showCountryDropdown ? countrySearchQuery : `${selectedCountryObj?.name || 'Global (Worldwide)'}${selectedCountryObj?.code === 'GLOBAL' ? ' (Worldwide Peer Network)' : ''}`}
                    onChange={(e) => {
                      setCountrySearchQuery(e.target.value);
                      setShowCountryDropdown(true);
                    }}
                    onFocus={() => {
                      setShowCountryDropdown(true);
                    }}
                    placeholder={t('hero.countryPlaceholder', 'Type to search country...')}
                    className="w-full bg-transparent focus:outline-none font-semibold text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal border-0 outline-none shadow-none"
                    style={{
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {showCountryDropdown && countrySearchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCountrySearchQuery('');
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 pointer-events-none ${
                      showCountryDropdown ? '-rotate-90' : 'rotate-90'
                    }`}
                  />
                </div>
              </div>

              {/* Searchable Dropdown List */}
              {showCountryDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 shadow-xl z-50 py-1"
                  style={{
                    borderRadius: '10px',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    Select or Type Country
                  </div>
                  {filteredCountries.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 italic">No country matching "{countrySearchQuery}"</div>
                  ) : (
                    filteredCountries.map((c) => {
                      const isSelected = c.code === country;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleSelectCountry(c.code)}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFF7ED] dark:bg-[#EC5E27]/20 text-[#EC5E27]'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-[#EC5E27] dark:hover:text-[#EC5E27]'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <CountryFlag code={c.code} name={c.name} className="w-5 h-3.5 rounded-xs shrink-0" />
                            <span className="truncate">{c.name} {c.code === 'GLOBAL' ? '(Worldwide)' : ''}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#EC5E27] shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: TARGET INTERESTS (Clean straight linear layout) ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="hero-tag-input" className="block font-semibold text-xs text-slate-700 dark:text-slate-300">
              {t('hero.interestTags', 'Target Interests')}
            </label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {tags.length}/4 tags • comma to add
            </span>
          </div>

          {/* Clean Transparent Tag Box (No covering background block) */}
          <div
            className="flex flex-wrap items-center gap-1.5 cursor-text min-h-[38px] px-2.5 py-1.5 rounded-[10px] border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 focus-within:border-[#EC5E27] focus-within:ring-2 focus-within:ring-[#EC5E27]/15 transition-all shadow-2xs"
            style={{
              borderRadius: '10px',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => document.getElementById('hero-tag-input')?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF7ED]/90 dark:bg-[#EC5E27]/20 text-[#EA580C] dark:text-[#FB923C] border border-[#FFEDD5] dark:border-[#EC5E27]/40 hover:border-[#FDBA74] transition-colors shadow-2xs"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="p-0 border-0 bg-transparent text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer flex items-center justify-center"
                  title={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {tags.length < 4 ? (
              <input
                id="hero-tag-input"
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setTagError(null);
                }}
                onKeyDown={onKeyDown}
                placeholder="+ tag…"
                className="flex-1 bg-transparent focus:outline-none font-semibold text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal min-w-[70px] border-0 outline-none shadow-none p-0 m-0"
                style={{
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                }}
              />
            ) : null}
          </div>

          {/* Inline Error for Target Interest */}
          {tagError && (
            <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 dark:text-red-400" />
              <span>{tagError}</span>
            </div>
          )}

          {/* Quick Suggestion Chips (Dynamically based on typed profession) */}
          <div className="mt-2">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              {t('hero.popularTopics', 'Popular Topics (tap to add)')}
            </span>
            <div className="flex flex-wrap gap-1">
              {dynamicPopularTopics.map((quick) => {
                const isSelected = tags.includes(quick);
                return (
                  <button
                    key={quick}
                    type="button"
                    disabled={isSelected || tags.length >= 4}
                    onClick={() => addQuickTag(quick)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-default opacity-60'
                        : tags.length >= 4
                        ? 'bg-white/40 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50'
                        : 'bg-white/70 dark:bg-slate-800/70 hover:bg-[#FFF7ED] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#EC5E27] dark:hover:text-[#EC5E27] border-slate-200 dark:border-slate-700 hover:border-[#FDBA74] shadow-2xs'
                    }`}
                  >
                    + {quick}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. FIND MATCH ACTION BUTTON ── */}
      <div id="hero-find-match-container" className="mt-2 lg:mt-1.5">
        <button
          id="hero-find-match-btn"
          type="submit"
          disabled={!isProfValid || tags.length < 1 || tags.length > 4}
          className="w-full font-bold rounded-xl py-2 sm:py-2.5 px-4 cursor-pointer text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group dark:bg-[#EC5E27] dark:bg-none"
          style={{
            background: isProfValid && tags.length >= 1 && tags.length <= 4
              ? 'var(--theme-btn-gradient, linear-gradient(135deg, #EC5E27 0%, #EA580C 50%, #C2410C 100%))'
              : '#94A3B8',
            color: isProfValid && tags.length >= 1 && tags.length <= 4
              ? 'var(--theme-btn-text, #ffffff)'
              : '#ffffff',
            cursor: isProfValid && tags.length >= 1 && tags.length <= 4 ? 'pointer' : 'not-allowed',
            boxShadow: isProfValid && tags.length >= 1 && tags.length <= 4
              ? '0 8px 24px var(--theme-primary-glow, rgba(236, 94, 39, 0.35)), 0 2px 6px rgba(0, 0, 0, 0.08)'
              : 'none',
          }}
        >
          {sessionMode === 'video' || sessionMode === 'VIDEO' ? (
            <Video className="w-4 h-4 text-amber-200 group-hover:rotate-6 transition-transform shrink-0" />
          ) : sessionMode === 'voice' || sessionMode === 'AUDIO' ? (
            <Mic className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform shrink-0" />
          ) : (
            <MessageSquare className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform shrink-0" />
          )}
          <span className="truncate">{t('hero.findMatchBtn', 'Find Match')}</span>
          <span className="text-[10px] sm:text-[10.5px] font-black uppercase px-2 py-0.5 rounded-md bg-white/25 text-white tracking-wider ml-1 shadow-2xs shrink-0">
            {sessionMode === 'video' || sessionMode === 'VIDEO' ? t('hero.video', 'Video') : sessionMode === 'voice' || sessionMode === 'AUDIO' ? t('hero.audio', 'Audio') : t('hero.messaging', 'Messaging')}
          </span>
        </button>
      </div>
    </form>
  );
};

/* ─────────────────────────────────────────────────────────────────
   HeroSection (exported)
───────────────────────────────────────────────────────────────── */
interface HeroSectionProps {
  sessionMode?: string;
  onSessionModeChange?: (mode: string) => void;
  onFindMatch: (profession?: string, tags?: string[], country?: string, sessionMode?: string) => void;
  onStartExploring: () => void;
  selectedCountry?: string;
  onSelectCountry?: (country: string) => void;
  userProfession?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  sessionMode,
  onSessionModeChange,
  onFindMatch,
  onStartExploring,
  selectedCountry,
  onSelectCountry,
  userProfession,
}) => {
  const { t } = useLanguage();
  return (
  <section
    id="hero-section"
    className="w-full min-h-full flex-1 flex items-center justify-center transition-colors duration-500 py-3 sm:py-4 lg:py-1"
    style={{ background: 'var(--theme-bg, #fdedd1)' }}
  >
    <div className="w-full min-h-full flex items-center justify-center px-3 sm:px-6 md:px-8 lg:px-10 xl:px-14 py-2 lg:py-0">
      <div className="hero-split-root">

        {/* LEFT — Seamless 3-Column 9:16 Portrait Showcase (Hidden on Mobile & Tablet, visible on Desktop) */}
        <div className="hero-col-left hidden lg:flex">
          <PortraitGrid />
        </div>

        {/* RIGHT — Headline + Filter card */}
        <div className="hero-col-right">
          <div className="flex flex-col gap-2 lg:gap-1.5 xl:gap-2 w-full">
            <h1
              className="m-0 font-black tracking-tight transition-colors duration-300"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif",
                fontSize: 'clamp(1.45rem, 2.1vw, 2.25rem)',
                lineHeight: 1.12,
                color: 'var(--theme-text-heading, #0F172A)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
              }}
            >
              {t('hero.connectBy', 'Connect by')}{' '}
              <span style={{ color: 'var(--theme-primary, #EC5E27)' }}>{t('hero.professionSpan', 'Profession')}</span>
              {' '}{t('hero.andShared', '& Shared')}{' '}
              <span style={{ color: 'var(--theme-primary, #EC5E27)' }}>{t('hero.interestsSpan', 'Interests.')}</span>
            </h1>
            <p
              className="m-0 transition-colors duration-300 text-xs sm:text-[13px] leading-snug text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xl"
            >
              {t('hero.mainSubtitle', 'Move beyond random chats. Our intelligent matching engine connects you instantly with verified developers, designers, creators, and experts who match your exact domain and curiosity.')}
            </p>
            <FilterCard
              sessionMode={sessionMode}
              onSessionModeChange={onSessionModeChange}
              onFindMatch={onFindMatch}
              selectedCountry={selectedCountry}
              onSelectCountry={onSelectCountry}
              userProfession={userProfession}
            />
          </div>
        </div>
      </div>
    </div>

    {/* ── Seamless 3-Column Showcase & Kinetic Continuous Loop Styles ── */}
    <style>{`
      /* ── Layout & Responsive Split ── */
      .hero-split-root {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        width: 100%;
        max-width: 100%;
      }
      .hero-col-left  { display: none; width: 100%; }
      .hero-col-right { width: 100%; order: 1; display: flex; flex-direction: column; justify-content: center; }

      @media (min-width: 1024px) {
        .hero-split-root {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          width: 100%;
          min-height: 0;
        }
        .hero-col-left  { display: flex !important; flex: 1.15; order: 1; min-width: 0; align-items: center; justify-content: center; }
        .hero-col-right { flex: 1.05; order: 2; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
      }

      /* ── Hero 3-Column Seamless Canvas Showcase ── */
      .hero-grid-wrapper {
        width: 100%;
        max-width: 100%;
        position: relative;
        display: flex;
        justify-content: center;
        height: 100%;
      }

      .hero-grid-showcase {
        width: 100%;
        height: 640px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        position: relative;
        overflow: hidden;
        border-radius: 22px;
        box-sizing: border-box;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%);
        mask-image: linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%);
      }

      @media (min-width: 1024px) {
        .hero-grid-showcase {
          height: clamp(340px, calc(100vh - 170px), 560px);
          gap: 12px;
        }
      }

      @media (max-width: 1024px) {
        .hero-grid-showcase {
          height: 480px;
          gap: 10px;
        }
      }

      @media (max-width: 640px) {
        .hero-grid-showcase {
          height: 400px;
          gap: 8px;
        }
      }

      .kinetic-stream-col {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        position: relative;
      }

      .kinetic-stream-track {
        will-change: transform;
      }

      /* ── Ultra-Smooth Continuous Linear Infinite Stream (Zero Reversal, Zero Jump) ── */
      @keyframes stream-continuous-up {
        0% {
          transform: translate3d(0, 0, 0);
        }
        100% {
          transform: translate3d(0, calc(-50% - 7px), 0);
        }
      }

      /* ── Pause on Hover for Entire Column ── */
      .kinetic-stream-col:hover .kinetic-stream-track {
        animation-play-state: paused;
      }

      /* ── Card Hover Elevation & Vibrant Orange Glow ── */
      .hcard {
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                    border-color 0.3s ease;
        will-change: transform, box-shadow;
      }

      .hcard:hover {
        transform: translateY(-3px) scale(1.025) !important;
        border-color: #EC5E27 !important;
        box-shadow: 0 14px 30px rgba(236, 94, 39, 0.28) !important;
        z-index: 50 !important;
      }

      /* Photo subtle zoom on card hover */
      .hcard-img {
        transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease;
      }
      .hcard:hover .hcard-img {
        transform: scale(1.05);
        filter: brightness(1.04) saturate(1.05);
      }

      /* Green ONLINE status pulse dot */
      @keyframes hero-blink {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.35; transform: scale(0.75); }
      }

      /* ── 3D Harmonic Wave Float Perspective Styles ── */
      .anim-mode-wave {
        perspective: 1200px;
      }
      .anim-mode-wave .wave-perspective {
        perspective: 1000px;
      }
      .anim-mode-wave .hcard {
        transform: rotateY(1.5deg) rotateX(1deg);
      }

      .hcard-wave {
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .hcard-wave:hover {
        transform: translateY(-8px) scale(1.04) rotateX(4deg) !important;
        box-shadow: 0 20px 35px rgba(236, 94, 39, 0.32) !important;
      }

      /* ── Neon Glow & Shimmering Holographic Frame Styles ── */
      .shimmer-stream-col {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        position: relative;
      }

      .hcard-shimmer {
        border: 2px solid #EC5E27 !important;
        animation: frame-border-flow 4s ease-in-out infinite;
      }

      @keyframes frame-border-flow {
        0% {
          border-color: #EC5E27;
          box-shadow: 0 0 16px rgba(236, 94, 39, 0.5), 0 4px 20px rgba(15, 23, 42, 0.15);
        }
        33% {
          border-color: #F59E0B;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.55), 0 4px 20px rgba(15, 23, 42, 0.15);
        }
        66% {
          border-color: #EC4899;
          box-shadow: 0 0 22px rgba(236, 72, 153, 0.5), 0 4px 20px rgba(15, 23, 42, 0.15);
        }
        100% {
          border-color: #EC5E27;
          box-shadow: 0 0 16px rgba(236, 94, 39, 0.5), 0 4px 20px rgba(15, 23, 42, 0.15);
        }
      }

      .hcard-shimmer-sweep {
        position: absolute;
        top: -60%;
        left: -60%;
        width: 220%;
        height: 220%;
        background: linear-gradient(
          115deg,
          transparent 35%,
          rgba(255, 255, 255, 0.45) 50%,
          transparent 65%
        );
        pointer-events: none;
        z-index: 10;
        animation: frame-shimmer-sweep 3.6s ease-in-out infinite;
      }

      @keyframes frame-shimmer-sweep {
        0% {
          transform: translateX(-150%) rotate(25deg);
          opacity: 0;
        }
        15% {
          opacity: 0.65;
        }
        38% {
          transform: translateX(180%) rotate(25deg);
          opacity: 0;
        }
        100% {
          transform: translateX(180%) rotate(25deg);
          opacity: 0;
        }
      }
    `}</style>
  </section>
  );
};
