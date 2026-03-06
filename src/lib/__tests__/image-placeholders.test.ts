import { describe, it, expect } from 'vitest';
import { extractPlaceholderImages } from '../image-placeholders';

describe('extractPlaceholderImages', () => {
  it('extracts filenames from drop markers', () => {
    const bbcode = '[b]>>> Drop image: test.png <<<[/b]\n[b]>>> Drop image: screenshot.gif <<<[/b]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['test.png', 'screenshot.gif']);
  });

  it('returns empty array when no drop markers', () => {
    const bbcode = '[img]https://example.com/img.png[/img]';
    expect(extractPlaceholderImages(bbcode)).toEqual([]);
  });

  it('deduplicates repeated filenames', () => {
    const bbcode = '[b]>>> Drop image: hero.png <<<[/b]\n[b]>>> Drop image: hero.png <<<[/b]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['hero.png']);
  });

  it('handles filenames with spaces', () => {
    const bbcode = '[b]>>> Drop image: Screenshot 2026-03-04 at 1.09.26 PM.png <<<[/b]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['Screenshot 2026-03-04 at 1.09.26 PM.png']);
  });

  it('handles mixed drop markers and real URLs', () => {
    const bbcode = '[b]>>> Drop image: local.png <<<[/b]\n[img]https://cdn.steam.com/real.png[/img]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['local.png']);
  });

  it('returns empty array for empty input', () => {
    expect(extractPlaceholderImages('')).toEqual([]);
  });

  it('handles filenames with special characters', () => {
    const bbcode = '[b]>>> Drop image: pasted-image-1.png <<<[/b]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['pasted-image-1.png']);
  });

  it('extracts multiple filenames in order', () => {
    const bbcode = '[b]>>> Drop image: a.png <<<[/b]\n[b]>>> Drop image: b.gif <<<[/b]\n[b]>>> Drop image: c.jpg <<<[/b]';
    expect(extractPlaceholderImages(bbcode)).toEqual(['a.png', 'b.gif', 'c.jpg']);
  });

  it('ignores drop markers with no filename', () => {
    const bbcode = '[b]>>> Drop image:  <<<[/b]';
    // The regex requires at least one non-space character
    expect(extractPlaceholderImages(bbcode)).toEqual([]);
  });
});
