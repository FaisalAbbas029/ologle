/**
 * Hayloo Application Constants & Validation
 */

import { RECOGNIZED_PROFESSIONS, OCCUPATIONAL_STEMS, NON_PROFESSION_WORDS } from './professionsData.ts';
import { CandidatePeer } from '../types/index.ts';

export const PRESET_INTERESTS = [
  'AI',
  'Programming',
  'Technology',
  'Science',
  'Education',
  'Business',
  'Design',
  'Photography',
  'Music',
  'Gaming',
  'Books',
  'Travel',
  'Sports',
  'Movies',
  'Art',
  'Robotics',
  'Startups',
  'Web Development',
  'Data Science',
  'Mathematics',
  'Languages',
];

// Pre-compute lowercase set for O(1) lookup
const LOWERCASE_PROFESSIONS_SET = new Set<string>(
  RECOGNIZED_PROFESSIONS.map((p) => p.toLowerCase().trim())
);

/**
 * Filter and search for recognized professions matching user input query.
 * Used for instant autocomplete suggestions.
 */
export function searchProfessions(query: string, limit = 8): string[] {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 1) return [];

  const exactPrefixMatches: string[] = [];
  const wordPrefixMatches: string[] = [];
  const substringMatches: string[] = [];

  for (const prof of RECOGNIZED_PROFESSIONS) {
    const profLower = prof.toLowerCase();

    if (profLower.startsWith(clean)) {
      exactPrefixMatches.push(prof);
    } else if (profLower.split(/\s+/).some((w) => w.startsWith(clean))) {
      wordPrefixMatches.push(prof);
    } else if (profLower.includes(clean)) {
      substringMatches.push(prof);
    }

    if (exactPrefixMatches.length >= limit) break;
  }

  const combined = Array.from(
    new Set([...exactPrefixMatches, ...wordPrefixMatches, ...substringMatches])
  );
  return combined.slice(0, limit);
}

/**
 * Checks whether an input text represents a legitimate, recognized profession.
 * Accepts canonical titles, occupational stems with professional modifiers, and recognized roles.
 * Strictly rejects random words, objects, gibberish, pure numbers, and inappropriate text.
 */
