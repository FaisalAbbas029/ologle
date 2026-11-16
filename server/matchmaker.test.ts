import { describe, expect, it } from 'vitest';

import {
  MatchmakerQueue,
  calculateCompatibility,
  EXACT_MATCH_WEIGHT,
  TOPIC_MATCH_WEIGHT,
  RELATED_MATCH_WEIGHT,
  PROFESSION_BONUS_WEIGHT,
  COMPLEMENTARY_PROFESSION_BONUS_WEIGHT,
  type QueuedSession,
} from './matchmaker.ts';
import { defaultSafetyAgent } from './safetyAgent.ts';
import { validateProfession } from '../client/src/data/constants.ts';

function makeQueuedSession(overrides: Partial<QueuedSession> = {}): QueuedSession {
  return {
    sessionId: 'session-1',
    visitorId: 'visitor-1',
    ipAddress: '10.0.0.1',
    isLoopback: false,
    profession: 'Developer',
    interests: ['AI', 'Programming'],
    country: 'GLOBAL',
    queuedAt: Date.now(),
    blockedSessionIds: new Set(),
    blockedVisitorIds: new Set(),
    matchedSessionId: null,
    ...overrides,
  };
}

describe('matchmaker scoring', () => {
  it('includes the exact-interest and category weights together', () => {
    const sessionA = makeQueuedSession({ profession: '', interests: ['AI'] });
    const sessionB = makeQueuedSession({
      sessionId: 'session-2',
      visitorId: 'visitor-2',
      ipAddress: '10.0.0.2',
      profession: '',
      interests: ['AI'],
    });

    expect(calculateCompatibility(sessionA, sessionB).score).toBe(EXACT_MATCH_WEIGHT + TOPIC_MATCH_WEIGHT);
  });

  it('awards topic and semantic affinity bonuses', () => {
    const sessionA = makeQueuedSession({ profession: '', interests: ['AI'] });
    const sessionB = makeQueuedSession({
      sessionId: 'session-2',
      visitorId: 'visitor-2',
      ipAddress: '10.0.0.2',
      profession: '',
      interests: ['Data Science'],
    });

    const result = calculateCompatibility(sessionA, sessionB);
    expect(result.sharedTopics).toContain('Technology');
    expect(result.score).toBe(TOPIC_MATCH_WEIGHT + RELATED_MATCH_WEIGHT);
  });

  it('awards same-profession and complementary-profession bonuses', () => {
    const sameProfession = calculateCompatibility(
      makeQueuedSession({ profession: 'Developer', interests: [] }),
      makeQueuedSession({ sessionId: 'session-2', visitorId: 'visitor-2', profession: 'Developer', interests: [] })
    );
    expect(sameProfession.score).toBe(PROFESSION_BONUS_WEIGHT);

    const complementary = calculateCompatibility(
      makeQueuedSession({ profession: 'Developer', interests: [] }),
      makeQueuedSession({ sessionId: 'session-2', visitorId: 'visitor-2', profession: 'Designer', interests: [] })
    );
    expect(complementary.score).toBe(COMPLEMENTARY_PROFESSION_BONUS_WEIGHT);
  });
});

describe('matchmaker queue', () => {
  it('does not self-match or pair blocked users', () => {
    const queue = new MatchmakerQueue();
    const sessionA = makeQueuedSession({
      sessionId: 'session-a',
      visitorId: 'visitor-a',
      ipAddress: '10.0.0.11',
      profession: 'Developer',
      interests: ['AI'],
    });
    const sessionB = makeQueuedSession({
      sessionId: 'session-b',
      visitorId: 'visitor-b',
      ipAddress: '10.0.0.12',
      profession: 'Designer',
      interests: ['AI'],
    });

    queue.enqueue(sessionA);
    queue.enqueue(sessionB);

    expect(queue.findBestMatch(sessionA)?.matchedSession.sessionId).toBe('session-b');

    const sessionC = makeQueuedSession({
      sessionId: 'session-c',
      visitorId: 'visitor-c',
      ipAddress: '10.0.0.13',
      profession: 'Designer',
      interests: ['AI'],
    });
    sessionA.blockedSessionIds.add('session-b');
    queue.enqueue(sessionC);

    expect(queue.findBestMatch(sessionA)?.matchedSession.sessionId).toBe('session-c');
    expect(queue.size()).toBe(1);
  });

  it('matches different visitors sharing the same network', () => {
    const queue = new MatchmakerQueue();
    const sessionA = makeQueuedSession({
      sessionId: 'session-shared-network-a',
      visitorId: 'visitor-shared-network-a',
      ipAddress: 'same-network',
    });
    const sessionB = makeQueuedSession({
      sessionId: 'session-shared-network-b',
      visitorId: 'visitor-shared-network-b',
      ipAddress: 'same-network',
    });

    queue.enqueue(sessionA);

    expect(queue.findBestMatch(sessionB)?.matchedSession.sessionId).toBe(sessionA.sessionId);
  });

  it('continues to prevent matching the same visitor across sessions', () => {
    const queue = new MatchmakerQueue();
    const queuedSession = makeQueuedSession({
      sessionId: 'session-same-visitor-queued',
      visitorId: 'visitor-same',
      ipAddress: 'network-a',
    });
    const currentSession = makeQueuedSession({
      sessionId: 'session-same-visitor-current',
      visitorId: 'visitor-same',
      ipAddress: 'network-b',
    });

    queue.enqueue(queuedSession);

    expect(queue.findBestMatch(currentSession)).toBeNull();
  });

  it('supports remove and cancel flows', () => {
    const queue = new MatchmakerQueue();
    const session = makeQueuedSession({ sessionId: 'session-removed' });

    queue.enqueue(session);
    expect(queue.size()).toBe(1);

    queue.remove('session-removed');
    expect(queue.size()).toBe(0);
  });
});

describe('safety agent and validators', () => {
  it('blocks high-confidence threats and warns on mild harassment', () => {
    expect(defaultSafetyAgent.classifyMessage('I will kill you').severityTier).toBe('high');
    expect(defaultSafetyAgent.classifyMessage('You are so stupid').severityTier).toBe('medium');
    expect(defaultSafetyAgent.classifyMessage('hello friend').isSafe).toBe(true);
  });

  it('accepts valid professions and rejects junk input', () => {
    expect(validateProfession('Software Engineer').isValid).toBe(true);
    expect(validateProfession('hello there').isValid).toBe(false);
  });
});
