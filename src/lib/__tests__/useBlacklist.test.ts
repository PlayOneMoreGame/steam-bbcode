import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTermStore, type TermStore } from '@/lib/term-store';

/**
 * Tests for the useBlacklist hook's core algorithm.
 *
 * useBlacklist is a thin React wrapper around createTermStore (blacklist-store).
 * The hook's logic is: load terms from store, expose add/remove/reset that
 * delegate to the store then re-read. We test createTermStore directly with
 * the same config shape used by blacklist-store.
 *
 * React lifecycle (useState, useCallback) is covered by E2E tests.
 */

describe('useBlacklist algorithm simulation', () => {
  let storage: Record<string, string>;

  const mockLocalStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { storage = {}; },
    get length() { return Object.keys(storage).length; },
    key: (index: number) => Object.keys(storage)[index] ?? null,
  };

  const STUDIO_DEFAULTS = ['badword', 'offensive', 'slur'];
  const TITLE_DEFAULTS = ['titleterm', 'gamename'];
  const USER_STORAGE_KEY = 'test-blacklist-user-terms';

  let store: TermStore;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
    store = createTermStore({
      defaults: STUDIO_DEFAULTS,
      titleDefaults: TITLE_DEFAULTS,
      userStorageKey: USER_STORAGE_KEY,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('loads combined studio and title defaults', () => {
      const all = store.getAll();
      expect(all).toEqual([...STUDIO_DEFAULTS, ...TITLE_DEFAULTS]);
    });

    it('loads user terms from localStorage', () => {
      storage[USER_STORAGE_KEY] = JSON.stringify(['myterm']);
      const all = store.getAll();
      expect(all).toContain('myterm');
      expect(all.length).toBe(STUDIO_DEFAULTS.length + TITLE_DEFAULTS.length + 1);
    });

    it('returns defaults when localStorage is empty', () => {
      expect(store.getAll()).toEqual([...STUDIO_DEFAULTS, ...TITLE_DEFAULTS]);
    });

    it('handles corrupted localStorage gracefully', () => {
      storage[USER_STORAGE_KEY] = 'not-valid-json';
      expect(store.getAll()).toEqual([...STUDIO_DEFAULTS, ...TITLE_DEFAULTS]);
    });

    it('handles non-array localStorage value', () => {
      storage[USER_STORAGE_KEY] = JSON.stringify({ not: 'array' });
      expect(store.getAll()).toEqual([...STUDIO_DEFAULTS, ...TITLE_DEFAULTS]);
    });
  });

  describe('adding a user term', () => {
    it('adds a new user term', () => {
      store.add('customword');
      const all = store.getAll();
      expect(all).toContain('customword');
    });

    it('persists user term to localStorage', () => {
      store.add('customword');
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toContain('customword');
    });

    it('does not add duplicate user term (case-insensitive)', () => {
      store.add('customword');
      store.add('CUSTOMWORD');
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toEqual(['customword']);
    });

    it('does not add empty or whitespace-only terms', () => {
      store.add('');
      store.add('   ');
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('trims whitespace from added terms', () => {
      store.add('  padded  ');
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toEqual(['padded']);
    });

    it('does not add a term that is a studio default', () => {
      store.add('badword');
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('does not add a term that is a title default', () => {
      store.add('titleterm');
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('does not add a studio default (case-insensitive)', () => {
      store.add('BADWORD');
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });
  });

  describe('removing a user term', () => {
    it('removes a user-added term', () => {
      store.add('customword');
      store.remove('customword');
      expect(store.getAll()).not.toContain('customword');
    });

    it('removes user term case-insensitively', () => {
      store.add('customword');
      store.remove('CUSTOMWORD');
      expect(store.getAll()).not.toContain('customword');
    });

    it('cannot remove a studio default', () => {
      store.remove('badword');
      expect(store.getAll()).toContain('badword');
    });

    it('cannot remove a title default', () => {
      store.remove('titleterm');
      expect(store.getAll()).toContain('titleterm');
    });

    it('is a no-op for terms not in any tier', () => {
      store.remove('nonexistent');
      expect(store.getAll()).toEqual([...STUDIO_DEFAULTS, ...TITLE_DEFAULTS]);
    });
  });

  describe('reset', () => {
    it('clears all user terms', () => {
      store.add('custom1');
      store.add('custom2');
      store.reset();
      expect(store.getAll()).toEqual([...STUDIO_DEFAULTS, ...TITLE_DEFAULTS]);
    });

    it('removes user storage key from localStorage', () => {
      store.add('custom1');
      store.reset();
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('preserves studio and title defaults after reset', () => {
      store.add('custom1');
      store.reset();
      const all = store.getAll();
      for (const term of [...STUDIO_DEFAULTS, ...TITLE_DEFAULTS]) {
        expect(all).toContain(term);
      }
    });
  });

  describe('combined list deduplication', () => {
    it('deduplicates title defaults against studio defaults', () => {
      const storeWithOverlap = createTermStore({
        defaults: ['shared', 'studioonly'],
        titleDefaults: ['shared', 'titleonly'],
        userStorageKey: USER_STORAGE_KEY,
      });
      const all = storeWithOverlap.getAll();
      expect(all).toEqual(['shared', 'studioonly', 'titleonly']);
    });

    it('deduplicates user terms against both default tiers', () => {
      storage[USER_STORAGE_KEY] = JSON.stringify(['badword', 'titleterm', 'unique']);
      const all = store.getAll();
      // badword and titleterm are already in defaults, so only 'unique' is new
      const uniqueCount = all.filter(t => t === 'unique').length;
      expect(uniqueCount).toBe(1);
      expect(all.length).toBe(STUDIO_DEFAULTS.length + TITLE_DEFAULTS.length + 1);
    });

    it('deduplication is case-insensitive', () => {
      storage[USER_STORAGE_KEY] = JSON.stringify(['BADWORD']);
      const all = store.getAll();
      expect(all.length).toBe(STUDIO_DEFAULTS.length + TITLE_DEFAULTS.length);
    });
  });

  describe('tier identification', () => {
    it('identifies studio defaults', () => {
      expect(store.isDefault('badword')).toBe(true);
      expect(store.isDefault('BADWORD')).toBe(true);
    });

    it('identifies title defaults', () => {
      expect(store.isTitleDefault('titleterm')).toBe(true);
      expect(store.isTitleDefault('TITLETERM')).toBe(true);
    });

    it('does not misidentify user terms as defaults', () => {
      store.add('userword');
      expect(store.isDefault('userword')).toBe(false);
      expect(store.isTitleDefault('userword')).toBe(false);
    });

    it('getTier returns correct tier for each type', () => {
      store.add('userword');
      expect(store.getTier('badword')).toBe('studio');
      expect(store.getTier('titleterm')).toBe('title');
      expect(store.getTier('userword')).toBe('user');
      expect(store.getTier('nonexistent')).toBeNull();
    });
  });

  describe('legacy migration', () => {
    it('migrates user terms from legacy storage key', () => {
      const legacyKey = 'legacy-blacklist';
      const storeWithLegacy = createTermStore({
        defaults: STUDIO_DEFAULTS,
        titleDefaults: TITLE_DEFAULTS,
        userStorageKey: USER_STORAGE_KEY,
        legacyStorageKey: legacyKey,
      });

      // Simulate legacy data: a mix of defaults and user terms
      storage[legacyKey] = JSON.stringify(['badword', 'titleterm', 'legacyuser']);

      const all = storeWithLegacy.getAll();
      expect(all).toContain('legacyuser');
      // Legacy key should be removed after migration
      expect(storage[legacyKey]).toBeUndefined();
    });

    it('filters out defaults during legacy migration', () => {
      const legacyKey = 'legacy-blacklist';
      const storeWithLegacy = createTermStore({
        defaults: STUDIO_DEFAULTS,
        userStorageKey: USER_STORAGE_KEY,
        legacyStorageKey: legacyKey,
      });

      storage[legacyKey] = JSON.stringify(['badword', 'offensive', 'useronly']);
      storeWithLegacy.getAll();

      const migrated = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(migrated).toEqual(['useronly']);
    });
  });
});