export function validateProfession(profession: string): { isValid: boolean; error?: string } {
  if (!profession) {
    return { isValid: false, error: 'Please enter your profession to continue.' };
  }

  const trimmed = profession.trim();
  
  // Empty or whitespace-only
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your profession to continue.' };
  }

  // Length limits
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Profession must be at least 2 characters.' };
  }

  if (trimmed.length > 60) {
    return { isValid: false, error: 'Profession must not exceed 60 characters.' };
  }

  // Reject code/HTML tags or special scripting characters
  if (/[<>{}[\]\\`^$|~]/.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid profession without special code symbols.' };
  }

  // Must contain at least 2 letters (supports Latin and international unicode alphabets)
  const lettersCount = (trimmed.match(/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF]/g) || []).length;
  if (lettersCount < 2) {
    return { isValid: false, error: 'Please enter a valid profession.' };
  }

  // Anti-spam: check for 4+ consecutive identical characters (e.g. "aaaaa", ".....")
  if (/(.)\1{3,}/i.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid profession.' };
  }

  const lower = trimmed.toLowerCase();

  // Anti-mash: check for common keyboard mashing sequences
  const keyboardMashes = [
    'asdfgh', 'sdfghj', 'dfghjk', 'fghjkl',
    'qwerty', 'wertyu', 'ertyui', 'rtyuio', 'tyuiop',
    'zxcvbn', 'xcvbnm',
    'qazwsx', 'wsxedc', 'edcrfv',
    '12345', '23456', '34567', '45678', '56789',
  ];
  for (const mash of keyboardMashes) {
    if (lower.includes(mash)) {
      return { isValid: false, error: 'Please enter a valid profession.' };
    }
  }

  // Disallowed inappropriate, adult, sexual, dating, social media, and abusive patterns
  const disallowedPatterns: RegExp[] = [
    // Sexual / adult / dating / solicitation terms (18+)
    /\b(sex|sexy|porn|porno|pornography|nude|nudes|escort|camgirl|camboy|sugar\s*baby|sugar\s*daddy|onlyfans|stripper|hooker|prostitute|fetish|erotic|nsfw|dating|single|singles|horny|milf|fap|dildo|pimp|playboy|playgirl|gigolo|brothel|hookup|tinder|bumble|grindr)\b/i,
    // Social media names, usernames, and handles
    /\b(insta|instagram|snap|snapchat|tiktok|onlyfans|telegram|whatsapp|twitter|facebook|discord|reddit|hmu|dm\s*me|follow\s*me)\b/i,
    /@|http:\/\//i,
    // Explicit body parts / slurs / abusive / hate speech
    /\b(nigg(er|a|az)?|fagg(ot)?|kike|chink|gook|wetback|spic|tranny|cunt|whore|slut|dick|cock|pussy|tits|penis|vagina|asshole|bitch|bastard|retard|nazi|hitler|kkk|white\s*supremacist)\b/i,
    // Criminal / violence / threat terms
    /\b(terrorist|hitman|murderer|killer|assassin|cartel|drug\s*dealer|scammer|doxx|pedophile|pedo)\b/i,
    // Common pronouns and non-profession geopolitical words
    /^(we|she|he|they|them|him|her|you|your|me|my|us|our|isreal|israel|palestine)$/i,
  ];

  for (const pattern of disallowedPatterns) {
    if (pattern.test(lower)) {
      return { isValid: false, error: 'Only legitimate professional occupations are allowed. 18+, abusive, social media, and non-profession terms are strictly blocked.' };
    }
  }

  // Conversational chatter, greetings, dating/chat seeking phrases, and casual filler
  const conversationalPattern = /\b(hello|hey|hi|good\s+morning|good\s+night|how\s+are\s+you|what's\s+up|sup|wanna\s+talk|chat\s+with|looking\s+for|want\s+to|wants\s+to|i\s+am|i'm|my\s+name|who\s+are\s+you|call\s+me|text\s+me|bored|lonely|anyone\s+here|just\s+looking|dating|friendship|meet\s+me|hit\s+me\s+up|please\s+help|what\s+is\s+this|tell\s+me|just\s+chilling|talk\s+to\s+me)\b/i;
  if (conversationalPattern.test(lower)) {
    return {
      isValid: false,
      error: 'Irrelevant text. Please enter a genuine profession or occupation, not conversational phrases.',
    };
  }

  // 1. Direct match in recognized professions set (canonical titles & common variations)
  const normalizedText = lower.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (
    LOWERCASE_PROFESSIONS_SET.has(lower) ||
    LOWERCASE_PROFESSIONS_SET.has(trimmed.toLowerCase()) ||
    LOWERCASE_PROFESSIONS_SET.has(normalizedText)
  ) {
    return { isValid: true };
  }

  // 2. Multi-discipline or compound profession support (e.g. "Software Engineering & AI", "Data Science and Machine Learning")
  if (/(\s+(&|and|\+|\/)\s+)/i.test(trimmed)) {
    const segments = trimmed.split(/(\s+(&|and|\+|\/)\s+)/i).filter((s) => s.trim().length > 1 && !/^[&+/]|and$/i.test(s.trim()));
    if (segments.length >= 2) {
      const anySegmentRecognized = segments.some((seg) => {
        const segLower = seg.toLowerCase().trim();
        const segNorm = segLower.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (LOWERCASE_PROFESSIONS_SET.has(segLower) || LOWERCASE_PROFESSIONS_SET.has(segNorm)) return true;
        const segWords = segNorm.split(/[\s-]+/);
        return segWords.some((w) => OCCUPATIONAL_STEMS.has(w));
      });
      if (anySegmentRecognized) {
        return { isValid: true };
      }
    }
  }

  // 3. Tokenize words for semantic stem & structure analysis
  const words = normalizedText.split(/[\s-]+/).filter((w) => w.length > 0);

  // Profession titles typically range between 1 and 5 words
  if (words.length > 5) {
    return {
      isValid: false,
      error: 'Irrelevant text. Please enter a concise profession title (e.g. Software Engineer, AI Researcher, UI/UX Designer).',
    };
  }

  // If every word in the input is an everyday non-profession noun/object/fruit/color, reject it immediately
  const allNonProfWords = words.length > 0 && words.every((w) => NON_PROFESSION_WORDS.has(w));
  if (allNonProfWords) {
    return {
      isValid: false,
      error: 'Irrelevant text. Please enter a genuine profession or occupation (e.g. Software Engineer, AI Researcher, UI/UX Designer).',
    };
  }

  // 4. Check for core occupational stem match in tokens or phrase
  let hasOccupationalStem = false;

  // Direct word match against stem dictionary
  for (const w of words) {
    if (OCCUPATIONAL_STEMS.has(w)) {
      hasOccupationalStem = true;
      break;
    }
  }

  // Multi-word stem search (e.g. "scrum master", "flight attendant", "product owner", "social worker")
  if (!hasOccupationalStem) {
    for (const stem of OCCUPATIONAL_STEMS) {
      if (stem.includes(' ') && normalizedText.includes(stem)) {
        hasOccupationalStem = true;
        break;
      }
    }
  }

  // Also check if any word ends with standard occupational agent suffixes:
  // -ist, -er, -or, -ian, -ent (e.g., geneticist, curator, statistician, developer, resident)
  if (!hasOccupationalStem) {
    const professionalSuffixes = [/^[a-z]{3,}(ist|ologist|ician|iatrician|iatrist|grapher|urgen)$/i];
    for (const w of words) {
      if (professionalSuffixes.some((rx) => rx.test(w)) && !NON_PROFESSION_WORDS.has(w)) {
        hasOccupationalStem = true;
        break;
      }
    }
  }

  // If no occupational stem or recognized profession structure is found, reject as irrelevant text
  if (!hasOccupationalStem) {
    return {
      isValid: false,
      error: 'Irrelevant text. Please enter a genuine profession or occupation (e.g. Software Engineer, AI Researcher, UI/UX Designer).',
    };
  }

  return { isValid: true };
}

/**
 * Validates a target interest or stack tag.
 * Blocks 18+ adult terms, abusive words, social media handles, and non-topic spam.
 */
export function validateTargetInterest(tag: string): { isValid: boolean; error?: string } {
  if (!tag || tag.trim().length < 2) {
    return { isValid: false, error: 'Interest tag must be at least 2 characters.' };
  }
  const clean = tag.trim().toLowerCase();
  if (clean.length > 35) {
    return { isValid: false, error: 'Interest tag must not exceed 35 characters.' };
  }

  // Social media handles, usernames, and domains
  if (/@|http|\.com|\.net|\.org|\.io|\.gg/i.test(clean) || /\b(insta|instagram|snap|snapchat|tiktok|onlyfans|telegram|whatsapp|twitter|facebook|discord|hmu|dm\s*me)\b/i.test(clean)) {
    return { isValid: false, error: 'Social media handles, usernames, and external links are strictly blocked.' };
  }

  // 18+, adult, dating, and solicitation terms
  if (/\b(18\+|nsfw|sex|sexy|porn|porno|nude|nudes|escort|dating|single|singles|horny|milf|fap|dildo|hooker|prostitute|fetish|erotic|hookup|tinder|bumble|grindr)\b/i.test(clean)) {
    return { isValid: false, error: '18+, dating, and adult terms are not permitted.' };
  }

  // Abusive terms, slurs, profanity, and harassment
  if (/\b(cunt|whore|slut|dick|cock|pussy|tits|penis|vagina|asshole|bitch|bastard|retard|nazi|hitler|nigg|fagg)\b/i.test(clean)) {
    return { isValid: false, error: 'Abusive words and hate speech are strictly prohibited.' };
  }

  // Geopolitical non-interest slogans or non-topic terms
  if (/^(isreal|israel|palestine|we|she|he|they|them|him|her)$/i.test(clean)) {
    return { isValid: false, error: 'Please enter academic, technical, or creative domain interests only.' };
  }

  return { isValid: true };
}

export const REPORT_CATEGORIES = [
  { id: 'hate_speech', label: 'Hate speech', description: 'Discrimination or slurs targeting race, religion, gender, or orientation' },
  { id: 'harassment', label: 'Harassment & Bullying', description: 'Persistent unwanted insults, humiliation, or abusive behavior' },
  { id: 'threats', label: 'Threats or Violence', description: 'Statements intending physical injury, harm, or doxxing' },
  { id: 'nudity_sexual', label: 'Nudity / Sexual Solicitation', description: 'Explicit sexual messages or demands for explicit media' },
  { id: 'spam_scam', label: 'Spam or Scam', description: 'Commercial solicitations, phishing, or financial schemes' },
  { id: 'other', label: 'Other violation', description: 'Other behavior disrupting safe conversation' },
];

export const COMMUNITY_RULES_CONTENT = [
  {
    title: '1. No Harassment, Slurs, or Hate Speech',
    description: 'We do not tolerate racism, misogyny, homophobia, transphobia, religious bigotry, or targeted abuse.',
  },
  {
    title: '2. No Sexual Solicitation or Explicit Text',
    description: 'Ologle is an interest and knowledge exchange platform. Solicitation of sexual content or explicit propositioning is strictly prohibited and blocked.',
  },
  {
    title: '3. No Threats, Doxxing, or Harm',
    description: 'Never threaten someone or demand their real-world personally identifiable information (phone numbers, full names, home addresses).',
  },
  {
    title: '4. No Commercial Spam or Financial Scams',
    description: 'Crypto schemes, work-from-home promotions, bot spam, and repetitive advertising links are prohibited.',
  },
  {
    title: '5. Mutual Respect and Thoughtful Discourse',
    description: 'Disagree intellectually without demeaning. Skip or end the conversation if you and your partner have incompatible conversation styles.',
  },
];

export const PRIVACY_HIGHLIGHTS = [
  {
    title: 'Zero Account System',
    description: 'No usernames, passwords, phone numbers, or emails. You are purely ephemeral.',
  },
  {
    title: 'No Message History Kept',
    description: 'Messages are relayed across active sockets and evaluated in memory. When you leave, the chat vanishes completely.',
  },
  {
    title: 'Strictly Ephemeral Video & Text',
    description: 'Direct P2P WebRTC connection with no video/audio recordings and zero chat logs stored on disk.',
  },
  {
    title: 'Server-Authoritative Ephemeral Moderation',
    description: 'Safety filters evaluate messages in memory before relay, keeping bad actors out while preserving total data privacy.',
  },
];

export const HAYLOO_PROFESSIONS = [
  { id: 'software-development', slug: 'software-development', name: 'Software Development', desc: 'Full-stack, systems architecture, mobile, and distributed engineering.', tag: 'ENG' },
  { id: 'data-ai', slug: 'data-ai', name: 'Data & Artificial Intelligence', desc: 'Machine learning, computer vision, deep learning, and analytics.', tag: 'AI' },
  { id: 'design-creative', slug: 'design-creative', name: 'Design & Creative', desc: 'Product design, UX research, brand identity, and design systems.', tag: 'DES' },
  { id: 'business-entrepreneurship', slug: 'business-entrepreneurship', name: 'Business & Entrepreneurship', desc: 'Founders, venture strategy, operations, and company building.', tag: 'BIZ' },
  { id: 'product-management', slug: 'product-management', name: 'Product Management', desc: 'Roadmapping, user discovery, product strategy, and execution.', tag: 'PM' },
  { id: 'marketing-sales', slug: 'marketing-sales', name: 'Marketing & Sales', desc: 'Growth strategy, positioning, enterprise outbound, and GTM.', tag: 'GTM' },
  { id: 'science-research', slug: 'science-research', name: 'Science & Research', desc: 'Academic research, laboratory methods, and applied R&D.', tag: 'SCI' },
  { id: 'education-academia', slug: 'education-academia', name: 'Education & Academia', desc: 'Higher education, curriculum design, and knowledge sharing.', tag: 'EDU' },
  { id: 'healthcare', slug: 'healthcare', name: 'Healthcare', desc: 'Clinical systems, digital health innovation, and medical practice.', tag: 'MED' },
  { id: 'finance', slug: 'finance', name: 'Finance', desc: 'Corporate finance, capital markets, fintech, and quantitative analysis.', tag: 'FIN' },
  { id: 'engineering', slug: 'engineering', name: 'Engineering', desc: 'Electrical, mechanical, robotics, civil, and hardware systems.', tag: 'HW' },
  { id: 'students-early-career', slug: 'students-early-career', name: 'Students & Early-Career', desc: 'University projects, career transitions, internships, and mentorship.', tag: 'STU' },
];
export const OLOGLE_PROFESSIONS = HAYLOO_PROFESSIONS;

export const HAYLOO_PURPOSES = [
  { id: 'EXCHANGE_IDEAS', value: 'EXCHANGE_IDEAS', label: 'Exchange Industry Ideas' },
  { id: 'MEET_PEER', value: 'MEET_PEER', label: 'Meet a Peer' },
  { id: 'FIND_MENTOR', value: 'FIND_MENTOR', label: 'Find a Mentor' },
  { id: 'SHARE_EXPERTISE', value: 'SHARE_EXPERTISE', label: 'Share My Expertise' },
  { id: 'DISCUSS_PROJECT', value: 'DISCUSS_PROJECT', label: 'Discuss a Project' },
  { id: 'COLLABORATE_BUILD', value: 'COLLABORATE_BUILD', label: 'Collaborate & Build' },
  { id: 'EXPLORE_CAREER', value: 'EXPLORE_CAREER', label: 'Explore Career Options' },
  { id: 'LEARN', value: 'LEARN', label: 'Learn from Someone' },
  { id: 'MOCK_INTERVIEW', value: 'MOCK_INTERVIEW', label: 'Mock Interview & Prep' },
  { id: 'CODE_DEBUG', value: 'CODE_DEBUG', label: 'Code Review & Technical Chat' },
  { id: 'DESIGN_FEEDBACK', value: 'DESIGN_FEEDBACK', label: 'Design & Creative Feedback' },
  { id: 'STARTUP_PITCH', value: 'STARTUP_PITCH', label: 'Startup Pitch & Brainstorming' },
  { id: 'CASUAL_CHAT', value: 'CASUAL_CHAT', label: 'Casual Professional Coffee Chat' },
  { id: 'LANGUAGE_EXCHANGE', value: 'LANGUAGE_EXCHANGE', label: 'Language & Culture Exchange' },
  { id: 'SPONTANEOUS', value: 'SPONTANEOUS', label: 'Surprise Me (Spontaneous)' },
];
export const OLOGLE_PURPOSES = HAYLOO_PURPOSES;

export const STARTER_PROMPTS = [
  "What are you currently building or working on?",
  "What skill or technology are you focusing on learning right now?",
  "What is one thing you wish you had known earlier in your career?",
  "What is changing fastest in your industry this year?",
  "Can you recommend a book, tool, or resource that shaped your work?"
];

export const CANDIDATE_POOL: CandidatePeer[] = [
  {
    id: 'peer-sophia',
    displayName: 'Sophia Al-Mansoor',
    headline: 'SaaS Founder & Product Lead',
    professionId: 'business-entrepreneurship',
    professionName: 'Startup Founder',
    experience: 'Founder & Product Lead',
    languages: ['English', 'Arabic'],
    purpose: 'EXCHANGE_IDEAS',
    skills: ['SaaS', 'Startups', 'ProductStrategy'],
    bio: 'Building SaaS platforms, user-centered product discovery, and early stage scaling.',
    countryCode: 'AE',
    location: 'Dubai',
    avatarUrl: '/ai-portraits/hero_sofia_v2.jpg',
    matchScore: 96,
    starterMessage: 'Hello! Always great meeting fellow builders. What stage is your current project in?',
  },
  {
    id: 'peer-1',
    displayName: 'Elena Rostova',
    headline: 'Staff Systems Architect',
    professionId: 'software-development',
    professionName: 'Software Development',
    experience: 'Senior',
    languages: ['English'],
    purpose: 'EXCHANGE_IDEAS',
    skills: ['Distributed Systems', 'TypeScript', 'Next.js', 'PostgreSQL'],
    bio: 'Building resilient real-time infrastructure and mentoring engineers transitioning into architecture.',
    countryCode: 'DE',
    location: 'Berlin',
    avatarUrl: '/ai-portraits/hero_priya_v1.jpg',
    matchScore: 94,
    starterMessage: 'Hey there! Working on high-throughput microservices architecture lately. How about you?',
  },
  {
    id: 'peer-2',
    displayName: 'Tariq Mahmood',
    headline: 'Principal ML & Computer Vision Engineer',
    professionId: 'data-ai',
    professionName: 'Data & Artificial Intelligence',
    experience: 'Expert',
    languages: ['English', 'Urdu'],
    purpose: 'SHARE_EXPERTISE',
    skills: ['Computer Vision', 'PyTorch', 'YOLOv8', 'Edge Deployment'],
    bio: 'Focused on real-time video inference pipelines and applied deep learning.',
    countryCode: 'AE',
    location: 'Abu Dhabi',
    avatarUrl: '/ai-portraits/hero_tariq_datascience.jpg',
    matchScore: 91,
    starterMessage: 'Salam! Exciting to connect. Are you experimenting with any local AI models or edge pipelines?',
  },
  {
    id: 'peer-3',
    displayName: 'Claire Vance',
    headline: 'Founding Product Designer',
    professionId: 'design-creative',
    professionName: 'Design & Creative',
    experience: 'Founder or Executive',
    languages: ['English'],
    purpose: 'DISCUSS_PROJECT',
    skills: ['Design Systems', 'Brand Identity', 'UX Research', 'Prototyping'],
    bio: 'Obsessed with typography-first interfaces, dark mode ergonomics, and zero-fluff product workflows.',
    countryCode: 'US',
    location: 'San Francisco',
    avatarUrl: '/ai-portraits/hero_chloe_creative.jpg',
    matchScore: 89,
    starterMessage: 'Hi! Love chatting about clean UX, subtle motion design, and delightful user experiences.',
  }
];
