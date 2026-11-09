export type AppView =
  | 'landing'
  | 'onboarding'
  | 'dashboard'
  | 'match'
  | 'conversation'
  | 'voice_session'
  | 'profile'
  | 'settings'
  | 'admin'
  | 'history'
  | 'messages'
  | 'profession_select'
  | 'interest_select'
  | 'mode_select'
  | 'matching'
  | '1on1_chat'
  | 'privacy_info'
  | 'community_rules'
  | 'privacy_page'
  | 'terms_page'
  | 'not_found'
  | 'no_match'
  | 'connection_lost'
  | 'restriction';

export interface HaylooProfession {
  id: string;
  slug: string;
  name: string;
  desc: string;
  tag: string;
}
export type OlogleProfession = HaylooProfession;

export interface HaylooPurpose {
  id: string;
  value: string;
  label: string;
}
export type OloglePurpose = HaylooPurpose;

export interface ModerationReportItem {
  id: string;
  reporter: string;
  target: string;
  targetId?: string;
  category: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'ACTION_TAKEN' | 'DISMISSED';
  time: string;
}

export interface SavedConnectionItem {
  id: string;
  name: string;
  role: string;
  topic: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'self' | 'peer' | 'system';
  senderSessionId?: string;
  isHost?: boolean;
  timestamp: number;
  blocked?: boolean;
  translatedText?: string;
  detectedLanguage?: string;
  detectedLanguageName?: string;
  targetLanguage?: string;
  isTranslating?: boolean;
  translationError?: boolean;
  isRead?: boolean;
  readAt?: number;
}

export interface LiveSubtitleCaption {
  id: string;
  speaker: 'self' | 'partner';
  originalText: string;
  sourceLanguage: string;
  translatedText?: string;
  targetLanguage?: string;
  isFinal: boolean;
  timestamp: number;
}

export interface ClassQuestionItem {
  id: string;
  askerSessionId: string;
  question: string;
  timestamp: number;
  answer?: string;
  answeredAt?: number;
}

export interface ScoreBreakdown {
  sharedInterests: string[];
  sharedTopics: string[];
  professionBonus: boolean;
  countryBonus: boolean;
  totalScore: number;
}

export interface Active1on1Room {
  roomId: string;
  sharedInterests: string[];
  sharedTopics: string[];
  score: number;
  partnerProfession?: string;
  partnerCountry?: string;
  partnerVisitorId?: string;
  scoreBreakdown?: ScoreBreakdown;
  breakdown?: ScoreBreakdown;
}

export interface ActiveCommunityRoom {
  id: string;
  name: string;
  topic: string;
  category: string;
  participantCount: number;
  maxParticipants: number;
}

export interface ActiveClassRoom {
  id: string;
  name: string;
  topic: string;
  isHost: boolean;
  participantCount: number;
  questions: ClassQuestionItem[];
}

export interface SafetyToast {
  id: string;
  type: 'warning' | 'blocked' | 'info';
  message: string;
  timestamp: number;
}

export interface RestrictionState {
  restrictedUntil: number;
  reason: string;
}

export interface CommunityExploreItem {
  id: string;
  name: string;
  topic: string;
  category: string;
  count: number;
  max: number;
}

export interface ClassExploreItem {
  id: string;
  name: string;
  topic: string;
  count: number;
}

