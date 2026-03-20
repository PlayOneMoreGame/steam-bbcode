import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
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

import {
  getCustomTitles,
  addCustomTitle,
  removeCustomTitle,
  isCustomTitle,
  slugify,
} from '../custom-titles';
import { getAvailableTitles } from '../workspace-loader';

describe('custom-titles', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('slugify', () => {
    it('converts display name to lowercase slug', () => {
      expect(slugify('My Cool Game')).toBe('my-cool-game');
    });

    it('strips special characters', () => {
      expect(slugify('Game: The Sequel!!!')).toBe('game-the-sequel');
    });

    it('trims leading/trailing hyphens', () => {
      expect(slugify('  --hello--  ')).toBe('hello');
    });

    it('collapses multiple hyphens', () => {
      expect(slugify('a   b   c')).toBe('a-b-c');
    });

    it('returns empty string for empty input', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
    });
  });

  describe('getCustomTitles', () => {
    it('returns empty array when no custom titles exist', () => {
      expect(getCustomTitles('one-more-game')).toEqual([]);
    });

    it('returns stored custom titles', () => {
      const titles = [{
        slug: 'my-game',
        displayName: 'My Game',
        studioSlug: 'one-more-game',
        dntTerms: [],
        blockedWords: [],
        localizationTargets: ['pt-BR'],
      }];
      store['steambb-custom-titles-one-more-game'] = JSON.stringify(titles);
      expect(getCustomTitles('one-more-game')).toEqual(titles);
    });

    it('returns empty array for corrupted data', () => {
      store['steambb-custom-titles-one-more-game'] = 'not json';
      expect(getCustomTitles('one-more-game')).toEqual([]);
    });

    it('returns empty array for non-array data', () => {
      store['steambb-custom-titles-one-more-game'] = JSON.stringify({ bad: true });
      expect(getCustomTitles('one-more-game')).toEqual([]);
    });
  });

  describe('addCustomTitle', () => {
    it('adds a custom title and returns it', () => {
      const result = addCustomTitle('one-more-game', 'My New Game', ['swapmeat']);
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('my-new-game');
      expect(result!.displayName).toBe('My New Game');
      expect(result!.studioSlug).toBe('one-more-game');
      expect(result!.dntTerms).toEqual([]);
      expect(result!.blockedWords).toEqual([]);
      expect(result!.localizationTargets).toEqual(['pt-BR', 'es-LATAM', 'ko', 'zh-Hans', 'ja', 'de', 'fr']);
    });

    it('persists to localStorage', () => {
      addCustomTitle('one-more-game', 'My New Game', ['swapmeat']);
      const stored = JSON.parse(store['steambb-custom-titles-one-more-game']);
      expect(stored).toHaveLength(1);
      expect(stored[0].slug).toBe('my-new-game');
    });

    it('returns null for duplicate custom title slug', () => {
      addCustomTitle('one-more-game', 'My Game', ['swapmeat']);
      const result = addCustomTitle('one-more-game', 'My Game', ['swapmeat']);
      expect(result).toBeNull();
    });

    it('returns null when slug collides with a built-in title', () => {
      const result = addCustomTitle('one-more-game', 'Swapmeat', ['swapmeat']);
      expect(result).toBeNull();
    });

    it('returns null for empty name', () => {
      const result = addCustomTitle('one-more-game', '', ['swapmeat']);
      expect(result).toBeNull();
    });

    it('returns null for whitespace-only name', () => {
      const result = addCustomTitle('one-more-game', '   ', ['swapmeat']);
      expect(result).toBeNull();
    });

    it('uses provided localization targets when given', () => {
      const result = addCustomTitle('one-more-game', 'My Game', ['swapmeat'], ['ko', 'ja']);
      expect(result!.localizationTargets).toEqual(['ko', 'ja']);
    });

    it('scopes custom titles per studio', () => {
      addCustomTitle('one-more-game', 'OMG Game', ['swapmeat']);
      addCustomTitle('best-mega-gameco', 'BMG Game', ['mega-wedgie-3d']);

      expect(getCustomTitles('one-more-game')).toHaveLength(1);
      expect(getCustomTitles('one-more-game')[0].slug).toBe('omg-game');

      expect(getCustomTitles('best-mega-gameco')).toHaveLength(1);
      expect(getCustomTitles('best-mega-gameco')[0].slug).toBe('bmg-game');
    });

    it('can add multiple titles to the same studio', () => {
      addCustomTitle('one-more-game', 'Game A', ['swapmeat']);
      addCustomTitle('one-more-game', 'Game B', ['swapmeat']);
      expect(getCustomTitles('one-more-game')).toHaveLength(2);
    });

    it('trims the display name', () => {
      const result = addCustomTitle('one-more-game', '  Padded Name  ', ['swapmeat']);
      expect(result!.displayName).toBe('Padded Name');
    });
  });

  describe('removeCustomTitle', () => {
    it('removes a custom title', () => {
      addCustomTitle('one-more-game', 'My Game', ['swapmeat']);
      expect(getCustomTitles('one-more-game')).toHaveLength(1);

      removeCustomTitle('one-more-game', 'my-game');
      expect(getCustomTitles('one-more-game')).toHaveLength(0);
    });

    it('cleans up localStorage when last title is removed', () => {
      addCustomTitle('one-more-game', 'My Game', ['swapmeat']);
      removeCustomTitle('one-more-game', 'my-game');
      expect(store['steambb-custom-titles-one-more-game']).toBeUndefined();
    });

    it('is a no-op for unknown slug', () => {
      addCustomTitle('one-more-game', 'My Game', ['swapmeat']);
      removeCustomTitle('one-more-game', 'nonexistent');
      expect(getCustomTitles('one-more-game')).toHaveLength(1);
    });

    it('only removes the targeted title', () => {
      addCustomTitle('one-more-game', 'Game A', ['swapmeat']);
      addCustomTitle('one-more-game', 'Game B', ['swapmeat']);
      removeCustomTitle('one-more-game', 'game-a');
      const remaining = getCustomTitles('one-more-game');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].slug).toBe('game-b');
    });
  });

  describe('isCustomTitle', () => {
    it('returns true for custom title', () => {
      addCustomTitle('one-more-game', 'My Game', ['swapmeat']);
      expect(isCustomTitle('one-more-game', 'my-game')).toBe(true);
    });

    it('returns false for non-existent title', () => {
      expect(isCustomTitle('one-more-game', 'nonexistent')).toBe(false);
    });

    it('returns false for built-in title slug', () => {
      // swapmeat is a build-time title, not a custom one
      expect(isCustomTitle('one-more-game', 'swapmeat')).toBe(false);
    });
  });

  describe('integration with workspace-loader', () => {
    it('custom title appears in getAvailableTitles', () => {
      addCustomTitle('one-more-game', 'My New Title', ['swapmeat']);
      const titles = getAvailableTitles('one-more-game');
      const slugs = titles.map(t => t.slug);
      expect(slugs).toContain('swapmeat');
      expect(slugs).toContain('my-new-title');
    });

    it('custom titles appear after built-in titles', () => {
      addCustomTitle('one-more-game', 'My New Title', ['swapmeat']);
      const titles = getAvailableTitles('one-more-game');
      const swapmeatIdx = titles.findIndex(t => t.slug === 'swapmeat');
      const customIdx = titles.findIndex(t => t.slug === 'my-new-title');
      expect(customIdx).toBeGreaterThan(swapmeatIdx);
    });

    it('removed custom title disappears from getAvailableTitles', () => {
      addCustomTitle('one-more-game', 'Temp Title', ['swapmeat']);
      removeCustomTitle('one-more-game', 'temp-title');
      const titles = getAvailableTitles('one-more-game');
      expect(titles.map(t => t.slug)).not.toContain('temp-title');
    });

    it('custom title has empty DNT and blocked words', () => {
      addCustomTitle('one-more-game', 'Clean Title', ['swapmeat']);
      const titles = getAvailableTitles('one-more-game');
      const custom = titles.find(t => t.slug === 'clean-title');
      expect(custom).toBeDefined();
      expect(custom!.dntTerms).toEqual([]);
      expect(custom!.blockedWords).toEqual([]);
    });
  });
});
