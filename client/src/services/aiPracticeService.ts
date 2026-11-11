import { AIPracticePartner } from '../data/aiPracticePartners.ts';

export interface AIPracticeTurn {
  role: 'user' | 'assistant';
  text: string;
}

function getApiBaseUrl(): string {
  const metaEnv = import.meta.env as Record<string, string | undefined>;
  const configuredApiUrl = metaEnv.VITE_API_URL?.trim();
  if (configuredApiUrl) return configuredApiUrl.replace(/\/+$/, '');

  const websocketUrl = metaEnv.VITE_WEBSOCKET_URL?.trim();
  if (websocketUrl) {
    try {
      const url = new URL(websocketUrl);
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      return url.origin;
    } catch {
      // fallback
    }
  }

  return window.location.origin;
}

const FALLBACK_RESPONSES: Record<string, string[]> = {
  'Product Designer': [
    "That's a really interesting point. In design, finding the balance between flexibility and intuitive constraints is always a fun challenge. How are you approaching user feedback on that?",
    "I love that approach! Design systems often succeed or fail based on how easily other team members can adopt them. What kind of design tools or frameworks do you enjoy most?",
    "Great thought. Accessibility and clarity should always come first. Have you found any particular prototyping pattern especially helpful lately?",
  ],
  'Software Engineer': [
    "That makes total sense from an engineering perspective. When scaling systems like that, keeping latency predictable is always top of mind. What's your preferred stack for this?",
    "Interesting architecture trade-off! Sometimes keeping the data model simpler upfront saves weeks of refactoring later. Are you doing more frontend or backend work currently?",
    "I agree. Clean contracts and strong typing make collaborating across services so much easier. Have you had a chance to work with TypeScript or Rust on that?",
  ],
  'Cybersecurity Specialist': [
    "From a defense-in-depth perspective, that is crucial. Minimizing attack surfaces and enforcing strict zero-trust boundaries prevents a lot of headaches. How do you handle credential isolation?",
    "Spot on. Peer-to-peer protocols and ephemeral signaling are such powerful patterns for user privacy. What are your thoughts on current end-to-end encryption standards?",
  ],
  'default': [
    "That's a fascinating perspective! I really enjoy discussing how different disciplines approach problem solving. What inspired your interest in that area?",
    "Thanks for sharing that! It's always great connecting with someone passionate about their craft. What's the most exciting project you're working on right now?",
    "Totally agree with that idea. It's refreshing to explore practical ways to tackle these questions. What would you like to dive into next?",
  ],
};

function getSmartFallbackReply(partner: AIPracticePartner, userText: string): string {
  const options = FALLBACK_RESPONSES[partner.profession] || FALLBACK_RESPONSES['default'];
  const textHash = (userText || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selected = options[textHash % options.length];
  return selected;
}

export async function getAIPracticeReply(input: {
  partner: AIPracticePartner;
  userProfession?: string;
  userInterests?: string[];
  messages: AIPracticeTurn[];
}): Promise<string> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/ai-practice/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerId: input.partner.id,
        profession: input.userProfession || '',
        interests: input.userInterests || [],
        messages: input.messages.slice(-10),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (typeof data.reply === 'string' && data.reply.trim()) {
        return data.reply.trim();
      }
    }
  } catch (err) {
    console.warn('AI reply backend API call failed, using client fallback:', err);
  }

  // Graceful fallback
  const lastUserMsg = input.messages[input.messages.length - 1]?.text || '';
  return getSmartFallbackReply(input.partner, lastUserMsg);
}

export function generateAIGreeting(partner: AIPracticePartner, userProfession?: string, interests?: string[]): string {
  const greetingProfession = userProfession && userProfession !== 'General'
    ? ` As fellow ${userProfession.toLowerCase()} enthusiasts,`
    : '';
  const interestNote = interests && interests.length > 0
    ? ` I see you're interested in ${interests.slice(0, 2).join(' & ')}.`
    : '';

  return `Hey there! I’m ${partner.name}, an AI practice partner.${greetingProfession}${interestNote} Feel free to chat, practice conversation, or brainstorm ideas with me! What's on your mind today?`;
}
