import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTermStore, type TermStore } from '@/lib/term-store';

/**
 * Tests for the useDntTerms hook's core algorithm.
 *
 * useDntTerms is a thin React wrapper around createTermStore (dnt-store).
 * The hook's logic is: load DNT terms from store, expose add/remove/reset
 * that delegate to the store then re-read. We test createTermStore directly
 * with the same config shape used by dnt-store.
 *
 * React lifecycle (useState, useCallback) is covered by E2E tests.
 */

describe('useDntTerms algorithm simulation', () => {
  let storage: Record<string, string>;

  const mockLocalStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { storage = {}; },
    get length() { return Object.keys(storage).length; },
    key: (index: number) => Object.keys(storage)[index] ?? null,
  };

  // Simulate the glossary defaults that dnt-store uses
  const WORKSPACE_DEFAULTS = ['SWAPMEAT', 'MeatStamp', 'Grindhouse'];
  const USER_STORAGE_KEY = 'test-dnt-user-terms';

  let store: TermStore;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
    store = createTermStore({
      defaults: WORKSPACE_DEFAULTS,
      userStorageKey: USER_STORAGE_KEY,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('loads workspace defaults', () => {
      const all = store.getAll();
      expect(all).toEqual(WORKSPACE_DEFAULTS);
    });

    it('includes user terms from localStorage', () => {
      storage[USER_STORAGE_KEY] = JSON.stringify(['CustomTerm']);
      const all = store.getAll();
      expect(all).toContain('CustomTerm');
      expect(all.length).toBe(WORKSPACE_DEFAULTS.length + 1);
    });

    it('returns only defaults when no user terms exist', () => {
      expect(store.getAll()).toEqual(WORKSPACE_DEFAULTS);
    });

    it('handles corrupted localStorage gracefully', () => {
      storage[USER_STORAGE_KEY] = '{broken';
      expect(store.getAll()).toEqual(WORKSPACE_DEFAULTS);
    });
  });

  describe('adding a user term', () => {
    it('adds a new term', () => {
      store.add('NewBrand');
      expect(store.getAll()).toContain('NewBrand');
    });

    it('persists to localStorage', () => {
      store.add('NewBrand');
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toContain('NewBrand');
    });

    it('rejects duplicate terms (case-insensitive)', () => {
      store.add('NewBrand');
      store.add('newbrand');
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toEqual(['NewBrand']);
    });

    it('rejects empty and whitespace terms', () => {
      store.add('');
      store.add('  ');
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('trims whitespace', () => {
      store.add('  Trimmed  ');
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toEqual(['Trimmed']);
    });

    it('does not add a workspace default', () => {
      store.add('SWAPMEAT');
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('does not add a workspace default (case-insensitive)', () => {
      store.add('swapmeat');
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('allows multiple user terms', () => {
      store.add('Term1');
      store.add('Term2');
      store.add('Term3');
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toEqual(['Term1', 'Term2', 'Term3']);
    });
  });

  describe('removing a user term', () => {
    it('removes a user-added term', () => {
      store.add('CustomTerm');
      store.remove('CustomTerm');
      expect(store.getAll()).not.toContain('CustomTerm');
    });

    it('removes case-insensitively', () => {
      store.add('CustomTerm');
      store.remove('customterm');
      expect(store.getAll()).not.toContain('CustomTerm');
    });

    it('cannot remove a workspace default', () => {
      store.remove('SWAPMEAT');
      expect(store.getAll()).toContain('SWAPMEAT');
    });

    it('is a no-op for unknown terms', () => {
      const before = store.getAll();
      store.remove('nonexistent');
      expect(store.getAll()).toEqual(before);
    });

    it('cleans up localStorage when last user term is removed', () => {
      store.add('OnlyTerm');
      store.remove('OnlyTerm');
      // When zero user terms remain, the key is removed entirely
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('clears all user terms', () => {
      store.add('Custom1');
      store.add('Custom2');
      store.reset();
      expect(store.getAll()).toEqual(WORKSPACE_DEFAULTS);
    });

    it('removes user storage key from localStorage', () => {
      store.add('Custom1');
      store.reset();
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });

    it('preserves workspace defaults after reset', () => {
      store.add('Custom1');
      store.reset();
      for (const term of WORKSPACE_DEFAULTS) {
        expect(store.getAll()).toContain(term);
      }
    });

    it('can add user terms again after reset', () => {
      store.add('Custom1');
      store.reset();
      store.add('Custom2');
      expect(store.getAll()).toContain('Custom2');
      expect(store.getAll()).not.toContain('Custom1');
    });
  });

  describe('combined list', () => {
    it('combines defaults and user terms', () => {
      store.add('UserTerm');
      const all = store.getAll();
      expect(all).toEqual([...WORKSPACE_DEFAULTS, 'UserTerm']);
    });

    it('deduplicates user terms against defaults', () => {
      storage[USER_STORAGE_KEY] = JSON.stringify(['SWAPMEAT', 'unique']);
      const all = store.getAll();
      const swapmeatCount = all.filter(t => t.toLowerCase() === 'swapmeat').length;
      expect(swapmeatCount).toBe(1);
      expect(all).toContain('unique');
    });
  });

  describe('tier identification', () => {
    it('identifies workspace defaults', () => {
      expect(store.isDefault('SWAPMEAT')).toBe(true);
      expect(store.isDefault('swapmeat')).toBe(true);
    });

    it('does not misidentify user terms as defaults', () => {
      store.add('UserTerm');
      expect(store.isDefault('UserTerm')).toBe(false);
    });

    it('getTier returns correct tier', () => {
      store.add('UserTerm');
      expect(store.getTier('SWAPMEAT')).toBe('studio');
      expect(store.getTier('UserTerm')).toBe('user');
      expect(store.getTier('nonexistent')).toBeNull();
    });
  });

  describe('setUserTerms', () => {
    it('replaces all user terms', () => {
      store.add('OldTerm');
      store.setUserTerms(['NewTerm1', 'NewTerm2']);
      const all = store.getAll();
      expect(all).not.toContain('OldTerm');
      expect(all).toContain('NewTerm1');
      expect(all).toContain('NewTerm2');
    });

    it('filters out defaults when setting user terms', () => {
      store.setUserTerms(['SWAPMEAT', 'MeatStamp', 'ActualUserTerm']);
      const stored = JSON.parse(storage[USER_STORAGE_KEY]);
      expect(stored).toEqual(['ActualUserTerm']);
    });

    it('clears localStorage when setting empty array', () => {
      store.add('SomeTerm');
      store.setUserTerms([]);
      expect(storage[USER_STORAGE_KEY]).toBeUndefined();
    });
  });

  describe('legacy migration', () => {
    it('migrates from legacy storage key', () => {
      const legacyKey = 'legacy-dnt';
      const storeWithLegacy = createTermStore({
        defaults: WORKSPACE_DEFAULTS,
        userStorageKey: USER_STORAGE_KEY,
        legacyStorageKey: legacyKey,
      });

      storage[legacyKey] = JSON.stringify(['SWAPMEAT', 'LegacyUserTerm']);

      const all = storeWithLegacy.getAll();
      expect(all).toContain('LegacyUserTerm');
      expect(storage[legacyKey]).toBeUndefined();
    });

    it('discards corrupted legacy data', () => {
      const legacyKey = 'legacy-dnt';
      const storeWithLegacy = createTermStore({
        defaults: WORKSPACE_DEFAULTS,
        userStorageKey: USER_STORAGE_KEY,
        legacyStorageKey: legacyKey,
      });

      storage[legacyKey] = 'not-json!!!';
      const all = storeWithLegacy.getAll();
      expect(all).toEqual(WORKSPACE_DEFAULTS);
      expect(storage[legacyKey]).toBeUndefined();
    });
  });
});
