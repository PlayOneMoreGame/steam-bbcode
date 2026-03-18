import { describe, it, expect } from 'vitest';
import { lintBBCode } from '../linter';

describe('lintBBCode', () => {
  describe('unknown tags', () => {
    it('reports unknown tags', () => {
      const result = lintBBCode('[foo]text[/foo]', 'announcements');
      expect(result.errors.some(e => e.message.includes("doesn't support [foo]"))).toBe(true);
    });

    it('does not report valid tags', () => {
      const result = lintBBCode('[b]bold[/b]', 'announcements');
      expect(result.errors.filter(e => e.message.includes("doesn't support"))).toHaveLength(0);
    });

    it('recognizes all valid tags', () => {
      const validTags = ['h1', 'h2', 'h3', 'b', 'i', 'u', 'strike', 'list', 'olist', 
                        'table', 'tr', 'td', 'th', 'img', 'url', 'code', 'quote', 
                        'spoiler', 'hr', 'previewyoutube', 'previewimg', 'noparse'];
      
      for (const tag of validTags) {
        const result = lintBBCode(`[${tag}]content[/${tag}]`, 'announcements');
        expect(result.errors.filter(e => e.message.includes("doesn't support"))).toHaveLength(0);
      }
    });
  });

  describe('HTML tags', () => {
    it('reports HTML tags', () => {
      const result = lintBBCode('<b>bold</b>', 'announcements');
      expect(result.errors.some(e => e.message.includes('HTML') && e.message.includes('<b>'))).toBe(true);
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
      expect(result.errors.some(e => e.message.includes('[b]') && e.message.includes('never closed'))).toBe(true);
    });

    it('reports mismatched tags', () => {
      const result = lintBBCode('[b]text[/i]', 'announcements');
      expect(result.errors.some(e => e.message.includes('mismatch') || e.message.includes('no matching'))).toBe(true);
    });

    it('reports unexpected closing tags', () => {
      const result = lintBBCode('text[/b]', 'announcements');
      expect(result.errors.some(e => e.message.includes('no matching'))).toBe(true);
    });

    it('handles properly nested tags', () => {
      const result = lintBBCode('[b][i]text[/i][/b]', 'announcements');
      expect(result.errors.filter(e => e.message.includes('never closed') || e.message.includes('mismatch'))).toHaveLength(0);
    });

    it('handles multiple unclosed tags', () => {
      const result = lintBBCode('[b][i]text', 'announcements');
      expect(result.errors.filter(e => e.message.includes('never closed'))).toHaveLength(2);
    });
  });

  describe('tag nesting', () => {
    it('reports overlapping tags', () => {
      const result = lintBBCode('[b][i]text[/b][/i]', 'announcements');
      expect(result.errors.some(e => e.message.includes('overlap') || e.message.includes('mismatch'))).toBe(true);
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
      expect(result.errors.some(e => e.message.includes("won't work") && e.message.includes('reviews'))).toBe(true);
    });

    it('reports unsupported video in forums', () => {
      const result = lintBBCode('[video]test[/video]', 'forums');
      expect(result.errors.some(e => e.message.includes("won't work") && e.message.includes('forums'))).toBe(true);
    });

    it('allows spoiler in reviews', () => {
      const result = lintBBCode('[spoiler]text[/spoiler]', 'reviews');
      expect(result.errors.filter(e => e.message.includes("won't work"))).toHaveLength(0);
    });

    it('reports unsupported table in reviews', () => {
      const result = lintBBCode('[table][tr][td]cell[/td][/tr][/table]', 'reviews');
      expect(result.errors.some(e => e.message.includes("won't work") && e.message.includes('reviews'))).toBe(true);
    });

    it('warns about limited img support in guides', () => {
      const result = lintBBCode('[img]test.png[/img]', 'guides');
      expect(result.warnings.some(w => w.message.includes('[previewimg]'))).toBe(true);
    });

    it('allows all tags in announcements', () => {
      const bbcode = '[h1]Title[/h1][img]img.png[/img][spoiler]text[/spoiler]';
      const result = lintBBCode(bbcode, 'announcements');
      expect(result.errors.filter(e => e.message.includes("won't work"))).toHaveLength(0);
    });
  });

  describe('list items and invalid bracket patterns', () => {
    it('reports invalid [-] pattern anywhere', () => {
      const result = lintBBCode('some text [-] more text', 'announcements');
      expect(result.errors.some(e => e.message.includes("[-]") && e.message.includes("isn't a Steam tag"))).toBe(true);
    });

    it('reports invalid [+] pattern anywhere', () => {
      const result = lintBBCode('vote [+] here', 'announcements');
      expect(result.errors.some(e => e.message.includes("[+]") && e.message.includes("isn't a Steam tag"))).toBe(true);
    });

    it('reports invalid [.] pattern anywhere', () => {
      const result = lintBBCode('text [.] text', 'announcements');
      expect(result.errors.some(e => e.message.includes("[.]") && e.message.includes("isn't a Steam tag"))).toBe(true);
    });

    it('reports empty brackets []', () => {
      const result = lintBBCode('text [] more text', 'announcements');
      expect(result.errors.some(e => e.message.includes('Empty brackets []'))).toBe(true);
    });

    it('does not report valid [*] markers inside lists', () => {
      const result = lintBBCode('[list][*]Item[/list]', 'announcements');
      expect(result.errors.filter(e => e.message.includes("isn't a Steam tag"))).toHaveLength(0);
    });

    it('reports [*] outside of list blocks', () => {
      const result = lintBBCode('Stray [*] item here', 'announcements');
      expect(result.errors.some(e => e.message.includes('[*]') && e.message.includes('outside'))).toBe(true);
    });
  });

  describe('URL validation', () => {
    it('warns about empty URLs', () => {
      const result = lintBBCode('[url][/url]', 'announcements');
      expect(result.warnings.some(w => w.message.includes('[url]') && w.message.includes('empty'))).toBe(true);
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

  describe('image drop markers', () => {
    it('does not lint drop markers — they are process reminders, not editing issues', () => {
      const bbcode = '[b]>>> Drop image: screenshot.png <<<[/b]';
      const result = lintBBCode(bbcode, 'announcements');
      expect(result.warnings.filter(w => w.message.includes('screenshot.png'))).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('does not affect Ready status for drop markers', () => {
      const bbcode = '[b]>>> Drop image: a.png <<<[/b]\n[b]>>> Drop image: b.png <<<[/b]';
      const result = lintBBCode(bbcode, 'announcements');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.filter(w => w.message.includes('upload'))).toHaveLength(0);
    });
  });

  describe('character limits', () => {
    it('reports error when exceeding limit', () => {
      const longText = '[b]' + 'a'.repeat(10000) + '[/b]';
      const result = lintBBCode(longText, 'announcements');
      expect(result.errors.some(e => e.message.includes('Too long'))).toBe(true);
    });

    it('warns when approaching limit', () => {
      const text = 'a'.repeat(7500); // 93.75% of 8000
      const result = lintBBCode(text, 'announcements');
      expect(result.warnings.some(w => w.message.includes('Getting close'))).toBe(true);
    });

    it('uses correct limit for forums (4000)', () => {
      const text = 'a'.repeat(4500); // Over forums limit
      const result = lintBBCode(text, 'forums');
      expect(result.errors.some(e => e.message.includes('Too long'))).toBe(true);
    });

    it('does not warn for short content', () => {
      const result = lintBBCode('short text', 'announcements');
      expect(result.warnings.filter(w => w.message.includes('Getting close'))).toHaveLength(0);
      expect(result.errors.filter(e => e.message.includes('Too long'))).toHaveLength(0);
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

  describe('help text', () => {
    it('includes help text on unknown tag errors', () => {
      const result = lintBBCode('[foo]text[/foo]', 'announcements');
      const error = result.errors.find(e => e.message.includes("[foo]"));
      expect(error?.help).toBeDefined();
      expect(error?.help).toContain('Steam recognizes');
    });

    it('includes help text on unclosed tag errors', () => {
      const result = lintBBCode('[b]unclosed bold', 'announcements');
      const error = result.errors.find(e => e.message.includes('never closed'));
      expect(error?.help).toBeDefined();
      expect(error?.help).toContain('matching');
    });

    it('includes help text on mismatched tag errors', () => {
      const result = lintBBCode('[b]text[/i]', 'announcements');
      const error = result.errors.find(e => e.message.includes('mismatch') || e.message.includes('no matching'));
      expect(error?.help).toBeDefined();
    });

    it('includes help text on overlapping tag errors', () => {
      const result = lintBBCode('[b][i]text[/b][/i]', 'announcements');
      const error = result.errors.find(e => e.message.includes('overlap'));
      expect(error?.help).toBeDefined();
      expect(error?.help).toContain('reverse order');
    });

    it('includes help text on HTML tag errors', () => {
      const result = lintBBCode('<b>bold</b>', 'announcements');
      const error = result.errors.find(e => e.message.includes('HTML'));
      expect(error?.help).toBeDefined();
      expect(error?.help).toContain('BBCode');
    });

    it('includes help text on unsupported context tag errors', () => {
      const result = lintBBCode('[img]test.png[/img]', 'reviews');
      const error = result.errors.find(e => e.message.includes("won't work"));
      expect(error?.help).toBeDefined();
      expect(error?.help).toContain('reviews');
    });

    it('includes help text on character limit exceeded', () => {
      const longText = '[b]' + 'a'.repeat(10000) + '[/b]';
      const result = lintBBCode(longText, 'announcements');
      const error = result.errors.find(e => e.message.includes('Too long'));
      expect(error?.help).toBeDefined();
      expect(error?.help).toContain('character limit');
    });

    it('includes help text on character limit approaching', () => {
      const text = 'a'.repeat(7500);
      const result = lintBBCode(text, 'announcements');
      const warning = result.warnings.find(w => w.message.includes('Getting close'));
      expect(warning?.help).toBeDefined();
    });

    it('includes help text on Markdown syntax warnings', () => {
      const result = lintBBCode('**bold**', 'announcements');
      const warning = result.warnings.find(w => w.message.includes('Markdown bold'));
      expect(warning?.help).toBeDefined();
    });

    it('includes help text on empty tag warnings', () => {
      const result = lintBBCode('[b][/b]', 'announcements');
      const warning = result.warnings.find(w => w.message.includes('Empty'));
      expect(warning?.help).toBeDefined();
    });

    it('includes help text on URL warnings', () => {
      const result = lintBBCode('[url=example.com]link[/url]', 'announcements');
      const warning = result.warnings.find(w => w.message.includes('https://'));
      expect(warning?.help).toBeDefined();
      expect(warning?.help).toContain('https://');
    });

    it('help field is optional - valid BBCode has no help', () => {
      const result = lintBBCode('[b]valid[/b]', 'announcements');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
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

  describe('blocked words in output', () => {
    it('detects blocked words in BBCode text content', () => {
      const result = lintBBCode('[b]This has a badword in it[/b]', 'announcements', {
        blacklist: ['badword'],
      });
      expect(result.warnings.some(w => w.message.includes('badword'))).toBe(true);
    });

    it('ignores blocked words inside BBCode tags', () => {
      // The tag name itself shouldn't trigger a match
      const result = lintBBCode('[url=http://example.com]link[/url]', 'announcements', {
        blacklist: ['url'],
      });
      // 'url' appears in tags but not in text content
      const blockedWarnings = result.warnings.filter(w => w.message.includes('Blocked word'));
      expect(blockedWarnings).toHaveLength(0);
    });

    it('returns no blocked word warnings when blacklist is empty', () => {
      const result = lintBBCode('[b]anything[/b]', 'announcements', {
        blacklist: [],
      });
      const blockedWarnings = result.warnings.filter(w => w.message.includes('Blocked word'));
      expect(blockedWarnings).toHaveLength(0);
    });

    it('returns no blocked word warnings when no blacklist option', () => {
      const result = lintBBCode('[b]anything[/b]', 'announcements');
      const blockedWarnings = result.warnings.filter(w => w.message.includes('Blocked word'));
      expect(blockedWarnings).toHaveLength(0);
    });

    it('includes help text for blocked word warnings', () => {
      const result = lintBBCode('some badterm here', 'announcements', {
        blacklist: ['badterm'],
      });
      const match = result.warnings.find(w => w.message.includes('badterm'));
      expect(match?.help).toContain('Settings');
    });
  });

  describe('blank line in list detection', () => {
    it('flags a blank line inside a single list block', () => {
      const bbcode = '[list]\n[*] item 1\n\n[*] item 2\n[/list]';
      const result = lintBBCode(bbcode, 'announcements');
      const blankWarnings = result.warnings.filter(w => w.message.includes('Blank line inside a list'));
      expect(blankWarnings).toHaveLength(1);
      expect(blankWarnings[0].line).toBe(3);
    });

    it('does NOT flag blank lines between separate list blocks', () => {
      // This is the false-positive scenario: multiple lists separated by blank lines
      const bbcode = [
        '[h1]Section 1[/h1]',
        '[list]',
        '[*] item a',
        '[*] item b',
        '[/list]',
        '',
        '[h2]Section 2[/h2]',
        '[list]',
        '[*] item c',
        '[*] item d',
        '[/list]',
        '',
        '[h2]Section 3[/h2]',
        '[list]',
        '[*] item e',
        '[*] item f',
        '[/list]',
      ].join('\n');
      const result = lintBBCode(bbcode, 'announcements');
      const blankWarnings = result.warnings.filter(w => w.message.includes('Blank line inside a list'));
      expect(blankWarnings).toHaveLength(0);
    });

    it('does NOT flag SWAPMEAT-style patch notes with multiple lists', () => {
      // Simulates real converter output: headings + list blocks + blank lines between sections
      const bbcode = [
        '[h1]SWAPMEAT Update v0.19.0[/h1]',
        '',
        '[h2]New Features[/h2]',
        '[list]',
        '[*] Added new weapon: Plasma Rifle',
        '[*] Added new map: Abandoned Warehouse',
        '[*] Added leaderboard integration',
        '[/list]',
        '',
        '[h2]Balance Changes[/h2]',
        '[list]',
        '[*] Reduced shotgun spread by 15%',
        '[*] Increased pistol damage from 20 to 25',
        '[*] Nerfed rocket launcher splash radius',
        '[/list]',
        '',
        '[h2]Bug Fixes[/h2]',
        '[list]',
        '[*] Fixed crash when joining full lobby',
        '[*] Fixed items disappearing from inventory',
        '[*] Fixed audio not playing on hit',
        '[/list]',
        '',
        '[h2]Known Issues[/h2]',
        '[list]',
        '[*] Occasional frame drops on large maps',
        '[*] Chat may disconnect during server migration',
        '[/list]',
      ].join('\n');
      const result = lintBBCode(bbcode, 'announcements');
      const blankWarnings = result.warnings.filter(w => w.message.includes('Blank line inside a list'));
      expect(blankWarnings).toHaveLength(0);
    });

    it('flags a blank line inside an [olist] block', () => {
      const bbcode = '[olist]\n[*] step 1\n\n[*] step 2\n[/olist]';
      const result = lintBBCode(bbcode, 'announcements');
      const blankWarnings = result.warnings.filter(w => w.message.includes('Blank line inside a list'));
      expect(blankWarnings).toHaveLength(1);
      expect(blankWarnings[0].line).toBe(3);
    });

    it('does NOT flag blank lines between separate [olist] blocks', () => {
      const bbcode = [
        '[olist]',
        '[*] step 1',
        '[*] step 2',
        '[/olist]',
        '',
        '[olist]',
        '[*] step 3',
        '[*] step 4',
        '[/olist]',
      ].join('\n');
      const result = lintBBCode(bbcode, 'announcements');
      const blankWarnings = result.warnings.filter(w => w.message.includes('Blank line inside a list'));
      expect(blankWarnings).toHaveLength(0);
    });

    it('correctly flags blank line inside one list while ignoring gaps between others', () => {
      const bbcode = [
        '[list]',
        '[*] clean item 1',
        '[*] clean item 2',
        '[/list]',
        '',
        '[list]',
        '[*] item a',
        '',
        '[*] item b',
        '[/list]',
      ].join('\n');
      const result = lintBBCode(bbcode, 'announcements');
      const blankWarnings = result.warnings.filter(w => w.message.includes('Blank line inside a list'));
      expect(blankWarnings).toHaveLength(1);
      // The blank line is on line 8 (between "[*] item a" on line 7 and "[*] item b" on line 9)
      expect(blankWarnings[0].line).toBe(8);
    });
  });

  describe('blacklist offset accuracy', () => {
    const blacklist = ['badword', 'term1', 'term2'];

    it('reports correct column for term inside [b] tags', () => {
      const result = lintBBCode('[b]badword[/b]', 'announcements', { blacklist });
      const match = result.warnings.find(w => w.message.includes('badword'));
      expect(match).toBeDefined();
      expect(match!.column).toBe(4); // [b] is 3 chars, badword starts at column 4
      expect(match!.line).toBe(1);
    });

    it('reports correct column for term inside nested [b][i] tags', () => {
      const result = lintBBCode('[b][i]badword[/i][/b]', 'announcements', { blacklist });
      const match = result.warnings.find(w => w.message.includes('badword'));
      expect(match).toBeDefined();
      expect(match!.column).toBe(7); // [b][i] is 6 chars, badword starts at column 7
      expect(match!.line).toBe(1);
    });

    it('reports correct column for term inside [url=...] tag', () => {
      const result = lintBBCode('[url=https://x.com]badword[/url]', 'announcements', { blacklist });
      const match = result.warnings.find(w => w.message.includes('badword'));
      expect(match).toBeDefined();
      expect(match!.column).toBe(20); // [url=https://x.com] is 19 chars
      expect(match!.line).toBe(1);
    });

    it('reports correct line and column for multiline list with term', () => {
      const bbcode = '[list]\n[*]badword\n[/list]';
      const result = lintBBCode(bbcode, 'announcements', { blacklist });
      const match = result.warnings.find(w => w.message.includes('badword'));
      expect(match).toBeDefined();
      expect(match!.line).toBe(2);
      expect(match!.column).toBe(4); // [*] is 3 chars, badword starts at column 4
    });

    it('reports correct columns for multiple terms with tags', () => {
      const bbcode = '[b]term1[/b] and [i]term2[/i]';
      const result = lintBBCode(bbcode, 'announcements', { blacklist });
      const m1 = result.warnings.find(w => w.message.includes('term1'));
      const m2 = result.warnings.find(w => w.message.includes('term2'));
      expect(m1).toBeDefined();
      expect(m2).toBeDefined();
      expect(m1!.column).toBe(4); // after [b]
      expect(m2!.column).toBe(21); // [b]term1[/b] and [i] = 20 chars
    });

    it('works correctly with no tags (plain text)', () => {
      const result = lintBBCode('plain badword text', 'announcements', { blacklist });
      const match = result.warnings.find(w => w.message.includes('badword'));
      expect(match).toBeDefined();
      expect(match!.column).toBe(7); // "plain " is 6 chars
      expect(match!.line).toBe(1);
    });
  });
});
