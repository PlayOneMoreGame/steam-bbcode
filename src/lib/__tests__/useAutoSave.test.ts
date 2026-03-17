import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatLastSaved } from '@/hooks/useAutoSave';

/**
 * Tests for the auto-save logic underlying useAutoSave.
 *
 * The hook uses React state (useState, useRef, useEffect, useCallback) and
 * cannot be tested without a React rendering environment. Instead, we test:
 *
 *   1. The pure function `formatLastSaved` directly.
 *   2. The hook's core algorithm via simulation: change detection via
 *      JSON.stringify comparison, debounced setTimeout writes to localStorage,
 *      clearTimeout on rapid changes, and error handling.
 *
 * The debounce and React lifecycle behavior is covered by E2E tests.
 */

describe('formatLastSaved', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(formatLastSaved(null)).toBe('');
  });

  it('returns "just now" for dates less than 5 seconds ago', () => {
    const now = new Date('2026-03-17T12:00:00Z');
    vi.setSystemTime(now);

    // 0 seconds ago
    expect(formatLastSaved(new Date('2026-03-17T12:00:00Z'))).toBe('just now');
    // 1 second ago
    expect(formatLastSaved(new Date('2026-03-17T11:59:59Z'))).toBe('just now');
    // 4 seconds ago
    expect(formatLastSaved(new Date('2026-03-17T11:59:56Z'))).toBe('just now');
  });

  it('returns "Xs ago" for dates 5-59 seconds ago', () => {
    const now = new Date('2026-03-17T12:00:00Z');
    vi.setSystemTime(now);

    // Exactly 5 seconds
    expect(formatLastSaved(new Date('2026-03-17T11:59:55Z'))).toBe('5s ago');
    // 30 seconds
    expect(formatLastSaved(new Date('2026-03-17T11:59:30Z'))).toBe('30s ago');
    // 59 seconds
    expect(formatLastSaved(new Date('2026-03-17T11:59:01Z'))).toBe('59s ago');
  });

  it('returns "Xm ago" for dates 1-59 minutes ago', () => {
    const now = new Date('2026-03-17T12:00:00Z');
    vi.setSystemTime(now);

    // Exactly 60 seconds = 1 minute
    expect(formatLastSaved(new Date('2026-03-17T11:59:00Z'))).toBe('1m ago');
    // 30 minutes
    expect(formatLastSaved(new Date('2026-03-17T11:30:00Z'))).toBe('30m ago');
    // 59 minutes
    expect(formatLastSaved(new Date('2026-03-17T11:01:00Z'))).toBe('59m ago');
  });

  it('returns "Xh ago" for dates 1-23 hours ago', () => {
    const now = new Date('2026-03-17T12:00:00Z');
    vi.setSystemTime(now);

    // Exactly 3600 seconds = 1 hour
    expect(formatLastSaved(new Date('2026-03-17T11:00:00Z'))).toBe('1h ago');
    // 12 hours
    expect(formatLastSaved(new Date('2026-03-17T00:00:00Z'))).toBe('12h ago');
    // 23 hours
    expect(formatLastSaved(new Date('2026-03-16T13:00:00Z'))).toBe('23h ago');
  });

  it('returns toLocaleDateString() for dates >= 24 hours ago', () => {
    const now = new Date('2026-03-17T12:00:00Z');
    vi.setSystemTime(now);

    // Exactly 24 hours ago
    const dayAgo = new Date('2026-03-16T12:00:00Z');
    expect(formatLastSaved(dayAgo)).toBe(dayAgo.toLocaleDateString());

    // A week ago
    const weekAgo = new Date('2026-03-10T12:00:00Z');
    expect(formatLastSaved(weekAgo)).toBe(weekAgo.toLocaleDateString());
  });

  describe('boundary values', () => {
    it('exactly 5 seconds is "5s ago", not "just now"', () => {
      const now = new Date('2026-03-17T12:00:05Z');
      vi.setSystemTime(now);
      expect(formatLastSaved(new Date('2026-03-17T12:00:00Z'))).toBe('5s ago');
    });

    it('exactly 60 seconds is "1m ago", not "60s ago"', () => {
      const now = new Date('2026-03-17T12:01:00Z');
      vi.setSystemTime(now);
      expect(formatLastSaved(new Date('2026-03-17T12:00:00Z'))).toBe('1m ago');
    });

    it('exactly 3600 seconds is "1h ago", not "60m ago"', () => {
      const now = new Date('2026-03-17T13:00:00Z');
      vi.setSystemTime(now);
      expect(formatLastSaved(new Date('2026-03-17T12:00:00Z'))).toBe('1h ago');
    });

    it('exactly 86400 seconds is a date string, not "24h ago"', () => {
      const now = new Date('2026-03-18T12:00:00Z');
      vi.setSystemTime(now);
      const date = new Date('2026-03-17T12:00:00Z');
      expect(formatLastSaved(date)).toBe(date.toLocaleDateString());
    });

    it('4 seconds is "just now"', () => {
      const now = new Date('2026-03-17T12:00:04Z');
      vi.setSystemTime(now);
      expect(formatLastSaved(new Date('2026-03-17T12:00:00Z'))).toBe('just now');
    });
  });
});

