import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing modules
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

import { switchWorkspace, getBlacklistStore, getDntStore, getCurrentSelection } from '../workspace-stores';
import { getWorkspaceConfig } from '../workspace-loader';

describe('workspace-stores', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset to default workspace
    switchWorkspace({ studioSlug: 'example-studio', titleSlug: 'example-game' });
  });

  describe('default workspace (Example Game)', () => {
    it('initializes with Example Game blocked words', () => {
      const config = getWorkspaceConfig({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      const blacklist = getBlacklistStore().getAll();
      expect(blacklist).toEqual(config.title.blockedWords);
    });

    it('initializes with Example Game DNT terms', () => {
      const config = getWorkspaceConfig({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      const dnt = getDntStore().getAll();
      expect(dnt).toEqual(config.title.dntTerms);
    });

    it('getCurrentSelection returns default', () => {
      const sel = getCurrentSelection();
      expect(sel.studioSlug).toBe('example-studio');
      expect(sel.titleSlug).toBe('example-game');
    });
  });

  describe('switchWorkspace', () => {
    it('switches to Mega Wedgie 3D', () => {
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });

      const config = getWorkspaceConfig({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(getBlacklistStore().getAll()).toEqual(config.title.blockedWords);
      expect(getDntStore().getAll()).toEqual(config.title.dntTerms);
    });

    it('updates current selection', () => {
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      const sel = getCurrentSelection();
      expect(sel.studioSlug).toBe('best-mega-gameco');
      expect(sel.titleSlug).toBe('mega-wedgie-3d');
    });

    it('blocked words differ between titles', () => {
      const exampleBlocked = getBlacklistStore().getAll();

      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      const mwBlocked = getBlacklistStore().getAll();

      expect(exampleBlocked.length).toBeGreaterThan(650);
      expect(mwBlocked.length).toBeLessThan(30);
      expect(mwBlocked).toContain('cheat');
      expect(mwBlocked).toContain('aimbot');
    });

    it('DNT terms differ between titles', () => {
      const exampleDnt = getDntStore().getAll();

      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      const mwDnt = getDntStore().getAll();

      expect(exampleDnt).toContain('Example Game');
      expect(exampleDnt).not.toContain('Mega Wedgie 3D');
      expect(mwDnt).toContain('Mega Wedgie 3D');
      expect(mwDnt).not.toContain('Example Game');
    });
  });

  describe('scoped localStorage keys', () => {
    it('user terms for Example Game use scoped key', () => {
      getBlacklistStore().add('my-example-term');
      expect(store['steambb-blacklist-user-example-studio-example-game']).toBeDefined();
      const parsed = JSON.parse(store['steambb-blacklist-user-example-studio-example-game']);
      expect(parsed).toContain('my-example-term');
    });

    it('user terms for Mega Wedgie 3D use different scoped key', () => {
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      getBlacklistStore().add('my-mw-term');
      expect(store['steambb-blacklist-user-best-mega-gameco-mega-wedgie-3d']).toBeDefined();
      const parsed = JSON.parse(store['steambb-blacklist-user-best-mega-gameco-mega-wedgie-3d']);
      expect(parsed).toContain('my-mw-term');
    });

    it('user terms are isolated between workspaces', () => {
      // Add term to Example Game
      getBlacklistStore().add('example-only');

      // Switch to Mega Wedgie 3D — should not see example-only
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(getBlacklistStore().getAll()).not.toContain('example-only');

      // Add term to MW
      getBlacklistStore().add('mw-only');

      // Switch back to Example Game — should see example-only but not mw-only
      switchWorkspace({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      expect(getBlacklistStore().getAll()).toContain('example-only');
      expect(getBlacklistStore().getAll()).not.toContain('mw-only');
    });

    it('DNT user terms are also isolated', () => {
      getDntStore().add('example-dnt');

      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(getDntStore().getAll()).not.toContain('example-dnt');

      getDntStore().add('mw-dnt');

      switchWorkspace({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      expect(getDntStore().getAll()).toContain('example-dnt');
      expect(getDntStore().getAll()).not.toContain('mw-dnt');
    });
  });

  describe('legacy key migration for Example Game', () => {
    it('migrates old unscoped blacklist user terms', () => {
      store['steambb-blacklist-user-terms'] = JSON.stringify(['legacy-term']);
      // Force rebuild to trigger migration
      switchWorkspace({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      const result = getBlacklistStore().getAll();
      expect(result).toContain('legacy-term');
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
    });

    it('migrates old unscoped DNT user terms', () => {
      store['steambb-dnt-user-terms'] = JSON.stringify(['legacy-dnt']);
      switchWorkspace({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      const result = getDntStore().getAll();
      expect(result).toContain('legacy-dnt');
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });

    it('does NOT migrate legacy keys for non-Example Game workspaces', () => {
      store['steambb-blacklist-user-terms'] = JSON.stringify(['should-not-migrate']);
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      // Legacy key should still be there — MW doesn't claim it
      expect(store['steambb-blacklist-user-terms']).toBeDefined();
      expect(getBlacklistStore().getAll()).not.toContain('should-not-migrate');
    });
  });
});
