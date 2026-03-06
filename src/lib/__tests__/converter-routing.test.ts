// @vitest-environment jsdom
// Tests for format-based converter routing
// Validates that the correct converter is chosen based on detected format

import { describe, it, expect } from 'vitest';
import { detectFormat } from '../format-detector';
import { markdownToBBCode } from '../converter';
import { confluenceToBBCode } from '../confluence-converter';
import type { SteamContext } from '../contexts';

/**
 * Simulates the converter routing logic from App.tsx.
 * This mirrors the useMemo in App.tsx that picks the right converter.
 */
function convertWithRouting(input: string, context: SteamContext) {
  const format = detectFormat(input);
  if (format === 'confluence') {
    return { ...confluenceToBBCode(input, context), format };
  }
  return { ...markdownToBBCode(input, context), format };
}

describe('converter routing', () => {
  it('routes markdown input to the markdown converter', () => {
    const input = '# Hello World\n\nThis is **bold** text.\n\n- Item 1\n- Item 2';
    const result = convertWithRouting(input, 'announcements');

    expect(result.format).toBe('markdown');
    expect(result.bbcode).toContain('[h1]Hello World[/h1]');
    expect(result.bbcode).toContain('[b]bold[/b]');
    expect(result.bbcode).toContain('[list]');
  });

  it('routes Confluence XHTML to the Confluence converter', () => {
    const input = '<h1>Patch Notes</h1><p>Fixed <strong>critical bug</strong>.</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Note content</p></ac:rich-text-body></ac:structured-macro>';
    const result = convertWithRouting(input, 'announcements');

    expect(result.format).toBe('confluence');
    expect(result.bbcode).toContain('[h1]Patch Notes[/h1]');
    expect(result.bbcode).toContain('[b]critical bug[/b]');
    // Confluence info macro gets a conversion note
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('routes plain text to the markdown converter', () => {
    const input = 'Just some plain text without any formatting.';
    const result = convertWithRouting(input, 'announcements');

    expect(result.format).toBe('plaintext');
    // Plain text passes through the markdown converter unchanged
    expect(result.bbcode).toContain('Just some plain text');
  });

  it('Confluence converter produces BBCode, not raw XHTML in output', () => {
    const input = '<p>Hello <strong>world</strong></p><ac:image><ri:attachment ri:filename="screenshot.png"/></ac:image>';
    const result = convertWithRouting(input, 'announcements');

    expect(result.format).toBe('confluence');
    // Should NOT contain raw HTML tags in output
    expect(result.bbcode).not.toContain('<p>');
    expect(result.bbcode).not.toContain('<strong>');
    expect(result.bbcode).not.toContain('<ac:');
    // Should contain BBCode
    expect(result.bbcode).toContain('[b]world[/b]');
    expect(result.bbcode).toContain('[img]{image: screenshot.png}[/img]');
  });

  it('respects Steam context for both converters', () => {
    // Markdown with image
    const md = '# Title\n\n![alt](http://example.com/img.png)';
    const mdResult = convertWithRouting(md, 'guides');
    expect(mdResult.format).toBe('markdown');
    expect(mdResult.notes.some(n => n.includes('previewimg'))).toBe(true);

    // Confluence with info macro generates conversion notes
    const xhtml = '<h1>Title</h1><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Note</p></ac:rich-text-body></ac:structured-macro>';
    const xhtmlResult = convertWithRouting(xhtml, 'guides');
    expect(xhtmlResult.format).toBe('confluence');
    expect(xhtmlResult.notes.length).toBeGreaterThan(0);
  });

  it('handles empty input as plaintext', () => {
    const result = convertWithRouting('', 'announcements');
    expect(result.format).toBe('plaintext');
    expect(result.bbcode).toBe('');
  });

  it('handles whitespace-only input as plaintext', () => {
    const result = convertWithRouting('   \n\n   ', 'announcements');
    expect(result.format).toBe('plaintext');
  });

  it('Confluence with lists produces correct BBCode', () => {
    const input = '<h1>Release Notes</h1><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Important info</p></ac:rich-text-body></ac:structured-macro><ul><li>First item</li><li>Second item</li></ul>';
    const result = convertWithRouting(input, 'announcements');

    expect(result.format).toBe('confluence');
    expect(result.bbcode).toContain('[h1]Release Notes[/h1]');
    expect(result.bbcode).toContain('[list]');
    expect(result.bbcode).toContain('[*]First item');
    expect(result.bbcode).toContain('[*]Second item');
    expect(result.bbcode).toContain('[/list]');
  });
});

describe('isConfluenceHtml detection (for paste)', () => {
  // These test the same heuristic used in MarkdownPanel's paste handler.
  // We test detectFormat since isConfluenceHtml is a private helper.

  it('detects Confluence ac: namespace as confluence format', () => {
    expect(detectFormat('<p>Text</p><ac:image><ri:attachment ri:filename="x.png"/></ac:image>')).toBe('confluence');
  });

  it('detects ri: namespace as confluence format', () => {
    expect(detectFormat('<p><ri:page ri:content-title="My Page"/></p>')).toBe('confluence');
  });

  it('does not detect standard HTML as confluence', () => {
    expect(detectFormat('<p>Hello <strong>world</strong></p>')).not.toBe('confluence');
  });
});
