import { describe, it, expect } from 'vitest';
import { lintMarkdown } from '../markdown-linter';

describe('lintMarkdown', () => {
  describe('unclosed formatting', () => {
    it('detects unclosed inline code', () => {
      const result = lintMarkdown('This has `unclosed code');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unclosed inline code');
    });

    it('detects unmatched bold markers', () => {
      const result = lintMarkdown('This is **bold but not closed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unmatched **');
    });

    it('detects unmatched strikethrough', () => {
      const result = lintMarkdown('This is ~~strike but not closed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unmatched ~~');
    });

    it('detects unclosed code blocks', () => {
      const result = lintMarkdown('```javascript\nconst x = 1;');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unclosed code block');
    });

    it('passes valid formatting', () => {
      const result = lintMarkdown('**bold** and `code` and ~~strike~~');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('whitespace in formatting', () => {
    it('warns about space after opening bold', () => {
      const result = lintMarkdown('This is ** bold** text');
      expect(result.warnings.some(w => w.message.includes('Space after **'))).toBe(true);
    });

    it('warns about space before closing bold', () => {
      const result = lintMarkdown('This is **bold ** text');
      expect(result.warnings.some(w => w.message.includes('Space before **'))).toBe(true);
    });

    it('does not warn about properly formatted bold', () => {
      const result = lintMarkdown('This is **bold** text');
      const spaceWarnings = result.warnings.filter(w => 
        w.message.includes('Space after **') || w.message.includes('Space before **')
      );
      expect(spaceWarnings).toHaveLength(0);
    });

    it('does not warn about space before opening bold', () => {
      const result = lintMarkdown('Feature one with **bold** text');
      expect(result.warnings.filter(w => w.message.includes('Space before **'))).toHaveLength(0);
    });

    it('warns about space after opening strikethrough', () => {
      const result = lintMarkdown('This is ~~ strike~~ text');
      expect(result.warnings.some(w => w.message.includes('Space after ~~'))).toBe(true);
    });

    it('warns about space before closing strikethrough', () => {
      const result = lintMarkdown('This is ~~strike ~~ text');
      expect(result.warnings.some(w => w.message.includes('Space before ~~'))).toBe(true);
    });

    it('warns about missing space after header hash', () => {
      const result = lintMarkdown('#Header without space');
      expect(result.warnings.some(w => w.message.includes('Missing space after #'))).toBe(true);
    });

    it('passes valid header with space', () => {
      const result = lintMarkdown('# Header with space');
      expect(result.warnings.filter(w => w.message.includes('Missing space after #'))).toHaveLength(0);
    });

    it('warns about missing space after list marker', () => {
      const result = lintMarkdown('-Item without space');
      expect(result.warnings.some(w => w.message.includes('Missing space after list marker'))).toBe(true);
    });

    it('passes valid list with space', () => {
      const result = lintMarkdown('- Item with space');
      expect(result.warnings.filter(w => w.message.includes('Missing space after list marker'))).toHaveLength(0);
    });

    it('does not warn for bold at start of line', () => {
      const result = lintMarkdown('**bold text**');
      expect(result.warnings.filter(w => w.message.includes('Missing space after list marker'))).toHaveLength(0);
    });
  });

  describe('broken links', () => {
    it('warns about space between ] and (', () => {
      const result = lintMarkdown('Check [this link] (https://example.com)');
      expect(result.warnings.some(w => w.message.includes('space between ] and ('))).toBe(true);
    });

    it('warns about empty link text', () => {
      const result = lintMarkdown('Check [](https://example.com)');
      expect(result.warnings.some(w => w.message.includes('empty text'))).toBe(true);
    });

    it('warns about empty link URL', () => {
      const result = lintMarkdown('Check [link text]()');
      expect(result.warnings.some(w => w.message.includes('empty URL'))).toBe(true);
    });

    it('passes valid links', () => {
      const result = lintMarkdown('Check [this link](https://example.com)');
      expect(result.warnings.filter(w => w.message.includes('link'))).toHaveLength(0);
    });
  });

  describe('Confluence syntax', () => {
    it('warns about Confluence macros', () => {
      const result = lintMarkdown('Here is {code}some code{code}');
      expect(result.warnings.some(w => w.message.includes('Confluence macro'))).toBe(true);
    });

    it('warns about Confluence user mentions', () => {
      const result = lintMarkdown('Ask [~username] about this');
      expect(result.warnings.some(w => w.message.includes('Confluence user mention'))).toBe(true);
    });
  });

  describe('inline code info', () => {
    it('notes inline code will become bold', () => {
      const result = lintMarkdown('Use `npm install` to install');
      expect(result.info.some(i => i.message.includes('inline code'))).toBe(true);
    });
  });

  describe('nested lists', () => {
    it('warns about nested lists', () => {
      const result = lintMarkdown('- Item\n  - Nested item');
      expect(result.warnings.some(w => w.message.includes('Nested list'))).toBe(true);
    });

    it('warns about extra whitespace after list marker', () => {
      const result = lintMarkdown('-  Item with extra space');
      expect(result.warnings.some(w => w.message.includes('Extra whitespace after list marker'))).toBe(true);
    });

    it('warns about multiple extra spaces after list marker', () => {
      const result = lintMarkdown('-   Item with more spaces');
      expect(result.warnings.some(w => w.message.includes('Extra whitespace after list marker'))).toBe(true);
    });

    it('does not warn about normal list items', () => {
      const result = lintMarkdown('- Normal item');
      expect(result.warnings.filter(w => w.message.includes('Extra whitespace'))).toHaveLength(0);
    });
  });

  describe('tables', () => {
    it('notes tables may need adjustment', () => {
      const result = lintMarkdown('| A | B |\n|---|---|\n| 1 | 2 |');
      expect(result.info.some(i => i.message.includes('table'))).toBe(true);
    });
  });

  describe('images', () => {
    it('notes images for Guides context', () => {
      const result = lintMarkdown('![alt](https://example.com/img.png)');
      expect(result.info.some(i => i.message.includes('image'))).toBe(true);
    });
  });

  describe('invalid bracket patterns', () => {
    it('reports [-] as invalid pattern', () => {
      const result = lintMarkdown('text [-] more text');
      expect(result.errors.some(e => e.message.includes('Invalid pattern [-]'))).toBe(true);
    });

    it('reports [+] as invalid pattern', () => {
      const result = lintMarkdown('vote [+] here');
      expect(result.errors.some(e => e.message.includes('Invalid pattern [+]'))).toBe(true);
    });

    it('reports [.] as invalid pattern', () => {
      const result = lintMarkdown('text [.] text');
      expect(result.errors.some(e => e.message.includes('Invalid pattern [.]'))).toBe(true);
    });

    it('reports empty brackets []', () => {
      const result = lintMarkdown('text [] more text');
      expect(result.errors.some(e => e.message.includes('Empty brackets []'))).toBe(true);
    });

    it('does not flag brackets inside code blocks', () => {
      const result = lintMarkdown('```\n[-] in code\n```');
      expect(result.errors.filter(e => e.message.includes('Invalid pattern'))).toHaveLength(0);
    });
  });

  describe('line numbers', () => {
    it('reports correct line number for errors', () => {
      const result = lintMarkdown('Line 1\nLine 2\n`unclosed');
      expect(result.errors[0].line).toBe(3);
    });

    it('reports correct line number for warnings', () => {
      const result = lintMarkdown('Line 1\n#NoSpace\nLine 3');
      const headerWarning = result.warnings.find(w => w.message.includes('Missing space'));
      expect(headerWarning?.line).toBe(2);
    });
  });
});
