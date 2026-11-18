import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBackendApiUrl } from './apiConfig.ts';

describe('getBackendApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers an explicit VITE_API_URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example/');
    vi.stubEnv('VITE_WEBSOCKET_URL', 'wss://signal.example/ws');
    expect(getBackendApiUrl('/api/translate')).toBe('https://api.example/api/translate');
  });

  it('derives an https origin from a wss:// VITE_WEBSOCKET_URL', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_WEBSOCKET_URL', 'wss://signal.example/ws');
    expect(getBackendApiUrl('/api/translate')).toBe('https://signal.example/api/translate');
  });

  it('keeps https when VITE_WEBSOCKET_URL is given as https:// (avoids mixed content)', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_WEBSOCKET_URL', 'https://signal.example');
    expect(getBackendApiUrl('api/translate')).toBe('https://signal.example/api/translate');
  });

  it('falls back to a relative path when nothing is configured', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_WEBSOCKET_URL', '');
    expect(getBackendApiUrl('/api/translate')).toBe('/api/translate');
  });
});
