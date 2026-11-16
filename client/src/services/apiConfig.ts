/**
 * API Configuration Helper
 * Resolves backend REST endpoints against the configured backend host.
 * If VITE_API_URL is set, uses that base.
 * Otherwise, if VITE_WEBSOCKET_URL is set (e.g. on Vercel), derives the HTTP base from the WebSocket URL.
 * In local development (or same-host deployment), falls back to relative paths.
 */
export function getBackendApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const explicitApiUrl = import.meta.env.VITE_API_URL?.trim();
  if (explicitApiUrl) {
    return `${explicitApiUrl.replace(/\/+$/, '')}${cleanEndpoint}`;
  }

  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL?.trim();
  if (websocketUrl) {
    try {
      const url = new URL(websocketUrl);
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      return `${url.origin}${cleanEndpoint}`;
    } catch {
      // Ignore URL parsing errors and fall back to relative
    }
  }

  return cleanEndpoint;
}

