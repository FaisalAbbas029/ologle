import crypto from 'crypto';
import { describe, expect, it } from 'vitest';

import { createIceServerConfig } from './iceServers.ts';

describe('ICE server configuration', () => {
  it('returns STUN servers and reports when TURN is not configured', () => {
    const config = createIceServerConfig({}, 1_700_000_000_000);

    expect(config.relayAvailable).toBe(false);
    expect(config.expiresAt).toBeNull();
    expect(config.iceServers[0].urls).toContain('stun:stun.l.google.com:19302');
  });

  it('generates short-lived TURN REST credentials without exposing the shared secret', () => {
    const secret = 'backend-only-test-secret';
    const config = createIceServerConfig({
      TURN_URLS: 'turn:turn.example.test:3478?transport=udp,turns:turn.example.test:5349?transport=tcp',
      TURN_SHARED_SECRET: secret,
      TURN_CREDENTIAL_TTL_SECONDS: '600',
    }, 1_700_000_000_000);
    const turnServer = config.iceServers[1];
    const username = turnServer.username as string;
    const expectedCredential = crypto.createHmac('sha1', secret).update(username).digest('base64');

    expect(config.relayAvailable).toBe(true);
    expect(config.expiresAt).toBe(1_700_000_600);
    expect(turnServer.urls).toEqual([
      'turn:turn.example.test:3478?transport=udp',
      'turns:turn.example.test:5349?transport=tcp',
    ]);
    expect(turnServer.credential).toBe(expectedCredential);
    expect(username.startsWith('1700000600:')).toBe(true);
    expect(JSON.stringify(config)).not.toContain(secret);
  });

  it('rejects partial or malformed TURN configuration', () => {
    expect(() => createIceServerConfig({ TURN_SHARED_SECRET: 'secret' }))
      .toThrow('TURN_URLS and TURN_SHARED_SECRET must both be configured.');
    expect(() => createIceServerConfig({
      TURN_URLS: 'https://not-a-turn-server.example',
      TURN_SHARED_SECRET: 'secret',
    })).toThrow('TURN_URLS must contain only valid turn: or turns: URLs.');
  });

  it('supports static TURN_USERNAME and TURN_CREDENTIAL with automatic UDP/TCP transport expansion and priority over TURN_SHARED_SECRET', () => {
    const config = createIceServerConfig({
      TURN_URLS: 'turn:global.relay.metered.ca:80,turn:global.relay.metered.ca:443,turns:global.relay.metered.ca:443',
      TURN_USERNAME: 'metered-user-123',
      TURN_CREDENTIAL: 'metered-pass-456',
      TURN_SHARED_SECRET: 'ignored-when-static-present',
    });

    expect(config.relayAvailable).toBe(true);
    expect(config.expiresAt).toBeNull();
    expect(config.iceServers[1]).toEqual({
      urls: [
        'turn:global.relay.metered.ca:80?transport=udp',
        'turn:global.relay.metered.ca:80?transport=tcp',
        'turn:global.relay.metered.ca:443?transport=udp',
        'turn:global.relay.metered.ca:443?transport=tcp',
        'turns:global.relay.metered.ca:443?transport=tcp',
      ],
      username: 'metered-user-123',
      credential: 'metered-pass-456',
    });
  });
});
