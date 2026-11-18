import { describe, expect, it } from 'vitest';
import { getFallbackIceServers } from './iceServerConfig.ts';

describe('iceServerConfig', () => {
  it('returns valid fallback Google STUN servers', () => {
    const servers = getFallbackIceServers();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
    expect(servers.some((s) => typeof s.urls === 'string' && s.urls.includes('stun:stun.l.google.com:19302'))).toBe(true);
  });

  it('guarantees all fallback ICE server entries conform to RTCIceServer structure', () => {
    const servers = getFallbackIceServers();
    for (const server of servers) {
      if (typeof server.urls === 'string') {
        expect(server.urls).toMatch(/^stun:/);
      } else if (Array.isArray(server.urls)) {
        for (const url of server.urls) {
          expect(url).toMatch(/^stun:/);
        }
      }
    }
  });
});

