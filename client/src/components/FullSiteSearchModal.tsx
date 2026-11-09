import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Shield,
  MessageSquare,
  Users,
  GraduationCap,
  Sparkles,
  HelpCircle,
  FileText,
  Lock,
} from 'lucide-react';
import { AppView } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface SearchResultItem {
  id: string;
  category: 'Modes' | 'Professions' | 'Topics' | 'Safety' | 'Legal' | 'FAQ';
  title: string;
  description: string;
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

interface FullSiteSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onSelectProfession?: (prof: string) => void;
  onSelectInterest?: (interest: string) => void;
}

export const FullSiteSearchModal: React.FC<FullSiteSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectProfession,
  onSelectInterest,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount & handle escape key
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const indexItems: SearchResultItem[] = useMemo(() => [
    {
      id: 'mode-1on1',
      category: 'Modes',
      title: '1-on-1 High Synergy Match',
      description: 'Private real-time video or text peer conversation matched by deep technical tags.',
      icon: MessageSquare,
      action: () => {
        onNavigate('profession_select');
        onClose();
      },
    },
    {
      id: 'prof-swe',
      category: 'Professions',
      title: 'Software Engineer',
      description: 'Distributed systems, compilers, frontend, backend, and DevOps engineering.',
      icon: Sparkles,
      action: () => {
        if (onSelectProfession) onSelectProfession('Software Engineer');
        onNavigate('profession_select');
        onClose();
      },
    },
    {
      id: 'prof-ai',
      category: 'Professions',
      title: 'AI & ML Researcher',
      description: 'Deep learning architectures, LLM alignment, training pipelines, and robotics.',
      icon: Sparkles,
      action: () => {
        if (onSelectProfession) onSelectProfession('AI Researcher');
        onNavigate('profession_select');
        onClose();
      },
    },
    {
      id: 'prof-design',
      category: 'Professions',
      title: 'UI/UX & Product Designer',
      description: 'Design systems, micro-interactions, Figma architectures, and ergonomic UX.',
      icon: Sparkles,
      action: () => {
        if (onSelectProfession) onSelectProfession('UI/UX Designer');
        onNavigate('profession_select');
        onClose();
      },
    },
    {
      id: 'prof-security',
      category: 'Professions',
      title: 'Cybersecurity Analyst',
      description: 'Penetration testing, cryptography, zero-trust infrastructure, and threat intel.',
      icon: Lock,
      action: () => {
        if (onSelectProfession) onSelectProfession('Cybersecurity Analyst');
        onNavigate('profession_select');
        onClose();
      },
    },
    {
      id: 'topic-react',
      category: 'Topics',
      title: 'React & Frontend Frameworks',
      description: 'Server components, reactive state patterns, and virtual DOM performance.',
      icon: Sparkles,
      action: () => {
        if (onSelectInterest) onSelectInterest('React');
        onNavigate('interest_select');
        onClose();
      },
    },
    {
      id: 'topic-rust',
      category: 'Topics',
      title: 'Rust & Memory Safety',
      description: 'Async runtimes, ownership semantics, WebAssembly, and systems programming.',
      icon: Sparkles,
      action: () => {
        if (onSelectInterest) onSelectInterest('Rust');
        onNavigate('interest_select');
        onClose();
      },
    },
    {
      id: 'safety-zerologs',
      category: 'Safety',
      title: 'Zero Data Retention Specification',
      description: 'Discover how Ologle eliminates disk storage and purges memory upon disconnect.',
      icon: Shield,
      action: () => {
        onNavigate('privacy_page');
        onClose();
      },
    },
    {
      id: 'safety-rules',
      category: 'Safety',
      title: 'Community Rules & Behavioral Standards',
      description: 'Anti-harassment policies, moderation pipeline, and safe conduct standards.',
      icon: Shield,
      action: () => {
        onNavigate('community_rules');
        onClose();
      },
    },
    {
      id: 'legal-terms',
      category: 'Legal',
      title: 'Terms of Service',
      description: 'Platform usage agreement, acceptable use, and terms of service.',
      icon: FileText,
      action: () => {
        onNavigate('terms_page');
        onClose();
      },
    },
    {
      id: 'faq-free',
      category: 'FAQ',
      title: 'Is Ologle free to use?',
      description: 'Yes, Ologle is 100% free, accountless, and requires no subscriptions.',
      icon: HelpCircle,
      action: () => {
        onNavigate('landing');
        onClose();
      },
    },
    {
      id: 'faq-encryption',
      category: 'FAQ',
      title: 'How is audio and video encrypted?',
      description: 'Media streams communicate through direct peer-to-peer WebRTC DTLS/SRTP encryption.',
      icon: HelpCircle,
      action: () => {
        onNavigate('privacy_page');
        onClose();
      },
    },
  ], [onNavigate, onClose, onSelectProfession, onSelectInterest]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return indexItems.slice(0, 7);
    return indexItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query, indexItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % (filteredResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full-site search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#111111]/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#141414] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-[#111111]/50">
          <Search className="w-5 h-5 text-[#EC5E27] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder', 'Search professions, interests, rooms, rules, or FAQs...')}
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-white mr-2"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-neutral-400 bg-[#1A1A1A] rounded border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-white/10">
          {filteredResults.length > 0 ? (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EC5E27]/15 border border-[#EC5E27]/40 text-white'
                      : 'hover:bg-[#1E1E1E]/60 text-neutral-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-[#EC5E27] text-white shadow-[0_0_12px_rgba(236,94,39,0.4)]'
                          : 'bg-[#1A1A1A] text-[#EC5E27]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#1A1A1A] text-white border border-white/10">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-[#EC5E27] translate-x-0.5' : 'text-neutral-500'
                    }`}
                  />
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center text-neutral-400 text-sm">
              No results found for &ldquo;{query}&rdquo;. Try searching for &ldquo;Engineer&rdquo;, &ldquo;React&rdquo;, or &ldquo;Privacy&rdquo;.
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-black border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span>{t('search.navigateHint', '↑↓ to navigate')}</span>
            <span>{t('search.selectHint', '↵ to select')}</span>
            <span>{t('search.closeHint', 'ESC to close')}</span>
          </div>
          <span className="text-[#EC5E27] font-medium">{t('search.title', 'Full-Site Search')}</span>
        </div>
      </div>
    </div>
  );
};
