/**
 * Hayloo Visitor Identification & Anonymous Client Fingerprint Service
 * Generates and persists a high-entropy, unique visitorId in localStorage.
 * Manages blocked stranger IDs without requiring an account or login.
 */

const VISITOR_ID_STORAGE_KEY = 'hayloo_visitor_id';
const BLOCKED_STRANGERS_STORAGE_KEY = 'blocked_strangers';

/**
 * Generates a lightweight, privacy-preserving client device fingerprint hash.
 */
function generateDeviceFingerprint(): string {
  try {
    const screenInfo = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const lang = navigator.language || 'en';
    const hw = navigator.hardwareConcurrency || 2;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown';

    // Simple canvas fingerprinting
    let canvasHash = 'c0';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('HL', 2, 2);
        canvasHash = canvas.toDataURL().slice(-16);
      }
    } catch {
      // Ignore canvas errors
    }

    const rawString = `${screenInfo}|${tz}|${lang}|${hw}|${platform}|${canvasHash}`;
    
    // Simple 32-bit FNV-1a hash
    let hash = 2166136261;
    for (let i = 0; i < rawString.length; i++) {
      hash ^= rawString.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  } catch {
    return Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Generates a UUID v4 string with cryptographic fallback.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return Array.from(bytes)
      .map((b, i) => ([4, 6, 8, 10].includes(i) ? `-${b.toString(16).padStart(2, '0')}` : b.toString(16).padStart(2, '0')))
      .join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Returns the persistent visitorId from localStorage, or generates, stores, and returns a new one.
 */
export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 6) {
      return existing.trim();
    }
  } catch {
    // LocalStorage might be restricted
  }

  const deviceHash = generateDeviceFingerprint();
  const uuid = generateUUID();
  const visitorId = `vst_${deviceHash}_${uuid.slice(0, 12)}`;

  try {
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
  } catch (err) {
    console.warn('Unable to persist visitorId to localStorage:', err);
  }

  return visitorId;
}

/**
 * Retrieves the array of blocked stranger IDs from localStorage.
 */
export function getBlockedStrangers(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_STRANGERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === 'string' && id.trim().length > 0);
    }
  } catch (err) {
    console.warn('Failed to parse blocked_strangers from localStorage:', err);
  }
  return [];
}

/**
 * Persists a newly blocked stranger's visitorId into localStorage.
 */
export function addBlockedStranger(strangerId: string): void {
  if (!strangerId || typeof strangerId !== 'string') return;
  const cleanId = strangerId.trim();
  if (!cleanId) return;

  try {
    const currentList = getBlockedStrangers();
    if (!currentList.includes(cleanId)) {
      const updated = [...currentList, cleanId];
      localStorage.setItem(BLOCKED_STRANGERS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to save blocked stranger to localStorage:', err);
  }
}

/**
 * Checks if a stranger visitorId is already blocked in localStorage.
 */
export function isStrangerBlocked(strangerId: string): boolean {
  if (!strangerId) return false;
  const currentList = getBlockedStrangers();
  return currentList.includes(strangerId.trim());
}

/**
 * Clears all locally stored blocks (used for privacy resets or testing).
 */
export function clearBlockedStrangers(): void {
  try {
    localStorage.removeItem(BLOCKED_STRANGERS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
