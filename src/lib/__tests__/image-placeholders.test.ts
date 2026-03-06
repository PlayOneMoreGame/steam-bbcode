import { describe, it, expect } from 'vitest';
import {
  extractPlaceholderImages,
  resolvePlaceholders,
  countUnresolved,
  type ImageUrlMap,
} from '../image-placeholders';

describe('extractPlaceholderImages', () => {
  it('extracts filenames from placeholder [img] tags', () => {
    const bbcode = '[img]{placeholder:test.png}[/img]\n[img]{placeholder:screenshot.gif}[/img]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['test.png', 'screenshot.gif']);
  });

  it('returns empty array when no placeholders', () => {
    const bbcode = '[img]https://example.com/img.png[/img]';
    expect(extractPlaceholderImages(bbcode)).toEqual([]);
  });

  it('deduplicates repeated filenames', () => {
    const bbcode = '[img]{placeholder:hero.png}[/img]\n[img]{placeholder:hero.png}[/img]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['hero.png']);
  });

  it('handles filenames with spaces', () => {
    const bbcode = '[img]{placeholder:Screenshot 2026-03-04 at 1.09.26 PM.png}[/img]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['Screenshot 2026-03-04 at 1.09.26 PM.png']);
  });

  it('handles mixed placeholder and real URLs', () => {
    const bbcode = '[img]{placeholder:local.png}[/img]\n[img]https://cdn.steam.com/real.png[/img]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['local.png']);
  });

  it('returns empty array for empty input', () => {
    expect(extractPlaceholderImages('')).toEqual([]);
  });
});

describe('resolvePlaceholders', () => {
  it('replaces placeholder with Steam URL', () => {
    const bbcode = '[img]{placeholder:test.png}[/img]';
    const urls: ImageUrlMap = { 'test.png': 'https://cdn.steam.com/test.png' };
    expect(resolvePlaceholders(bbcode, urls)).toBe('[img]https://cdn.steam.com/test.png[/img]');
  });

  it('leaves unresolved placeholders unchanged', () => {
    const bbcode = '[img]{placeholder:test.png}[/img]';
    const urls: ImageUrlMap = {};
    expect(resolvePlaceholders(bbcode, urls)).toBe(bbcode);
  });

  it('leaves placeholders with empty URL unchanged', () => {
    const bbcode = '[img]{placeholder:test.png}[/img]';
    const urls: ImageUrlMap = { 'test.png': '' };
    expect(resolvePlaceholders(bbcode, urls)).toBe(bbcode);
  });

  it('leaves placeholders with whitespace-only URL unchanged', () => {
    const bbcode = '[img]{placeholder:test.png}[/img]';
    const urls: ImageUrlMap = { 'test.png': '   ' };
    expect(resolvePlaceholders(bbcode, urls)).toBe(bbcode);
  });

  it('trims whitespace from URLs', () => {
    const bbcode = '[img]{placeholder:test.png}[/img]';
    const urls: ImageUrlMap = { 'test.png': '  https://cdn.steam.com/test.png  ' };
    expect(resolvePlaceholders(bbcode, urls)).toBe('[img]https://cdn.steam.com/test.png[/img]');
  });

  it('resolves some placeholders and leaves others', () => {
    const bbcode = '[img]{placeholder:a.png}[/img]\n[img]{placeholder:b.png}[/img]';
    const urls: ImageUrlMap = { 'a.png': 'https://cdn.steam.com/a.png' };
    const result = resolvePlaceholders(bbcode, urls);
    expect(result).toContain('[img]https://cdn.steam.com/a.png[/img]');
    expect(result).toContain('[img]{placeholder:b.png}[/img]');
  });

  it('resolves all occurrences of the same filename', () => {
    const bbcode = '[img]{placeholder:hero.png}[/img]\ntext\n[img]{placeholder:hero.png}[/img]';
    const urls: ImageUrlMap = { 'hero.png': 'https://cdn.steam.com/hero.png' };
    const result = resolvePlaceholders(bbcode, urls);
    expect(result).not.toContain('{placeholder:');
  });

  it('does not affect non-placeholder [img] tags', () => {
    const bbcode = '[img]https://example.com/real.png[/img]';
    const urls: ImageUrlMap = {};
    expect(resolvePlaceholders(bbcode, urls)).toBe(bbcode);
  });
});

describe('countUnresolved', () => {
  it('counts all as unresolved when map is empty', () => {
    expect(countUnresolved(['a.png', 'b.png'], {})).toBe(2);
  });

  it('counts none as unresolved when all have URLs', () => {
    const urls: ImageUrlMap = { 'a.png': 'https://a', 'b.png': 'https://b' };
    expect(countUnresolved(['a.png', 'b.png'], urls)).toBe(0);
  });

  it('counts partially resolved correctly', () => {
    const urls: ImageUrlMap = { 'a.png': 'https://a', 'b.png': '' };
    expect(countUnresolved(['a.png', 'b.png'], urls)).toBe(1);
  });

  it('treats whitespace-only URLs as unresolved', () => {
    const urls: ImageUrlMap = { 'a.png': '   ' };
    expect(countUnresolved(['a.png'], urls)).toBe(1);
  });

  it('returns 0 for empty filename list', () => {
    expect(countUnresolved([], { 'a.png': 'https://a' })).toBe(0);
  });
});
