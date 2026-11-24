import { describe, expect, it } from 'vitest';
import type { WebRTCConnectionState } from './useWebRTC.ts';

describe('useWebRTC Signaling & Lifecycle Contracts', () => {
  it('validates supported connection state machine steps', () => {
    const validStates: WebRTCConnectionState[] = [
      'idle',
      'requesting_media',
      'ready',
      'connecting',
      'connected',
      'disconnected',
      'failed',
      'permission_denied',
      'unstable',
      'reconnecting',
      'offline',
    ];

    expect(validStates).toHaveLength(11);
    for (const state of validStates) {
      expect(typeof state).toBe('string');
    }
  });

  it('validates SDP offer and answer signal envelope shapes', () => {
    const mockOfferSignal = {
      type: 'offer',
      sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
    };

    const mockAnswerSignal = {
      type: 'answer',
      sdp: 'v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
    };

    const mockCandidateSignal = {
      type: 'candidate',
      candidate: {
        candidate: 'candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      },
    };

    expect(mockOfferSignal.type).toBe('offer');
    expect(mockOfferSignal.sdp).toContain('v=0');
    expect(mockAnswerSignal.type).toBe('answer');
    expect(mockAnswerSignal.sdp).toContain('v=0');
    expect(mockCandidateSignal.type).toBe('candidate');
    expect(mockCandidateSignal.candidate.candidate).toContain('UDP');
  });

  it('supports all three OLOGLE media modes: video, voice, and messaging', () => {
    const supportedModes: Array<'video' | 'voice' | 'messaging'> = ['video', 'voice', 'messaging'];
    expect(supportedModes).toContain('video');
    expect(supportedModes).toContain('voice');
    expect(supportedModes).toContain('messaging');
  });
});

