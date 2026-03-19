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
    switchWorkspace({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
  });

  describe('default workspace (SWAPMEAT)', () => {
    it('initializes with SWAPMEAT blocked words', () => {
      const config = getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      const blacklist = getBlacklistStore().getAll();
      expect(blacklist).toEqual(config.title.blockedWords);
    });

    it('initializes with SWAPMEAT DNT terms', () => {
      const config = getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      const dnt = getDntStore().getAll();
      expect(dnt).toEqual(config.title.dntTerms);
    });

    it('getCurrentSelection returns default', () => {
      const sel = getCurrentSelection();
      expect(sel.studioSlug).toBe('one-more-game');
      expect(sel.titleSlug).toBe('swapmeat');
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
      const swapmeatBlocked = getBlacklistStore().getAll();

      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      const mwBlocked = getBlacklistStore().getAll();

      expect(swapmeatBlocked.length).toBeGreaterThan(650);
      expect(mwBlocked.length).toBeLessThan(30);
      expect(mwBlocked).toContain('cheat');
      expect(mwBlocked).toContain('aimbot');
    });

    it('DNT terms differ between titles', () => {
      const swapmeatDnt = getDntStore().getAll();

      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      const mwDnt = getDntStore().getAll();

      expect(swapmeatDnt).toContain('SWAPMEAT');
      expect(swapmeatDnt).not.toContain('Mega Wedgie 3D');
      expect(mwDnt).toContain('Mega Wedgie 3D');
      expect(mwDnt).not.toContain('SWAPMEAT');
    });
  });

  describe('scoped localStorage keys', () => {
    it('user terms for SWAPMEAT use scoped key', () => {
      getBlacklistStore().add('my-swapmeat-term');
      expect(store['steambb-blacklist-user-one-more-game-swapmeat']).toBeDefined();
      const parsed = JSON.parse(store['steambb-blacklist-user-one-more-game-swapmeat']);
      expect(parsed).toContain('my-swapmeat-term');
    });

    it('user terms for Mega Wedgie 3D use different scoped key', () => {
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      getBlacklistStore().add('my-mw-term');
      expect(store['steambb-blacklist-user-best-mega-gameco-mega-wedgie-3d']).toBeDefined();
      const parsed = JSON.parse(store['steambb-blacklist-user-best-mega-gameco-mega-wedgie-3d']);
      expect(parsed).toContain('my-mw-term');
    });

    it('user terms are isolated between workspaces', () => {
      // Add term to SWAPMEAT
      getBlacklistStore().add('swapmeat-only');

      // Switch to Mega Wedgie 3D — should not see swapmeat-only
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(getBlacklistStore().getAll()).not.toContain('swapmeat-only');

      // Add term to MW
      getBlacklistStore().add('mw-only');

      // Switch back to SWAPMEAT — should see swapmeat-only but not mw-only
      switchWorkspace({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      expect(getBlacklistStore().getAll()).toContain('swapmeat-only');
      expect(getBlacklistStore().getAll()).not.toContain('mw-only');
    });

    it('DNT user terms are also isolated', () => {
      getDntStore().add('swapmeat-dnt');

      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(getDntStore().getAll()).not.toContain('swapmeat-dnt');

      getDntStore().add('mw-dnt');

      switchWorkspace({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      expect(getDntStore().getAll()).toContain('swapmeat-dnt');
      expect(getDntStore().getAll()).not.toContain('mw-dnt');
    });
  });

  describe('legacy key migration for SWAPMEAT', () => {
    it('migrates old unscoped blacklist user terms', () => {
      store['steambb-blacklist-user-terms'] = JSON.stringify(['legacy-term']);
      // Force rebuild to trigger migration
      switchWorkspace({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      const result = getBlacklistStore().getAll();
      expect(result).toContain('legacy-term');
      expect(store['steambb-blacklist-user-terms']).toBeUndefined();
    });

    it('migrates old unscoped DNT user terms', () => {
      store['steambb-dnt-user-terms'] = JSON.stringify(['legacy-dnt']);
      switchWorkspace({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      const result = getDntStore().getAll();
      expect(result).toContain('legacy-dnt');
      expect(store['steambb-dnt-user-terms']).toBeUndefined();
    });

    it('does NOT migrate legacy keys for non-SWAPMEAT workspaces', () => {
      store['steambb-blacklist-user-terms'] = JSON.stringify(['should-not-migrate']);
      switchWorkspace({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      // Legacy key should still be there — MW doesn't claim it
      expect(store['steambb-blacklist-user-terms']).toBeDefined();
      expect(getBlacklistStore().getAll()).not.toContain('should-not-migrate');
    });
  });
});
