/**
 * API Configuration Helper
 * Resolves backend REST endpoints against the configured backend host.
 * Priority:
 * 1. Explicit VITE_API_URL (normalized to http/https origin)
 * 2. Derived HTTP/HTTPS origin from VITE_WEBSOCKET_URL
 * 3. Canonical production backend origin when running in production on a separate frontend host
 * 4. Relative path in local development/test or same-host deployment
 */

const DEFAULT_PRODUCTION_API_ORIGIN = 'https://ologle-backend.vercel.app';

function normalizeToHttpOrigin(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    url.protocol = url.protocol === 'wss:' || url.protocol === 'https:' ? 'https:' : 'http:';
    return url.origin;
  } catch {
    return null;
  }
}

export function getBackendApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const explicitApiUrl = import.meta.env.VITE_API_URL?.trim();
  if (explicitApiUrl) {
    const origin = normalizeToHttpOrigin(explicitApiUrl);
    if (origin) {
      return `${origin}${cleanEndpoint}`;
    }
    return `${explicitApiUrl.replace(/\/+$/, '')}${cleanEndpoint}`;
  }

  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL?.trim();
  if (websocketUrl) {
    const origin = normalizeToHttpOrigin(websocketUrl);
    if (origin) {
      return `${origin}${cleanEndpoint}`;
    }
  }

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const host = window.location?.host || '';
    if (
      host &&
      !host.includes('localhost') &&
      !host.includes('127.0.0.1') &&
      !host.endsWith('.onrender.com')
    ) {
      return `${DEFAULT_PRODUCTION_API_ORIGIN}${cleanEndpoint}`;
    }
  }

  return cleanEndpoint;
}
