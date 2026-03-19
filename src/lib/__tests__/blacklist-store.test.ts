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
import { getBlacklist, addTerm, removeTerm, resetBlacklist, isOrgTerm } from '../blacklist-store';
import { getWorkspaceConfig } from '../workspace-loader';

// Get the default blocked words from the workspace config (SWAPMEAT title)
const TITLE_BLOCKED_WORDS = getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' }).title.blockedWords;

// Scoped localStorage key for the default workspace (one-more-game/swapmeat)
const USER_KEY = 'steambb-blacklist-user-one-more-game-swapmeat';

describe('blacklist-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('title blocked words', () => {
    it('contains hundreds of terms', () => {
      expect(TITLE_BLOCKED_WORDS.length).toBeGreaterThan(650);
    });

    it('is sorted and lowercase', () => {
      for (const term of TITLE_BLOCKED_WORDS) {
        expect(term).toBe(term.toLowerCase());
      }
      const sorted = [...TITLE_BLOCKED_WORDS].sort();
      expect(TITLE_BLOCKED_WORDS).toEqual(sorted);
    });
  });

  describe('getBlacklist', () => {
    it('returns default list when nothing stored', () => {
      expect(getBlacklist()).toEqual(TITLE_BLOCKED_WORDS);
    });

    it('returns defaults plus user terms', () => {
      store[USER_KEY] = JSON.stringify(['custom-term']);
      const result = getBlacklist();
      expect(result).toContain('custom-term');
      expect(result.length).toBe(TITLE_BLOCKED_WORDS.length + 1);
      // Defaults come first
      expect(result.slice(0, TITLE_BLOCKED_WORDS.length)).toEqual(TITLE_BLOCKED_WORDS);
    });

    it('returns default list for corrupted user terms', () => {
      store[USER_KEY] = 'not-json';
      expect(getBlacklist()).toEqual(TITLE_BLOCKED_WORDS);
    });

    it('deduplicates user terms that match defaults', () => {
      store[USER_KEY] = JSON.stringify(['anal', 'custom-term']);
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
      expect(result.length).toBe(TITLE_BLOCKED_WORDS.length + 1);
    });

    it('no-op if term is already a title default', () => {
      addTerm('anal');
      expect(store[USER_KEY]).toBeUndefined();
      expect(getBlacklist()).toEqual(TITLE_BLOCKED_WORDS);
    });

    it('no-op if term is already a title default (case-insensitive)', () => {
      addTerm('ANAL');
      expect(store[USER_KEY]).toBeUndefined();
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
      expect(getBlacklist()).toEqual(TITLE_BLOCKED_WORDS);
    });

    it('does not add whitespace-only string', () => {
      addTerm('   ');
      expect(getBlacklist()).toEqual(TITLE_BLOCKED_WORDS);
    });
  });

  describe('removeTerm', () => {
    it('removes a user-added term', () => {
      addTerm('custom-bad');
      expect(getBlacklist()).toContain('custom-bad');
      removeTerm('custom-bad');
      expect(getBlacklist()).not.toContain('custom-bad');
      expect(getBlacklist()).toEqual(TITLE_BLOCKED_WORDS);
    });

    it('removes user terms case-insensitively', () => {
      addTerm('Custom-Bad');
      removeTerm('custom-bad');
      expect(getBlacklist()).not.toContain('Custom-Bad');
    });

    it('no-op for title default terms — they cannot be removed', () => {
      const before = getBlacklist();
      removeTerm('anal');
      const after = getBlacklist();
      expect(after).toContain('anal');
      expect(after).toEqual(before);
    });

    it('no-op for title defaults regardless of case', () => {
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
      expect(getBlacklist().length).toBe(TITLE_BLOCKED_WORDS.length + 2);
      resetBlacklist();
      expect(getBlacklist()).toEqual(TITLE_BLOCKED_WORDS);
    });

    it('removes user terms localStorage key', () => {
      addTerm('custom');
      resetBlacklist();
      expect(store[USER_KEY]).toBeUndefined();
    });

    it('also removes legacy key if present', () => {
      store['steambb-blacklist-terms'] = JSON.stringify(['old']);
      resetBlacklist();
      expect(store['steambb-blacklist-terms']).toBeUndefined();
    });

    it('title defaults remain after reset', () => {
      resetBlacklist();
      const result = getBlacklist();
      expect(result).toEqual(TITLE_BLOCKED_WORDS);
      expect(result).toContain('anal');
    });
  });

  describe('isOrgTerm', () => {
    it('returns true for title default terms', () => {
      expect(isOrgTerm('anal')).toBe(true);
      expect(isOrgTerm(TITLE_BLOCKED_WORDS[0])).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isOrgTerm('ANAL')).toBe(true);
      expect(isOrgTerm(TITLE_BLOCKED_WORDS[0].toUpperCase())).toBe(true);
    });

    it('returns false for non-default terms', () => {
      expect(isOrgTerm('xyzzy-not-a-word')).toBe(false);
    });

    it('returns false for user-added terms', () => {
      addTerm('custom-term');
      expect(isOrgTerm('custom-term')).toBe(false);
    });
  });

  describe('migration from old storage format', () => {
    it('migrates non-default terms from old key to scoped user terms', () => {
      store['steambb-blacklist-user-terms'] = JSON.stringify(['custom-migrated']);
      const result = getBlacklist();
      expect(result).toContain('custom-migrated');
      // Old key should be deleted
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
      // New scoped key should contain the custom term
      expect(JSON.parse(store[USER_KEY])).toEqual(['custom-migrated']);
    });

    it('handles corrupted old storage', () => {
      store['steambb-blacklist-user-terms'] = 'not-json';
      const result = getBlacklist();
      expect(result).toEqual(TITLE_BLOCKED_WORDS);
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
    });
  });

  describe('combined behavior', () => {
    it('add custom + remove custom works independently of defaults', () => {
      addTerm('my-custom');
      addTerm('another-custom');
      expect(getBlacklist()).toContain('my-custom');
      expect(getBlacklist()).toContain('another-custom');
      expect(getBlacklist()).toContain('anal'); // title default still there

      removeTerm('my-custom');
      expect(getBlacklist()).not.toContain('my-custom');
      expect(getBlacklist()).toContain('another-custom');
      expect(getBlacklist()).toContain('anal');
    });

    it('title defaults are always first in the list', () => {
      addTerm('zzz-custom');
      const result = getBlacklist();
      const defaultsEnd = TITLE_BLOCKED_WORDS.length;
      expect(result.slice(0, defaultsEnd)).toEqual(TITLE_BLOCKED_WORDS);
      expect(result[defaultsEnd]).toBe('zzz-custom');
    });
  });
});
