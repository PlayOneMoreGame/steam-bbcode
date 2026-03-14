import { describe, it, expect } from 'vitest';
import { getWorkspaceConfig, getAvailableTitles, studioConfig } from '../workspace-loader';
import { DO_NOT_TRANSLATE } from '../glossary';

describe('workspace-loader', () => {
  describe('getWorkspaceConfig', () => {
    it('returns a valid config with studio and title', () => {
      const config = getWorkspaceConfig();
      expect(config.studio).toBeDefined();
      expect(config.title).toBeDefined();
      expect(config.studio.studio).toBe('One More Game');
      expect(config.title.title).toBe('SWAPMEAT');
    });

    it('returns config for an explicit title', () => {
      const config = getWorkspaceConfig('SWAPMEAT');
      expect(config.title.title).toBe('SWAPMEAT');
    });

    it('throws for unknown title', () => {
      expect(() => getWorkspaceConfig('NONEXISTENT')).toThrow('Unknown title: "NONEXISTENT"');
    });

    it('has expected shape', () => {
      const config = getWorkspaceConfig();
      expect(typeof config.studio.studio).toBe('string');
      expect(typeof config.title.title).toBe('string');
      expect(Array.isArray(config.title.dntTerms)).toBe(true);
      expect(config.title.dntTerms.length).toBeGreaterThan(0);
      expect(Array.isArray(config.title.localizationTargets)).toBe(true);
      expect(config.title.localizationTargets).toContain('pt-BR');
      expect(config.title.localizationTargets).toContain('es-LATAM');
    });
  });

  describe('getAvailableTitles', () => {
    it('returns SWAPMEAT', () => {
      expect(getAvailableTitles()).toEqual(['SWAPMEAT']);
    });
  });

  describe('studioConfig', () => {
    it('exposes the raw studio config', () => {
      expect(studioConfig.studio).toBe('One More Game');
    });
  });

  describe('glossary integration', () => {
    it('DO_NOT_TRANSLATE matches title config DNT terms', () => {
      const config = getWorkspaceConfig();
      expect(DO_NOT_TRANSLATE).toEqual(config.title.dntTerms);
    });

    it('includes known terms', () => {
      expect(DO_NOT_TRANSLATE).toContain('SWAPMEAT');
      expect(DO_NOT_TRANSLATE).toContain('Tangus');
      expect(DO_NOT_TRANSLATE).toContain('Random Solar System');
    });
  });
});