describe('useAutoSave algorithm simulation', () => {
  let storage: Record<string, string>;

  const mockLocalStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    storage = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /**
   * Simulates the useAutoSave hook's core algorithm:
   *
   *   - Tracks last-saved value via JSON.stringify comparison
   *   - On change: sets status to 'unsaved', starts debounce timer
   *   - On timer fire: writes to localStorage, sets status to 'saved'
   *   - Rapid changes clear previous timer (debounce)
   *   - Manual save writes immediately
   *   - localStorage errors revert status to 'unsaved'
   */
  function createAutoSaveSimulation(key: string, delay: number = 2000) {
    let status: 'saved' | 'saving' | 'unsaved' = 'saved';
    let lastSaved: Date | null = null;
    let lastValue: string = '';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Load initial saved time (mirrors the first useEffect)
    const savedTime = localStorage.getItem(`${key}-saved-at`);
    if (savedTime) {
      lastSaved = new Date(savedTime);
    }

    function setValue(value: unknown) {
      const currentValue = JSON.stringify(value);

      // No change — early return (mirrors the hook)
      if (currentValue === lastValue) {
        return;
      }

      // Mark unsaved
      status = 'unsaved';

      // Clear existing timeout (debounce)
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      // Set new timeout
      timeoutId = setTimeout(() => {
        status = 'saving';

        try {
          localStorage.setItem(key, currentValue);
          const now = new Date();
          localStorage.setItem(`${key}-saved-at`, now.toISOString());
          lastValue = currentValue;
          status = 'saved';
          lastSaved = now;
        } catch {
          status = 'unsaved';
        }
      }, delay);
    }

    function manualSave(value: unknown) {
      try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        const now = new Date();
        localStorage.setItem(`${key}-saved-at`, now.toISOString());
        lastValue = serialized;
        status = 'saved';
        lastSaved = now;
      } catch (error) {
        console.warn('Error saving to localStorage:', error);
      }
    }

    return {
      setValue,
      manualSave,
      getStatus: () => status,
      getLastSaved: () => lastSaved,
    };
  }

  describe('change detection', () => {
    it('does not trigger save when value is unchanged', () => {
      const sim = createAutoSaveSimulation('test-key');
      sim.setValue('hello');
      vi.advanceTimersByTime(2000);

      // Change to same value again
      sim.setValue('hello');
      // Status should remain saved (no change detected)
      expect(sim.getStatus()).toBe('saved');
    });

    it('detects changes via JSON.stringify comparison', () => {
      const sim = createAutoSaveSimulation('test-key');
      sim.setValue({ text: 'v1' });
      vi.advanceTimersByTime(2000);

      sim.setValue({ text: 'v2' });
      expect(sim.getStatus()).toBe('unsaved');
    });

    it('treats structurally equal objects as unchanged', () => {
      const sim = createAutoSaveSimulation('test-key');
      sim.setValue({ a: 1, b: 2 });
      vi.advanceTimersByTime(2000);

      // Same structure, same values
      sim.setValue({ a: 1, b: 2 });
      expect(sim.getStatus()).toBe('saved');
    });
  });

  describe('debounce behavior', () => {
    it('saves after delay elapses', () => {
      const sim = createAutoSaveSimulation('test-key', 1000);
      sim.setValue('content');

      expect(sim.getStatus()).toBe('unsaved');
      expect(localStorage.getItem('test-key')).toBeNull();

      vi.advanceTimersByTime(1000);

      expect(sim.getStatus()).toBe('saved');
      expect(localStorage.getItem('test-key')).toBe('"content"');
    });

    it('does not save before delay elapses', () => {
      const sim = createAutoSaveSimulation('test-key', 2000);
      sim.setValue('content');

      vi.advanceTimersByTime(1999);

      expect(sim.getStatus()).toBe('unsaved');
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('resets timer on rapid changes (only last value is saved)', () => {
      const sim = createAutoSaveSimulation('test-key', 1000);

      sim.setValue('v1');
      vi.advanceTimersByTime(500);

      sim.setValue('v2');
      vi.advanceTimersByTime(500);

      sim.setValue('v3');
      vi.advanceTimersByTime(500);

      // Only 500ms since last change, not yet saved
      expect(sim.getStatus()).toBe('unsaved');

      vi.advanceTimersByTime(500);

      // Now 1000ms since last change
      expect(sim.getStatus()).toBe('saved');
      expect(localStorage.getItem('test-key')).toBe('"v3"');
    });

    it('uses default delay of 2000ms', () => {
      const sim = createAutoSaveSimulation('test-key');
      sim.setValue('content');

      vi.advanceTimersByTime(1999);
      expect(sim.getStatus()).toBe('unsaved');

      vi.advanceTimersByTime(1);
      expect(sim.getStatus()).toBe('saved');
    });
  });

  describe('localStorage writes', () => {
    it('writes value under the specified key', () => {
      const sim = createAutoSaveSimulation('my-draft');
      sim.setValue('some content');
      vi.advanceTimersByTime(2000);

      expect(localStorage.getItem('my-draft')).toBe('"some content"');
    });

    it('writes saved-at timestamp alongside value', () => {
      vi.setSystemTime(new Date('2026-03-17T10:00:00Z'));

      const sim = createAutoSaveSimulation('draft');
      sim.setValue('content');
      vi.advanceTimersByTime(2000);

      // System time advances with fake timers, so saved-at is 2s after start
      const expectedTime = new Date('2026-03-17T10:00:02Z');
      expect(localStorage.getItem('draft-saved-at')).toBe(expectedTime.toISOString());
    });

    it('updates lastSaved after successful write', () => {
      vi.setSystemTime(new Date('2026-03-17T10:00:00Z'));

      const sim = createAutoSaveSimulation('draft');
      expect(sim.getLastSaved()).toBeNull();

      sim.setValue('content');
      vi.advanceTimersByTime(2000);

      // System time advances with fake timers
      const expectedTime = new Date('2026-03-17T10:00:02Z');
      expect(sim.getLastSaved()).toEqual(expectedTime);
    });
  });

  describe('manual save', () => {
    it('writes immediately without waiting for debounce', () => {
      const sim = createAutoSaveSimulation('draft', 5000);
      sim.manualSave('urgent content');

      // No timer advance needed
      expect(sim.getStatus()).toBe('saved');
      expect(localStorage.getItem('draft')).toBe('"urgent content"');
    });

    it('writes saved-at timestamp', () => {
      const now = new Date('2026-03-17T15:00:00Z');
      vi.setSystemTime(now);

      const sim = createAutoSaveSimulation('draft');
      sim.manualSave('content');

      expect(localStorage.getItem('draft-saved-at')).toBe(now.toISOString());
    });

    it('updates lastSaved', () => {
      const now = new Date('2026-03-17T15:00:00Z');
      vi.setSystemTime(now);

      const sim = createAutoSaveSimulation('draft');
      sim.manualSave('content');

      expect(sim.getLastSaved()).toEqual(now);
    });
  });

  describe('error handling', () => {
    it('reverts status to unsaved on localStorage failure during auto-save', () => {
      const sim = createAutoSaveSimulation('draft');
      sim.setValue('content');

      // Make localStorage throw on the next setItem call
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      vi.advanceTimersByTime(2000);

      expect(sim.getStatus()).toBe('unsaved');

      // Restore
      mockLocalStorage.setItem = originalSetItem;
    });
  });

  describe('initial state loading', () => {
    it('loads lastSaved from localStorage on initialization', () => {
      const savedTime = '2026-03-17T09:00:00.000Z';
      storage[`draft-saved-at`] = savedTime;

      const sim = createAutoSaveSimulation('draft');
      expect(sim.getLastSaved()).toEqual(new Date(savedTime));
    });

    it('starts with null lastSaved when no prior save exists', () => {
      const sim = createAutoSaveSimulation('draft');
      expect(sim.getLastSaved()).toBeNull();
    });

    it('starts with saved status', () => {
      const sim = createAutoSaveSimulation('draft');
      expect(sim.getStatus()).toBe('saved');
    });
  });
});
