import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DO_NOT_TRANSLATE } from '../glossary';

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
import {
  getDntTerms,
  setDntTerms,
  addDntTerm,
  removeDntTerm,
  resetDntTerms,
  isDefaultTerm,
} from '../dnt-store';

describe('dnt-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getDntTerms', () => {
    it('returns default glossary when nothing stored', () => {
      const terms = getDntTerms();
      expect(terms).toEqual(DO_NOT_TRANSLATE);
    });

    it('returns stored terms when present', () => {
      store['steambb-dnt-terms'] = JSON.stringify(['CustomTerm', 'AnotherTerm']);
      expect(getDntTerms()).toEqual(['CustomTerm', 'AnotherTerm']);
    });

    it('returns defaults for corrupted JSON', () => {
      store['steambb-dnt-terms'] = 'not-json';
      expect(getDntTerms()).toEqual(DO_NOT_TRANSLATE);
    });

    it('returns defaults for non-array JSON', () => {
      store['steambb-dnt-terms'] = '{"not": "array"}';
      expect(getDntTerms()).toEqual(DO_NOT_TRANSLATE);
    });
  });

  describe('setDntTerms', () => {
    it('saves terms to localStorage', () => {
      setDntTerms(['Term1', 'Term2']);
      expect(JSON.parse(store['steambb-dnt-terms'])).toEqual(['Term1', 'Term2']);
    });

    it('overwrites existing terms', () => {
      setDntTerms(['old']);
      setDntTerms(['new']);
      expect(getDntTerms()).toEqual(['new']);
    });
  });

  describe('addDntTerm', () => {
    it('adds a term to the default list', () => {
      addDntTerm('NewGameTerm');
      const terms = getDntTerms();
      expect(terms).toContain('NewGameTerm');
      // Should also contain all defaults
      expect(terms).toContain('SWAPMEAT');
    });

    it('prevents duplicates (case-insensitive)', () => {
      addDntTerm('SWAPMEAT'); // Already in defaults
      const terms = getDntTerms();
      const count = terms.filter(t => t.toLowerCase() === 'swapmeat').length;
      expect(count).toBe(1);
    });

    it('trims whitespace', () => {
      addDntTerm('  NewTerm  ');
      expect(getDntTerms()).toContain('NewTerm');
    });

    it('does not add empty string', () => {
      const before = getDntTerms().length;
      addDntTerm('');
      expect(getDntTerms().length).toBe(before);
    });

    it('does not add whitespace-only string', () => {
      const before = getDntTerms().length;
      addDntTerm('   ');
      expect(getDntTerms().length).toBe(before);
    });
  });

  describe('removeDntTerm', () => {
    it('removes a default term', () => {
      removeDntTerm('Tangus');
      expect(getDntTerms()).not.toContain('Tangus');
    });

    it('removes case-insensitively', () => {
      removeDntTerm('tangus');
      expect(getDntTerms()).not.toContain('Tangus');
    });

    it('removes a user-added term', () => {
      addDntTerm('CustomBoss');
      removeDntTerm('CustomBoss');
      expect(getDntTerms()).not.toContain('CustomBoss');
    });

    it('no-op when term not present', () => {
      const before = getDntTerms();
      removeDntTerm('nonexistent');
      expect(getDntTerms()).toEqual(before);
    });
  });

  describe('resetDntTerms', () => {
    it('restores the default glossary after modifications', () => {
      addDntTerm('CustomTerm');
      removeDntTerm('Tangus');
      resetDntTerms();
      expect(getDntTerms()).toEqual(DO_NOT_TRANSLATE);
    });

    it('clears localStorage key', () => {
      addDntTerm('CustomTerm');
      resetDntTerms();
      expect(store['steambb-dnt-terms']).toBeUndefined();
    });
  });

  describe('isDefaultTerm', () => {
    it('returns true for default terms', () => {
      expect(isDefaultTerm('SWAPMEAT')).toBe(true);
      expect(isDefaultTerm('Tangus')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isDefaultTerm('swapmeat')).toBe(true);
      expect(isDefaultTerm('TANGUS')).toBe(true);
    });

    it('returns false for non-default terms', () => {
      expect(isDefaultTerm('CustomBoss')).toBe(false);
      expect(isDefaultTerm('MyNewTerm')).toBe(false);
    });
  });
});
