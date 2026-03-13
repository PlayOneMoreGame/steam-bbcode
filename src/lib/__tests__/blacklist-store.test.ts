import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing the module
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Import after localStorage is mocked
import { getBlacklist, addTerm, removeTerm, resetBlacklist, isOrgTerm, isDefaultBlockedWord, setBlacklist, DEFAULT_BLOCKED_WORDS } from '../blacklist-store';

describe('blacklist-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('DEFAULT_BLOCKED_WORDS', () => {
    it('contains hundreds of terms', () => {
      expect(DEFAULT_BLOCKED_WORDS.length).toBeGreaterThan(650);
    });

    it('is sorted and lowercase', () => {
      for (const term of DEFAULT_BLOCKED_WORDS) {
        expect(term).toBe(term.toLowerCase());
      }
      const sorted = [...DEFAULT_BLOCKED_WORDS].sort();
      expect(DEFAULT_BLOCKED_WORDS).toEqual(sorted);
    });
  });

  describe('getBlacklist', () => {
    it('returns default list when nothing stored', () => {
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('returns defaults plus user terms', () => {
      store['steambb-blacklist-user-terms'] = JSON.stringify(['custom-term']);
      const result = getBlacklist();
      expect(result).toContain('custom-term');
      expect(result.length).toBe(DEFAULT_BLOCKED_WORDS.length + 1);
      // Defaults come first
      expect(result.slice(0, DEFAULT_BLOCKED_WORDS.length)).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('returns default list for corrupted user terms', () => {
      store['steambb-blacklist-user-terms'] = 'not-json';
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('deduplicates user terms that match defaults', () => {
      // If somehow a default term got into user terms, it should be filtered
      store['steambb-blacklist-user-terms'] = JSON.stringify(['anal', 'custom-term']);
      const result = getBlacklist();
      expect(result.filter(t => t === 'anal').length).toBe(1);
      expect(result).toContain('custom-term');
    });
  });

  describe('addTerm', () => {
    it('adds a custom term', () => {
      addTerm('xyzzy-custom');
      const result = getBlacklist();
      expect(result).toContain('xyzzy-custom');
      expect(result.length).toBe(DEFAULT_BLOCKED_WORDS.length + 1);
    });

    it('no-op if term is already an org default', () => {
      addTerm('anal');
      // Should NOT create user terms storage
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('no-op if term is already an org default (case-insensitive)', () => {
      addTerm('ANAL');
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
    });

    it('prevents duplicate user terms (case-insensitive)', () => {
      addTerm('custom-bad');
      addTerm('CUSTOM-BAD');
      const result = getBlacklist();
      expect(result.filter(t => t.toLowerCase() === 'custom-bad').length).toBe(1);
    });

    it('trims whitespace', () => {
      addTerm('  custom-bad  ');
      expect(getBlacklist()).toContain('custom-bad');
    });

    it('does not add empty string', () => {
      addTerm('');
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('does not add whitespace-only string', () => {
      addTerm('   ');
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });
  });

  describe('removeTerm', () => {
    it('removes a user-added term', () => {
      addTerm('custom-bad');
      expect(getBlacklist()).toContain('custom-bad');
      removeTerm('custom-bad');
      expect(getBlacklist()).not.toContain('custom-bad');
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('removes user terms case-insensitively', () => {
      addTerm('Custom-Bad');
      removeTerm('custom-bad');
      expect(getBlacklist()).not.toContain('Custom-Bad');
    });

    it('no-op for org default terms — they cannot be removed', () => {
      const before = getBlacklist();
      removeTerm('anal');
      const after = getBlacklist();
      expect(after).toContain('anal');
      expect(after).toEqual(before);
    });

    it('no-op for org defaults regardless of case', () => {
      removeTerm('ANAL');
      expect(getBlacklist()).toContain('anal');
    });

    it('no-op when term not present', () => {
      addTerm('only-this');
      removeTerm('nothere');
      expect(getBlacklist()).toContain('only-this');
    });
  });

  describe('resetBlacklist', () => {
    it('clears user additions', () => {
      addTerm('custom-a');
      addTerm('custom-b');
      expect(getBlacklist().length).toBe(DEFAULT_BLOCKED_WORDS.length + 2);
      resetBlacklist();
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('removes user terms localStorage key', () => {
      addTerm('custom');
      resetBlacklist();
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
    });

    it('also removes old key if present', () => {
      store['steambb-blacklist-terms'] = JSON.stringify(['old']);
      resetBlacklist();
      expect(store['steambb-blacklist-terms']).toBeUndefined();
    });

    it('org defaults remain after reset', () => {
      resetBlacklist();
      const result = getBlacklist();
      expect(result).toEqual(DEFAULT_BLOCKED_WORDS);
      expect(result).toContain('anal');
    });
  });

  describe('isOrgTerm', () => {
    it('returns true for org default terms', () => {
      expect(isOrgTerm('anal')).toBe(true);
      expect(isOrgTerm(DEFAULT_BLOCKED_WORDS[0])).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isOrgTerm('ANAL')).toBe(true);
      expect(isOrgTerm(DEFAULT_BLOCKED_WORDS[0].toUpperCase())).toBe(true);
    });

    it('returns false for non-default terms', () => {
      expect(isOrgTerm('xyzzy-not-a-word')).toBe(false);
    });

    it('returns false for user-added terms', () => {
      addTerm('custom-term');
      expect(isOrgTerm('custom-term')).toBe(false);
    });
  });

  describe('isDefaultBlockedWord (deprecated alias)', () => {
    it('works the same as isOrgTerm', () => {
      expect(isDefaultBlockedWord('anal')).toBe(true);
      expect(isDefaultBlockedWord('xyzzy')).toBe(false);
    });
  });

  describe('migration from old storage format', () => {
    it('migrates non-default terms from old key to user terms', () => {
      // Simulate old storage: defaults + some custom terms
      store['steambb-blacklist-terms'] = JSON.stringify([
        ...DEFAULT_BLOCKED_WORDS,
        'custom-migrated',
      ]);
      const result = getBlacklist();
      expect(result).toContain('custom-migrated');
      // Old key should be deleted
      expect(store['steambb-blacklist-terms']).toBeUndefined();
      // New key should contain only the custom term
      expect(JSON.parse(store['steambb-blacklist-user-terms'])).toEqual(['custom-migrated']);
    });

    it('migrates empty old storage without creating user terms', () => {
      store['steambb-blacklist-terms'] = '[]';
      const result = getBlacklist();
      expect(result).toEqual(DEFAULT_BLOCKED_WORDS);
      expect(store['steambb-blacklist-terms']).toBeUndefined();
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
    });

    it('migrates old storage that only has defaults', () => {
      store['steambb-blacklist-terms'] = JSON.stringify(DEFAULT_BLOCKED_WORDS);
      const result = getBlacklist();
      expect(result).toEqual(DEFAULT_BLOCKED_WORDS);
      expect(store['steambb-blacklist-terms']).toBeUndefined();
      // No user terms to migrate
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
    });

    it('handles corrupted old storage', () => {
      store['steambb-blacklist-terms'] = 'not-json';
      const result = getBlacklist();
      expect(result).toEqual(DEFAULT_BLOCKED_WORDS);
      expect(store['steambb-blacklist-terms']).toBeUndefined();
    });

    it('migration only runs once', () => {
      store['steambb-blacklist-terms'] = JSON.stringify(['custom-once']);
      getBlacklist(); // triggers migration
      // Old key is gone
      expect(store['steambb-blacklist-terms']).toBeUndefined();
      // Second call should not error
      const result = getBlacklist();
      expect(result).toContain('custom-once');
    });

    it('setBlacklist writes to old key for migration compat', () => {
      setBlacklist(['term1', 'term2']);
      expect(JSON.parse(store['steambb-blacklist-terms'])).toEqual(['term1', 'term2']);
    });
  });

  describe('combined behavior', () => {
    it('add custom + remove custom works independently of defaults', () => {
      addTerm('my-custom');
      addTerm('another-custom');
      expect(getBlacklist()).toContain('my-custom');
      expect(getBlacklist()).toContain('another-custom');
      expect(getBlacklist()).toContain('anal'); // org default still there

      removeTerm('my-custom');
      expect(getBlacklist()).not.toContain('my-custom');
      expect(getBlacklist()).toContain('another-custom');
      expect(getBlacklist()).toContain('anal');
    });

    it('org defaults are always first in the list', () => {
      addTerm('zzz-custom');
      const result = getBlacklist();
      const defaultsEnd = DEFAULT_BLOCKED_WORDS.length;
      expect(result.slice(0, defaultsEnd)).toEqual(DEFAULT_BLOCKED_WORDS);
      expect(result[defaultsEnd]).toBe('zzz-custom');
    });
  });
});
