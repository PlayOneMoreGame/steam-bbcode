import { describe, it, expect } from 'vitest';
import { lintBBCode } from '../linter';

describe('lintBBCode', () => {
  describe('unknown tags', () => {
    it('reports unknown tags', () => {
      const result = lintBBCode('[foo]text[/foo]', 'announcements');
      expect(result.errors.some(e => e.message.includes('Unknown tag [foo]'))).toBe(true);
    });

    it('does not report valid tags', () => {
      const result = lintBBCode('[b]bold[/b]', 'announcements');
      expect(result.errors.filter(e => e.message.includes('Unknown tag'))).toHaveLength(0);
    });

    it('recognizes all valid tags', () => {
      const validTags = ['h1', 'h2', 'h3', 'b', 'i', 'u', 'strike', 'list', 'olist', 
                        'table', 'tr', 'td', 'th', 'img', 'url', 'code', 'quote', 
                        'spoiler', 'hr', 'previewyoutube', 'previewimg', 'noparse'];
      
      for (const tag of validTags) {
        const result = lintBBCode(`[${tag}]content[/${tag}]`, 'announcements');
        expect(result.errors.filter(e => e.message.includes('Unknown tag'))).toHaveLength(0);
      }
    });
  });

  describe('HTML tags', () => {
    it('reports HTML tags', () => {
      const result = lintBBCode('<b>bold</b>', 'announcements');
      expect(result.errors.some(e => e.message.includes('HTML tag <b>'))).toBe(true);
    });

    it('suggests BBCode equivalent for common HTML tags', () => {
      const result = lintBBCode('<strong>bold</strong>', 'announcements');
      expect(result.errors.some(e => e.message.includes('[b]'))).toBe(true);
    });

    it('reports <br> tags', () => {
      const result = lintBBCode('line 1<br>line 2', 'announcements');
      expect(result.errors.some(e => e.message.includes('<br>'))).toBe(true);
    });

    it('reports self-closing HTML tags', () => {
      const result = lintBBCode('<img src="test.png" />', 'announcements');
      expect(result.errors.some(e => e.message.includes('<img>'))).toBe(true);
    });
  });

  describe('Markdown syntax', () => {
    it('warns about Markdown headers', () => {
      const result = lintBBCode('# Header', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Markdown header'))).toBe(true);
    });

    it('warns about Markdown bold', () => {
      const result = lintBBCode('**bold**', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Markdown bold'))).toBe(true);
    });

    it('warns about Markdown italic', () => {
      const result = lintBBCode('*italic*', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Markdown italic'))).toBe(true);
    });

    it('warns about Markdown links', () => {
      const result = lintBBCode('[text](https://example.com)', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Markdown link'))).toBe(true);
    });

    it('warns about Markdown code', () => {
      const result = lintBBCode('`code`', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Markdown code'))).toBe(true);
    });

    it('warns about Markdown lists', () => {
      const result = lintBBCode('- item', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Markdown list'))).toBe(true);
    });
  });

  describe('tag matching', () => {
    it('reports unclosed tags', () => {
      const result = lintBBCode('[b]unclosed bold', 'announcements');
      expect(result.errors.some(e => e.message.includes('Unclosed [b]'))).toBe(true);
    });

    it('reports mismatched tags', () => {
      const result = lintBBCode('[b]text[/i]', 'announcements');
      expect(result.errors.some(e => e.message.includes('Mismatched') || e.message.includes('Unexpected'))).toBe(true);
    });

    it('reports unexpected closing tags', () => {
      const result = lintBBCode('text[/b]', 'announcements');
      expect(result.errors.some(e => e.message.includes('Unexpected closing'))).toBe(true);
    });

    it('handles properly nested tags', () => {
      const result = lintBBCode('[b][i]text[/i][/b]', 'announcements');
      expect(result.errors.filter(e => e.message.includes('Unclosed') || e.message.includes('Mismatched'))).toHaveLength(0);
    });

    it('handles multiple unclosed tags', () => {
      const result = lintBBCode('[b][i]text', 'announcements');
      expect(result.errors.filter(e => e.message.includes('Unclosed'))).toHaveLength(2);
    });
  });

  describe('tag nesting', () => {
    it('reports overlapping tags', () => {
      const result = lintBBCode('[b][i]text[/b][/i]', 'announcements');
      expect(result.errors.some(e => e.message.includes('Overlapping') || e.message.includes('Mismatched'))).toBe(true);
    });
  });

  describe('empty tags', () => {
    it('warns about empty bold tags', () => {
      const result = lintBBCode('[b][/b]', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Empty [b]'))).toBe(true);
    });

    it('warns about empty url tags', () => {
      const result = lintBBCode('[url][/url]', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Empty [url]'))).toBe(true);
    });

    it('warns about empty tags with attributes', () => {
      const result = lintBBCode('[url=https://example.com][/url]', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Empty [url]'))).toBe(true);
    });

    it('does not warn about tags with content', () => {
      const result = lintBBCode('[b]text[/b]', 'announcements');
      expect(result.warnings.filter(w => w.message.includes('Empty'))).toHaveLength(0);
    });
  });

  describe('context-specific tag support', () => {
    it('reports unsupported img in reviews', () => {
      const result = lintBBCode('[img]test.png[/img]', 'reviews');
      expect(result.errors.some(e => e.message.includes('not supported in reviews'))).toBe(true);
    });

    it('reports unsupported video in forums', () => {
      const result = lintBBCode('[video]test[/video]', 'forums');
      expect(result.errors.some(e => e.message.includes('not supported in forums'))).toBe(true);
    });

    it('allows spoiler in reviews', () => {
      const result = lintBBCode('[spoiler]text[/spoiler]', 'reviews');
      expect(result.errors.filter(e => e.message.includes('not supported'))).toHaveLength(0);
    });

    it('reports unsupported table in reviews', () => {
      const result = lintBBCode('[table][tr][td]cell[/td][/tr][/table]', 'reviews');
      expect(result.errors.some(e => e.message.includes('not supported in reviews'))).toBe(true);
    });

    it('warns about limited img support in guides', () => {
      const result = lintBBCode('[img]test.png[/img]', 'guides');
      expect(result.warnings.some(w => w.message.includes('[previewimg]'))).toBe(true);
    });

    it('allows all tags in announcements', () => {
      const bbcode = '[h1]Title[/h1][img]img.png[/img][spoiler]text[/spoiler]';
      const result = lintBBCode(bbcode, 'announcements');
      expect(result.errors.filter(e => e.message.includes('not supported'))).toHaveLength(0);
    });
  });

  describe('list items and invalid bracket patterns', () => {
    it('reports invalid [-] pattern anywhere', () => {
      const result = lintBBCode('some text [-] more text', 'announcements');
      expect(result.errors.some(e => e.message.includes('Invalid tag [-]'))).toBe(true);
    });

    it('reports invalid [+] pattern anywhere', () => {
      const result = lintBBCode('vote [+] here', 'announcements');
      expect(result.errors.some(e => e.message.includes('Invalid tag [+]'))).toBe(true);
    });

    it('reports invalid [.] pattern anywhere', () => {
      const result = lintBBCode('text [.] text', 'announcements');
      expect(result.errors.some(e => e.message.includes('Invalid tag [.]'))).toBe(true);
    });

    it('reports empty brackets []', () => {
      const result = lintBBCode('text [] more text', 'announcements');
      expect(result.errors.some(e => e.message.includes('Empty brackets []'))).toBe(true);
    });

    it('does not report valid [*] markers inside lists', () => {
      const result = lintBBCode('[list][*]Item[/list]', 'announcements');
      expect(result.errors.filter(e => e.message.includes('Invalid tag'))).toHaveLength(0);
    });

    it('reports [*] outside of list blocks', () => {
      const result = lintBBCode('Stray [*] item here', 'announcements');
      expect(result.errors.some(e => e.message.includes('[*] found outside'))).toBe(true);
    });
  });

  describe('URL validation', () => {
    it('warns about empty URLs', () => {
      const result = lintBBCode('[url][/url]', 'announcements');
      expect(result.warnings.some(w => w.message.includes('Empty [url]'))).toBe(true);
    });

    it('warns about URLs without protocol', () => {
      const result = lintBBCode('[url=example.com]link[/url]', 'announcements');
      expect(result.warnings.some(w => w.message.includes('https://'))).toBe(true);
    });

    it('does not warn about URLs with https', () => {
      const result = lintBBCode('[url=https://example.com]link[/url]', 'announcements');
      expect(result.warnings.filter(w => w.message.includes('https://'))).toHaveLength(0);
    });

    it('does not warn about URLs with http', () => {
      const result = lintBBCode('[url=http://example.com]link[/url]', 'announcements');
      expect(result.warnings.filter(w => w.message.includes('https://'))).toHaveLength(0);
    });
  });

  describe('character limits', () => {
    it('reports error when exceeding limit', () => {
      const longText = '[b]' + 'a'.repeat(10000) + '[/b]';
      const result = lintBBCode(longText, 'announcements');
      expect(result.errors.some(e => e.message.includes('Exceeds'))).toBe(true);
    });

    it('warns when approaching limit', () => {
      const text = 'a'.repeat(7500); // 93.75% of 8000
      const result = lintBBCode(text, 'announcements');
      expect(result.warnings.some(w => w.message.includes('Approaching'))).toBe(true);
    });

    it('uses correct limit for forums (4000)', () => {
      const text = 'a'.repeat(4500); // Over forums limit
      const result = lintBBCode(text, 'forums');
      expect(result.errors.some(e => e.message.includes('Exceeds'))).toBe(true);
    });

    it('does not warn for short content', () => {
      const result = lintBBCode('short text', 'announcements');
      expect(result.warnings.filter(w => w.message.includes('Approaching'))).toHaveLength(0);
      expect(result.errors.filter(e => e.message.includes('Exceeds'))).toHaveLength(0);
    });
  });

  describe('line numbers', () => {
    it('includes line numbers in error messages', () => {
      const bbcode = 'line 1\n[foo]line 2[/foo]\nline 3';
      const result = lintBBCode(bbcode, 'announcements');
      const fooError = result.errors.find(e => e.message.includes('[foo]'));
      expect(fooError?.line).toBe(2);
    });

    it('tracks error lines in set', () => {
      const bbcode = 'line 1\n[b]unclosed\nline 3';
      const result = lintBBCode(bbcode, 'announcements');
      expect(result.errorLines.has(2)).toBe(true);
    });

    it('tracks warning lines in set', () => {
      const bbcode = 'line 1\n**markdown**\nline 3';
      const result = lintBBCode(bbcode, 'announcements');
      expect(result.warningLines.has(2)).toBe(true);
    });
  });

  describe('valid BBCode', () => {
    it('passes valid patch notes', () => {
      const bbcode = `[h1]Patch 1.0[/h1]

[h2]Bug Fixes[/h2]
[list]
[*]Fixed crash on startup
[*]Resolved memory leak
[/list]

[h2]New Features[/h2]
[olist]
[*]Added new mode
[*]New character
[/olist]

[hr][/hr]

Visit [url=https://example.com]our site[/url] for more info.`;

      const result = lintBBCode(bbcode, 'announcements');
      expect(result.errors).toHaveLength(0);
    });
  });
});
