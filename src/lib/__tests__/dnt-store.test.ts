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
  isWorkspaceTerm,
} from '../dnt-store';

describe('dnt-store (split model: workspace defaults + user additions)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getDntTerms', () => {
    it('returns workspace defaults when no user terms stored', () => {
      const terms = getDntTerms();
      expect(terms).toEqual(DO_NOT_TRANSLATE);
    });

    it('returns workspace defaults + user additions when user terms exist', () => {
      store['steambb-dnt-user-terms'] = JSON.stringify(['CustomTerm', 'AnotherTerm']);
      const terms = getDntTerms();
      expect(terms).toContain('SWAPMEAT'); // workspace default
      expect(terms).toContain('CustomTerm'); // user addition
      expect(terms).toContain('AnotherTerm'); // user addition
      expect(terms.length).toBe(DO_NOT_TRANSLATE.length + 2);
    });

    it('deduplicates case-insensitively (workspace wins)', () => {
      store['steambb-dnt-user-terms'] = JSON.stringify(['swapmeat']); // duplicate of workspace term
      const terms = getDntTerms();
      const count = terms.filter(t => t.toLowerCase() === 'swapmeat').length;
      expect(count).toBe(1);
      // The workspace version should be the one that survives
      expect(terms).toContain('SWAPMEAT');
    });

    it('returns defaults for corrupted user terms JSON', () => {
      store['steambb-dnt-user-terms'] = 'not-json';
      expect(getDntTerms()).toEqual(DO_NOT_TRANSLATE);
    });

    it('returns defaults for non-array user terms JSON', () => {
      store['steambb-dnt-user-terms'] = '{"not": "array"}';
      expect(getDntTerms()).toEqual(DO_NOT_TRANSLATE);
    });
  });

  describe('migration from old format', () => {
    it('migrates old single-list format to user additions', () => {
      // Old format: all terms in one key
      store['steambb-dnt-terms'] = JSON.stringify([
        ...DO_NOT_TRANSLATE,
        'CustomBoss',
        'MyNewTerm',
      ]);

      const terms = getDntTerms();
      // Should have all workspace defaults + the two custom terms
      expect(terms).toContain('SWAPMEAT');
      expect(terms).toContain('CustomBoss');
      expect(terms).toContain('MyNewTerm');

      // Old key should be removed
      expect(store['steambb-dnt-terms']).toBeUndefined();

      // User terms should be stored separately
      const userTerms = JSON.parse(store['steambb-dnt-user-terms']);
      expect(userTerms).toEqual(['CustomBoss', 'MyNewTerm']);
    });

    it('removes old key even if it only has defaults (no user additions)', () => {
      store['steambb-dnt-terms'] = JSON.stringify([...DO_NOT_TRANSLATE]);
      getDntTerms();
      expect(store['steambb-dnt-terms']).toBeUndefined();
      // No user terms key should be created
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });

    it('handles corrupted old format gracefully', () => {
      store['steambb-dnt-terms'] = 'not-json';
      const terms = getDntTerms();
      expect(terms).toEqual(DO_NOT_TRANSLATE);
      expect(store['steambb-dnt-terms']).toBeUndefined();
    });

    it('handles non-array old format gracefully', () => {
      store['steambb-dnt-terms'] = '{"not": "array"}';
      const terms = getDntTerms();
      expect(terms).toEqual(DO_NOT_TRANSLATE);
      expect(store['steambb-dnt-terms']).toBeUndefined();
    });
  });

  describe('setDntTerms', () => {
    it('stores only non-workspace terms', () => {
      setDntTerms(['SWAPMEAT', 'CustomTerm', 'Tangus']);
      const userTerms = JSON.parse(store['steambb-dnt-user-terms']);
      expect(userTerms).toEqual(['CustomTerm']);
    });

    it('overwrites existing user terms', () => {
      setDntTerms(['old']);
      setDntTerms(['new']);
      const userTerms = JSON.parse(store['steambb-dnt-user-terms']);
      expect(userTerms).toEqual(['new']);
    });
  });

  describe('addDntTerm', () => {
    it('adds a user term', () => {
      addDntTerm('NewGameTerm');
      const terms = getDntTerms();
      expect(terms).toContain('NewGameTerm');
      expect(terms).toContain('SWAPMEAT'); // workspace defaults still present
    });

    it('skips if already a workspace default (case-insensitive)', () => {
      addDntTerm('SWAPMEAT');
      // No user terms should be stored
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });

    it('skips if already a workspace default with different case', () => {
      addDntTerm('swapmeat');
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });

    it('prevents duplicate user terms (case-insensitive)', () => {
      addDntTerm('CustomBoss');
      addDntTerm('customboss');
      const userTerms = JSON.parse(store['steambb-dnt-user-terms']);
      expect(userTerms).toEqual(['CustomBoss']);
    });

    it('trims whitespace', () => {
      addDntTerm('  NewTerm  ');
      expect(getDntTerms()).toContain('NewTerm');
    });

    it('does not add empty string', () => {
      addDntTerm('');
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });

    it('does not add whitespace-only string', () => {
      addDntTerm('   ');
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });
  });

  describe('removeDntTerm', () => {
    it('does NOT remove workspace default terms', () => {
      removeDntTerm('Tangus');
      const terms = getDntTerms();
      expect(terms).toContain('Tangus'); // still present
    });

    it('does NOT remove workspace defaults case-insensitively', () => {
      removeDntTerm('tangus');
      expect(getDntTerms()).toContain('Tangus');
    });

    it('removes a user-added term', () => {
      addDntTerm('CustomBoss');
      removeDntTerm('CustomBoss');
      expect(getDntTerms()).not.toContain('CustomBoss');
    });

    it('removes user terms case-insensitively', () => {
      addDntTerm('CustomBoss');
      removeDntTerm('customboss');
      expect(getDntTerms()).not.toContain('CustomBoss');
    });

    it('no-op when term not present', () => {
      const before = getDntTerms();
      removeDntTerm('nonexistent');
      expect(getDntTerms()).toEqual(before);
    });
  });

  describe('resetDntTerms', () => {
    it('clears user additions, workspace defaults remain', () => {
      addDntTerm('CustomTerm');
      resetDntTerms();
      const terms = getDntTerms();
      expect(terms).toEqual(DO_NOT_TRANSLATE);
      expect(terms).not.toContain('CustomTerm');
    });

    it('clears user terms localStorage key', () => {
      addDntTerm('CustomTerm');
      resetDntTerms();
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });
  });

  describe('isWorkspaceTerm', () => {
    it('returns true for workspace terms', () => {
      expect(isWorkspaceTerm('SWAPMEAT')).toBe(true);
      expect(isWorkspaceTerm('Tangus')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isWorkspaceTerm('swapmeat')).toBe(true);
      expect(isWorkspaceTerm('TANGUS')).toBe(true);
    });

    it('returns false for non-workspace terms', () => {
      expect(isWorkspaceTerm('CustomBoss')).toBe(false);
      expect(isWorkspaceTerm('MyNewTerm')).toBe(false);
    });
  });

  describe('isDefaultTerm (backward compat alias)', () => {
    it('returns true for workspace terms', () => {
      expect(isDefaultTerm('SWAPMEAT')).toBe(true);
    });

    it('returns false for non-workspace terms', () => {
      expect(isDefaultTerm('CustomBoss')).toBe(false);
    });
  });
});
