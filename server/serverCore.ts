/**
 * Hayloo Server Core & WebSocket Protocol Handler
 * Manages in-memory ephemeral state: sessions, 1:1 rooms, communities, and classrooms.
 * No persistent storage or database.
 */

import crypto from 'crypto';
import { WebSocket } from 'ws';
import { defaultSafetyAgent, type SafetyClassificationResult } from './safetyAgent.ts';
import { MatchmakerQueue, calculateCompatibility } from './matchmaker.ts';
import type { QueuedSession, MatchScoreResult } from './matchmaker.ts';
import { validateProfession } from '../client/src/data/constants.ts';
import type { ScoreBreakdown, EphemeralLiveTicket } from '../client/src/types/index.ts';

/**
 * Transient volatile in-memory cache with automated TTL purge.
 * Strictly volatile RAM—zero disk or database writes.
 */
export class TransientVolatileCache<T> {
  private map: Map<string, { value: T; expiresAt: number }> = new Map();

  public set(key: string, value: T, ttlMs: number): void {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  public get(key: string): T | null {
    const item = this.map.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return item.value;
  }

  public delete(key: string): void {
    this.map.delete(key);
  }

  public purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [k, v] of this.map.entries()) {
      if (now > v.expiresAt) {
        this.map.delete(k);
        purged++;
      }
    }
    return purged;
  }
}

export interface EphemeralSession {
  sessionId: string;
  visitorId: string;
  ipAddress: string;
  ws: WebSocket | null;
  profession: string;
  interests: string[];
  sessionMode: 'video' | 'voice' | 'messaging';
  country?: string; // 'GLOBAL' or country code/name
  currentMode: 'none' | 'matching' | '1on1' | 'community' | 'class';
  currentRoomId: string | null;
  pairedSessionId: string | null;
  blockedSessionIds: Set<string>;
  blockedVisitorIds: Set<string>;
  createdAt: number;
  lastActivity: number;
  violationCount: number;
  isMutedUntil: number; // Unix timestamp
  isRestrictedUntil: number; // Unix timestamp
  skipTimestamps: number[];
  messageTimestamps: number[];
}

export interface CommunityRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  category: string;
  maxParticipants: number;
  memberSessionIds: Set<string>;
  isPreset: boolean;
  createdAt: number;
}

export interface ClassQuestion {
  id: string;
  askerSessionId: string;
  question: string;
  timestamp: number;
  answer?: string;
  answeredAt?: number;
}

export interface ClassRoom {
  id: string;
  name: string;
  topic: string;
  hostSessionId: string;
  participantSessionIds: Set<string>;
  questions: ClassQuestion[];
  createdAt: number;
}

// Client -> Server Action Messages
export type ClientMessage =
  | { type: 'REGISTER_SESSION'; visitorId?: string; blockedStrangers?: string[]; profession?: string; interests?: string[] }
  | { type: 'START_MATCHING'; visitorId?: string; blockedStrangers?: string[]; profession: string; interests: string[]; country?: string; sessionMode?: 'video' | 'voice' | 'messaging' }
  | { type: 'CANCEL_MATCHING' }
  | { type: 'NEXT_PERSON' }
  | { type: 'END_CONVERSATION' }
  | { type: 'SEND_1ON1_MESSAGE'; text: string }
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
  | { type: 'PAD_UPDATE'; content: string; language?: string }
  | { type: 'TYPING_INDICATOR'; isTyping: boolean }
  | { type: 'MESSAGE_READ'; messageId: string }
  | { type: 'GET_EXPLORE_DATA' }
  | { type: 'MOD_SUBSCRIBE' }
  | { type: 'MOD_ACTION'; ticketId: string; action: 'KICK' | 'MUTE' | 'DISMISS' }
  | { type: 'FLAG_LIVE_STREAM'; reason: string; confidence: number };

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
  | { type: 'CLASS_JOINED'; room: { id: string; name: string; topic: string; isHost: boolean; participantCount: number; questions: ClassQuestion[] } }
  | { type: 'CLASS_UPDATE'; participantCount: number; questions: ClassQuestion[] }
  | { type: 'RECEIVE_CLASS_MESSAGE'; id: string; text: string; senderSessionId: string; isHost: boolean; isSelf: boolean; timestamp: number }
  | { type: 'EXPLORE_DATA'; communities: Array<{ id: string; name: string; topic: string; category: string; count: number; max: number }>; classes: Array<{ id: string; name: string; topic: string; count: number }> }
  | { type: 'MOD_QUEUE_UPDATE'; tickets: EphemeralLiveTicket[] }
  | { type: 'STREAM_MUTED_BY_MODERATOR'; reason: string }
  | { type: 'ERROR'; message: string };

export class HaylooEngine {
  private sessions: Map<string, EphemeralSession> = new Map();
  // In-memory persistent stores for anonymous blocking & safety
  private blockedPairs: Set<string> = new Set(); // "blockerVisitorId:blockedVisitorId"
  private blockedIpPairs: Set<string> = new Set(); // "ipA:ipB"
  private matchQueue = new MatchmakerQueue(this.blockedPairs, this.blockedIpPairs);
  private communityRooms: Map<string, CommunityRoom> = new Map();
  private classRooms: Map<string, ClassRoom> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  // Auto-moderation sliding window tracking (10 min rolling window, 3 reports threshold, 30 min temporary ban)
  private readonly REPORT_ROLLING_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  private readonly BAN_THRESHOLD = 3; // 3 or more reports
  private readonly BAN_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  private reportsByVisitorId: Map<string, number[]> = new Map();
  private reportsByIp: Map<string, number[]> = new Map();
  private bannedVisitorIds: Map<string, number> = new Map();
  private bannedIps: Map<string, number> = new Map();

  // Transient in-memory volatile cache (TTL auto-purged from volatile RAM)
  private transientVolatileCache = new TransientVolatileCache<any>();
  // Rotating in-memory salt for session IP hashing (Raw IPs never retained)
  private rotatingIpSalt: string = crypto.randomBytes(16).toString('hex');
  // Live Ephemeral Moderation Queue (Volatile RAM only, 0 database storage)
  private ephemeralTickets: Map<string, EphemeralLiveTicket> = new Map();
  private moderatorSessionIds: Set<string> = new Set();

  // Rate limit constants
  private readonly MAX_SKIPS_IN_WINDOW = 4;
  private readonly SKIP_WINDOW_MS = 25000;
  private readonly SKIP_COOLDOWN_SECONDS = 15;