// Client -> Server Action Messages
export type ClientMessage =
  | { type: 'REGISTER_SESSION'; visitorId?: string; blockedStrangers?: string[]; profession?: string; interests?: string[] }
  | { type: 'START_MATCHING'; visitorId?: string; blockedStrangers?: string[]; profession: string; interests: string[]; country?: string; sessionMode?: string }
  | { type: 'CANCEL_MATCHING' }
  | { type: 'NEXT_PERSON' }
  | { type: 'END_CONVERSATION' }
  | { type: 'SEND_1ON1_MESSAGE'; text: string }
  | { type: 'PAD_UPDATE'; content: string; language: string }
  | { type: 'TYPING_INDICATOR'; isTyping: boolean }
  | { type: 'JOIN_COMMUNITY'; communityId: string }
  | { type: 'CREATE_COMMUNITY'; name: string; topic: string; category: string }
  | { type: 'LEAVE_COMMUNITY' }
  | { type: 'SEND_COMMUNITY_MESSAGE'; text: string }
  | { type: 'JOIN_CLASS'; classId: string }
  | { type: 'CREATE_CLASS'; name: string; topic: string }
  | { type: 'LEAVE_CLASS' }
  | { type: 'SEND_CLASS_MESSAGE'; text: string }
  | { type: 'SUBMIT_CLASS_QUESTION'; question: string }
  | { type: 'ANSWER_CLASS_QUESTION'; questionId: string; answer: string }
  | { type: 'REPORT_USER'; category: string; details?: string }
  | { type: 'BLOCK_USER' }
  | { type: 'block_partner'; blockerId: string; blockedId: string; reason: string }
  | { type: 'WEBRTC_SIGNAL'; signal: any }
  | { type: 'VOICE_TRANSCRIPT'; text: string; language: string; isFinal: boolean; id?: string; timestamp?: number }
  | { type: 'MESSAGE_READ'; messageId: string }
  | { type: 'GET_EXPLORE_DATA' }
  | { type: 'MOD_SUBSCRIBE' }
  | { type: 'MOD_ACTION'; ticketId: string; action: 'KICK' | 'MUTE' | 'DISMISS' }
  | { type: 'FLAG_LIVE_STREAM'; reason: string; confidence: number };

export interface EphemeralLiveTicket {
  ticketId: string;
  roomId: string;
  sessionHash: string;
  reason: string;
  category: string;
  confidence: number;
  flaggedAt: number;
  expiresAt: number;
  status: 'PENDING_REVIEW' | 'INSPECTING' | 'RESOLVED';
}

// Server -> Client Event Messages
export type ServerMessage =
  | { type: 'SESSION_REGISTERED'; sessionId: string }
  | { type: 'MATCHING_STARTED' }
  | { type: 'MATCHING_CANCELED' }
  | {
      type: 'MATCH_FOUND';
      roomId: string;
      sharedInterests: string[];
      sharedTopics: string[];
      score: number;
      partnerProfession?: string;
      partnerCountry?: string;
      partnerVisitorId?: string;
      scoreBreakdown?: ScoreBreakdown;
      breakdown?: ScoreBreakdown;
    }
  | { type: 'PARTNER_LEFT'; reason: 'skipped' | 'ended' | 'disconnected' | 'reported' | 'blocked' }
  | { type: 'WEBRTC_SIGNAL'; signal: any }
  | { type: 'VOICE_TRANSCRIPT'; id: string; text: string; language: string; isFinal: boolean; senderSessionId: string; timestamp: number }
  | { type: 'RECEIVE_1ON1_MESSAGE'; id: string; text: string; sender: 'self' | 'peer'; timestamp: number }
  | { type: 'PAD_UPDATE'; content: string; language: string; senderSessionId: string }
  | { type: 'TYPING_INDICATOR'; isTyping: boolean; senderSessionId: string }
  | { type: 'MESSAGE_READ'; messageId: string; readAt: number }
  | { type: 'MESSAGE_BLOCKED'; reason: string }
  | { type: 'SAFETY_WARNING'; message: string }
  | { type: 'RATE_LIMIT_COOLDOWN'; cooldownSeconds: number; reason: string }
  | { type: 'TEMPORARY_RESTRICTION'; restrictedUntil: number; reason: string }
  | { type: 'COMMUNITY_JOINED'; room: { id: string; name: string; topic: string; category: string; participantCount: number; maxParticipants: number } }
  | { type: 'COMMUNITY_UPDATE'; participantCount: number }
  | { type: 'RECEIVE_COMMUNITY_MESSAGE'; id: string; text: string; senderSessionId: string; isSelf: boolean; timestamp: number }
  | { type: 'CLASS_JOINED'; room: { id: string; name: string; topic: string; isHost: boolean; participantCount: number; questions: ClassQuestionItem[] } }
  | { type: 'CLASS_UPDATE'; participantCount: number; questions: ClassQuestionItem[] }
  | { type: 'RECEIVE_CLASS_MESSAGE'; id: string; text: string; senderSessionId: string; isHost: boolean; isSelf: boolean; timestamp: number }
  | { type: 'EXPLORE_DATA'; communities: Array<{ id: string; name: string; topic: string; category: string; count: number; max: number }>; classes: Array<{ id: string; name: string; topic: string; count: number }> }
  | { type: 'MOD_QUEUE_UPDATE'; tickets: EphemeralLiveTicket[] }
  | { type: 'STREAM_MUTED_BY_MODERATOR'; reason: string }
  | { type: 'ERROR'; message: string };
