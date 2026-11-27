import crypto from 'crypto';

const STUN_URLS = [
  'stun:stun.cloudflare.com:3478',
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun.services.mozilla.com',
];

export interface IceServerConfig {
  iceServers: RTCIceServer[];
  relayAvailable: boolean;
  expiresAt: number | null;
}

/**
 * Expands a list of raw TURN URLs to include both UDP and TCP transport variants
 * if no transport is explicitly specified in the query parameters.
 */
function expandTurnTransports(rawUrls: string[]): string[] {
  const result: string[] = [];
  for (const raw of rawUrls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.includes('?transport=')) {
      result.push(trimmed);
    } else if (/^turns:/i.test(trimmed)) {
      const separator = trimmed.includes('?') ? '&' : '?';
      result.push(`${trimmed}${separator}transport=tcp`);
    } else {
      const separator = trimmed.includes('?') ? '&' : '?';
      result.push(`${trimmed}${separator}transport=udp`);
      result.push(`${trimmed}${separator}transport=tcp`);
    }
  }
  return result;
}

export function createIceServerConfig(
  env: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now()
): IceServerConfig {
  const rawTurnUrls = (env.TURN_URLS || env.METERED_URLS || env.COTURN_URLS || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const sharedSecret = (
    env.TURN_SHARED_SECRET ||
    env.METERED_SECRET_KEY ||
    env.METERED_API_KEY ||
    env.COTURN_SHARED_SECRET ||
    env.TURN_SECRET
  )?.trim();

  const staticUsername = (env.TURN_USERNAME || env.TURN_USER)?.trim();
  const staticCredential = (env.TURN_CREDENTIAL || env.TURN_PASSWORD || env.TURN_PASS)?.trim();

  if (rawTurnUrls.length === 0 && !sharedSecret && !staticUsername) {
    return {
      iceServers: [{ urls: STUN_URLS }],
      relayAvailable: false,
      expiresAt: null,
    };
  }

  if (sharedSecret && rawTurnUrls.length === 0) {
    throw new Error('TURN_URLS and TURN_SHARED_SECRET must both be configured.');
  }

  if ((staticUsername || staticCredential) && rawTurnUrls.length === 0) {
    throw new Error('TURN_URLS must be configured when TURN_USERNAME/TURN_CREDENTIAL are set.');
  }

  if (rawTurnUrls.some((url) => !/^turns?:[^\s,]+$/i.test(url))) {
    throw new Error('TURN_URLS must contain only valid turn: or turns: URLs.');
  }

  const expandedUrls = expandTurnTransports(rawTurnUrls);

  if (sharedSecret) {
    const ttlSeconds = Number(env.TURN_CREDENTIAL_TTL_SECONDS || 600);
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 86400) {
      throw new Error('TURN_CREDENTIAL_TTL_SECONDS must be an integer from 60 to 86400.');
    }

    const expiresAt = Math.floor(nowMs / 1000) + ttlSeconds;
    const username = `${expiresAt}:${crypto.randomBytes(12).toString('hex')}`;
    const credential = crypto.createHmac('sha1', sharedSecret).update(username).digest('base64');

    return {
      iceServers: [
        { urls: STUN_URLS },
        { urls: expandedUrls, username, credential },
      ],
      relayAvailable: true,
      expiresAt,
    };
  }

  if (staticUsername && staticCredential) {
    return {
      iceServers: [
        { urls: STUN_URLS },
        { urls: expandedUrls, username: staticUsername, credential: staticCredential },
      ],
      relayAvailable: true,
      expiresAt: null,
    };
  }

  throw new Error('TURN_URLS and TURN_SHARED_SECRET (or TURN_USERNAME and TURN_CREDENTIAL) must both be configured.');
}