  private readonly MAX_MESSAGES_IN_WINDOW = 8;
  private readonly MESSAGE_WINDOW_MS = 5000;

  private readonly SESSION_INACTIVITY_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

  constructor() {
    this.initializePresetRooms();
    this.startInactivityGarbageCollector();
  }

  private initializePresetRooms(): void {
    const presets: Array<Omit<CommunityRoom, 'memberSessionIds' | 'createdAt'>> = [
      {
        id: 'comm-ai-ml',
        name: 'AI & Machine Learning Builders',
        topic: 'LLMs, Neural Networks, Agents & Ethics',
        description: 'Discuss latest breakthroughs, open models, and application architecture.',
        category: 'Technology',
        maxParticipants: 30,
        isPreset: true,
      },
      {
        id: 'comm-web-dev',
        name: 'Web Engineering & Architecture',
        topic: 'React, TypeScript, Cloud, Next-gen Web',
        description: 'Frontend performance, backend scalability, and developer tooling.',
        category: 'Technology',
        maxParticipants: 30,
        isPreset: true,
      },
      {
        id: 'comm-startups',
        name: 'Early-Stage Founders',
        topic: 'Bootstrapping, Ideation, Product Market Fit',
        description: 'No hype, no spam. Honest founder discussions and user feedback tactics.',
        category: 'Business',
        maxParticipants: 30,
        isPreset: true,
      },
      {
        id: 'comm-design',
        name: 'Product & Visual Design',
        topic: 'Design Systems, Typography, Interaction',
        description: 'Critiques, aesthetic debates, and human-computer interface design.',
        category: 'Creative',
        maxParticipants: 30,
        isPreset: true,
      },
      {
        id: 'comm-science-math',
        name: 'Mathematics & Science Exchange',
        topic: 'Pure Math, Quantum Physics, Deep Research',
        description: 'Deep discussions on proofs, cosmology, biology, and scientific inquiry.',
        category: 'STEM',
        maxParticipants: 30,
        isPreset: true,
      },
      {
        id: 'comm-books-writing',
        name: 'Writers & Avid Readers',
        topic: 'Philosophy, Fiction, Craft, Non-Fiction',
        description: 'Share book recommendations, writing habits, and analytical thoughts.',
        category: 'Media & Arts',
        maxParticipants: 30,
        isPreset: true,
      },
    ];

    for (const preset of presets) {
      this.communityRooms.set(preset.id, {
        ...preset,
        memberSessionIds: new Set(),
        createdAt: Date.now(),
      });
    }

    // Initialize preset classes
    const defaultClasses = [
      {
        id: 'class-system-design',
        name: 'System Design: Scaling to 10M Users',
        topic: 'Distributed caching, sharding, and fault tolerance patterns',
      },
      {
        id: 'class-math-proofs',
        name: 'Introduction to Discrete Mathematics',
        topic: 'Combinatorics, Graph Theory, and Modular Arithmetic',
      },
    ];

    for (const c of defaultClasses) {
      this.classRooms.set(c.id, {
        id: c.id,
        name: c.name,
        topic: c.topic,
        hostSessionId: 'system-mentor',
        participantSessionIds: new Set(),
        questions: [
          {
            id: 'q-intro',
            askerSessionId: 'anonymous',
            question: 'What is the most common pitfall when designing distributed systems?',
            timestamp: Date.now() - 360000,
            answer: 'Premature optimization and assuming the network is reliable.',
            answeredAt: Date.now() - 300000,
          },
        ],
        createdAt: Date.now(),
      });
    }
  }

