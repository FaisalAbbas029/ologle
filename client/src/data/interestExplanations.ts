/**
 * Interest Match Explanations & Conversation Starters
 * Provides why specific interests are matched in Hayloo's matchmaking engine.
 */

export interface InterestExplanation {
  interest: string;
  category: string;
  matchReason: string;
  scoringWeight: string;
  icebreaker: string;
  tags: string[];
}

export const KNOWN_INTEREST_METADATA: Record<string, { category: string; matchReason: string; icebreaker: string; tags: string[] }> = {
  'ai': {
    category: 'Technology & AI',
    matchReason: 'Both participants selected AI / Machine Learning in their active search criteria.',
    icebreaker: 'What AI tools or models have you been experimenting with lately?',
    tags: ['Machine Learning', 'LLMs', 'Deep Learning'],
  },
  'artificial intelligence': {
    category: 'Technology & AI',
    matchReason: 'Both participants selected AI / Machine Learning in their active search criteria.',
    icebreaker: 'What AI tools or models have you been experimenting with lately?',
    tags: ['Machine Learning', 'LLMs', 'Deep Learning'],
  },
  'programming': {
    category: 'Software Engineering',
    matchReason: 'Direct interest alignment on coding and software engineering.',
    icebreaker: 'What programming languages or frameworks are you currently building with?',
    tags: ['Development', 'Coding', 'Architecture'],
  },
  'web development': {
    category: 'Technology',
    matchReason: 'Matched on frontend, backend, or full-stack web engineering.',
    icebreaker: 'What tech stack do you prefer for building modern web applications?',
    tags: ['Frontend', 'Backend', 'Fullstack'],
  },
  'data science': {
    category: 'STEM & Analytics',
    matchReason: 'Direct affinity for data analysis, analytics, statistics, and modeling.',
    icebreaker: 'What interesting data sets or analytics problems have you worked on recently?',
    tags: ['Analytics', 'Statistics', 'Visualization'],
  },
  'startups': {
    category: 'Business & Innovation',
    matchReason: 'Both users share an entrepreneurial focus on building and scaling new ventures.',
    icebreaker: 'What exciting startup ideas or market trends have caught your attention?',
    tags: ['Entrepreneurship', 'Venture', 'Product'],
  },
  'business': {
    category: 'Business & Innovation',
    matchReason: 'Mutual interest in commerce, strategy, market dynamics, and leadership.',
    icebreaker: 'What industry developments or business strategies are you following right now?',
    tags: ['Strategy', 'Leadership', 'Finance'],
  },
  'design': {
    category: 'Creative & Arts',
    matchReason: 'Both users value visual aesthetics, user experience, and product craft.',
    icebreaker: 'What design philosophy or interface pattern inspires your work most?',
    tags: ['UI/UX', 'Product Design', 'Visual Arts'],
  },
  'science': {
    category: 'STEM',
    matchReason: 'Mutual curiosity in scientific research, empirical discoveries, and the natural world.',
    icebreaker: 'What recent scientific discovery or hypothesis has intrigued you most?',
    tags: ['Physics', 'Biology', 'Research'],
  },
  'mathematics': {
    category: 'STEM',
    matchReason: 'Mutual affinity for mathematical foundations, logic, and problem-solving.',
    icebreaker: 'What area of mathematics do you find most elegant or engaging?',
    tags: ['Logic', 'Calculus', 'Abstract Algebra'],
  },
  'music': {
    category: 'Creative & Culture',
    matchReason: 'Shared passion for musical genres, composition, performance, or production.',
    icebreaker: 'What music artists or genres have been on heavy rotation for you lately?',
    tags: ['Audio', 'Instruments', 'Production'],
  },
  'movies': {
    category: 'Media & Arts',
    matchReason: 'Shared interest in cinema, storytelling, directing, and screenwriting.',
    icebreaker: 'What is a movie or series you recently watched that left a lasting impression?',
    tags: ['Cinema', 'Storytelling', 'Film'],
  },
  'books': {
    category: 'Literature & Learning',
    matchReason: 'Mutual passion for reading, literature, non-fiction, or creative writing.',
    icebreaker: 'What book has had the biggest impact on your thinking or worldview?',
    tags: ['Reading', 'Literature', 'Writing'],
  },
  'gaming': {
    category: 'Entertainment & Tech',
    matchReason: 'Shared interest in video games, interactive mechanics, and game development.',
    icebreaker: 'What games or platforms are you currently spending time on?',
    tags: ['Interactive Media', 'Game Dev', 'Esports'],
  },
  'languages': {
    category: 'Linguistics & Culture',
    matchReason: 'Mutual passion for polyglot learning, cross-cultural communication, and linguistics.',
    icebreaker: 'What languages are you currently learning or fluent in?',
    tags: ['Polyglot', 'Linguistics', 'Culture'],
  },
  'travel': {
    category: 'Lifestyle & Exploration',
    matchReason: 'Shared enthusiasm for exploring new places, cultures, and adventures.',
    icebreaker: 'What is the most memorable place you have visited, or where do you want to go next?',
    tags: ['Exploration', 'Culture', 'Geography'],
  },
  'philosophy': {
    category: 'Humanities & Ideas',
    matchReason: 'Mutual interest in epistemology, ethics, philosophy of mind, and existential inquiry.',
    icebreaker: 'What philosophical question or concept has been on your mind recently?',
    tags: ['Ethics', 'Epistemology', 'Critical Thinking'],
  },
  'history': {
    category: 'Humanities',
    matchReason: 'Mutual fascination with historical eras, civilizations, and historical context.',
    icebreaker: 'What historical era or civilization do you find most interesting to study?',
    tags: ['Civilizations', 'World History', 'Archival'],
  },
  'sports': {
    category: 'Athletics & Fitness',
    matchReason: 'Shared engagement in athletics, training, competition, or team sports.',
    icebreaker: 'What sports or fitness activities do you actively play or follow?',
    tags: ['Fitness', 'Competition', 'Health'],
  },
  'education': {
    category: 'Learning & Growth',
    matchReason: 'Mutual interest in pedagogy, knowledge sharing, and lifelong education.',
    icebreaker: 'What is a skill or subject you are currently in the process of learning?',
    tags: ['Pedagogy', 'Teaching', 'Self-Development'],
  },
};

/**
 * Get formatted explanation and conversation starter for any interest badge
 */
export function getInterestExplanation(interestName: string): InterestExplanation {
  const clean = interestName.trim().toLowerCase();
  const known = KNOWN_INTEREST_METADATA[clean];

  if (known) {
    return {
      interest: interestName,
      category: known.category,
      matchReason: known.matchReason,
      scoringWeight: '+40 Exact Match Bonus (+15 Multi-Interest Boost)',
      icebreaker: known.icebreaker,
      tags: known.tags,
    };
  }

  // Smart fallback for custom or unlisted interests
  const capitalized = interestName.charAt(0).toUpperCase() + interestName.slice(1);
  return {
    interest: capitalized,
    category: 'Shared Topic',
    matchReason: `Both you and your partner specifically added "${capitalized}" to your interest search filters.`,
    scoringWeight: '+40 Matchmaking Priority (+15 Synergistic Bonus)',
    icebreaker: `What initially sparked your interest in ${capitalized}?`,
    tags: ['Direct Match', 'Mutual Filter'],
  };
}
