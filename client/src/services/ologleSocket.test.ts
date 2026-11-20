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

  it('normalizes an https:// configured endpoint to wss://', () => {
    expect(resolveWebSocketUrl('https://signal.example', true, 'https:', 'site.example'))
      .toBe('wss://signal.example/ws');
  });

  it('normalizes an http:// configured endpoint to ws:// and keeps an explicit path', () => {
    expect(resolveWebSocketUrl('http://localhost:4000/ws', false, 'http:', 'localhost:3000'))
      .toBe('ws://localhost:4000/ws');
  });

  it('strips trailing slashes and prevents duplicate /ws/ws suffixes', () => {
    expect(resolveWebSocketUrl('wss://ologle-backend.vercel.app/ws/', true, 'https:', 'ologle-five.vercel.app'))
      .toBe('wss://ologle-backend.vercel.app/ws');
    expect(resolveWebSocketUrl('wss://ologle-backend.vercel.app/ws/ws', true, 'https:', 'ologle-five.vercel.app'))
      .toBe('wss://ologle-backend.vercel.app/ws');
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

  it('appends ?sessionId= query parameter when reconnecting with an existing sessionId', () => {
    expect(resolveWebSocketUrl('wss://signal.example/ws', true, 'https:', 'ologle-five.vercel.app', 'hl_abc_123'))
      .toBe('wss://signal.example/ws?sessionId=hl_abc_123');
    expect(resolveWebSocketUrl(undefined, false, 'http:', 'localhost:3000', 'hl_local_99'))
      .toBe('ws://localhost:3000/ws?sessionId=hl_local_99');
  });
});
