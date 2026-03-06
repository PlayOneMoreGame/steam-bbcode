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
import { getBlacklist, setBlacklist, addTerm, removeTerm, DEFAULT_BLACKLIST } from '../blacklist-store';

describe('blacklist-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('DEFAULT_BLACKLIST', () => {
    it('is an empty array', () => {
      expect(DEFAULT_BLACKLIST).toEqual([]);
    });
  });

  describe('getBlacklist', () => {
    it('returns empty array when nothing stored', () => {
      expect(getBlacklist()).toEqual([]);
    });

    it('returns stored terms', () => {
      store['steambb-blacklist-terms'] = JSON.stringify(['bad', 'worse']);
      expect(getBlacklist()).toEqual(['bad', 'worse']);
    });

    it('returns empty array for corrupted JSON', () => {
      store['steambb-blacklist-terms'] = 'not-json';
      expect(getBlacklist()).toEqual([]);
    });

    it('returns empty array for non-array JSON', () => {
      store['steambb-blacklist-terms'] = '{"not": "array"}';
      expect(getBlacklist()).toEqual([]);
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
    it('adds a term to empty blacklist', () => {
      addTerm('bad');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('adds a term to existing blacklist', () => {
      setBlacklist(['existing']);
      addTerm('new');
      expect(getBlacklist()).toEqual(['existing', 'new']);
    });

    it('prevents duplicates (case-insensitive)', () => {
      addTerm('bad');
      addTerm('BAD');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('prevents duplicates (exact match)', () => {
      addTerm('bad');
      addTerm('bad');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('trims whitespace', () => {
      addTerm('  bad  ');
      expect(getBlacklist()).toEqual(['bad']);
    });

    it('does not add empty string', () => {
      addTerm('');
      expect(getBlacklist()).toEqual([]);
    });

    it('does not add whitespace-only string', () => {
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
});
