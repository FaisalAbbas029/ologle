import crypto from 'crypto';

const STUN_URLS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
];

export interface IceServerConfig {
  iceServers: RTCIceServer[];
  relayAvailable: boolean;
  expiresAt: number | null;
}

export function createIceServerConfig(
  env: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now()
): IceServerConfig {
  const rawTurnUrls = (env.TURN_URLS || '').split(',').map((url) => url.trim()).filter(Boolean);
  const sharedSecret = env.TURN_SHARED_SECRET?.trim();

  if (rawTurnUrls.length === 0 && !sharedSecret) {
    return {
      iceServers: [{ urls: STUN_URLS }],
      relayAvailable: false,
      expiresAt: null,
    };
  }

  if (rawTurnUrls.length === 0 || !sharedSecret) {
    throw new Error('TURN_URLS and TURN_SHARED_SECRET must both be configured.');
  }

  if (rawTurnUrls.some((url) => !/^turns?:[^\s,]+$/i.test(url))) {
    throw new Error('TURN_URLS must contain only valid turn: or turns: URLs.');
  }

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
      { urls: rawTurnUrls, username, credential },
    ],
    relayAvailable: true,
    expiresAt,
  };
}
