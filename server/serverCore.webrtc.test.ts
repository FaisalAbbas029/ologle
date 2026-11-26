import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';

import { OlogleEngine } from './serverCore.ts';

function createSocket(): { socket: WebSocket; messages: string[] } {
  const messages: string[] = [];
  const socket = {
    readyState: 1,
    send: (message: string) => messages.push(message),
  } as unknown as WebSocket;

  return { socket, messages };
}

function parseMessages(messages: string[]): Array<Record<string, any>> {
  return messages.map((message) => JSON.parse(message));
}

describe('WebRTC signaling relay', () => {
  it('only relays signals within the active matched room', () => {
    const engine = new OlogleEngine();
    const socketA = createSocket();
    const socketB = createSocket();
    const sessionA = engine.registerSession(socketA.socket, undefined, '10.0.0.1', 'visitor-a');
    const sessionB = engine.registerSession(socketB.socket, undefined, '10.0.0.2', 'visitor-b');
    const matchingRequest = JSON.stringify({
      type: 'START_MATCHING',
      profession: 'Software Engineer',
      interests: ['AI', 'Programming', 'Design'],
    });

    engine.processMessage(sessionA.sessionId, matchingRequest);
    engine.processMessage(sessionB.sessionId, matchingRequest);

    const match = parseMessages(socketB.messages).find((message) => message.type === 'MATCH_FOUND');
    expect(match?.roomId).toBeTruthy();

    const signal = { type: 'offer', sdp: { type: 'offer', sdp: 'v=0' } };
    const messagesBeforeWrongRoomSignal = socketB.messages.length;
    engine.processMessage(sessionA.sessionId, JSON.stringify({
      type: 'WEBRTC_SIGNAL',
      roomId: 'stale-room',
      signal,
    }));
    expect(socketB.messages).toHaveLength(messagesBeforeWrongRoomSignal);

    engine.processMessage(sessionA.sessionId, JSON.stringify({
      type: 'WEBRTC_SIGNAL',
      roomId: match?.roomId,
      signal,
    }));
    expect(parseMessages(socketB.messages).at(-1)).toEqual({ type: 'WEBRTC_SIGNAL', signal });

    engine.destroySession(sessionA.sessionId);
    engine.destroySession(sessionB.sessionId);
  });

  it('preserves room during transient socket drop and does not create duplicate matchmaking sessions', () => {
    const engine = new OlogleEngine();
    const socketA = createSocket();
    const socketB = createSocket();
    const sessionA = engine.registerSession(socketA.socket, undefined, '10.0.0.1', 'visitor-a');
    const sessionB = engine.registerSession(socketB.socket, undefined, '10.0.0.2', 'visitor-b');

    const matchingRequest = JSON.stringify({
      type: 'START_MATCHING',
      profession: 'Designer',
      interests: ['UI', 'UX', 'Design'],
    });

    engine.processMessage(sessionA.sessionId, matchingRequest);
    engine.processMessage(sessionB.sessionId, matchingRequest);

    const matchB = parseMessages(socketB.messages).find((m) => m.type === 'MATCH_FOUND');
    expect(matchB).toBeTruthy();
    const originalRoomId = matchB.roomId;

    // Simulate transient network disconnection for Session A
    engine.handleDisconnect(sessionA.sessionId);

    // Partner B receives PARTNER_RECONNECTING notice
    const partnerReconnecting = parseMessages(socketB.messages).find((m) => m.type === 'PARTNER_RECONNECTING');
    expect(partnerReconnecting).toBeTruthy();
    expect(partnerReconnecting.graceSeconds).toBeGreaterThan(0);

    // Ensure session A is not queued in matchmaker during disconnect grace window
    expect((engine as any).matchQueue.queue.has(sessionA.sessionId)).toBe(false);

    // Session A reconnects with its same sessionId
    const socketA2 = createSocket();
    engine.registerSession(socketA2.socket, sessionA.sessionId, '10.0.0.1', 'visitor-a');

    // Verify Session A received SESSION_RESTORED with its original room
    const sessionRestored = parseMessages(socketA2.messages).find((m) => m.type === 'SESSION_RESTORED');
    expect(sessionRestored).toBeTruthy();
    expect(sessionRestored.roomId).toBe(originalRoomId);

    // Verify Partner B received PARTNER_RECONNECTED notice
    const partnerReconnected = parseMessages(socketB.messages).find((m) => m.type === 'PARTNER_RECONNECTED');
    expect(partnerReconnected).toBeTruthy();
    expect(partnerReconnected.roomId).toBe(originalRoomId);

    // Verify subsequent ICE restart offer is relayed cleanly over restored session
    const iceRestartOffer = { type: 'offer', sdp: { type: 'offer', sdp: 'v=0\r\na=ice-restart' } };
    engine.processMessage(sessionA.sessionId, JSON.stringify({
      type: 'WEBRTC_SIGNAL',
      roomId: originalRoomId,
      signal: iceRestartOffer,
    }));

    const relayedSignal = parseMessages(socketB.messages).find(
      (m) => m.type === 'WEBRTC_SIGNAL' && m.signal?.sdp?.sdp?.includes('a=ice-restart')
    );
    expect(relayedSignal).toBeTruthy();

    engine.destroySession(sessionA.sessionId);
    engine.destroySession(sessionB.sessionId);
  });

  it('handles End Call and Next correctly during reconnection without ghost rooms', () => {
    const engine = new OlogleEngine();
    const socketA = createSocket();
    const socketB = createSocket();
    const sessionA = engine.registerSession(socketA.socket, undefined, '10.0.0.1', 'visitor-a');
    const sessionB = engine.registerSession(socketB.socket, undefined, '10.0.0.2', 'visitor-b');

    const matchingRequest = JSON.stringify({
      type: 'START_MATCHING',
      profession: 'Designer',
      interests: ['UI', 'UX', 'Design'],
    });

    engine.processMessage(sessionA.sessionId, matchingRequest);
    engine.processMessage(sessionB.sessionId, matchingRequest);

    // Partner A disconnects
    engine.handleDisconnect(sessionA.sessionId);

    // While Partner A is disconnected, Partner B clicks End Call
    engine.processMessage(sessionB.sessionId, JSON.stringify({
      type: 'END_CONVERSATION',
    }));

    // Partner B is cleanly un-paired and back in idle/none mode without errors
    expect(sessionB.pairedSessionId).toBeNull();
    expect(sessionB.currentRoomId).toBeNull();

    // Now Session A reconnects later: receives PARTNER_LEFT because partner departed
    const socketA2 = createSocket();
    engine.registerSession(socketA2.socket, sessionA.sessionId, '10.0.0.1', 'visitor-a');
    const partnerLeft = parseMessages(socketA2.messages).find((m) => m.type === 'PARTNER_LEFT');
    expect(partnerLeft).toBeTruthy();

    engine.destroySession(sessionA.sessionId);
    engine.destroySession(sessionB.sessionId);
  });
});
