import { describe, it, expect } from 'vitest';
import { getWorkspaceConfig, getWorkspaceSelection, getAvailableStudios, getAvailableTitles } from '../workspace-loader';

describe('workspace-loader', () => {
  describe('auto-discovery', () => {
    it('discovers studios from src/workspace/studios/ via import.meta.glob', () => {
      const studios = getAvailableStudios();
      expect(studios.length).toBeGreaterThanOrEqual(2);
      const slugs = studios.map(s => s.slug);
      expect(slugs).toContain('one-more-game');
      expect(slugs).toContain('best-mega-gameco');
    });

    it('discovers titles nested under each studio', () => {
      const omgTitles = getAvailableTitles('one-more-game');
      expect(omgTitles.length).toBeGreaterThanOrEqual(1);
      expect(omgTitles.map(t => t.slug)).toContain('swapmeat');

      const bmgTitles = getAvailableTitles('best-mega-gameco');
      expect(bmgTitles.length).toBeGreaterThanOrEqual(1);
      expect(bmgTitles.map(t => t.slug)).toContain('mega-wedgie-3d');
    });
  });

  describe('default selection', () => {
    it('defaults to studio with "default": true (one-more-game)', () => {
      // one-more-game has "default": true in studio.json
      const sel = getWorkspaceSelection();
      expect(sel.studioSlug).toBe('one-more-game');
      expect(sel.titleSlug).toBe('swapmeat');
    });

    it('studio marked as default has the flag set', () => {
      const config = getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      expect(config.studio.default).toBe(true);
    });

    it('non-default studio does not have the flag', () => {
      const config = getWorkspaceConfig({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(config.studio.default).toBeFalsy();
    });
  });

  describe('getWorkspaceConfig', () => {
    it('returns a valid config with studio and title', () => {
      const config = getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      expect(config.studio).toBeDefined();
      expect(config.title).toBeDefined();
      expect(config.studio.displayName).toBe('One More Game');
      expect(config.title.displayName).toBe('SWAPMEAT');
    });

    it('returns config for Best Mega Gameco', () => {
      const config = getWorkspaceConfig({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(config.studio.displayName).toBe('Best Mega Gameco');
      expect(config.title.displayName).toBe('Mega Wedgie 3D');
    });

    it('throws for unknown studio', () => {
      expect(() => getWorkspaceConfig({ studioSlug: 'nope', titleSlug: 'swapmeat' }))
        .toThrow('Unknown studio: "nope"');
    });

    it('throws for unknown title', () => {
      expect(() => getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'nope' }))
        .toThrow('Unknown title: "nope"');
    });

    it('has expected shape for SWAPMEAT', () => {
      const config = getWorkspaceConfig({ studioSlug: 'one-more-game', titleSlug: 'swapmeat' });
      expect(config.studio.slug).toBe('one-more-game');
      expect(config.title.slug).toBe('swapmeat');
      expect(config.title.studioSlug).toBe('one-more-game');
      expect(Array.isArray(config.title.dntTerms)).toBe(true);
      expect(config.title.dntTerms.length).toBeGreaterThan(0);
      expect(Array.isArray(config.title.blockedWords)).toBe(true);
      expect(config.title.blockedWords.length).toBeGreaterThan(650);
      expect(Array.isArray(config.title.localizationTargets)).toBe(true);
      expect(config.title.localizationTargets).toContain('pt-BR');
      expect(config.title.localizationTargets).toContain('ko');
      expect(config.title.localizationTargets).toContain('de');
    });

    it('Mega Wedgie 3D has its own blocked words', () => {
      const config = getWorkspaceConfig({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(config.title.blockedWords).toContain('cheat');
      expect(config.title.blockedWords).toContain('aimbot');
      expect(config.title.blockedWords.length).toBeLessThan(30);
    });
  });

  describe('getAvailableStudios', () => {
    it('returns both studios', () => {
      const studios = getAvailableStudios();
      expect(studios.length).toBe(2);
      expect(studios.map(s => s.slug)).toContain('one-more-game');
      expect(studios.map(s => s.slug)).toContain('best-mega-gameco');
    });
  });

  describe('getAvailableTitles', () => {
    it('returns SWAPMEAT for one-more-game', () => {
      const titles = getAvailableTitles('one-more-game');
      expect(titles.length).toBe(1);
      expect(titles[0].slug).toBe('swapmeat');
    });

    it('returns Mega Wedgie 3D for best-mega-gameco', () => {
      const titles = getAvailableTitles('best-mega-gameco');
      expect(titles.length).toBe(1);
      expect(titles[0].slug).toBe('mega-wedgie-3d');
    });

    it('returns empty array for unknown studio', () => {
      expect(getAvailableTitles('nope')).toEqual([]);
    });
  });
});
