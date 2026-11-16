import { resolveWebSocketUrl } from './ologleSocket.ts';

interface IceServerResponse {
  iceServers: RTCIceServer[];
  relayAvailable: boolean;
  expiresAt: number | null;
}

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

let cachedConfig: IceServerResponse | null = null;
let cachedUntil = 0;

function isIceServer(value: unknown): value is RTCIceServer {
  if (!value || typeof value !== 'object') return false;
  const server = value as Record<string, unknown>;
  const hasValidUrls = typeof server.urls === 'string' ||
    (Array.isArray(server.urls) && server.urls.every((url) => typeof url === 'string'));

  return hasValidUrls &&
    (server.username === undefined || typeof server.username === 'string') &&
    (server.credential === undefined || typeof server.credential === 'string');
}

export async function fetchIceServerConfig(): Promise<IceServerResponse> {
  if (cachedConfig && cachedUntil > Date.now()) {
    return cachedConfig;
  }

  const websocketUrl = resolveWebSocketUrl(
    import.meta.env.VITE_WEBSOCKET_URL,
    import.meta.env.PROD,
    window.location.protocol,
    window.location.host
  );
  const apiUrl = new URL(websocketUrl);
  apiUrl.protocol = apiUrl.protocol === 'wss:' ? 'https:' : 'http:';
  apiUrl.pathname = '/api/ice-servers';
  apiUrl.search = '';

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`ICE server configuration request failed (${response.status}).`);
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object') {
      throw new Error('ICE server configuration response is invalid.');
    }
    const config = payload as Record<string, unknown>;
    let expiresAt: number | null;
    if (config.expiresAt === null) {
      expiresAt = null;
    } else if (typeof config.expiresAt === 'number') {
      expiresAt = config.expiresAt;
    } else {
      throw new Error('ICE server configuration response is invalid.');
    }

    if (
      !Array.isArray(config.iceServers) ||
      config.iceServers.length === 0 ||
      !config.iceServers.every(isIceServer) ||
      typeof config.relayAvailable !== 'boolean'
    ) {
      throw new Error('ICE server configuration response is invalid.');
    }

    const result: IceServerResponse = {
      iceServers: config.iceServers,
      relayAvailable: config.relayAvailable,
      expiresAt,
    };
    cachedConfig = result;
    cachedUntil = result.expiresAt
      ? Math.max(Date.now(), result.expiresAt * 1000 - 60_000)
      : Date.now() + 5 * 60_000;
    return result;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getFallbackIceServers(): RTCIceServer[] {
  return FALLBACK_ICE_SERVERS;
}
