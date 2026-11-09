/**
 * Profession-to-Interest Recommendation Engine
 * Dynamically correlates professions, occupational stems, and job titles
 * into curated, engaging conversation topics and interest tags.
 */

export interface ProfessionInterestCluster {
  keywords: string[];
  suggestedInterests: string[];
  tagline: string;
}

export const PROFESSION_INTEREST_CLUSTERS: ProfessionInterestCluster[] = [
  {
    keywords: [
      'software', 'developer', 'engineer', 'programmer', 'coder', 'frontend',
      'backend', 'fullstack', 'full stack', 'web dev', 'devops', 'sre',
      'system', 'kernel', 'embedded', 'cloud', 'security', 'cybersecurity'
    ],
    suggestedInterests: [
      'Artificial Intelligence',
      'Web Development',
      'Distributed Systems',
      'Open Source',
      'Cybersecurity',
      'Cloud Architecture',
      'Algorithms',
      'Linux & Kernel',
      'System Design',
      'DevOps'
    ],
    tagline: 'High-synergy engineering & infrastructure topics',
  },
  {
    keywords: [
      'data scientist', 'data science', 'machine learning', 'ml', 'ai engineer',
      'deep learning', 'statistician', 'data analyst', 'biostatistician', 'nlp'
    ],
    suggestedInterests: [
      'Machine Learning',
      'Deep Learning',
      'Data Science',
      'Neural Networks',
      'Mathematics',
      'Statistics',
      'Robotics',
      'Bioinformatics',
      'Computer Vision',
      'Generative AI'
    ],
    tagline: 'High-synergy data modeling & intelligence topics',
  },
  {
    keywords: [
      'designer', 'ui', 'ux', 'product design', 'graphic', 'visual',
      'illustrator', 'architect', 'typographer', 'animator', '3d artist'
    ],
    suggestedInterests: [
      'UI/UX Design',
      'Design Systems',
      'Typography',
      'Visual Arts',
      'Architecture',
      'Motion Design',
      'Creative Coding',
      '3D Modeling',
      'Industrial Design',
      'Human-Computer Interaction'
    ],
    tagline: 'High-synergy aesthetics, UX & visual culture topics',
  },
  {
    keywords: [
      'doctor', 'physician', 'surgeon', 'nurse', 'medical', 'cardio',
      'neuro', 'dentist', 'pharmacist', 'therapist', 'psychiatrist',
      'psychologist', 'radiologist', 'biomedical'
    ],
    suggestedInterests: [
      'Medical Research',
      'Neuroscience',
      'Biotechnology',
      'Mental Health',
      'Public Health',
      'Immunology',
      'Genetics',
      'Healthcare AI',
      'Bioethics',
      'Longevity & Wellness'
    ],
    tagline: 'High-synergy health sciences & biological research topics',
  },
  {
    keywords: [
      'teacher', 'educator', 'professor', 'lecturer', 'instructor',
      'academic', 'tutor', 'principal', 'dean', 'researcher'
    ],
    suggestedInterests: [
      'Pedagogy & Learning',
      'EdTech',
      'Cognitive Science',
      'Philosophy',
      'Literature & Books',
      'History',
      'Creative Writing',
      'Psychology',
      'Public Speaking',
      'Science Communication'
    ],
    tagline: 'High-synergy academic & pedagogical discourse topics',
  },
  {
    keywords: [
      'student', 'undergraduate', 'graduate student', 'phd candidate',
      'intern', 'fellow', 'scholar', 'apprentice'
    ],
    suggestedInterests: [
      'Computer Science',
      'Philosophy',
      'Physics',
      'Mathematics',
      'Language Learning',
      'Productivity Systems',
      'Literature',
      'Hackathons',
      'Deep Work',
      'Career Growth'
    ],
    tagline: 'High-synergy student & polymath exploration topics',
  },
  {
    keywords: [
      'founder', 'entrepreneur', 'ceo', 'co-founder', 'cto', 'cpo',
      'product manager', 'pm', 'executive', 'director', 'venture'
    ],
    suggestedInterests: [
      'Startups & Venture',
      'Product Strategy',
      'Angel Investing',
      'Macroeconomics',
      'Growth & Scaling',
      'Team Leadership',
      'Bootstrapping',
      'SaaS Business',
      'Future of Work',
      'Tech Policy'
    ],
    tagline: 'High-synergy venture building & product strategy topics',
  },
  {
    keywords: [
      'finance', 'trader', 'investor', 'banker', 'accountant',
      'auditor', 'analyst', 'actuary', 'economist', 'portfolio'
    ],
    suggestedInterests: [
      'Macroeconomics',
      'Stock Markets',
      'Fintech & DeFi',
      'Venture Capital',
      'Quantitative Trading',
      'Cryptocurrency',
      'Real Estate',
      'Monetary Policy',
      'Game Theory',
      'Risk Management'
    ],
    tagline: 'High-synergy financial systems & quantitative markets topics',
  },
  {
    keywords: [
      'writer', 'journalist', 'author', 'editor', 'copywriter',
      'screenwriter', 'poet', 'reporter', 'essayist', 'podcaster'
    ],
    suggestedInterests: [
      'Creative Writing',
      'Journalism',
      'Storytelling',
      'Literature & Books',
      'Media Criticism',
      'Podcasting',
      'Philosophy',
      'Cinematography',
      'Cultural Analysis',
      'Publishing'
    ],
    tagline: 'High-synergy narrative & investigative arts topics',
  },
  {
    keywords: [
      'musician', 'producer', 'audio engineer', 'composer', 'dj',
      'sound designer', 'vocalist', 'guitarist', 'pianist', 'sound'
    ],
    suggestedInterests: [
      'Music Production',
      'Sound Design',
      'Synthesizers & Modular',
      'Acoustics',
      'Audio DSP',
      'Songwriting',
      'Music Theory',
      'Live Performance',
      'Vinyl & Hi-Fi',
      'Film Scoring'
    ],
    tagline: 'High-synergy sonic arts & audio production topics',
  },
  {
    keywords: [
      'physicist', 'chemist', 'biologist', 'astronomer', 'scientist',
      'geologist', 'laboratory', 'environmental'
    ],
    suggestedInterests: [
      'Astrophysics',
      'Quantum Mechanics',
      'Synthetic Biology',
      'Renewable Energy',
      'Space Exploration',
      'Nanotechnology',
      'Climate Science',
      'Complex Systems',
      'Scientific Method',
      'Materials Science'
    ],
    tagline: 'High-synergy empirical science & cosmology topics',
  },
  {
    keywords: [
      'lawyer', 'attorney', 'counsel', 'paralegal', 'judge',
      'legal', 'solicitor', 'barrister', 'advocate'
    ],
    suggestedInterests: [
      'Intellectual Property',
      'Tech Policy & AI Law',
      'Constitutional Law',
      'Digital Privacy Rights',
      'Ethics & Governance',
      'Contract Negotiation',
      'International Law',
      'Civil Rights',
      'Legal Tech',
      'Debate & Rhetoric'
    ],
    tagline: 'High-synergy jurisprudence & digital rights topics',
  },
];

