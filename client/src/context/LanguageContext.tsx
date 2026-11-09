import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SUPPORTED_LANGUAGES, LanguageOption, getLanguageByCode } from '../data/languages.ts';
import { OTHER_TRANSLATIONS } from '../data/translationsOther.ts';

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    // Nav
    'nav.matchmaking': 'Matchmaking',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.startTalking': 'Start Talking',
    'nav.search': 'Search (Cmd+K)',
    'nav.language': 'Language',
    'nav.home': 'Home',
    'nav.preferences': 'Preferences',

    // Hero Section
    'hero.connectBy': 'Connect by',
    'hero.professionSpan': 'Profession',
    'hero.andShared': '& Shared',
    'hero.interestsSpan': 'Interests.',
    'hero.mainSubtitle': 'Choose a profession and interests to look for real members who share your curiosity. Availability varies; when no compatible member is online, we’ll wait instead of showing a fabricated profile.',
    'hero.configureFilters': 'Configure Your Match Filters',
    'hero.resetFilters': 'Reset match filters',
    'hero.professionLabel': 'Your Profession or Field',
    'hero.professionPlaceholder': 'e.g. Software Engineer, AI Researcher, UI/UX Designer...',
    'hero.suggestedOccupations': 'Suggested Recognized Occupations',
    'hero.countryPlaceholder': 'Type to search country...',
    'hero.matchingScope': 'Matching Scope',
    'hero.worldwide': 'Worldwide (Global Discovery)',
    'hero.sameCountry': 'Same Country Only',
    'hero.filterPresets': 'Filter Presets',
    'hero.interestTags': 'Target Interest Tags',
    'hero.popularTopics': 'Popular Topics (tap to add)',
    'hero.findMatchBtn': 'Find Match',
    'hero.smartQueue': 'SMART QUEUE',
    'hero.configureSubtitle': 'Select target profession, conversation intention, and language.',
    'hero.targetProfession': '1. Target Profession',
    'hero.anyProfession': 'Any Profession (Open Discovery)',
    'hero.conversationPurpose': '2. Conversation Purpose',
    'hero.sessionMode': 'Session Mode',
    'hero.sessionModeLabel': 'Session Mode',
    'hero.chooseMode': '(Choose Call or Messaging)',
    'hero.activeMode': 'Active',
    'hero.primaryLanguage': '3. Primary Language',
    'hero.videoCall': 'Video Call',
    'hero.voiceCall': 'Voice Call',
    'hero.messaging': 'Messaging',
    'hero.videoTag': 'HD Video',
    'hero.videoDesc': 'Face-to-face camera & audio',
    'hero.voiceTag': 'Audio Only',
    'hero.voiceDesc': 'Microphone & voice stream',
    'hero.textTag': 'Text Chat',
    'hero.textDesc': 'Direct encrypted text chat',
    'hero.saveAndClose': 'Save',
    'hero.cancel': 'Cancel',
    'hero.zeroSelfMatches': 'Zero self-matches or blocked users. Verified compatibility routing.',
    'hero.verified': 'Verified',
    'hero.invalidProfession': 'Invalid Profession',
    'hero.audio': 'Audio',
    'purpose.EXCHANGE_IDEAS': 'Exchange Industry Ideas',
    'purpose.MEET_PEER': 'Meet a Peer',
    'purpose.FIND_MENTOR': 'Find a Mentor',
    'purpose.SHARE_EXPERTISE': 'Share My Expertise',
    'purpose.DISCUSS_PROJECT': 'Discuss a Project',
    'purpose.COLLABORATE_BUILD': 'Collaborate & Build',
    'purpose.EXPLORE_CAREER': 'Explore Career Options',
    'purpose.LEARN': 'Learn from Someone',
    'purpose.MOCK_INTERVIEW': 'Mock Interview & Prep',
    'purpose.CODE_DEBUG': 'Code Review & Technical Chat',
    'purpose.DESIGN_FEEDBACK': 'Design & Creative Feedback',
    'purpose.STARTUP_PITCH': 'Startup Pitch & Brainstorming',
    'purpose.CASUAL_CHAT': 'Casual Professional Coffee Chat',
    'purpose.LANGUAGE_EXCHANGE': 'Language & Culture Exchange',
    'purpose.SPONTANEOUS': 'Surprise Me (Spontaneous)',

    // Hero Top Banner
    'hero.bannerBadge': 'Next-Gen Anonymous Video Chat',
    'hero.heroTitle': 'Your Next Great Conversation Starts Here.',
    'hero.heroSubtitle': 'Meet vetted professionals and creative minds beyond your network. Instant encrypted video, audio, or text conversations with radical zero persistence.',
    'hero.findMatch': 'Find My Match →',
    'hero.exploreProfessions': 'Explore Professions',
    'hero.heroDisclaimer': 'Zero cold outreach. Instant video, audio, or text matching with one-click skip and strict privacy controls.',
    'hero.liveConnecting': '74,143 connecting in real-time',
    'hero.startVideoChat': 'Start Video Chat',
    'hero.startTalkingTopics': 'Start Talking with Selected Topics',


    // Product Preview Card
    'hero.productPreview': 'Illustrative Product Preview',
    'hero.compatibility': 'Compatibility: 94%',
    'hero.matchedPeer': 'Matched Peer',
    'hero.softwareEng': 'SOFTWARE ENG',
    'hero.staffArchitect': 'Staff Systems Architect',
    'hero.sharedTags': 'Shared: TypeScript, Distributed',
    'hero.sessionControls': 'Session Controls',
    'hero.video': 'Video',
    'hero.exchangeIdeas': 'Exchange Ideas',
    'hero.demoDesc': 'Live WebRTC video room demo or custom smart queue filters.',
    'hero.launchDemo': 'Launch Live Demo →',

    // Disciplines
    'disciplines.badge': 'Curated Disciplines',
    'filters.exploreDiscipline': 'Explore by Industry & Discipline',
    'filters.selectDiscipline': 'Select any discipline to jump straight into tailored peer matchmaking.',
    'disciplines.match': 'Match →',
    'prof.software-development.name': 'Software Development',
    'prof.software-development.desc': 'Full-stack, systems architecture, mobile, and distributed engineering.',
    'prof.data-ai.name': 'Data & Artificial Intelligence',
    'prof.data-ai.desc': 'Machine learning, computer vision, deep learning, and analytics.',
    'prof.design-creative.name': 'Design & Creative',
    'prof.design-creative.desc': 'Product design, UX research, brand identity, and design systems.',
    'prof.business-entrepreneurship.name': 'Business & Entrepreneurship',
    'prof.business-entrepreneurship.desc': 'Founders, venture strategy, operations, and company building.',
    'prof.product-management.name': 'Product Management',
    'prof.product-management.desc': 'Roadmapping, user discovery, product strategy, and execution.',
    'prof.marketing-sales.name': 'Marketing & Sales',
    'prof.marketing-sales.desc': 'Growth strategy, positioning, enterprise outbound, and GTM.',
    'prof.science-research.name': 'Science & Research',
    'prof.science-research.desc': 'Academic research, laboratory methods, and applied R&D.',
    'prof.education-academia.name': 'Education & Academia',
    'prof.education-academia.desc': 'Higher education, curriculum design, and knowledge sharing.',
    'prof.healthcare.name': 'Healthcare',
    'prof.healthcare.desc': 'Clinical systems, digital health innovation, and medical practice.',
    'prof.finance.name': 'Finance',
    'prof.finance.desc': 'Corporate finance, capital markets, fintech, and quantitative analysis.',
    'prof.engineering.name': 'Engineering',
    'prof.engineering.desc': 'Electrical, mechanical, robotics, civil, and hardware systems.',
    'prof.students-early-career.name': 'Students & Early-Career',
    'prof.students-early-career.desc': 'University projects, career transitions, internships, and mentorship.',

    // Console Card & Filters
    'console.fullscreen': 'Toggle Fullscreen',
    'console.topicFilter': 'Topic & Profession Filter',
    'filters.gender': 'Gender',
    'filters.matchPreference': 'Match Preference',
    'filters.both': 'Both (Everyone)',
    'filters.women': 'Women',
    'filters.men': 'Men',
    'filters.country': 'Country',
    'filters.searchCountry': 'Search country...',
    'filters.global': 'Global (Any Country)',

    // Peer Matrix Section
    'matrix.badge': 'Ologle Peer Matrix',
    'matrix.title': 'Connect by Intellectual & Creative Field',
    'matrix.exploreLounges': 'Explore Community Lounges',
    'matrix.searchPlaceholder': 'Search profession or field (e.g. Software Engineer, UI/UX Designer, Physicist)...',
    'matrix.select': 'Select',
    'matrix.recommendedTopics': 'Recommended Topics',
    'matrix.selected': 'Selected',
    'matrix.addCustom': '+ Add custom interest topic',
    'matrix.customPlaceholder': 'Add custom topic...',
    'matrix.add': 'Add',

    // Showcase
    'showcase.online': 'ONLINE',
    'showcase.match': 'match',
    'showcase.startMatch': 'Start Match',
    'showcase.affinity': 'Affinity',
    'showcase.connectCall': 'Connect & Start Video Call',

    // Tabs
    'tabs.videoChat': 'Video Chat',
    'tabs.history': 'History',
    'tabs.messages': 'Messages',
    'tabs.noHistory': 'No history yet. Start a video chat and connect with an intellectual peer!',
    'tabs.startChatting': 'Start Chatting',
    'tabs.directThreads': 'Direct Threads',
    'tabs.notFollowing': "You're not following anyone yet.",
    'tabs.meetSomeone': 'Meet Someone New!',
    'tabs.zeroPersistenceDesc': 'Connect with peers you respect and start discussions with radical zero persistence!',

    // Start Talking Modal
    'modal.title': 'Start Talking',
    'modal.subtitle': 'Connect instantly with an intellectual peer without leaving your screen.',

    'modal.chooseFormat': '1. Choose Conversation Format',
    'modal.video': 'Video Call',
    'modal.videoDesc': 'Camera & Audio',
    'modal.audio': 'Audio Only',
    'modal.audioDesc': 'Voice Only',
    'modal.text': 'Text & Code',
    'modal.textDesc': 'Ephemeral Pad',
    'modal.targetDomain': '2. Target Profession / Peer Domain',
    'modal.anyProf': 'Any Profession (Instant & Open Discovery)',
    'modal.purpose': '3. Discussion Purpose',
    'modal.prefLang': '4. Preferred Language',
    'modal.guaranteeTitle': 'Zero Persistence Guarantee:',
    'modal.guaranteeDesc': 'Video and audio are routed via encrypted peer-to-peer WebRTC. No recordings or conversations are saved.',
    'modal.searchingTitle': 'Searching for a Compatible Peer...',



    'modal.connectedTitle': 'Compatible Peer Located!',
    'modal.compatibilityScore': 'Compatibility',
    'modal.findPeer': 'Find Peer Now',
    'modal.cancel': 'Cancel',
    'modal.stopSearching': 'Stop Searching',
    'modal.liveActive': 'Live matchmaker active',
    'modal.skip': 'Skip & Find Another',
    'modal.enterCall': 'Connect & Enter Call',

    // Settings Drawer
    'settings.title': 'Edit Profile',
    'settings.guidance': 'Please do not share inappropriate content or personal information (such as phone number or address) on your profile. All uploads are reviewed and moderated.',
    'settings.aboutMe': 'About me',
    'settings.aboutPlaceholder': 'Share a little something about yourself.',
    'settings.hashtag': 'Hashtag',
    'settings.myInfo': 'My info',
    'settings.audioSounds': 'Audio Sounds',
    'settings.on': 'ON',
    'settings.off': 'OFF',
    'settings.complete': 'Complete',

    // Search Modal
    'search.placeholder': 'Search professions, interests, rooms, rules, or FAQs...',
    'search.navigateHint': '↑↓ to navigate',
    'search.selectHint': '↵ to select',
    'search.closeHint': 'ESC to close',
    'search.title': 'Full-Site Search',

    // FAQ
    'faq.badge': 'Frequently Asked Questions',
    'faq.title': 'Everything You Need to Know',
    'faq.q1': 'Can I use Ologle for free?',
    'faq.a1': 'Yes, it is completely free and accountless. No credit card, no sign-up form, and no subscription tiers are required. You can connect with peers across the globe immediately in your browser.',
    'faq.q2': 'What makes the Ologle peer platform stand out?',
    'faq.a2': 'We combine high-performance instant video discovery with strict zero data retention. You are paired with peers live in real-time, backed by low-latency P2P WebRTC encryption.',
    'faq.q3': 'Can I filter by country or intellectual topics?',
    'faq.a3': 'Yes. You can switch between Global matching or Country-specific matching right on the video console, and select topic interests for focused, high-signal conversations.',
    'faq.q4': 'How does the zero data retention policy work?',
    'faq.a4': 'Once your session ends, all WebRTC peer connections close permanently. Text messages and media frames evaporate from memory immediately without touching persistent database disks.',

    // Newsletter
    'news.badge': 'Ologle Innovation Dispatch',
    'news.title': 'Stay Updated on Smarter Technology & P2P Engineering',
    'news.subtitle': 'Monthly technical writeups on low-latency WebRTC architectures, hardware-accelerated streams, and radical zero-logs privacy.',
    'news.placeholder': 'Enter your professional email...',
    'news.subscribe': 'Subscribe Now',
    'news.subscribed': 'Subscribed! You will receive the monthly Ologle Innovation Dispatch.',

    // Footer
    'footer.description': 'Ologle Network. Privacy-first peer discovery platform with radical zero data retention.',
    'footer.videoChat': 'Video Chat',
    'footer.exploreModes': 'Explore Modes',
    'footer.guidelines': 'Community Guidelines',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.report': 'Report a User',
    'footer.contact': 'Contact Support',
    'footer.rights': 'All rights reserved.',
    'footer.zeroLogs': 'Zero logs verified',
  },
  ...OTHER_TRANSLATIONS,
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  currentLanguageOption: LanguageOption;
  t: (key: string, fallback?: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem('heyloo_site_language') || 'en';
  });

  const setLanguage = (lang: string) => {
    const option = getLanguageByCode(lang);
    const clean = option ? option.shortCode : (lang || 'en').split('-')[0].toLowerCase();
    setLanguageState(clean);
    try {
      localStorage.setItem('heyloo_site_language', clean);
      if (option) {
        localStorage.setItem('hayloo_primary_language', option.englishName);
      }
    } catch {}
  };

  // Always keep false so layout and text side never flips
  const isRtl = false;

  useEffect(() => {
    document.documentElement.lang = language;
    // Always enforce ltr so text alignment, columns, buttons, and layout side never change
    document.documentElement.dir = 'ltr';
  }, [language]);

  const currentLanguageOption = getLanguageByCode(language);

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Check fallback as a phrase in the language dictionary if it matches a known phrase
    if (fallback && langDict && langDict[fallback]) {
      return langDict[fallback];
    }
    // Fallback to English dict
    if (TRANSLATIONS.en && TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    // Fallback provided
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguageOption, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    const fallbackOption = getLanguageByCode('en');
    return {
      language: 'en',
      setLanguage: () => {},
      currentLanguageOption: fallbackOption,
      t: (key: string, fallback?: string) => fallback !== undefined ? fallback : key,
      isRtl: false,
    };
  }
  return context;
}
