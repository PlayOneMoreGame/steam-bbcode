import { describe, it, expect } from 'vitest';
import { markdownToHTML } from '../markdown-renderer';

describe('markdownToHTML', () => {
  describe('headers', () => {
    it('converts h1', () => {
      expect(markdownToHTML('# Title')).toContain('<h1 class="md-h1">Title</h1>');
    });

    it('converts h2', () => {
      expect(markdownToHTML('## Section')).toContain('<h2 class="md-h2">Section</h2>');
    });

    it('converts h3', () => {
      expect(markdownToHTML('### Sub')).toContain('<h3 class="md-h3">Sub</h3>');
    });
  });

  describe('formatting', () => {
    it('converts bold with **', () => {
      expect(markdownToHTML('**bold**')).toContain('<strong>bold</strong>');
    });

    it('converts bold with __', () => {
      expect(markdownToHTML('__bold__')).toContain('<strong>bold</strong>');
    });

    it('converts italic with *', () => {
      expect(markdownToHTML('*italic*')).toContain('<em>italic</em>');
    });

    it('converts strikethrough', () => {
      expect(markdownToHTML('~~deleted~~')).toContain('<del>deleted</del>');
    });
  });

  describe('code', () => {
    it('converts fenced code blocks', () => {
      const html = markdownToHTML('```\nconst x = 1;\n```');
      expect(html).toContain('<pre class="md-codeblock">');
      expect(html).toContain('const x = 1;');
    });

    it('converts code blocks with language class', () => {
      const html = markdownToHTML('```javascript\nconst x = 1;\n```');
      expect(html).toContain('class="language-javascript"');
    });

    it('converts inline code', () => {
      expect(markdownToHTML('use `npm install`')).toContain('<code class="md-code">npm install</code>');
    });
  });

  describe('links', () => {
    it('converts markdown links', () => {
      const html = markdownToHTML('[click](https://example.com)');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('>click</a>');
    });

    it('adds target blank and noopener', () => {
      const html = markdownToHTML('[link](https://example.com)');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener"');
    });
  });

  describe('images', () => {
    it('converts images', () => {
      const html = markdownToHTML('![alt text](https://example.com/img.png)');
      expect(html).toContain('src="https://example.com/img.png"');
      expect(html).toContain('alt="alt text"');
    });
  });

  describe('blockquotes', () => {
    it('converts single blockquote', () => {
      expect(markdownToHTML('> quoted text')).toContain('<blockquote class="md-quote">quoted text</blockquote>');
    });

    it('merges consecutive blockquotes', () => {
      const html = markdownToHTML('> line 1\n> line 2');
      // Should be one blockquote, not two
      const count = (html.match(/<blockquote/g) || []).length;
      expect(count).toBe(1);
    });
  });

  describe('horizontal rules', () => {
    it('converts ---', () => {
      expect(markdownToHTML('---')).toContain('<hr class="md-hr" />');
    });

    it('converts ***', () => {
      expect(markdownToHTML('***')).toContain('<hr class="md-hr" />');
    });

    it('converts ___', () => {
      expect(markdownToHTML('___')).toContain('<hr class="md-hr" />');
    });
  });

  describe('lists', () => {
    it('converts unordered list', () => {
      const html = markdownToHTML('- Item 1\n- Item 2');
      expect(html).toContain('<ul class="md-list">');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>Item 2</li>');
      expect(html).toContain('</ul>');
    });

    it('converts ordered list', () => {
      const html = markdownToHTML('1. First\n2. Second');
      expect(html).toContain('<ol class="md-olist">');
      expect(html).toContain('<li>First</li>');
      expect(html).toContain('<li>Second</li>');
    });

    it('handles list followed by text', () => {
      const html = markdownToHTML('- Item 1\n- Item 2\n\nSome text');
      expect(html).toContain('</ul>');
      expect(html).toContain('Some text');
    });
  });

  describe('HTML escaping', () => {
    it('escapes ampersands', () => {
      expect(markdownToHTML('A & B')).toContain('A &amp; B');
    });

    it('escapes angle brackets', () => {
      expect(markdownToHTML('<script>')).toContain('&lt;script&gt;');
    });
  });

  describe('paragraphs', () => {
    it('wraps plain text in paragraphs', () => {
      const html = markdownToHTML('hello world');
      expect(html).toContain('<p>');
    });

    it('separates paragraphs on double newlines', () => {
      const html = markdownToHTML('para 1\n\npara 2');
      expect(html).toContain('</p><p>');
    });
  });
});