export const POPULAR_UNIVERSAL_TOPICS: string[] = [
  'Artificial Intelligence',
  'Philosophy & Ethics',
  'Books & Literature',
  'Startups & Tech',
  'Science & Universe',
  'Design & Architecture',
  'Travel & Cultures',
  'Psychology',
  'Music & Audio',
  'Gaming & Indie Dev',
  'Languages & Linguistics',
  'Cinema & Film',
];

/**
 * Dynamically extract and rank suggested interests for any typed profession.
 */
export function getSuggestedInterestsForProfession(profession: string): {
  clusterTagline: string;
  suggestedInterests: string[];
} {
  const clean = profession.trim().toLowerCase();
  if (!clean || clean.length < 2) {
    return {
      clusterTagline: 'Curated polymath & discussion topics',
      suggestedInterests: POPULAR_UNIVERSAL_TOPICS.slice(0, 8),
    };
  }

  // Look for exact word matches in clusters
  for (const cluster of PROFESSION_INTEREST_CLUSTERS) {
    const isMatched = cluster.keywords.some((kw) => {
      if (clean.includes(kw)) return true;
      const tokens = clean.split(/[\s-]+/);
      return tokens.some((token) => token === kw || kw.includes(token));
    });

    if (isMatched) {
      return {
        clusterTagline: cluster.tagline,
        suggestedInterests: cluster.suggestedInterests,
      };
    }
  }

  // Default intelligent fallback: universal intellectual curiosity topics
  return {
    clusterTagline: `Suggested discussions for "${profession}"`,
    suggestedInterests: [
      'Artificial Intelligence',
      'Philosophy & Ethics',
      'Future of Work',
      'Science & Technology',
      'Creative Thinking',
      'Books & Non-Fiction',
      'Human Psychology',
      'Global Trends',
    ],
  };
}
