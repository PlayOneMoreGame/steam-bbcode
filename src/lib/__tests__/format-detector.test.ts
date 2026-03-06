import { describe, it, expect } from 'vitest';
import { detectFormat } from '../format-detector';

describe('detectFormat', () => {
  describe('confluence detection', () => {
    it('detects ac: namespace tags', () => {
      expect(detectFormat('<ac:image><ri:attachment ri:filename="test.png" /></ac:image>')).toBe('confluence');
    });

    it('detects ri: namespace tags', () => {
      expect(detectFormat('<p>Text with <ri:page ri:content-title="Page" /></p>')).toBe('confluence');
    });

    it('detects local-id attributes', () => {
      expect(detectFormat('<h2 local-id="8c8c629dc341">Title</h2>')).toBe('confluence');
    });

    it('detects ac:structured-macro', () => {
      expect(detectFormat('<ac:structured-macro ac:name="code"><ac:plain-text-body>x=1</ac:plain-text-body></ac:structured-macro>')).toBe('confluence');
    });

    it('detects real SWAPMEAT fixture as confluence', () => {
      // Just the first line of the fixture
      const sample = '<h2 local-id="8c8c629dc341"><strong><u>Shrines</u></strong></h2>';
      expect(detectFormat(sample)).toBe('confluence');
    });

    it('does not false-positive on generic HTML', () => {
      expect(detectFormat('<b>bold</b> <i>italic</i> <a href="http://example.com">link</a>')).not.toBe('confluence');
    });

    it('does not false-positive on HTML with id attributes', () => {
      expect(detectFormat('<div id="abc123"><p>content</p></div>')).not.toBe('confluence');
    });
  });

  describe('markdown detection', () => {
    it('detects ATX headers', () => {
      expect(detectFormat('# Hello World\n\nSome text')).toBe('markdown');
    });

    it('detects h2 headers', () => {
      expect(detectFormat('## Section\n\nContent here')).toBe('markdown');
    });

    it('detects bold syntax', () => {
      expect(detectFormat('This has **bold** text and more content')).toBe('markdown');
    });

    it('detects links', () => {
      expect(detectFormat('Check [this link](http://example.com) out')).toBe('markdown');
    });

    it('detects unordered lists', () => {
      expect(detectFormat('- item 1\n- item 2\n- item 3')).toBe('markdown');
    });

    it('detects ordered lists', () => {
      expect(detectFormat('1. first\n2. second\n3. third')).toBe('markdown');
    });

    it('detects fenced code blocks', () => {
      expect(detectFormat('```\ncode here\n```')).toBe('markdown');
    });

    it('detects images', () => {
      expect(detectFormat('![alt text](http://example.com/image.png)')).toBe('markdown');
    });

    it('detects blockquotes', () => {
      expect(detectFormat('> This is a quote\n> Another line\n\nNormal text')).toBe('markdown');
    });
  });

  describe('plaintext detection', () => {
    it('returns plaintext for empty string', () => {
      expect(detectFormat('')).toBe('plaintext');
    });

    it('returns plaintext for whitespace only', () => {
      expect(detectFormat('   \n  \n  ')).toBe('plaintext');
    });

    it('returns plaintext for plain sentences', () => {
      expect(detectFormat('This is just a regular sentence with no markup.')).toBe('plaintext');
    });

    it('returns plaintext for multi-line plain text', () => {
      expect(detectFormat('Line one.\nLine two.\nLine three.')).toBe('plaintext');
    });
  });

  describe('edge cases', () => {
    it('prioritizes confluence over markdown when both present', () => {
      const mixed = '# Heading\n\n<ac:image><ri:attachment ri:filename="test.png" /></ac:image>\n\n**bold**';
      expect(detectFormat(mixed)).toBe('confluence');
    });

    it('handles single markdown marker as plaintext (low confidence)', () => {
      // A single asterisk in normal text should not trigger markdown
      expect(detectFormat('I rated it 5 * out of 5')).toBe('plaintext');
    });
  });

  describe('rendered clipboard detection', () => {
    it('detects data-renderer-start-pos attribute', () => {
      expect(detectFormat('<p data-renderer-start-pos="10">Text</p>')).toBe('confluence');
    });

    it('detects data-node-type="mediaSingle"', () => {
      expect(detectFormat('<div data-node-type="mediaSingle"><div data-node-type="media" data-file-name="img.png"></div></div>')).toBe('confluence');
    });

    it('detects data-local-id attribute (rendered clipboard variant)', () => {
      expect(detectFormat('<h2 data-local-id="8c8c629dc341">Title</h2>')).toBe('confluence');
    });

    it('detects real rendered clipboard sample', () => {
      const sample = `<meta charset='utf-8'><h2 id="Shrines" data-local-id="8c8c629dc341" data-renderer-start-pos="1" style="margin: 0px;"><strong><u>Shrines</u></strong></h2>`;
      expect(detectFormat(sample)).toBe('confluence');
    });
  });
});
