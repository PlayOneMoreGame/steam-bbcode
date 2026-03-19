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
import {
  getDntTerms,
  setDntTerms,
  addDntTerm,
  removeDntTerm,
  resetDntTerms,
  isWorkspaceTerm,
  isProtectedTerm,
  isTitleTerm,
  getTier,
} from '../dnt-store';
import { getWorkspaceConfig } from '../workspace-loader';

// Get the default DNT terms from the workspace config (SWAPMEAT title)
const TITLE_DNT_TERMS = getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' }).title.dntTerms;

// Scoped localStorage key for the default workspace
const USER_KEY = 'steambb-dnt-user-one-more-game-swapmeat';

describe('dnt-store (split model: title defaults + user additions)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getDntTerms', () => {
    it('returns title defaults when no user terms stored', () => {
      const terms = getDntTerms();
      expect(terms).toEqual(TITLE_DNT_TERMS);
    });

    it('returns title defaults + user additions when user terms exist', () => {
      store[USER_KEY] = JSON.stringify(['CustomTerm', 'AnotherTerm']);
      const terms = getDntTerms();
      expect(terms).toContain('SWAPMEAT'); // title default
      expect(terms).toContain('CustomTerm'); // user addition
      expect(terms).toContain('AnotherTerm'); // user addition
      expect(terms.length).toBe(TITLE_DNT_TERMS.length + 2);
    });

    it('deduplicates case-insensitively (title default wins)', () => {
      store[USER_KEY] = JSON.stringify(['swapmeat']); // duplicate of title term
      const terms = getDntTerms();
      const count = terms.filter(t => t.toLowerCase() === 'swapmeat').length;
      expect(count).toBe(1);
      expect(terms).toContain('SWAPMEAT');
    });

    it('returns defaults for corrupted user terms JSON', () => {
      store[USER_KEY] = 'not-json';
      expect(getDntTerms()).toEqual(TITLE_DNT_TERMS);
    });

    it('returns defaults for non-array user terms JSON', () => {
      store[USER_KEY] = '{"not": "array"}';
      expect(getDntTerms()).toEqual(TITLE_DNT_TERMS);
    });
  });

  describe('migration from old format', () => {
    it('migrates old unscoped key to scoped user terms', () => {
      store['steambb-dnt-user-terms'] = JSON.stringify(['CustomBoss', 'MyNewTerm']);
      const terms = getDntTerms();
      expect(terms).toContain('SWAPMEAT');
      expect(terms).toContain('CustomBoss');
      expect(terms).toContain('MyNewTerm');
      // Old key should be removed
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
      // Scoped key should have the user terms
      expect(JSON.parse(store[USER_KEY])).toEqual(['CustomBoss', 'MyNewTerm']);
    });

    it('handles corrupted old format gracefully', () => {
      store['steambb-dnt-user-terms'] = 'not-json';
      const terms = getDntTerms();
      expect(terms).toEqual(TITLE_DNT_TERMS);
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });
  });

  describe('setDntTerms', () => {
    it('stores only non-title-default terms', () => {
      setDntTerms(['SWAPMEAT', 'CustomTerm', 'Tangus']);
      const userTerms = JSON.parse(store[USER_KEY]);
      expect(userTerms).toEqual(['CustomTerm']);
    });

    it('overwrites existing user terms', () => {
      setDntTerms(['old']);
      setDntTerms(['new']);
      const userTerms = JSON.parse(store[USER_KEY]);
      expect(userTerms).toEqual(['new']);
    });
  });

  describe('addDntTerm', () => {
    it('adds a user term', () => {
      addDntTerm('NewGameTerm');
      const terms = getDntTerms();
      expect(terms).toContain('NewGameTerm');
      expect(terms).toContain('SWAPMEAT');
    });

    it('skips if already a title default (case-insensitive)', () => {
      addDntTerm('SWAPMEAT');
      expect(store[USER_KEY]).toBeUndefined();
    });

    it('skips if already a title default with different case', () => {
      addDntTerm('swapmeat');
      expect(store[USER_KEY]).toBeUndefined();
    });

    it('prevents duplicate user terms (case-insensitive)', () => {
      addDntTerm('CustomBoss');
      addDntTerm('customboss');
      const userTerms = JSON.parse(store[USER_KEY]);
      expect(userTerms).toEqual(['CustomBoss']);
    });

    it('trims whitespace', () => {
      addDntTerm('  NewTerm  ');
      expect(getDntTerms()).toContain('NewTerm');
    });

    it('does not add empty string', () => {
      addDntTerm('');
      expect(store[USER_KEY]).toBeUndefined();
    });

    it('does not add whitespace-only string', () => {
      addDntTerm('   ');
      expect(store[USER_KEY]).toBeUndefined();
    });
  });

  describe('removeDntTerm', () => {
    it('does NOT remove title default terms', () => {
      removeDntTerm('Tangus');
      expect(getDntTerms()).toContain('Tangus');
    });

    it('does NOT remove title defaults case-insensitively', () => {
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
    it('clears user additions, title defaults remain', () => {
      addDntTerm('CustomTerm');
      resetDntTerms();
      const terms = getDntTerms();
      expect(terms).toEqual(TITLE_DNT_TERMS);
      expect(terms).not.toContain('CustomTerm');
    });

    it('clears user terms localStorage key', () => {
      addDntTerm('CustomTerm');
      resetDntTerms();
      expect(store[USER_KEY]).toBeUndefined();
    });
  });

  describe('isWorkspaceTerm / isProtectedTerm', () => {
    it('returns true for title default terms', () => {
      expect(isWorkspaceTerm('SWAPMEAT')).toBe(true);
      expect(isProtectedTerm('Tangus')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isWorkspaceTerm('swapmeat')).toBe(true);
      expect(isProtectedTerm('TANGUS')).toBe(true);
    });

    it('returns false for non-workspace terms', () => {
      expect(isWorkspaceTerm('CustomBoss')).toBe(false);
    });

    it('returns false for user terms', () => {
      addDntTerm('CustomBoss');
      expect(isProtectedTerm('CustomBoss')).toBe(false);
    });
  });

  describe('isTitleTerm', () => {
    it('returns true for title default terms', () => {
      expect(isTitleTerm('SWAPMEAT')).toBe(true);
      expect(isTitleTerm('Tangus')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isTitleTerm('swapmeat')).toBe(true);
    });

    it('returns false for user terms', () => {
      addDntTerm('CustomBoss');
      expect(isTitleTerm('CustomBoss')).toBe(false);
    });
  });

  describe('getTier', () => {
    it('returns title for title default terms', () => {
      expect(getTier('SWAPMEAT')).toBe('title');
      expect(getTier('Tangus')).toBe('title');
    });

    it('is case-insensitive', () => {
      expect(getTier('swapmeat')).toBe('title');
      expect(getTier('TANGUS')).toBe('title');
    });

    it('returns user for user-added terms', () => {
      addDntTerm('CustomBoss');
      expect(getTier('CustomBoss')).toBe('user');
    });

    it('returns null for unknown terms', () => {
      expect(getTier('nonexistent')).toBeNull();
    });
  });
});
