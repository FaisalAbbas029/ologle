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
});
