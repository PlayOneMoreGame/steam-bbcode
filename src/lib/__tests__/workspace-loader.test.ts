import { describe, it, expect } from 'vitest';
import { getWorkspaceConfig, getWorkspaceSelection, getAvailableStudios, getAvailableTitles } from '../workspace-loader';

describe('workspace-loader', () => {
  describe('auto-discovery', () => {
    it('discovers studios from src/workspace/studios/ via import.meta.glob', () => {
      const studios = getAvailableStudios();
      expect(studios.length).toBeGreaterThanOrEqual(2);
      const slugs = studios.map(s => s.slug);
      expect(slugs).toContain('example-studio');
      expect(slugs).toContain('best-mega-gameco');
    });

    it('discovers titles nested under each studio', () => {
      const exampleTitles = getAvailableTitles('example-studio');
      expect(exampleTitles.length).toBeGreaterThanOrEqual(1);
      expect(exampleTitles.map(t => t.slug)).toContain('example-game');

      const bmgTitles = getAvailableTitles('best-mega-gameco');
      expect(bmgTitles.length).toBeGreaterThanOrEqual(1);
      expect(bmgTitles.map(t => t.slug)).toContain('mega-wedgie-3d');
    });
  });

  describe('default selection', () => {
    it('defaults to studio with "default": true (example-studio)', () => {
      // example-studio has "default": true in studio.json
      const sel = getWorkspaceSelection();
      expect(sel.studioSlug).toBe('example-studio');
      expect(sel.titleSlug).toBe('example-game');
    });

    it('studio marked as default has the flag set', () => {
      const config = getWorkspaceConfig({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      expect(config.studio.default).toBe(true);
    });

    it('non-default studio does not have the flag', () => {
      const config = getWorkspaceConfig({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(config.studio.default).toBeFalsy();
    });
  });

  describe('getWorkspaceConfig', () => {
    it('returns a valid config with studio and title', () => {
      const config = getWorkspaceConfig({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      expect(config.studio).toBeDefined();
      expect(config.title).toBeDefined();
      expect(config.studio.displayName).toBe('Example Studio');
      expect(config.title.displayName).toBe('Example Game');
    });

    it('returns config for Best Mega Gameco', () => {
      const config = getWorkspaceConfig({ studioSlug: 'best-mega-gameco', titleSlug: 'mega-wedgie-3d' });
      expect(config.studio.displayName).toBe('Best Mega Gameco');
      expect(config.title.displayName).toBe('Mega Wedgie 3D');
    });

    it('throws for unknown studio', () => {
      expect(() => getWorkspaceConfig({ studioSlug: 'nope', titleSlug: 'example-game' }))
        .toThrow('Unknown studio: "nope"');
    });

    it('throws for unknown title', () => {
      expect(() => getWorkspaceConfig({ studioSlug: 'example-studio', titleSlug: 'nope' }))
        .toThrow('Unknown title: "nope"');
    });

    it('has expected shape for Example Game', () => {
      const config = getWorkspaceConfig({ studioSlug: 'example-studio', titleSlug: 'example-game' });
      expect(config.studio.slug).toBe('example-studio');
      expect(config.title.slug).toBe('example-game');
      expect(config.title.studioSlug).toBe('example-studio');
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
      expect(studios.map(s => s.slug)).toContain('example-studio');
      expect(studios.map(s => s.slug)).toContain('best-mega-gameco');
    });
  });

  describe('getAvailableTitles', () => {
    it('returns Example Game for example-studio', () => {
      const titles = getAvailableTitles('example-studio');
      expect(titles.length).toBe(1);
      expect(titles[0].slug).toBe('example-game');
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
