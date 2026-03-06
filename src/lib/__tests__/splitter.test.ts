import { describe, it, expect } from 'vitest';
import { splitForDiscord, formatSectionHeader, needsSplitting } from '../splitter';

describe('splitForDiscord', () => {
  it('returns single section for short content', () => {
    const sections = splitForDiscord('short text');
    expect(sections).toHaveLength(1);
    expect(sections[0].content).toBe('short text');
    expect(sections[0].index).toBe(0);
  });

  it('returns single section when exactly at limit', () => {
    const text = 'a'.repeat(2000);
    const sections = splitForDiscord(text, 2000);
    expect(sections).toHaveLength(1);
  });

  it('splits content exceeding limit', () => {
    const text = 'a'.repeat(3000);
    const sections = splitForDiscord(text, 2000);
    expect(sections.length).toBeGreaterThan(1);
  });

  it('assigns sequential indices', () => {
    const text = 'a'.repeat(5000);
    const sections = splitForDiscord(text, 2000);
    for (let i = 0; i < sections.length; i++) {
      expect(sections[i].index).toBe(i);
    }
  });

  it('charCount matches content length', () => {
    const text = 'a'.repeat(3000);
    const sections = splitForDiscord(text, 2000);
    for (const section of sections) {
      expect(section.charCount).toBe(section.content.length);
    }
  });

  it('preserves all content across sections', () => {
    const text = 'word '.repeat(500); // ~2500 chars
    const sections = splitForDiscord(text, 2000);
    const rejoined = sections.map(s => s.content).join(' ');
    // All words should be present (trimming may remove some spaces)
    expect(rejoined.replace(/\s+/g, ' ').trim()).toBe(text.trim());
  });

  it('prefers breaking at paragraph boundaries', () => {
    const text = 'Paragraph one content here.\n\nParagraph two content here.\n\nParagraph three.';
    const sections = splitForDiscord(text, 40);
    // Should break at \n\n rather than mid-word
    expect(sections[0].content).not.toContain('Paragraph two');
  });

  it('prefers breaking at headers', () => {
    const text = 'Some intro text\n\n# Section Header\n\nMore content here';
    const sections = splitForDiscord(text, 30);
    // Header should start a new section
    expect(sections.some(s => s.content.startsWith('# Section'))).toBe(true);
  });

  it('each section is within the limit', () => {
    const text = 'word '.repeat(1000);
    const sections = splitForDiscord(text, 2000);
    for (const section of sections) {
      expect(section.charCount).toBeLessThanOrEqual(2000);
    }
  });

  it('uses discord default limit of 2000', () => {
    const text = 'a'.repeat(1999);
    const sections = splitForDiscord(text);
    expect(sections).toHaveLength(1);
  });
});

describe('formatSectionHeader', () => {
  it('returns empty for single section', () => {
    expect(formatSectionHeader(0, 1)).toBe('');
  });

  it('formats 1-indexed section numbers', () => {
    expect(formatSectionHeader(0, 3)).toBe('[1/3]\n');
    expect(formatSectionHeader(1, 3)).toBe('[2/3]\n');
    expect(formatSectionHeader(2, 3)).toBe('[3/3]\n');
  });
});

describe('needsSplitting', () => {
  it('returns false for short content', () => {
    expect(needsSplitting('short')).toBe(false);
  });

  it('returns true for content exceeding limit', () => {
    expect(needsSplitting('a'.repeat(2001))).toBe(true);
  });

  it('returns false for content at exactly the limit', () => {
    expect(needsSplitting('a'.repeat(2000))).toBe(false);
  });

  it('accepts custom limit', () => {
    expect(needsSplitting('a'.repeat(100), 50)).toBe(true);
    expect(needsSplitting('a'.repeat(100), 200)).toBe(false);
  });
});
