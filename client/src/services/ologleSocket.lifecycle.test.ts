import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ologleSocket, ConnectionStatus } from './ologleSocket.ts';
import { ServerMessage } from '../types/index.ts';

describe('ologleSocket Client Lifecycle & Signaling Simulation', () => {
  beforeEach(() => {
    ologleSocket.disconnect();
  });

  afterEach(() => {
    ologleSocket.disconnect();
    vi.restoreAllMocks();
  });

  it('subscribes and receives status changes', () => {
    const statuses: ConnectionStatus[] = [];
    const unsubscribe = ologleSocket.subscribeStatus((status) => {
      statuses.push(status);
    });

    expect(statuses).toContain('disconnected');
    unsubscribe();
  });

  it('subscribes to incoming server messages and unregisters cleanly', () => {
    const receivedMessages: ServerMessage[] = [];
    const unsubscribe = ologleSocket.subscribe((msg) => {
      receivedMessages.push(msg);
    });

    // Simulate internal notification
    (ologleSocket as any).notify({
      type: 'SESSION_REGISTERED',
      sessionId: 'test_session_123',
    });

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0]).toEqual({
      type: 'SESSION_REGISTERED',
      sessionId: 'test_session_123',
    });

    unsubscribe();

    // After unregistering, listener should not be called
    (ologleSocket as any).notify({
      type: 'PARTNER_LEFT',
      reason: 'disconnected',
    });

    expect(receivedMessages).toHaveLength(1);
  });

  it('returns false when send() is called while disconnected', () => {
    const sent = ologleSocket.send({
      type: 'SEND_1ON1_MESSAGE',
      text: 'Hello test',
    });
    expect(sent).toBe(false);
  });

  it('handles simulated MATCH_FOUND server message', () => {
    let matchPayload: any = null;
    const unsubscribe = ologleSocket.subscribe((msg) => {
      if (msg.type === 'MATCH_FOUND') {
        matchPayload = msg;
      }
    });

    (ologleSocket as any).notify({
      type: 'MATCH_FOUND',
      roomId: 'room_abc_123',
      sharedInterests: ['Artificial Intelligence', 'WebRTC'],
      isInitiator: true,
      partnerCountry: 'CA',
    });

    expect(matchPayload).not.toBeNull();
    expect(matchPayload.roomId).toBe('room_abc_123');
    expect(matchPayload.isInitiator).toBe(true);
    expect(matchPayload.sharedInterests).toContain('WebRTC');

    unsubscribe();
  });

  it('handles simulated WEBRTC_SIGNAL relay packet', () => {
    let receivedSignal: any = null;
    const unsubscribe = ologleSocket.subscribe((msg) => {
      if (msg.type === 'WEBRTC_SIGNAL') {
        receivedSignal = msg.signal;
      }
    });

    const mockOffer = { type: 'offer', sdp: 'v=0\r\no=mockOfferSDP...' };
    (ologleSocket as any).notify({
      type: 'WEBRTC_SIGNAL',
      signal: mockOffer,
    });

    expect(receivedSignal).toEqual(mockOffer);
    unsubscribe();
  });

  it('delivers SESSION_RESTORED, PARTNER_RECONNECTING, and PARTNER_RECONNECTED recovery events', () => {
    const events: ServerMessage[] = [];
    const unsubscribe = ologleSocket.subscribe((msg) => {
      events.push(msg);
    });

    (ologleSocket as any).notify({
      type: 'PARTNER_RECONNECTING',
      graceSeconds: 20,
    });
    (ologleSocket as any).notify({
      type: 'SESSION_RESTORED',
      roomId: 'room_restored_1',
      sharedInterests: ['WebRTC', 'AI'],
      sharedTopics: ['Technology'],
      score: 180,
      isInitiator: true,
    });
    (ologleSocket as any).notify({
      type: 'PARTNER_RECONNECTED',
      roomId: 'room_restored_1',
    });

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('PARTNER_RECONNECTING');
    expect(events[1].type).toBe('SESSION_RESTORED');
    expect(events[2].type).toBe('PARTNER_RECONNECTED');
    unsubscribe();
  });
});

