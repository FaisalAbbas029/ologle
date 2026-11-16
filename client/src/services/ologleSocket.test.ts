import { describe, expect, it } from 'vitest';
import { resolveWebSocketUrl } from './ologleSocket.ts';

describe('resolveWebSocketUrl', () => {
  it('uses the explicitly configured signaling endpoint', () => {
    expect(resolveWebSocketUrl(' wss://signal.example/ws ', true, 'https:', 'site.example'))
      .toBe('wss://signal.example/ws');
  });

  it('normalizes configured endpoint without /ws path', () => {
    expect(resolveWebSocketUrl('wss://signal.example', true, 'https:', 'site.example'))
      .toBe('wss://signal.example/ws');
  });

  it('uses the same-origin socket during development', () => {
    expect(resolveWebSocketUrl(undefined, false, 'http:', 'localhost:3000'))
      .toBe('ws://localhost:3000/ws');
  });

  it('uses the Render origin when the app is served by Render', () => {
    expect(resolveWebSocketUrl(undefined, true, 'https:', 'ologle-signaling.onrender.com'))
      .toBe('wss://ologle-signaling.onrender.com/ws');
  });

  it('routes production frontends to the Render signaling service', () => {
    expect(resolveWebSocketUrl(undefined, true, 'https:', 'ologle.vercel.app'))
      .toBe('wss://ologle-signaling.onrender.com/ws');
  });
});
