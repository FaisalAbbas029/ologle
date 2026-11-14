import { describe, expect, it } from 'vitest';

import { MatchmakerQueue, type QueuedSession } from './matchmaker.ts';

function makeSession(sessionId: string, visitorId: string): QueuedSession {
  return {
    sessionId,
    visitorId,
    ipAddress: 'shared-network',
    isLoopback: false,
    profession: 'Developer',
    interests: ['AI', 'Programming', 'Design'],
    country: 'GLOBAL',
    queuedAt: Date.now(),
    blockedSessionIds: new Set(),
    blockedVisitorIds: new Set(),
    matchedSessionId: null,
  };
}

describe('shared-network matchmaking', () => {
  it('matches different visitors who share an IP address', () => {
    const queue = new MatchmakerQueue();
    const queuedSession = makeSession('session-a', 'visitor-a');
    const searchingSession = makeSession('session-b', 'visitor-b');

    queue.enqueue(queuedSession);

    expect(queue.findBestMatch(searchingSession)?.matchedSession.sessionId).toBe(queuedSession.sessionId);
  });
});
