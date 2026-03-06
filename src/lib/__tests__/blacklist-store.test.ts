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
import { getBlacklist, setBlacklist, addTerm, removeTerm, DEFAULT_BLOCKED_WORDS, resetBlacklist, isDefaultBlockedWord } from '../blacklist-store';

describe('blacklist-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('DEFAULT_BLOCKED_WORDS', () => {
    it('contains hundreds of terms', () => {
      expect(DEFAULT_BLOCKED_WORDS.length).toBeGreaterThan(700);
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

    it('returns stored terms', () => {
      store['steambb-blacklist-terms'] = JSON.stringify(['bad', 'worse']);
      expect(getBlacklist()).toEqual(['bad', 'worse']);
    });

    it('returns default list for corrupted JSON', () => {
      store['steambb-blacklist-terms'] = 'not-json';
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('returns default list for non-array JSON', () => {
      store['steambb-blacklist-terms'] = '{"not": "array"}';
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });
  });

  describe('setBlacklist', () => {
    it('saves terms to localStorage', () => {
      setBlacklist(['term1', 'term2']);
      expect(JSON.parse(store['steambb-blacklist-terms'])).toEqual(['term1', 'term2']);
    });

    it('overwrites existing terms', () => {
      setBlacklist(['old']);
      setBlacklist(['new']);
      expect(getBlacklist()).toEqual(['new']);
    });
  });

  describe('addTerm', () => {
    it('adds a term to the list', () => {
      setBlacklist([]);
      addTerm('bad');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('adds a term to existing list', () => {
      setBlacklist(['existing']);
      addTerm('new');
      expect(getBlacklist()).toEqual(['existing', 'new']);
    });

    it('prevents duplicates (case-insensitive)', () => {
      setBlacklist([]);
      addTerm('bad');
      addTerm('BAD');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('prevents duplicates (exact match)', () => {
      setBlacklist([]);
      addTerm('bad');
      addTerm('bad');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('trims whitespace', () => {
      setBlacklist([]);
      addTerm('  bad  ');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('does not add empty string', () => {
      setBlacklist([]);
      addTerm('');
      expect(getBlacklist()).toEqual([]);
    });

    it('does not add whitespace-only string', () => {
      setBlacklist([]);
      addTerm('   ');
      expect(getBlacklist()).toEqual([]);
    });
  });

  describe('removeTerm', () => {
    it('removes a term', () => {
      setBlacklist(['bad', 'worse']);
      removeTerm('bad');
      expect(getBlacklist()).toEqual(['worse']);
    });

    it('removes case-insensitively', () => {
      setBlacklist(['Bad']);
      removeTerm('bad');
      expect(getBlacklist()).toEqual([]);
    });

    it('no-op when term not present', () => {
      setBlacklist(['bad']);
      removeTerm('nothere');
      expect(getBlacklist()).toEqual(['bad']);
    });
  });

  describe('resetBlacklist', () => {
    it('restores defaults after modifications', () => {
      setBlacklist(['custom-only']);
      resetBlacklist();
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('clears localStorage key', () => {
      setBlacklist(['custom']);
      resetBlacklist();
      expect(store['steambb-blacklist-terms']).toBeUndefined();
    });
  });

  describe('isDefaultBlockedWord', () => {
    it('returns true for default terms', () => {
      expect(isDefaultBlockedWord(DEFAULT_BLOCKED_WORDS[0])).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isDefaultBlockedWord(DEFAULT_BLOCKED_WORDS[0].toUpperCase())).toBe(true);
    });

    it('returns false for non-default terms', () => {
      expect(isDefaultBlockedWord('xyzzy-not-a-word')).toBe(false);
    });
  });
});
