import { describe, it, expect } from 'vitest';
import { tokenizeMarkdown, tokenizeBBCode, applyHighlighting } from '../highlighter';

describe('tokenizeMarkdown', () => {
  it('tokenizes headers', () => {
    const tokens = tokenizeMarkdown('# Hello');
    expect(tokens.some(t => t.type === 'md-header')).toBe(true);
  });

  it('tokenizes bold **', () => {
    const tokens = tokenizeMarkdown('**bold**');
    expect(tokens.some(t => t.type === 'md-bold')).toBe(true);
  });

  it('tokenizes italic *', () => {
    const tokens = tokenizeMarkdown('some *italic* text');
    expect(tokens.some(t => t.type === 'md-italic')).toBe(true);
  });

  it('tokenizes strikethrough', () => {
    const tokens = tokenizeMarkdown('~~deleted~~');
    expect(tokens.some(t => t.type === 'md-strike')).toBe(true);
  });

  it('tokenizes code blocks', () => {
    const tokens = tokenizeMarkdown('```\ncode\n```');
    expect(tokens.some(t => t.type === 'md-codeblock')).toBe(true);
  });

  it('tokenizes inline code', () => {
    const tokens = tokenizeMarkdown('use `npm`');
    expect(tokens.some(t => t.type === 'md-code')).toBe(true);
  });

  it('tokenizes links', () => {
    const tokens = tokenizeMarkdown('[text](url)');
    expect(tokens.some(t => t.type === 'md-link')).toBe(true);
  });

  it('tokenizes images', () => {
    const tokens = tokenizeMarkdown('![alt](url)');
    expect(tokens.some(t => t.type === 'md-image')).toBe(true);
  });

  it('tokenizes blockquotes', () => {
    const tokens = tokenizeMarkdown('> quoted');
    expect(tokens.some(t => t.type === 'md-quote')).toBe(true);
  });

  it('tokenizes horizontal rules', () => {
    const tokens = tokenizeMarkdown('---');
    expect(tokens.some(t => t.type === 'md-hr')).toBe(true);
  });

  it('tokenizes list items', () => {
    const tokens = tokenizeMarkdown('- item');
    expect(tokens.some(t => t.type === 'md-list')).toBe(true);
  });

  it('returns tokens sorted by start position', () => {
    const tokens = tokenizeMarkdown('# Header\n**bold** and `code`');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].start).toBeGreaterThanOrEqual(tokens[i - 1].start);
    }
  });

  it('returns empty array for plain text', () => {
    const tokens = tokenizeMarkdown('plain text');
    expect(tokens).toHaveLength(0);
  });
});

describe('tokenizeBBCode', () => {
  it('tokenizes header tags', () => {
    const tokens = tokenizeBBCode('[h1]Title[/h1]');
    expect(tokens.some(t => t.type === 'bb-header')).toBe(true);
  });

  it('tokenizes formatting tags', () => {
    const tokens = tokenizeBBCode('[b]bold[/b]');
    expect(tokens.some(t => t.type === 'bb-format')).toBe(true);
  });

  it('marks closing tags', () => {
    const tokens = tokenizeBBCode('[b]bold[/b]');
    expect(tokens.some(t => t.type.includes('bb-closing'))).toBe(true);
  });

  it('tokenizes list tags', () => {
    const tokens = tokenizeBBCode('[list][*]item[/list]');
    expect(tokens.some(t => t.type === 'bb-list')).toBe(true);
    expect(tokens.some(t => t.type === 'bb-list-item')).toBe(true);
  });

  it('tokenizes link tags', () => {
    const tokens = tokenizeBBCode('[url=https://example.com]link[/url]');
    expect(tokens.some(t => t.type === 'bb-link')).toBe(true);
  });

  it('tokenizes code tags', () => {
    const tokens = tokenizeBBCode('[code]x[/code]');
    expect(tokens.some(t => t.type === 'bb-code')).toBe(true);
  });

  it('handles case insensitive tags', () => {
    const tokens = tokenizeBBCode('[B]bold[/B]');
    expect(tokens.some(t => t.type === 'bb-format')).toBe(true);
  });

  it('returns tokens sorted by start position', () => {
    const tokens = tokenizeBBCode('[h1]Title[/h1]\n[b]text[/b]');
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].start).toBeGreaterThanOrEqual(tokens[i - 1].start);
    }
  });

  it('returns empty array for plain text', () => {
    const tokens = tokenizeBBCode('plain text');
    expect(tokens).toHaveLength(0);
  });
});

describe('applyHighlighting', () => {
  it('returns escaped HTML for empty tokens', () => {
    expect(applyHighlighting('<div>', [])).toBe('&lt;div&gt;');
  });

  it('wraps tokens in spans', () => {
    const tokens = [{ type: 'md-bold', start: 0, end: 8 }];
    const html = applyHighlighting('**bold**', tokens);
    expect(html).toContain('<span class="md-bold">');
    expect(html).toContain('**bold**');
    expect(html).toContain('</span>');
  });

  it('preserves text outside tokens', () => {
    const tokens = [{ type: 'md-bold', start: 5, end: 13 }];
    const html = applyHighlighting('text **bold** end', tokens);
    expect(html).toContain('text ');
    expect(html).toContain(' end');
  });

  it('escapes HTML in token text', () => {
    const tokens = [{ type: 'md-code', start: 0, end: 5 }];
    const html = applyHighlighting('`<b>`', tokens);
    expect(html).toContain('&lt;b&gt;');
  });

  it('filters overlapping tokens', () => {
    const tokens = [
      { type: 'md-bold', start: 0, end: 8 },
      { type: 'md-italic', start: 2, end: 6 }, // overlaps
    ];
    const html = applyHighlighting('**bold**', tokens);
    // Should only have one span (first token wins)
    expect((html.match(/<span/g) || []).length).toBe(1);
  });
});
