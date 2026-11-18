import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getVisitorId,
  getBlockedStrangers,
  addBlockedStranger,
  isStrangerBlocked,
  clearBlockedStrangers,
} from './visitorService.ts';

describe('visitorService (Anonymous Visitor & Block List Management)', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key in store) delete store[key];

    // Mock localStorage in Node environment
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key in store) delete store[key];
      },
    });
  });

  it('generates a stable, high-entropy visitorId and persists to storage', () => {
    const id1 = getVisitorId();
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(10);

    const id2 = getVisitorId();
    expect(id2).toBe(id1);
  });

  it('blocks, checks, and clears blocked stranger IDs correctly', () => {
    const strangerId = 'stranger_bad_actor_999';
    expect(isStrangerBlocked(strangerId)).toBe(false);

    addBlockedStranger(strangerId);
    expect(isStrangerBlocked(strangerId)).toBe(true);

    const blockedList = getBlockedStrangers();
    expect(blockedList).toContain(strangerId);

    clearBlockedStrangers();
    expect(isStrangerBlocked(strangerId)).toBe(false);
  });
});
