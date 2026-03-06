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
    it('adds a term to existing list', () => {
      setBlacklist(['existing']);
      addTerm('new');
      expect(getBlacklist()).toEqual(['existing', 'new']);
    });

    it('adds a term to default list', () => {
      // No localStorage → defaults loaded, term appended
      addTerm('xyzzy-custom');
      const result = getBlacklist();
      expect(result).toContain('xyzzy-custom');
      expect(result.length).toBe(DEFAULT_BLOCKED_WORDS.length + 1);
    });

    it('prevents duplicates (case-insensitive)', () => {
      setBlacklist(['only']);
      addTerm('bad');
      addTerm('BAD');
      expect(getBlacklist()).toEqual(['only', 'bad']);
    });

    it('prevents duplicates (exact match)', () => {
      setBlacklist(['only']);
      addTerm('bad');
      addTerm('bad');
      expect(getBlacklist()).toEqual(['only', 'bad']);
    });

    it('trims whitespace', () => {
      setBlacklist(['only']);
      addTerm('  bad  ');
      expect(getBlacklist()).toContain('bad');
    });

    it('does not add empty string', () => {
      setBlacklist(['only']);
      addTerm('');
      expect(getBlacklist()).toEqual(['only']);
    });

    it('does not add whitespace-only string', () => {
      setBlacklist(['only']);
      addTerm('   ');
      expect(getBlacklist()).toEqual(['only']);
    });
  });

  describe('removeTerm', () => {
    it('removes a term', () => {
      setBlacklist(['bad', 'worse']);
      removeTerm('bad');
      expect(getBlacklist()).toEqual(['worse']);
    });

    it('removes case-insensitively', () => {
      setBlacklist(['Bad', 'other']);
      removeTerm('bad');
      expect(getBlacklist()).toEqual(['other']);
    });

    it('no-op when term not present', () => {
      setBlacklist(['bad']);
      removeTerm('nothere');
      expect(getBlacklist()).toEqual(['bad']);
    });
  });

  describe('migration from old empty default', () => {
    it('returns defaults when stored value is empty array', () => {
      store['steambb-blacklist-terms'] = '[]';
      expect(getBlacklist()).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('clears the old empty value from localStorage', () => {
      store['steambb-blacklist-terms'] = '[]';
      getBlacklist();
      expect(store['steambb-blacklist-terms']).toBeUndefined();
    });

    it('preserves non-empty stored lists', () => {
      store['steambb-blacklist-terms'] = JSON.stringify(['custom-term']);
      expect(getBlacklist()).toEqual(['custom-term']);
    });
  });

  describe('removing default terms', () => {
    it('removes a default term from the active list', () => {
      // Start fresh — no localStorage, defaults active
      removeTerm('anal');
      const result = getBlacklist();
      expect(result).not.toContain('anal');
      expect(result.length).toBe(DEFAULT_BLOCKED_WORDS.length - 1);
    });

    it('removed default term stays removed across reads', () => {
      removeTerm('anal');
      // Simulate re-reading (as if app re-rendered or page refreshed)
      const firstRead = getBlacklist();
      const secondRead = getBlacklist();
      expect(firstRead).not.toContain('anal');
      expect(secondRead).not.toContain('anal');
      expect(firstRead).toEqual(secondRead);
    });

    it('can remove multiple default terms independently', () => {
      removeTerm('anal');
      removeTerm('anus');
      removeTerm('ass');
      const result = getBlacklist();
      expect(result).not.toContain('anal');
      expect(result).not.toContain('anus');
      expect(result).not.toContain('ass');
      expect(result.length).toBe(DEFAULT_BLOCKED_WORDS.length - 3);
    });

    it('reset restores previously removed defaults', () => {
      removeTerm('anal');
      removeTerm('anus');
      expect(getBlacklist()).not.toContain('anal');
      resetBlacklist();
      const restored = getBlacklist();
      expect(restored).toContain('anal');
      expect(restored).toContain('anus');
      expect(restored).toEqual(DEFAULT_BLOCKED_WORDS);
    });

    it('can add custom terms after removing defaults', () => {
      removeTerm('anal');
      addTerm('swapmeat-custom');
      const result = getBlacklist();
      expect(result).not.toContain('anal');
      expect(result).toContain('swapmeat-custom');
    });

    it('isDefaultBlockedWord returns true even after removal', () => {
      removeTerm('anal');
      // "anal" is still a default — it's just been removed from the active list
      expect(isDefaultBlockedWord('anal')).toBe(true);
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
