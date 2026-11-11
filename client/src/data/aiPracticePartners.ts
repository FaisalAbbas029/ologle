export interface AIPracticePartner {
  id: string;
  name: string;
  initials: string;
  avatar: string;
  profession: string;
  bio: string;
  interests: string[];
  style: string;
  country: string;
  accentColor: string;
}

export const AI_PRACTICE_PARTNERS: AIPracticePartner[] = [
  {
    id: 'maya-chen',
    name: 'Maya Chen',
    initials: 'MC',
    avatar: '/ai-portraits/hero_mia_v1.jpg',
    profession: 'Product Designer',
    bio: 'Product designer focused on design systems, accessible UI, and intuitive interaction architecture.',
    interests: ['Product Design', 'Design Systems', 'Accessibility', 'Creative Technology'],
    style: 'Warm, thoughtful, and analytical; loves discussing UX trade-offs.',
    country: 'US',
    accentColor: 'from-orange-500 to-amber-500',
  },
  {
    id: 'leo-martins',
    name: 'Leo Martins',
    initials: 'LM',
    avatar: '/ai-portraits/hero_marcus_v1.jpg',
    profession: 'Software Engineer',
    bio: 'Distributed systems and backend engineer who enjoys comparing architecture trade-offs and dev tools.',
    interests: ['Distributed Systems', 'TypeScript', 'Rust', 'Web Development'],
    style: 'Practical and concise; brings real-world engineering perspectives.',
    country: 'BR',
    accentColor: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'amina-yusuf',
    name: 'Amina Yusuf',
    initials: 'AY',
    avatar: '/ai-portraits/hero_amina_cyber.jpg',
    profession: 'Cybersecurity Specialist',
    bio: 'Security architect passionate about zero-trust infrastructure, WebRTC encryption, and defense.',
    interests: ['Cybersecurity', 'Zero Trust', 'Cloud Architecture', 'Privacy'],
    style: 'Insightful and direct; explores security resilience and systems safety.',
    country: 'GB',
    accentColor: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'priya-patel',
    name: 'Priya Patel',
    initials: 'PP',
    avatar: '/ai-portraits/hero_priya_v1.jpg',
    profession: 'Full-Stack Developer',
    bio: 'Frontend enthusiast and full-stack engineer building fast, responsive web applications.',
    interests: ['Web Development', 'React', 'TypeScript', 'Performance'],
    style: 'Friendly and upbeat; loves sharing modern coding patterns.',
    country: 'IN',
    accentColor: 'from-purple-500 to-pink-500',
  },
  {
    id: 'mateo-rossi',
    name: 'Mateo Rossi',
    initials: 'MR',
    avatar: '/ai-portraits/hero_mateo_robotics.jpg',
    profession: 'Robotics Engineer',
    bio: 'Robotics and embedded systems builder exploring autonomous navigation and sensor fusion.',
    interests: ['Robotics', 'Embedded Systems', 'Hardware', 'IoT'],
    style: 'Curious and hands-on; fascinated by bridging software and physical mechanisms.',
    country: 'IT',
    accentColor: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'tariq-mansour',
    name: 'Tariq Mansour',
    initials: 'TM',
    avatar: '/ai-portraits/hero_tariq_datascience.jpg',
    profession: 'Data Scientist',
    bio: 'Machine learning practitioner exploring generative models, data storytelling, and analytics.',
    interests: ['Artificial Intelligence', 'Data Science', 'Machine Learning', 'Python'],
    style: 'Encouraging and analytical; loves breaking down complex data concepts.',
    country: 'AE',
    accentColor: 'from-rose-500 to-orange-500',
  },
  {
    id: 'chloe-vance',
    name: 'Chloe Vance',
    initials: 'CV',
    avatar: '/ai-portraits/hero_chloe_creative.jpg',
    profession: 'Creative Technologist',
    bio: 'Generative artist and 3D web developer mixing shaders, audio visualization, and interactive design.',
    interests: ['Creative Technology', 'Design', 'WebGL', 'UI/UX Design'],
    style: 'Expressive and visionary; loves discussing experimental media.',
    country: 'CA',
    accentColor: 'from-fuchsia-500 to-purple-500',
  },
  {
    id: 'zainab-al-hassan',
    name: 'Zainab Al-Hassan',
    initials: 'ZA',
    avatar: '/ai-portraits/hero_zainab_quantum.jpg',
    profession: 'AI Researcher',
    bio: 'Research scientist investigating transformer architectures, neural attention, and computing.',
    interests: ['Artificial Intelligence', 'AI Research', 'Mathematics', 'Science'],
    style: 'Methodical and deep; enjoys discussing paper breakthroughs.',
    country: 'DE',
    accentColor: 'from-violet-500 to-indigo-500',
  },
];

export function chooseAIPracticePartner(
  userProfession?: string,
  userInterests?: string[]
): AIPracticePartner {
  if (!userProfession && (!userInterests || userInterests.length === 0)) {
    return AI_PRACTICE_PARTNERS[Math.floor(Math.random() * AI_PRACTICE_PARTNERS.length)];
  }

  const profNorm = (userProfession || '').toLowerCase();
  const interestsNorm = (userInterests || []).map((i) => i.toLowerCase());

  // Score partners by profession match and shared interests
  let bestScore = -1;
  let bestPartner = AI_PRACTICE_PARTNERS[0];

  for (const partner of AI_PRACTICE_PARTNERS) {
    let score = 0;
    if (profNorm && partner.profession.toLowerCase().includes(profNorm)) {
      score += 10;
    }
    for (const interest of partner.interests) {
      if (interestsNorm.some((ui) => ui.includes(interest.toLowerCase()) || interest.toLowerCase().includes(ui))) {
        score += 5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestPartner = partner;
    }
  }

  return bestPartner;
}
