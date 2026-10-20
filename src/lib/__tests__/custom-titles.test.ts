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
      expect(getCustomTitles('example-studio')).toEqual([]);
    });

    it('returns stored custom titles', () => {
      const titles = [{
        slug: 'my-game',
        displayName: 'My Game',
        studioSlug: 'example-studio',
        dntTerms: [],
        blockedWords: [],
        localizationTargets: ['pt-BR'],
      }];
      store['steambb-custom-titles-example-studio'] = JSON.stringify(titles);
      expect(getCustomTitles('example-studio')).toEqual(titles);
    });

    it('returns empty array for corrupted data', () => {
      store['steambb-custom-titles-example-studio'] = 'not json';
      expect(getCustomTitles('example-studio')).toEqual([]);
    });

    it('returns empty array for non-array data', () => {
      store['steambb-custom-titles-example-studio'] = JSON.stringify({ bad: true });
      expect(getCustomTitles('example-studio')).toEqual([]);
    });
  });

  describe('addCustomTitle', () => {
    it('adds a custom title and returns it', () => {
      const result = addCustomTitle('example-studio', 'My New Game', ['example-game']);
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('my-new-game');
      expect(result!.displayName).toBe('My New Game');
      expect(result!.studioSlug).toBe('example-studio');
      expect(result!.dntTerms).toEqual([]);
      expect(result!.blockedWords).toEqual([]);
      expect(result!.localizationTargets).toEqual(['pt-BR', 'es-LATAM', 'ko', 'zh-Hans', 'ja', 'de', 'fr']);
    });

    it('persists to localStorage', () => {
      addCustomTitle('example-studio', 'My New Game', ['example-game']);
      const stored = JSON.parse(store['steambb-custom-titles-example-studio']);
      expect(stored).toHaveLength(1);
      expect(stored[0].slug).toBe('my-new-game');
    });

    it('returns null for duplicate custom title slug', () => {
      addCustomTitle('example-studio', 'My Game', ['example-game']);
      const result = addCustomTitle('example-studio', 'My Game', ['example-game']);
      expect(result).toBeNull();
    });

    it('returns null when slug collides with a built-in title', () => {
      const result = addCustomTitle('example-studio', 'Example Game', ['example-game']);
      expect(result).toBeNull();
    });

    it('returns null for empty name', () => {
      const result = addCustomTitle('example-studio', '', ['example-game']);
      expect(result).toBeNull();
    });

    it('returns null for whitespace-only name', () => {
      const result = addCustomTitle('example-studio', '   ', ['example-game']);
      expect(result).toBeNull();
    });

    it('uses provided localization targets when given', () => {
      const result = addCustomTitle('example-studio', 'My Game', ['example-game'], ['ko', 'ja']);
      expect(result!.localizationTargets).toEqual(['ko', 'ja']);
    });

    it('scopes custom titles per studio', () => {
      addCustomTitle('example-studio', 'Neat Game', ['example-game']);
      addCustomTitle('best-mega-gameco', 'BMG Game', ['mega-wedgie-3d']);

      expect(getCustomTitles('example-studio')).toHaveLength(1);
      expect(getCustomTitles('example-studio')[0].slug).toBe('neat-game');

      expect(getCustomTitles('best-mega-gameco')).toHaveLength(1);
      expect(getCustomTitles('best-mega-gameco')[0].slug).toBe('bmg-game');
    });

    it('can add multiple titles to the same studio', () => {
      addCustomTitle('example-studio', 'Game A', ['example-game']);
      addCustomTitle('example-studio', 'Game B', ['example-game']);
      expect(getCustomTitles('example-studio')).toHaveLength(2);
    });

    it('trims the display name', () => {
      const result = addCustomTitle('example-studio', '  Padded Name  ', ['example-game']);
      expect(result!.displayName).toBe('Padded Name');
    });
  });

  describe('removeCustomTitle', () => {
    it('removes a custom title', () => {
      addCustomTitle('example-studio', 'My Game', ['example-game']);
      expect(getCustomTitles('example-studio')).toHaveLength(1);

      removeCustomTitle('example-studio', 'my-game');
      expect(getCustomTitles('example-studio')).toHaveLength(0);
    });

    it('cleans up localStorage when last title is removed', () => {
      addCustomTitle('example-studio', 'My Game', ['example-game']);
      removeCustomTitle('example-studio', 'my-game');
      expect(store['steambb-custom-titles-example-studio']).toBeUndefined();
    });

    it('is a no-op for unknown slug', () => {
      addCustomTitle('example-studio', 'My Game', ['example-game']);
      removeCustomTitle('example-studio', 'nonexistent');
      expect(getCustomTitles('example-studio')).toHaveLength(1);
    });

    it('only removes the targeted title', () => {
      addCustomTitle('example-studio', 'Game A', ['example-game']);
      addCustomTitle('example-studio', 'Game B', ['example-game']);
      removeCustomTitle('example-studio', 'game-a');
      const remaining = getCustomTitles('example-studio');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].slug).toBe('game-b');
    });
  });

  describe('isCustomTitle', () => {
    it('returns true for custom title', () => {
      addCustomTitle('example-studio', 'My Game', ['example-game']);
      expect(isCustomTitle('example-studio', 'my-game')).toBe(true);
    });

    it('returns false for non-existent title', () => {
      expect(isCustomTitle('example-studio', 'nonexistent')).toBe(false);
    });

    it('returns false for built-in title slug', () => {
      // example-game is a build-time title, not a custom one
      expect(isCustomTitle('example-studio', 'example-game')).toBe(false);
    });
  });

  describe('integration with workspace-loader', () => {
    it('custom title appears in getAvailableTitles', () => {
      addCustomTitle('example-studio', 'My New Title', ['example-game']);
      const titles = getAvailableTitles('example-studio');
      const slugs = titles.map(t => t.slug);
      expect(slugs).toContain('example-game');
      expect(slugs).toContain('my-new-title');
    });

    it('custom titles appear after built-in titles', () => {
      addCustomTitle('example-studio', 'My New Title', ['example-game']);
      const titles = getAvailableTitles('example-studio');
      const exampleIdx = titles.findIndex(t => t.slug === 'example-game');
      const customIdx = titles.findIndex(t => t.slug === 'my-new-title');
      expect(customIdx).toBeGreaterThan(exampleIdx);
    });

    it('removed custom title disappears from getAvailableTitles', () => {
      addCustomTitle('example-studio', 'Temp Title', ['example-game']);
      removeCustomTitle('example-studio', 'temp-title');
      const titles = getAvailableTitles('example-studio');
      expect(titles.map(t => t.slug)).not.toContain('temp-title');
    });

    it('custom title has empty DNT and blocked words', () => {
      addCustomTitle('example-studio', 'Clean Title', ['example-game']);
      const titles = getAvailableTitles('example-studio');
      const custom = titles.find(t => t.slug === 'clean-title');
      expect(custom).toBeDefined();
      expect(custom!.dntTerms).toEqual([]);
      expect(custom!.blockedWords).toEqual([]);
    });
  });
});
