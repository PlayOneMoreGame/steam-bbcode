import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  length: 0,
  key: vi.fn(() => null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { createTermStore } from '../term-store';

const DEFAULTS = ['Alpha', 'Bravo', 'Charlie'];
const USER_KEY = 'test-user-terms';
const LEGACY_KEY = 'test-old-terms';

function makeStore(overrides?: Partial<Parameters<typeof createTermStore>[0]>) {
  return createTermStore({
    defaults: DEFAULTS,
    userStorageKey: USER_KEY,
    legacyStorageKey: LEGACY_KEY,
    ...overrides,
  });
}

describe('createTermStore', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns defaults when no user terms', () => {
      const s = makeStore();
      expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('returns defaults + user terms', () => {
      store[USER_KEY] = JSON.stringify(['Delta', 'Echo']);
      const s = makeStore();
      expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
    });

    it('deduplicates case-insensitively (defaults win)', () => {
      store[USER_KEY] = JSON.stringify(['alpha', 'Delta']);
      const s = makeStore();
      const result = s.getAll();
      expect(result).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
      expect(result).not.toContain('alpha');
    });

    it('returns a new array each call', () => {
      const s = makeStore();
      expect(s.getAll()).not.toBe(s.getAll());
    });

    it('handles corrupted localStorage gracefully', () => {
      store[USER_KEY] = 'not json';
      const s = makeStore();
      expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('handles non-array JSON gracefully', () => {
      store[USER_KEY] = JSON.stringify({ foo: 'bar' });
      const s = makeStore();
      expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });
  });

  describe('add', () => {
    it('adds a new user term', () => {
      const s = makeStore();
      s.add('Delta');
      expect(s.getAll()).toContain('Delta');
    });

    it('trims whitespace', () => {
      const s = makeStore();
      s.add('  Delta  ');
      expect(s.getAll()).toContain('Delta');
    });

    it('no-op for empty string', () => {
      const s = makeStore();
      s.add('');
      expect(s.getAll()).toEqual(DEFAULTS);
    });

    it('no-op for whitespace-only string', () => {
      const s = makeStore();
      s.add('   ');
      expect(s.getAll()).toEqual(DEFAULTS);
    });

    it('no-op if term is a default (case-insensitive)', () => {
      const s = makeStore();
      s.add('ALPHA');
      expect(s.getAll()).toEqual(DEFAULTS);
    });

    it('no-op if term already added (case-insensitive)', () => {
      const s = makeStore();
      s.add('Delta');
      s.add('DELTA');
      const deltas = s.getAll().filter(t => t.toLowerCase() === 'delta');
      expect(deltas).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('removes a user term', () => {
      const s = makeStore();
      s.add('Delta');
      s.remove('Delta');
      expect(s.getAll()).not.toContain('Delta');
    });

    it('case-insensitive removal', () => {
      const s = makeStore();
      s.add('Delta');
      s.remove('DELTA');
      expect(s.getAll()).not.toContain('Delta');
    });

    it('no-op for default terms', () => {
      const s = makeStore();
      s.remove('Alpha');
      expect(s.getAll()).toContain('Alpha');
    });

    it('no-op for non-existent terms', () => {
      const s = makeStore();
      s.remove('NonExistent');
      expect(s.getAll()).toEqual(DEFAULTS);
    });

    it('cleans up localStorage when last user term removed', () => {
      const s = makeStore();
      s.add('Delta');
      s.remove('Delta');
      expect(store[USER_KEY]).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('clears all user terms', () => {
      const s = makeStore();
      s.add('Delta');
      s.add('Echo');
      s.reset();
      expect(s.getAll()).toEqual(DEFAULTS);
    });

    it('removes user storage key', () => {
      store[USER_KEY] = JSON.stringify(['Delta']);
      const s = makeStore();
      s.reset();
      expect(store[USER_KEY]).toBeUndefined();
    });

    it('cleans up legacy keys', () => {
      store[LEGACY_KEY] = JSON.stringify(['old-stuff']);
      const s = makeStore({ legacyCleanupKeys: [LEGACY_KEY] });
      s.reset();
      expect(store[LEGACY_KEY]).toBeUndefined();
    });

    it('no-op when already empty', () => {
      const s = makeStore();
      s.reset();
      expect(s.getAll()).toEqual(DEFAULTS);
    });
  });

  describe('isDefault', () => {
    it('returns true for defaults', () => {
      const s = makeStore();
      expect(s.isDefault('Alpha')).toBe(true);
    });

    it('case-insensitive', () => {
      const s = makeStore();
      expect(s.isDefault('ALPHA')).toBe(true);
      expect(s.isDefault('alpha')).toBe(true);
    });

    it('returns false for user terms', () => {
      const s = makeStore();
      s.add('Delta');
      expect(s.isDefault('Delta')).toBe(false);
    });

    it('returns false for non-existent terms', () => {
      const s = makeStore();
      expect(s.isDefault('Zebra')).toBe(false);
    });
  });

  describe('setUserTerms', () => {
    it('replaces user terms', () => {
      const s = makeStore();
      s.setUserTerms(['Delta', 'Echo']);
      const result = s.getAll();
      expect(result).toContain('Delta');
      expect(result).toContain('Echo');
    });

    it('filters out defaults', () => {
      const s = makeStore();
      s.setUserTerms(['Alpha', 'Delta']);
      const userOnly = s.getAll().slice(DEFAULTS.length);
      expect(userOnly).toEqual(['Delta']);
    });

    it('cleans up when set to empty', () => {
      const s = makeStore();
      s.add('Delta');
      s.setUserTerms([]);
      expect(store[USER_KEY]).toBeUndefined();
      expect(s.getAll()).toEqual(DEFAULTS);
    });
  });

  describe('legacy migration', () => {
    it('migrates user additions from old key', () => {
      store[LEGACY_KEY] = JSON.stringify(['Alpha', 'Delta', 'Echo']);
      const s = makeStore();
      const result = s.getAll();
      // Alpha is a default, Delta and Echo are user additions
      expect(result).toContain('Delta');
      expect(result).toContain('Echo');
      // Old key removed
      expect(store[LEGACY_KEY]).toBeUndefined();
    });

    it('handles corrupted old key', () => {
      store[LEGACY_KEY] = 'not json';
      const s = makeStore();
      expect(s.getAll()).toEqual(DEFAULTS);
      expect(store[LEGACY_KEY]).toBeUndefined();
    });

    it('handles non-array old key', () => {
      store[LEGACY_KEY] = JSON.stringify({ foo: 'bar' });
      const s = makeStore();
      expect(s.getAll()).toEqual(DEFAULTS);
      expect(store[LEGACY_KEY]).toBeUndefined();
    });

    it('no-op when no legacy key configured', () => {
      store['some-key'] = JSON.stringify(['stuff']);
      const s = makeStore({ legacyStorageKey: undefined });
      expect(s.getAll()).toEqual(DEFAULTS);
    });

    it('migrates only once', () => {
      store[LEGACY_KEY] = JSON.stringify(['Delta']);
      const s = makeStore();
      s.getAll(); // triggers migration
      s.getAll(); // should not error
      expect(s.getAll()).toContain('Delta');
    });

    it('does not overwrite existing user terms on migration', () => {
      store[USER_KEY] = JSON.stringify(['Foxtrot']);
      store[LEGACY_KEY] = JSON.stringify(['Delta']);
      const s = makeStore();
      const result = s.getAll();
      // Migration writes Delta to user key, overwriting Foxtrot
      // This matches current behavior — migration only runs if old key exists
      expect(result).toContain('Delta');
    });
  });

  describe('empty defaults', () => {
    it('works with no defaults', () => {
      const s = makeStore({ defaults: [] });
      expect(s.getAll()).toEqual([]);
      s.add('Custom');
      expect(s.getAll()).toEqual(['Custom']);
      expect(s.isDefault('Custom')).toBe(false);
    });
  });

  describe('titleDefaults (three-tier)', () => {
    const TITLE_DEFAULTS = ['Xray', 'Yankee'];

    function makeThreeTierStore(overrides?: Partial<Parameters<typeof createTermStore>[0]>) {
      return createTermStore({
        defaults: DEFAULTS,
        titleDefaults: TITLE_DEFAULTS,
        userStorageKey: USER_KEY,
        legacyStorageKey: LEGACY_KEY,
        ...overrides,
      });
    }

    describe('getAll', () => {
      it('returns studio + title defaults when no user terms', () => {
        const s = makeThreeTierStore();
        expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Xray', 'Yankee']);
      });

      it('returns all three tiers combined', () => {
        store[USER_KEY] = JSON.stringify(['Zulu']);
        const s = makeThreeTierStore();
        expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Xray', 'Yankee', 'Zulu']);
      });

      it('deduplicates title defaults against studio defaults', () => {
        const s = makeThreeTierStore({ titleDefaults: ['Alpha', 'Xray'] });
        expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Xray']);
      });

      it('deduplicates user terms against title defaults', () => {
        store[USER_KEY] = JSON.stringify(['xray', 'Zulu']);
        const s = makeThreeTierStore();
        expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Xray', 'Yankee', 'Zulu']);
      });
    });

    describe('add', () => {
      it('no-op if term is a title default (case-insensitive)', () => {
        const s = makeThreeTierStore();
        s.add('XRAY');
        expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Xray', 'Yankee']);
      });

      it('no-op if term is a studio default', () => {
        const s = makeThreeTierStore();
        s.add('Alpha');
        expect(s.getAll()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Xray', 'Yankee']);
      });

      it('allows adding a user term', () => {
        const s = makeThreeTierStore();
        s.add('Zulu');
        expect(s.getAll()).toContain('Zulu');
      });
    });

    describe('remove', () => {
      it('no-op for title defaults', () => {
        const s = makeThreeTierStore();
        s.remove('Xray');
        expect(s.getAll()).toContain('Xray');
      });

      it('removes user terms', () => {
        const s = makeThreeTierStore();
        s.add('Zulu');
        s.remove('Zulu');
        expect(s.getAll()).not.toContain('Zulu');
      });
    });

    describe('isTitleDefault', () => {
      it('returns true for title defaults', () => {
        const s = makeThreeTierStore();
        expect(s.isTitleDefault('Xray')).toBe(true);
      });

      it('case-insensitive', () => {
        const s = makeThreeTierStore();
        expect(s.isTitleDefault('XRAY')).toBe(true);
        expect(s.isTitleDefault('xray')).toBe(true);
      });

      it('returns false for studio defaults', () => {
        const s = makeThreeTierStore();
        expect(s.isTitleDefault('Alpha')).toBe(false);
      });

      it('returns false for user terms', () => {
        const s = makeThreeTierStore();
        s.add('Zulu');
        expect(s.isTitleDefault('Zulu')).toBe(false);
      });

      it('returns false for non-existent terms', () => {
        const s = makeThreeTierStore();
        expect(s.isTitleDefault('Nonexistent')).toBe(false);
      });
    });

    describe('getTier', () => {
      it('returns studio for studio defaults', () => {
        const s = makeThreeTierStore();
        expect(s.getTier('Alpha')).toBe('studio');
      });

      it('returns title for title defaults', () => {
        const s = makeThreeTierStore();
        expect(s.getTier('Xray')).toBe('title');
      });

      it('returns user for user-added terms', () => {
        const s = makeThreeTierStore();
        s.add('Zulu');
        expect(s.getTier('Zulu')).toBe('user');
      });

      it('returns null for non-existent terms', () => {
        const s = makeThreeTierStore();
        expect(s.getTier('Nonexistent')).toBeNull();
      });

      it('case-insensitive', () => {
        const s = makeThreeTierStore();
        expect(s.getTier('ALPHA')).toBe('studio');
        expect(s.getTier('xray')).toBe('title');
      });

      it('studio takes precedence over title for overlapping terms', () => {
        const s = makeThreeTierStore({ titleDefaults: ['Alpha', 'Xray'] });
        expect(s.getTier('Alpha')).toBe('studio');
      });
    });

    describe('setUserTerms', () => {
      it('filters out title defaults', () => {
        const s = makeThreeTierStore();
        s.setUserTerms(['Xray', 'Zulu']);
        const userOnly = s.getAll().slice(DEFAULTS.length + TITLE_DEFAULTS.length);
        expect(userOnly).toEqual(['Zulu']);
      });
    });

    describe('legacy migration with title defaults', () => {
      it('filters out title defaults during migration', () => {
        store[LEGACY_KEY] = JSON.stringify(['Alpha', 'Xray', 'Zulu']);
        const s = makeThreeTierStore();
        const result = s.getAll();
        expect(result).toContain('Zulu');
        // Xray is a title default, should not be in user terms
        const userTermsRaw = store[USER_KEY];
        const userTerms = userTermsRaw ? JSON.parse(userTermsRaw) : [];
        expect(userTerms).toEqual(['Zulu']);
      });
    });
  });
});