  private startInactivityGarbageCollector(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      // Purge inactive sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > this.SESSION_INACTIVITY_TTL_MS && !session.ws) {
          this.destroySession(sessionId);
        }
      }
      // Purge expired live tickets from volatile RAM
      for (const [ticketId, ticket] of this.ephemeralTickets.entries()) {
        if (now > ticket.expiresAt) {
          this.ephemeralTickets.delete(ticketId);
        }
      }
      // Purge transient memory cache
      this.transientVolatileCache.purgeExpired();
    }, 30000);
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  public hashSessionIp(ip: string): string {
    return crypto
      .createHash('sha256')
      .update((ip || '127.0.0.1') + this.rotatingIpSalt)
      .digest('hex')
      .substring(0, 16);
  }

  public createEphemeralTicket(
    flaggedSession: EphemeralSession,
    category: string,
    reason: string,
    confidence = 0.9
  ): EphemeralLiveTicket {
    const ticketId = `mod_live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticket: EphemeralLiveTicket = {
      ticketId,
      roomId: flaggedSession.currentRoomId || `room_${flaggedSession.sessionId.substring(0, 6)}`,
      sessionHash: flaggedSession.ipAddress || this.hashSessionIp(flaggedSession.sessionId),
      reason,
      category,
      confidence,
      flaggedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL in volatile RAM
      status: 'PENDING_REVIEW',
    };
    this.ephemeralTickets.set(ticketId, ticket);
    this.broadcastModerationQueue();
    return ticket;
  }

  public getLiveTickets(): EphemeralLiveTicket[] {
    const now = Date.now();
    return Array.from(this.ephemeralTickets.values()).filter((t) => t.expiresAt > now);
  }

  public broadcastModerationQueue(): void {
    const tickets = this.getLiveTickets();
    const payload: ServerMessage = {
      type: 'MOD_QUEUE_UPDATE',
      tickets,
    };
    for (const modSessionId of this.moderatorSessionIds) {
      const modSession = this.sessions.get(modSessionId);
      if (modSession && modSession.ws) {
        this.send(modSession.ws, payload);
      } else {
        this.moderatorSessionIds.delete(modSessionId);
      }
    }
  }

  public registerSession(ws: WebSocket, existingId?: string, ipAddress = '127.0.0.1', visitorId?: string): EphemeralSession {
    const sessionId = existingId || `hl_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const now = Date.now();
    const hashedIp = this.hashSessionIp(ipAddress);

    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        visitorId: visitorId || `vst_${Math.random().toString(36).substring(2, 10)}`,
        ipAddress: hashedIp,
        ws,
        profession: '',
        interests: [],
        sessionMode: 'video',
        currentMode: 'none',
        currentRoomId: null,
        pairedSessionId: null,
        blockedSessionIds: new Set(),
        blockedVisitorIds: new Set(),
        createdAt: now,
        lastActivity: now,
        violationCount: 0,
        isMutedUntil: 0,
        isRestrictedUntil: 0,
        skipTimestamps: [],
        messageTimestamps: [],
      };
      this.sessions.set(sessionId, session);
    } else {
      session.ws = ws;
      session.lastActivity = now;
      session.ipAddress = hashedIp;
      if (visitorId) session.visitorId = visitorId;
    }

    this.send(ws, { type: 'SESSION_REGISTERED', sessionId });
    return session;
  }

  public handleDisconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.ws = null;
    session.lastActivity = Date.now();

    // Handle leave based on active mode
    if (session.currentMode === 'matching') {
      this.matchQueue.remove(sessionId);
    } else if (session.currentMode === '1on1' && session.pairedSessionId) {
      this.notifyPartnerLeft(session.pairedSessionId, 'disconnected');
      const partner = this.sessions.get(session.pairedSessionId);
      if (partner) {
        partner.currentMode = 'none';
        partner.pairedSessionId = null;
        partner.currentRoomId = null;
      }
    } else if (session.currentMode === 'community' && session.currentRoomId) {
      this.leaveCommunity(session);
    } else if (session.currentMode === 'class' && session.currentRoomId) {
      this.leaveClass(session);
    }

    session.currentMode = 'none';
    session.currentRoomId = null;
    session.pairedSessionId = null;
  }

  public destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.matchQueue.remove(sessionId);
    this.sessions.delete(sessionId);
  }

  public processMessage(sessionId: string, rawData: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ws) return;

    session.lastActivity = Date.now();

    let msg: ClientMessage;
    try {
      msg = JSON.parse(rawData);
    } catch {
      this.send(session.ws, { type: 'ERROR', message: 'Invalid message payload.' });
      return;
    }

    // Check active restrictions
    const now = Date.now();
    if (session.isRestrictedUntil > now) {
      this.send(session.ws, {
        type: 'TEMPORARY_RESTRICTION',
        restrictedUntil: session.isRestrictedUntil,
        reason: 'Temporary session restriction due to repeated policy violations.',
      });
      return;
    }

    switch (msg.type) {
      case 'REGISTER_SESSION':
        if (msg.visitorId) session.visitorId = msg.visitorId;
        if (msg.blockedStrangers && Array.isArray(msg.blockedStrangers)) {
          for (const bid of msg.blockedStrangers) {
            if (bid && typeof bid === 'string') session.blockedVisitorIds.add(bid);
          }
        }
        if (msg.profession) {
          const val = validateProfession(msg.profession);
          if (val.isValid) {
            session.profession = msg.profession.trim();
          }
        }
        if (msg.interests && Array.isArray(msg.interests)) session.interests = msg.interests;
        break;

      case 'START_MATCHING':
        if (msg.visitorId) session.visitorId = msg.visitorId;
        if (msg.blockedStrangers && Array.isArray(msg.blockedStrangers)) {
          for (const bid of msg.blockedStrangers) {
            if (bid && typeof bid === 'string') session.blockedVisitorIds.add(bid);
          }
        }
        this.startMatching(session, msg.profession, msg.interests, msg.country, msg.sessionMode);
        break;

      case 'CANCEL_MATCHING':
        this.cancelMatching(session);
        break;

      case 'NEXT_PERSON':
        this.handleNextPerson(session);
        break;

      case 'END_CONVERSATION':
        this.handleEndConversation(session);
        break;

      case 'SEND_1ON1_MESSAGE':
        this.handle1on1Message(session, msg.text);
        break;

      case 'MESSAGE_READ':
        this.handleMessageRead(session, msg.messageId);
        break;

      case 'JOIN_COMMUNITY':
        this.joinCommunity(session, msg.communityId);
        break;

      case 'CREATE_COMMUNITY':
        this.createCommunity(session, msg.name, msg.topic, msg.category);
        break;

      case 'LEAVE_COMMUNITY':
        this.leaveCommunity(session);
        break;

      case 'SEND_COMMUNITY_MESSAGE':
        this.handleCommunityMessage(session, msg.text);
        break;

      case 'JOIN_CLASS':
        this.joinClass(session, msg.classId);
        break;

      case 'CREATE_CLASS':
        this.createClass(session, msg.name, msg.topic);
        break;

      case 'LEAVE_CLASS':
        this.leaveClass(session);
        break;

      case 'SEND_CLASS_MESSAGE':
        this.handleClassMessage(session, msg.text);
        break;

      case 'SUBMIT_CLASS_QUESTION':
        this.handleSubmitClassQuestion(session, msg.question);
        break;

      case 'ANSWER_CLASS_QUESTION':
        this.handleAnswerClassQuestion(session, msg.questionId, msg.answer);
        break;

      case 'REPORT_USER':
        this.handleReportUser(session, msg.category, msg.details);
        break;

      case 'BLOCK_USER':
        this.handleBlockUser(session);
        break;

      case 'block_partner':
        this.handleBlockPartner(session, msg.blockerId, msg.blockedId, msg.reason);
        break;

      case 'WEBRTC_SIGNAL':
        this.handleWebRTCSignal(session, msg.signal);
        break;

      case 'VOICE_TRANSCRIPT':
        this.handleVoiceTranscript(session, msg.text, msg.language, msg.isFinal, msg.id, msg.timestamp);
        break;

      case 'GET_EXPLORE_DATA':
        this.sendExploreData(session);
        break;

      case 'PAD_UPDATE':
        this.handlePadUpdate(session, msg.content, msg.language);
        break;

      case 'TYPING_INDICATOR':
        this.handleTypingIndicator(session, msg.isTyping);
        break;

      case 'MOD_SUBSCRIBE':
        this.moderatorSessionIds.add(session.sessionId);
        if (session.ws) {
          this.send(session.ws, {
            type: 'MOD_QUEUE_UPDATE',
            tickets: this.getLiveTickets(),
          });
        }
        break;

      case 'MOD_ACTION':
        this.handleModAction(session, msg.ticketId, msg.action);
        break;

      case 'FLAG_LIVE_STREAM':
        this.handleFlagLiveStream(session, msg.reason, msg.confidence);
        break;

      default:
        break;
    }
  }

  private isBanned(visitorId: string, ip: string): { banned: boolean; restrictedUntil: number; reason: string } {
    const now = Date.now();
    const visitorBan = this.bannedVisitorIds.get(visitorId);
    if (visitorBan && visitorBan > now) {
      return {
        banned: true,
        restrictedUntil: visitorBan,
        reason: 'You are temporarily banned for 30 minutes following multiple community reports.',
      };
    }
    const ipBan = this.bannedIps.get(ip);
    if (ipBan && ipBan > now) {
      return {
        banned: true,
        restrictedUntil: ipBan,
        reason: 'This network is temporarily banned for 30 minutes following multiple community reports.',
      };
    }
    return { banned: false, restrictedUntil: 0, reason: '' };
  }

  // --- Matchmaking Implementation ---

  private startMatching(
    session: EphemeralSession,
    profession: string,
    interests: string[],
    country?: string,
    requestedMode?: 'video' | 'voice' | 'messaging'
  ): void {
    const banCheck = this.isBanned(session.visitorId, session.ipAddress);
    if (banCheck.banned) {
      if (session.ws) {
        this.send(session.ws, {
          type: 'TEMPORARY_RESTRICTION',
          restrictedUntil: banCheck.restrictedUntil,
          reason: banCheck.reason,
        });
      }
      return;
    }

    const cleanProf = (profession || session.profession || '').trim();
    const activeInterests = interests && interests.length > 0 ? interests : session.interests;
    if (country) {
      session.country = country;
    }

    const profValidation = validateProfession(cleanProf);
    if (!profValidation.isValid) {
      if (session.ws) {
        this.send(session.ws, { type: 'ERROR', message: profValidation.error || 'Please enter a valid profession.' });
      }
      return;
    }

    if (!activeInterests || activeInterests.length < 3) {
      if (session.ws) {
        this.send(session.ws, { type: 'ERROR', message: 'Please select at least 3 interests to match.' });
      }
      return;
    }

    // Clear existing paired state if any
    this.cleanCurrentSessionState(session);

    session.profession = cleanProf;
    session.interests = activeInterests;
    if (requestedMode) session.sessionMode = requestedMode;
    session.currentMode = 'matching';

    const queuedSession: QueuedSession = {
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      ipAddress: session.ipAddress,
      profession: session.profession,
      interests: session.interests,
      sessionMode: session.sessionMode,
      country: session.country || 'GLOBAL',
      queuedAt: Date.now(),
      blockedSessionIds: session.blockedSessionIds,
      blockedVisitorIds: session.blockedVisitorIds,
      matchedSessionId: null,
    };

    if (session.ws) {
      this.send(session.ws, { type: 'MATCHING_STARTED' });
    }

    // Try finding an immediate compatible match in queue
    const match = this.matchQueue.findBestMatch(queuedSession);

    if (match) {
      this.pairSessions(session, match.matchedSession, match.scoreResult);
    } else {
      // Put in queue
      this.matchQueue.enqueue(queuedSession);
    }
  }

  private cancelMatching(session: EphemeralSession): void {
    if (session.currentMode === 'matching') {
      this.matchQueue.remove(session.sessionId);
      session.currentMode = 'none';
      if (session.ws) {
        this.send(session.ws, { type: 'MATCHING_CANCELED' });
      }
    }
  }

  private pairSessions(sessionA: EphemeralSession, candidateB: QueuedSession, scoreResult: MatchScoreResult): void {
    const sessionB = this.sessions.get(candidateB.sessionId);
    // Strict atomic verification to avoid race conditions:
    if (!sessionB || !sessionB.ws || sessionB.currentMode !== 'matching') {
      this.matchQueue.remove(candidateB.sessionId);
      // Re-enqueue sessionA if candidate is gone or no longer matching
      const queuedA: QueuedSession = {
        sessionId: sessionA.sessionId,
        profession: sessionA.profession,
        interests: sessionA.interests,
        sessionMode: sessionA.sessionMode,
        country: sessionA.country || 'GLOBAL',
        queuedAt: Date.now(),
        blockedSessionIds: sessionA.blockedSessionIds,
        matchedSessionId: null,
      };
      this.matchQueue.enqueue(queuedA);
      return;
    }

    const roomId = `room_1on1_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    sessionA.currentMode = '1on1';
    sessionA.pairedSessionId = sessionB.sessionId;
    sessionA.currentRoomId = roomId;

    sessionB.currentMode = '1on1';
    sessionB.pairedSessionId = sessionA.sessionId;
    sessionB.currentRoomId = roomId;

    const professionBonus = Boolean(scoreResult.isSharedProfession);
    const countryBonus = Boolean(sessionA.country && sessionA.country !== 'GLOBAL' && sessionA.country === sessionB.country);

    const scoreBreakdown = {
      sharedInterests: scoreResult.sharedInterests,
      sharedTopics: scoreResult.sharedTopics,
      professionBonus,
      countryBonus,
      totalScore: scoreResult.score,
    };

    const payloadA: ServerMessage = {
      type: 'MATCH_FOUND',
      roomId,
      sharedInterests: scoreResult.sharedInterests,
      sharedTopics: scoreResult.sharedTopics,
      score: scoreResult.score,
      partnerProfession: sessionB.profession,
      partnerCountry: sessionB.country || 'GLOBAL',
      partnerVisitorId: sessionB.visitorId,
      scoreBreakdown,
    };

    const payloadB: ServerMessage = {
      type: 'MATCH_FOUND',
      roomId,
      sharedInterests: scoreResult.sharedInterests,
      sharedTopics: scoreResult.sharedTopics,
      score: scoreResult.score,
      partnerProfession: sessionA.profession,
      partnerCountry: sessionA.country || 'GLOBAL',
      partnerVisitorId: sessionA.visitorId,
      scoreBreakdown,
    };

    if (sessionA.ws) this.send(sessionA.ws, payloadA);
    if (sessionB.ws) this.send(sessionB.ws, payloadB);
  }

  private handlePadUpdate(session: EphemeralSession, content: string, language: string): void {
    if (session.currentMode === '1on1' && session.pairedSessionId) {
      const partner = this.sessions.get(session.pairedSessionId);
      if (partner && partner.ws) {
        this.send(partner.ws, {
          type: 'PAD_UPDATE',
          content: (content || '').slice(0, 10000),
          language: (language || 'javascript').slice(0, 50),
          senderSessionId: session.sessionId,
        });
      }
    }
  }

  private handleTypingIndicator(session: EphemeralSession, isTyping: boolean): void {
    if (session.currentMode === '1on1' && session.pairedSessionId) {
      const partner = this.sessions.get(session.pairedSessionId);
      if (partner && partner.ws) {
        this.send(partner.ws, {
          type: 'TYPING_INDICATOR',
          isTyping: Boolean(isTyping),
          senderSessionId: session.sessionId,
        });
      }
    }
  }

  private handleNextPerson(session: EphemeralSession): void {
    const now = Date.now();

    // Enforce server-authoritative rate limiting on skips
    session.skipTimestamps = session.skipTimestamps.filter((t) => now - t < this.SKIP_WINDOW_MS);
    if (session.skipTimestamps.length >= this.MAX_SKIPS_IN_WINDOW) {
      if (session.ws) {
        this.send(session.ws, {
          type: 'RATE_LIMIT_COOLDOWN',
          cooldownSeconds: this.SKIP_COOLDOWN_SECONDS,
          reason: 'You are skipping too quickly. Please pause for a few seconds.',
        });
      }
      return;
    }
    session.skipTimestamps.push(now);

    const prevPartnerId = session.pairedSessionId;
    if (prevPartnerId) {
      // Prevent immediate rematch between these two in this queue cycle
      session.blockedSessionIds.add(prevPartnerId);
      const partner = this.sessions.get(prevPartnerId);
      if (partner) {
        partner.blockedSessionIds.add(session.sessionId);
        this.notifyPartnerLeft(prevPartnerId, 'skipped');
        partner.currentMode = 'none';
        partner.pairedSessionId = null;
        partner.currentRoomId = null;
      }
    }

    session.pairedSessionId = null;
    session.currentRoomId = null;

    // Put straight back into matching queue
    this.startMatching(session, session.profession, session.interests, session.country, session.sessionMode);
  }

  private handleEndConversation(session: EphemeralSession): void {
    const partnerId = session.pairedSessionId;
    if (partnerId) {
      this.notifyPartnerLeft(partnerId, 'ended');
      const partner = this.sessions.get(partnerId);
      if (partner) {
        partner.currentMode = 'none';
        partner.pairedSessionId = null;
        partner.currentRoomId = null;
      }
    }

    session.currentMode = 'none';
    session.pairedSessionId = null;
    session.currentRoomId = null;
  }

  private handleReportUser(session: EphemeralSession, category: string, details?: string): void {
    const partnerId = session.pairedSessionId;
    if (!partnerId) return;

    const partner = this.sessions.get(partnerId);

    // Mutual separation
    session.blockedSessionIds.add(partnerId);
    if (partner) {
      partner.blockedSessionIds.add(session.sessionId);
      partner.violationCount += 1;

      // If user receives multiple reports, apply temporary restriction
      if (partner.violationCount >= 2) {
        partner.isRestrictedUntil = Date.now() + 5 * 60 * 1000;
        if (partner.ws) {
          this.send(partner.ws, {
            type: 'TEMPORARY_RESTRICTION',
            restrictedUntil: partner.isRestrictedUntil,
            reason: `Account received multiple community safety reports (${category}).`,
          });
        }
      }

      // Route immediately to live ephemeral moderation queue for human inspection
      this.createEphemeralTicket(
        partner,
        category,
        details || `User flagged/reported for ${category}`,
        0.95
      );

      this.notifyPartnerLeft(partnerId, 'reported');
      partner.currentMode = 'none';
      partner.pairedSessionId = null;
      partner.currentRoomId = null;
    }

    session.currentMode = 'none';
    session.pairedSessionId = null;
    session.currentRoomId = null;
  }

  private handleFlagLiveStream(session: EphemeralSession, reason: string, confidence: number): void {
    const partnerId = session.pairedSessionId;
    const flaggedTarget = partnerId ? this.sessions.get(partnerId) || session : session;
    this.createEphemeralTicket(flaggedTarget, 'inappropriate_stream', reason || 'On-device vision model flagged stream', confidence || 0.85);
  }

  private handleModAction(modSession: EphemeralSession, ticketId: string, action: 'KICK' | 'MUTE' | 'DISMISS'): void {
    const ticket = this.ephemeralTickets.get(ticketId);
    if (!ticket) return;

    if (action === 'KICK') {
      for (const s of this.sessions.values()) {
        if (s.currentRoomId === ticket.roomId || s.ipAddress === ticket.sessionHash) {
          if (s.pairedSessionId) {
            this.notifyPartnerLeft(s.pairedSessionId, 'blocked');
            const partner = this.sessions.get(s.pairedSessionId);
            if (partner) {
              partner.currentMode = 'none';
              partner.pairedSessionId = null;
              partner.currentRoomId = null;
            }
          }
          s.currentMode = 'none';
          s.pairedSessionId = null;
          s.currentRoomId = null;
          s.isRestrictedUntil = Date.now() + 30 * 60 * 1000;
          if (s.ws) {
            this.send(s.ws, {
              type: 'TEMPORARY_RESTRICTION',
              restrictedUntil: s.isRestrictedUntil,
              reason: 'Removed from live session by human moderator for community safety inspection.',
            });
          }
        }
      }
      this.ephemeralTickets.delete(ticketId);
      this.broadcastModerationQueue();
    } else if (action === 'MUTE') {
      for (const s of this.sessions.values()) {
        if (s.currentRoomId === ticket.roomId || s.ipAddress === ticket.sessionHash) {
          s.isMutedUntil = Date.now() + 10 * 60 * 1000;
          if (s.ws) {
            this.send(s.ws, {
              type: 'STREAM_MUTED_BY_MODERATOR',
              reason: 'Stream audio and video muted by human moderator for safety verification.',
            });
          }
        }
      }
    } else if (action === 'DISMISS') {
      this.ephemeralTickets.delete(ticketId);
      this.broadcastModerationQueue();
    }
  }

  private handleBlockUser(session: EphemeralSession): void {
    const partnerId = session.pairedSessionId;
    if (!partnerId) return;

    session.blockedSessionIds.add(partnerId);
    const partner = this.sessions.get(partnerId);
    if (partner) {
      partner.blockedSessionIds.add(session.sessionId);
      if (partner.visitorId && session.visitorId) {
        this.blockedPairs.add(`${session.visitorId}:${partner.visitorId}`);
        this.blockedPairs.add(`${partner.visitorId}:${session.visitorId}`);
        session.blockedVisitorIds.add(partner.visitorId);
        partner.blockedVisitorIds.add(session.visitorId);
      }
      this.notifyPartnerLeft(partnerId, 'blocked');
      partner.currentMode = 'none';
      partner.pairedSessionId = null;
      partner.currentRoomId = null;
    }

    session.currentMode = 'none';
    session.pairedSessionId = null;
    session.currentRoomId = null;
  }

  public handleBlockPartner(blockerSession: EphemeralSession, blockerId: string, blockedId: string, reason: string): void {
    const effectiveBlockerId = blockerId || blockerSession.visitorId;
    const partnerId = blockerSession.pairedSessionId;
    const partner = partnerId ? this.sessions.get(partnerId) : null;
    const effectiveBlockedId = blockedId || (partner ? partner.visitorId : '');
    const partnerIp = partner ? partner.ipAddress : '';

    // 1. Maintain in-memory store of blocked pairs (bidirectional lookup)
    if (effectiveBlockerId && effectiveBlockedId) {
      this.blockedPairs.add(`${effectiveBlockerId}:${effectiveBlockedId}`);
      this.blockedPairs.add(`${effectiveBlockedId}:${effectiveBlockerId}`);
      blockerSession.blockedVisitorIds.add(effectiveBlockedId);
      if (partner) partner.blockedVisitorIds.add(effectiveBlockerId);
    }

    if (blockerSession.ipAddress && partnerIp) {
      this.blockedIpPairs.add(`${blockerSession.ipAddress}:${partnerIp}`);
      this.blockedIpPairs.add(`${partnerIp}:${blockerSession.ipAddress}`);
    }

    // 2. Track total block reports per user ID & IP address within rolling 10-minute window
    const now = Date.now();
    let shouldBanPartner = false;
    let banUntil = now + this.BAN_DURATION_MS;

    if (effectiveBlockedId) {
      const timestamps = (this.reportsByVisitorId.get(effectiveBlockedId) || []).filter(
        (t) => now - t < this.REPORT_ROLLING_WINDOW_MS
      );
      timestamps.push(now);
      this.reportsByVisitorId.set(effectiveBlockedId, timestamps);

      if (timestamps.length >= this.BAN_THRESHOLD) {
        shouldBanPartner = true;
        this.bannedVisitorIds.set(effectiveBlockedId, banUntil);
      }
    }

    if (partnerIp) {
      const ipTimestamps = (this.reportsByIp.get(partnerIp) || []).filter(
        (t) => now - t < this.REPORT_ROLLING_WINDOW_MS
      );
      ipTimestamps.push(now);
      this.reportsByIp.set(partnerIp, ipTimestamps);

      if (ipTimestamps.length >= this.BAN_THRESHOLD) {
        shouldBanPartner = true;
        this.bannedIps.set(partnerIp, banUntil);
      }
    }

    // 3. Immediately terminate WebRTC media stream & text socket room
    if (partner) {
      partner.blockedSessionIds.add(blockerSession.sessionId);
      blockerSession.blockedSessionIds.add(partner.sessionId);

      if (shouldBanPartner) {
        partner.isRestrictedUntil = banUntil;
        if (partner.ws) {
          this.send(partner.ws, {
            type: 'TEMPORARY_RESTRICTION',
            restrictedUntil: banUntil,
            reason: `Account temporarily restricted for 30 minutes following multiple community reports (${reason || 'Safety violation'}).`,
          });
        }
      }

      this.notifyPartnerLeft(partner.sessionId, 'blocked');
      partner.currentMode = 'none';
      partner.pairedSessionId = null;
      partner.currentRoomId = null;
    }

    blockerSession.currentMode = 'none';
    blockerSession.pairedSessionId = null;
    blockerSession.currentRoomId = null;
  }

  private handleWebRTCSignal(session: EphemeralSession, signal: any): void {
    if (session.currentMode !== '1on1' || !session.pairedSessionId) {
      return;
    }

    const partner = this.sessions.get(session.pairedSessionId);
    if (partner && partner.ws) {
      this.send(partner.ws, {
        type: 'WEBRTC_SIGNAL',
        signal,
      });
    }
  }

  private handleVoiceTranscript(
    session: EphemeralSession,
    text: string,
    language: string,
    isFinal: boolean,
    id?: string,
    timestamp?: number
  ): void {
    if (session.currentMode !== '1on1' || !session.pairedSessionId) {
      return;
    }

    const clean = (text || '').trim();
    if (!clean) return;

    const partner = this.sessions.get(session.pairedSessionId);
    if (partner && partner.ws) {
      this.send(partner.ws, {
        type: 'VOICE_TRANSCRIPT',
        id: id || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: clean,
        language: language || 'en',
        isFinal: !!isFinal,
        senderSessionId: session.sessionId.substring(0, 6),
        timestamp: timestamp || Date.now(),
      });
    }
  }

  // --- Message Handling & Safety Moderation ---

  private handle1on1Message(session: EphemeralSession, text: string): void {
    if (session.currentMode !== '1on1' || !session.pairedSessionId) {
      return;
    }

    const now = Date.now();

    // Check mute
    if (session.isMutedUntil > now) {
      const remainingSec = Math.ceil((session.isMutedUntil - now) / 1000);
      if (session.ws) {
        this.send(session.ws, {
          type: 'RATE_LIMIT_COOLDOWN',
          cooldownSeconds: remainingSec,
          reason: 'You are temporarily muted due to community safety violations.',
        });
      }
      return;
    }

    // Rate limit messages
    session.messageTimestamps = session.messageTimestamps.filter((t) => now - t < this.MESSAGE_WINDOW_MS);
    if (session.messageTimestamps.length >= this.MAX_MESSAGES_IN_WINDOW) {
      if (session.ws) {
        this.send(session.ws, {
          type: 'RATE_LIMIT_COOLDOWN',
          cooldownSeconds: 5,
          reason: 'You are sending messages too quickly. Please slow down.',
        });
      }
      return;
    }
    session.messageTimestamps.push(now);

    // Pass through Safety Agent before relay
    const safetyResult = defaultSafetyAgent.classifyMessage(text);
    const messageId = `msg_${now}_${Math.random().toString(36).substring(2, 6)}`;

    // High confidence violation -> BLOCK
    if (safetyResult.severityTier === 'high') {
      session.violationCount += 1;

      // Instantly route flagged session to live human moderation queue
      this.createEphemeralTicket(
        session,
        safetyResult.category || 'in_flight_violation',
        safetyResult.reason || 'Blocked in-flight message violation',
        safetyResult.confidence
      );

      if (session.ws) {
        this.send(session.ws, {
          type: 'MESSAGE_BLOCKED',
          reason: safetyResult.senderFeedback || 'Message blocked: violated community safety guidelines.',
        });
      }

      // Escalation logic
      if (session.violationCount === 2) {
        session.isMutedUntil = Date.now() + 60 * 1000;
        if (session.ws) {
          this.send(session.ws, {
            type: 'SAFETY_WARNING',
            message: 'Repeated safety violations. You have been muted for 60 seconds.',
          });
        }
      } else if (session.violationCount >= 3) {
        session.isRestrictedUntil = Date.now() + 5 * 60 * 1000;
        this.handleEndConversation(session);
        if (session.ws) {
          this.send(session.ws, {
            type: 'TEMPORARY_RESTRICTION',
            restrictedUntil: session.isRestrictedUntil,
            reason: 'Excessive safety violations. 5-minute session restriction active.',
          });
        }
      }
      return;
    }

    // Medium confidence violation -> Deliver + Show warning banner to sender
    if (safetyResult.severityTier === 'medium') {
      if (session.ws) {
        this.send(session.ws, {
          type: 'SAFETY_WARNING',
          message: safetyResult.senderFeedback || 'Please keep conversations respectful.',
        });
      }
    }

    // Deliver to self & peer
    if (session.ws) {
      this.send(session.ws, {
        type: 'RECEIVE_1ON1_MESSAGE',
        id: messageId,
        text,
        sender: 'self',
        timestamp: now,
      });
    }

    const partner = this.sessions.get(session.pairedSessionId);
    if (partner && partner.ws) {
      this.send(partner.ws, {
        type: 'RECEIVE_1ON1_MESSAGE',
        id: messageId,
        text,
        sender: 'peer',
        timestamp: now,
      });
    }
  }

  private handleMessageRead(session: EphemeralSession, messageId: string): void {
    if (!messageId || typeof messageId !== 'string') return;
    if (session.currentMode !== '1on1' || !session.pairedSessionId) return;

    const partner = this.sessions.get(session.pairedSessionId);
    if (partner && partner.ws) {
      this.send(partner.ws, {
        type: 'MESSAGE_READ',
        messageId,
        readAt: Date.now(),
      });
    }
  }

  // --- Community Rooms ---

  private joinCommunity(session: EphemeralSession, communityId: string): void {
    this.cleanCurrentSessionState(session);

    let room = this.communityRooms.get(communityId);
    if (!room) {
      if (session.ws) this.send(session.ws, { type: 'ERROR', message: 'Community room not found.' });
      return;
    }

    if (room.memberSessionIds.size >= room.maxParticipants) {
      if (session.ws) this.send(session.ws, { type: 'ERROR', message: 'Room has reached maximum capacity (30/30).' });
      return;
    }

    room.memberSessionIds.add(session.sessionId);
    session.currentMode = 'community';
    session.currentRoomId = room.id;

    if (session.ws) {
      this.send(session.ws, {
        type: 'COMMUNITY_JOINED',
        room: {
          id: room.id,
          name: room.name,
          topic: room.topic,
          category: room.category,
          participantCount: room.memberSessionIds.size,
          maxParticipants: room.maxParticipants,
        },
      });
    }

    this.broadcastCommunityUpdate(room);
  }

  private createCommunity(session: EphemeralSession, name: string, topic: string, category: string): void {
    const cleanName = name.trim().substring(0, 40);
    const cleanTopic = topic.trim().substring(0, 80);
    if (!cleanName || !cleanTopic) return;

    const id = `comm-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRoom: CommunityRoom = {
      id,
      name: cleanName,
      topic: cleanTopic,
      description: `Created for discussions on ${cleanTopic}`,
      category: category || 'General',
      maxParticipants: 30,
      memberSessionIds: new Set(),
      isPreset: false,
      createdAt: Date.now(),
    };

    this.communityRooms.set(id, newRoom);
    this.joinCommunity(session, id);
  }

  private leaveCommunity(session: EphemeralSession): void {
    if (session.currentMode !== 'community' || !session.currentRoomId) return;

    const room = this.communityRooms.get(session.currentRoomId);
    if (room) {
      room.memberSessionIds.delete(session.sessionId);
      this.broadcastCommunityUpdate(room);

      // Auto-destroy non-preset rooms when empty
      if (!room.isPreset && room.memberSessionIds.size === 0) {
        this.communityRooms.delete(room.id);
      }
    }

    session.currentMode = 'none';
    session.currentRoomId = null;
  }

  private handleCommunityMessage(session: EphemeralSession, text: string): void {
    if (session.currentMode !== 'community' || !session.currentRoomId) return;
    const room = this.communityRooms.get(session.currentRoomId);
    if (!room) return;

    const now = Date.now();
    if (session.isMutedUntil > now) {
      if (session.ws) {
        this.send(session.ws, {
          type: 'RATE_LIMIT_COOLDOWN',
          cooldownSeconds: Math.ceil((session.isMutedUntil - now) / 1000),
          reason: 'You are muted in community rooms.',
        });
      }
      return;
    }

    const safetyResult = defaultSafetyAgent.classifyMessage(text);
    if (safetyResult.severityTier === 'high') {
      if (session.ws) {
        this.send(session.ws, {
          type: 'MESSAGE_BLOCKED',
          reason: safetyResult.senderFeedback || 'Message blocked by moderation rules.',
        });
      }
      return;
    }

    if (safetyResult.severityTier === 'medium' && session.ws) {
      this.send(session.ws, {
        type: 'SAFETY_WARNING',
        message: safetyResult.senderFeedback || 'Please adhere to community rules.',
      });
    }

    const messageId = `cmsg_${now}_${Math.random().toString(36).substring(2, 6)}`;

    // Broadcast to all active members
    for (const memberId of room.memberSessionIds) {
      const member = this.sessions.get(memberId);
      if (member && member.ws) {
        this.send(member.ws, {
          type: 'RECEIVE_COMMUNITY_MESSAGE',
          id: messageId,
          text,
          senderSessionId: session.sessionId.substring(0, 6),
          isSelf: memberId === session.sessionId,
          timestamp: now,
        });
      }
    }
  }

  private broadcastCommunityUpdate(room: CommunityRoom): void {
    for (const memberId of room.memberSessionIds) {
      const member = this.sessions.get(memberId);
      if (member && member.ws) {
        this.send(member.ws, {
          type: 'COMMUNITY_UPDATE',
          participantCount: room.memberSessionIds.size,
        });
      }
    }
  }

  // --- Classroom Mode ---

  private joinClass(session: EphemeralSession, classId: string): void {
    this.cleanCurrentSessionState(session);

    let room = this.classRooms.get(classId);
    if (!room) {
      if (session.ws) this.send(session.ws, { type: 'ERROR', message: 'Classroom not found.' });
      return;
    }

    room.participantSessionIds.add(session.sessionId);
    session.currentMode = 'class';
    session.currentRoomId = room.id;

    const isHost = room.hostSessionId === session.sessionId;

    if (session.ws) {
      this.send(session.ws, {
        type: 'CLASS_JOINED',
        room: {
          id: room.id,
          name: room.name,
          topic: room.topic,
          isHost,
          participantCount: room.participantSessionIds.size,
          questions: room.questions,
        },
      });
    }

    this.broadcastClassUpdate(room);
  }

  private createClass(session: EphemeralSession, name: string, topic: string): void {
    const cleanName = name.trim().substring(0, 40);
    const cleanTopic = topic.trim().substring(0, 80);
    if (!cleanName || !cleanTopic) return;

    const id = `class-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newClass: ClassRoom = {
      id,
      name: cleanName,
      topic: cleanTopic,
      hostSessionId: session.sessionId, // Ephemeral contextual host
      participantSessionIds: new Set(),
      questions: [],
      createdAt: Date.now(),
    };

    this.classRooms.set(id, newClass);
    this.joinClass(session, id);
  }

  private leaveClass(session: EphemeralSession): void {
    if (session.currentMode !== 'class' || !session.currentRoomId) return;

    const room = this.classRooms.get(session.currentRoomId);
    if (room) {
      room.participantSessionIds.delete(session.sessionId);

      // If host leaves and there are participants, designate the next earliest participant as ephemeral host
      if (room.hostSessionId === session.sessionId && room.participantSessionIds.size > 0) {
        const nextHost = Array.from(room.participantSessionIds)[0];
        room.hostSessionId = nextHost;
      }

      this.broadcastClassUpdate(room);

      if (room.participantSessionIds.size === 0 && !room.id.startsWith('class-system')) {
        this.classRooms.delete(room.id);
      }
    }

    session.currentMode = 'none';
    session.currentRoomId = null;
  }

  private handleClassMessage(session: EphemeralSession, text: string): void {
    if (session.currentMode !== 'class' || !session.currentRoomId) return;
    const room = this.classRooms.get(session.currentRoomId);
    if (!room) return;

    const safetyResult = defaultSafetyAgent.classifyMessage(text);
    if (safetyResult.severityTier === 'high') {
      if (session.ws) {
        this.send(session.ws, {
          type: 'MESSAGE_BLOCKED',
          reason: safetyResult.senderFeedback || 'Message blocked.',
        });
      }
      return;
    }

    const now = Date.now();
    const isHost = room.hostSessionId === session.sessionId;
    const messageId = `clmsg_${now}_${Math.random().toString(36).substring(2, 6)}`;

    for (const pId of room.participantSessionIds) {
      const pSession = this.sessions.get(pId);
      if (pSession && pSession.ws) {
        this.send(pSession.ws, {
          type: 'RECEIVE_CLASS_MESSAGE',
          id: messageId,
          text,
          senderSessionId: session.sessionId.substring(0, 6),
          isHost,
          isSelf: pId === session.sessionId,
          timestamp: now,
        });
      }
    }
  }

  private handleSubmitClassQuestion(session: EphemeralSession, question: string): void {
    if (session.currentMode !== 'class' || !session.currentRoomId) return;
    const room = this.classRooms.get(session.currentRoomId);
    if (!room) return;

    const cleanQ = question.trim().substring(0, 200);
    if (!cleanQ) return;

    const qItem: ClassQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      askerSessionId: session.sessionId.substring(0, 6),
      question: cleanQ,
      timestamp: Date.now(),
    };

    room.questions.push(qItem);
    this.broadcastClassUpdate(room);
  }

  private handleAnswerClassQuestion(session: EphemeralSession, questionId: string, answer: string): void {
    if (session.currentMode !== 'class' || !session.currentRoomId) return;
    const room = this.classRooms.get(session.currentRoomId);
    if (!room) return;

    const q = room.questions.find((item) => item.id === questionId);
    if (q) {
      q.answer = answer.trim().substring(0, 300);
      q.answeredAt = Date.now();
      this.broadcastClassUpdate(room);
    }
  }

  private broadcastClassUpdate(room: ClassRoom): void {
    for (const pId of room.participantSessionIds) {
      const pSession = this.sessions.get(pId);
      if (pSession && pSession.ws) {
        this.send(pSession.ws, {
          type: 'CLASS_UPDATE',
          participantCount: room.participantSessionIds.size,
          questions: room.questions,
        });
      }
    }
  }

  // --- Explore / Discovery ---

  public sendExploreData(session: EphemeralSession): void {
    const communities = Array.from(this.communityRooms.values()).map((c) => ({
      id: c.id,
      name: c.name,
      topic: c.topic,
      category: c.category,
      count: c.memberSessionIds.size,
      max: c.maxParticipants,
    }));

    const classes = Array.from(this.classRooms.values()).map((cl) => ({
      id: cl.id,
      name: cl.name,
      topic: cl.topic,
      count: cl.participantSessionIds.size,
    }));

    if (session.ws) {
      this.send(session.ws, {
        type: 'EXPLORE_DATA',
        communities,
        classes,
      });
    }
  }

  // --- Utilities ---

  private cleanCurrentSessionState(session: EphemeralSession): void {
    if (session.currentMode === 'matching') {
      this.matchQueue.remove(session.sessionId);
    } else if (session.currentMode === '1on1' && session.pairedSessionId) {
      this.handleEndConversation(session);
    } else if (session.currentMode === 'community') {
      this.leaveCommunity(session);
    } else if (session.currentMode === 'class') {
      this.leaveClass(session);
    }
  }

  private notifyPartnerLeft(
    partnerId: string,
    reason: 'skipped' | 'ended' | 'disconnected' | 'reported' | 'blocked'
  ): void {
    const partner = this.sessions.get(partnerId);
    if (partner && partner.ws) {
      this.send(partner.ws, { type: 'PARTNER_LEFT', reason });
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export const haylooEngine = new HaylooEngine();
