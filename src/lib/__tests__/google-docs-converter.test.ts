// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { googleDocsToMarkdown, isGoogleDocsHtml } from '../google-docs-converter';

describe('isGoogleDocsHtml', () => {
  it('detects docs-internal-guid wrapper', () => {
    expect(isGoogleDocsHtml('<b id="docs-internal-guid-abc123" style="font-weight:normal">')).toBe(true);
  });

  it('returns false for plain HTML', () => {
    expect(isGoogleDocsHtml('<p>Hello world</p>')).toBe(false);
  });

  it('returns false for Confluence HTML', () => {
    expect(isGoogleDocsHtml('<ac:image><ri:attachment /></ac:image>')).toBe(false);
  });
});

describe('googleDocsToMarkdown', () => {
  // Helper to wrap content in the typical Google Docs clipboard wrapper
  function gdoc(inner: string): string {
    return `<meta charset="utf-8"><b id="docs-internal-guid-abc123" style="font-weight:normal">${inner}</b>`;
  }

  describe('paragraphs', () => {
    it('converts a single paragraph', () => {
      const html = gdoc('<p><span>Hello world</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toBe('Hello world');
    });

    it('converts multiple paragraphs', () => {
      const html = gdoc('<p><span>First paragraph</span></p><p><span>Second paragraph</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('First paragraph');
      expect(markdown).toContain('Second paragraph');
      // Should have a blank line between paragraphs
      expect(markdown).toMatch(/First paragraph\n\nSecond paragraph/);
    });

    it('handles empty paragraphs as blank lines', () => {
      const html = gdoc('<p><span></span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toBe('');
    });
  });

  describe('bold formatting', () => {
    it('converts font-weight:700 span to bold', () => {
      const html = gdoc('<p><span style="font-weight:700">Bold text</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('**Bold text**');
    });

    it('converts font-weight:bold span to bold', () => {
      const html = gdoc('<p><span style="font-weight:bold">Bold text</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('**Bold text**');
    });

    it('handles bold within a sentence', () => {
      const html = gdoc('<p><span>Normal </span><span style="font-weight:700">bold</span><span> normal</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('Normal **bold** normal');
    });
  });

  describe('italic formatting', () => {
    it('converts font-style:italic span to italic', () => {
      const html = gdoc('<p><span style="font-style:italic">Italic text</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('*Italic text*');
    });
  });

  describe('strikethrough', () => {
    it('converts text-decoration:line-through to strikethrough', () => {
      const html = gdoc('<p><span style="text-decoration:line-through">Struck text</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('~~Struck text~~');
    });
  });

  describe('combined formatting', () => {
    it('handles bold + italic on the same span', () => {
      const html = gdoc('<p><span style="font-weight:700;font-style:italic">Bold italic</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('***Bold italic***');
    });
  });

  describe('links', () => {
    it('converts a simple link', () => {
      const html = gdoc('<p><a href="https://example.com"><span>Click here</span></a></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('[Click here](https://example.com)');
    });

    it('unwraps Google redirect URLs', () => {
      const html = gdoc('<p><a href="https://www.google.com/url?q=https://example.com&amp;sa=D"><span>Link</span></a></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('[Link](https://example.com)');
    });
  });

  describe('unordered lists', () => {
    it('converts a simple unordered list', () => {
      const html = gdoc('<ul><li><p><span>Item 1</span></p></li><li><p><span>Item 2</span></p></li></ul>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('- Item 1');
      expect(markdown).toContain('- Item 2');
    });
  });

  describe('ordered lists', () => {
    it('converts a simple ordered list', () => {
      const html = gdoc('<ol><li><p><span>First</span></p></li><li><p><span>Second</span></p></li></ol>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('1. First');
      expect(markdown).toContain('2. Second');
    });
  });

  describe('headings by font size', () => {
    it('detects h1 from 20pt font size', () => {
      const html = gdoc('<p><span style="font-size:20pt">Main Title</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('# Main Title');
    });

    it('detects h2 from 16pt font size', () => {
      const html = gdoc('<p><span style="font-size:16pt">Section</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('## Section');
    });

    it('detects h3 from 14pt font size', () => {
      const html = gdoc('<p><span style="font-size:14pt">Subsection</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('### Subsection');
    });

    it('treats normal size (11pt) as paragraph', () => {
      const html = gdoc('<p><span style="font-size:11pt">Normal text</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).not.toMatch(/^#/m);
      expect(markdown).toContain('Normal text');
    });
  });

  describe('tables', () => {
    it('converts a simple 2x2 table', () => {
      const html = gdoc('<table><tr><td><p><span>A</span></p></td><td><p><span>B</span></p></td></tr><tr><td><p><span>C</span></p></td><td><p><span>D</span></p></td></tr></table>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('| A | B |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| C | D |');
    });
  });

  describe('images', () => {
    it('preserves external image URLs', () => {
      const html = gdoc('<p><img src="https://example.com/img.png" /></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('![](https://example.com/img.png)');
    });

    it('notes embedded data: images', () => {
      const html = gdoc('<p><img src="data:image/png;base64,abc123" /></p>');
      const { markdown, notes } = googleDocsToMarkdown(html);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toContain('Embedded images');
      // Data images are stripped (no useful output)
      expect(markdown).not.toContain('data:image');
    });
  });

  describe('whitespace cleanup', () => {
    it('collapses excessive newlines', () => {
      const html = gdoc('<p><span>A</span></p><p><span></span></p><p><span></span></p><p><span>B</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      // Should not have more than 2 consecutive newlines
      expect(markdown).not.toMatch(/\n{3,}/);
    });

    it('trims trailing whitespace on lines', () => {
      const html = gdoc('<p><span>Text   </span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toBe('Text');
    });
  });

  describe('docs-internal-guid wrapper', () => {
    it('unwraps the guid wrapper with font-weight:normal', () => {
      const html = '<b id="docs-internal-guid-12345" style="font-weight:normal"><p><span>Content</span></p></b>';
      const { markdown } = googleDocsToMarkdown(html);
      // Should not treat the outer <b> as bold (it has font-weight:normal)
      expect(markdown).toBe('Content');
      expect(markdown).not.toContain('**');
    });
  });

  describe('horizontal rules', () => {
    it('converts <hr> to markdown', () => {
      const html = gdoc('<p><span>Before</span></p><hr><p><span>After</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('---');
    });
  });

  describe('line breaks', () => {
    it('converts <br> to newline', () => {
      const html = gdoc('<p><span>Line 1</span><br><span>Line 2</span></p>');
      const { markdown } = googleDocsToMarkdown(html);
      expect(markdown).toContain('Line 1\nLine 2');
    });
  });
});
