// @vitest-environment jsdom
// Tests for the one-pipeline architecture:
// All input → markdown (editor) → markdownToBBCode → BBCode (output)
// Confluence input is normalized to markdown at paste time, not at conversion time.

import { describe, it, expect } from 'vitest';
import { detectFormat } from '../format-detector';
import { markdownToBBCode } from '../converter';
import { confluenceToMarkdown } from '../confluence-converter';
import type { SteamContext } from '../contexts';

/**
 * Simulates the converter routing logic from App.tsx.
 * In the one-pipeline architecture, the editor always contains markdown.
 * The converter always uses markdownToBBCode — no format branching.
 */
function convertEditorContent(input: string, context: SteamContext) {
  return markdownToBBCode(input, context);
}

/**
 * Simulates the full Confluence paste flow:
 * Confluence HTML → confluenceToMarkdown → editor → markdownToBBCode → BBCode
 */
function simulateConfluencePaste(html: string, context: SteamContext) {
  const { markdown, notes: conversionNotes } = confluenceToMarkdown(html, context);
  const { bbcode, notes: converterNotes } = markdownToBBCode(markdown, context);
  return { markdown, bbcode, notes: [...conversionNotes, ...converterNotes] };
}

describe('one-pipeline conversion', () => {
  it('converts markdown input to BBCode', () => {
    const input = '# Hello World\n\nThis is **bold** text.\n\n- Item 1\n- Item 2';
    const result = convertEditorContent(input, 'announcements');

    expect(result.bbcode).toContain('[h1]Hello World[/h1]');
    expect(result.bbcode).toContain('[b]bold[/b]');
    expect(result.bbcode).toContain('[list]');
  });

  it('passes plain text through the markdown converter', () => {
    const input = 'Just some plain text without any formatting.';
    const result = convertEditorContent(input, 'announcements');

    expect(result.bbcode).toContain('Just some plain text');
  });

  it('handles empty input', () => {
    const result = convertEditorContent('', 'announcements');
    expect(result.bbcode).toBe('');
  });

  it('handles whitespace-only input', () => {
    const result = convertEditorContent('   \n\n   ', 'announcements');
    expect(result.bbcode.trim()).toBe('');
  });

  it('respects Steam context', () => {
    const md = '# Title\n\n![alt](http://example.com/img.png)';
    const result = convertEditorContent(md, 'guides');
    expect(result.notes.some(n => n.includes('previewimg'))).toBe(true);
  });
});

describe('Confluence paste pipeline', () => {
  it('Confluence HTML becomes markdown then BBCode', () => {
    const html = '<h1>Patch Notes</h1><p>Fixed <strong>critical bug</strong>.</p>';
    const result = simulateConfluencePaste(html, 'announcements');

    // Markdown intermediate is readable
    expect(result.markdown).toContain('# Patch Notes');
    expect(result.markdown).toContain('**critical bug**');

    // BBCode output is correct
    expect(result.bbcode).toContain('[h1]Patch Notes[/h1]');
    expect(result.bbcode).toContain('[b]critical bug[/b]');
  });

  it('no raw HTML survives the pipeline', () => {
    const html = '<p>Hello <strong>world</strong></p><ac:image><ri:attachment ri:filename="screenshot.png"/></ac:image>';
    const result = simulateConfluencePaste(html, 'announcements');

    expect(result.markdown).not.toContain('<p>');
    expect(result.markdown).not.toContain('<strong>');
    expect(result.markdown).not.toContain('<ac:');
    expect(result.bbcode).not.toContain('<p>');
    expect(result.bbcode).not.toContain('<strong>');
    expect(result.bbcode).not.toContain('<ac:');
  });

  it('Confluence with lists produces correct BBCode', () => {
    const html = '<h1>Release Notes</h1><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Important info</p></ac:rich-text-body></ac:structured-macro><ul><li>First item</li><li>Second item</li></ul>';
    const result = simulateConfluencePaste(html, 'announcements');

    expect(result.bbcode).toContain('[h1]Release Notes[/h1]');
    expect(result.bbcode).toContain('[list]');
    expect(result.bbcode).toContain('[*]First item');
    expect(result.bbcode).toContain('[*]Second item');
    expect(result.bbcode).toContain('[/list]');
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('image drop markers convert correctly through pipeline', () => {
    const html = '<ac:image><ri:attachment ri:filename="hero.png"/></ac:image>';
    const result = simulateConfluencePaste(html, 'announcements');

    // Markdown has markdown-format marker
    expect(result.markdown).toContain('**>>> Drop image: hero.png <<<**');
    // BBCode has BBCode-format marker (converted by markdownToBBCode)
    expect(result.bbcode).toContain('[b]>>> Drop image: hero.png <<<[/b]');
  });
});

describe('format detection (editor content)', () => {
  // The format detector runs on the editor content (always markdown or plaintext).
  // Confluence detection remains for the format badge — the editor might briefly
  // contain confluence HTML if pasted without the clipboard API (e.g., drag-and-drop).

  it('detects markdown content', () => {
    expect(detectFormat('# Hello World\n\nSome text')).toBe('markdown');
  });

  it('detects plaintext', () => {
    expect(detectFormat('Just a regular sentence.')).toBe('plaintext');
  });

  it('detects confluence markers (for badge)', () => {
    expect(detectFormat('<ac:image><ri:attachment ri:filename="test.png" /></ac:image>')).toBe('confluence');
  });

  it('does not detect standard HTML as confluence', () => {
    expect(detectFormat('<p>Hello <strong>world</strong></p>')).not.toBe('confluence');
  });

  it('returns plaintext for empty string', () => {
    expect(detectFormat('')).toBe('plaintext');
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

  it('detects data-renderer-start-pos attribute', () => {
    expect(detectFormat('<p data-renderer-start-pos="10">Text</p>')).toBe('confluence');
  });
});
