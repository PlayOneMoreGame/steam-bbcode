import { describe, it, expect } from 'vitest';
import { plaintextToMarkdown } from '../plaintext-normalizer';

describe('plaintextToMarkdown', () => {
  describe('passthrough cases', () => {
    it('returns empty string unchanged', () => {
      expect(plaintextToMarkdown('')).toBe('');
    });

    it('returns whitespace unchanged', () => {
      expect(plaintextToMarkdown('   \n  ')).toBe('   \n  ');
    });

    it('returns plain sentence unchanged', () => {
      expect(plaintextToMarkdown('Just a regular sentence.')).toBe('Just a regular sentence.');
    });

    it('does not modify text that already has markdown headings', () => {
      const md = '# Title\n\nSome text';
      expect(plaintextToMarkdown(md)).toBe(md);
    });

    it('does not modify text that already has markdown bold', () => {
      const md = 'This has **bold** text';
      expect(plaintextToMarkdown(md)).toBe(md);
    });

    it('does not modify text with markdown links', () => {
      const md = 'Check [this](http://example.com) out';
      expect(plaintextToMarkdown(md)).toBe(md);
    });

    it('does not modify text with fenced code blocks', () => {
      const md = '```\ncode\n```';
      expect(plaintextToMarkdown(md)).toBe(md);
    });
  });

  describe('bullet normalization', () => {
    it('converts bullet character • to dash', () => {
      expect(plaintextToMarkdown('• First item\n• Second item')).toBe('- First item\n- Second item');
    });

    it('converts filled circle ● to dash', () => {
      expect(plaintextToMarkdown('● Item one\n● Item two')).toBe('- Item one\n- Item two');
    });

    it('converts hollow circle ◦ to dash', () => {
      expect(plaintextToMarkdown('◦ Sub item')).toBe('- Sub item');
    });

    it('converts black square ▪ to dash', () => {
      expect(plaintextToMarkdown('▪ Square bullet')).toBe('- Square bullet');
    });

    it('converts triangle ▸ to dash', () => {
      expect(plaintextToMarkdown('▸ Arrow item')).toBe('- Arrow item');
    });

    it('converts right pointer ► to dash', () => {
      expect(plaintextToMarkdown('► Pointer item')).toBe('- Pointer item');
    });

    it('converts en dash – used as bullet to dash', () => {
      expect(plaintextToMarkdown('– Dash item')).toBe('- Dash item');
    });

    it('handles mixed bullet types', () => {
      const input = '• First\n● Second\n◦ Third';
      const expected = '- First\n- Second\n- Third';
      expect(plaintextToMarkdown(input)).toBe(expected);
    });

    it('preserves dash bullets already in markdown format', () => {
      // Dashes are already valid markdown, normalizer won't double-convert
      // because hasMarkdownSyntax doesn't trigger on bare dashes alone
      const input = '- Already markdown\n- Item two';
      expect(plaintextToMarkdown(input)).toBe(input);
    });
  });

  describe('numbered list normalization', () => {
    it('normalizes 1) format to 1. format', () => {
      expect(plaintextToMarkdown('1) First\n2) Second\n3) Third')).toBe('1. First\n2. Second\n3. Third');
    });

    it('passes through 1. format unchanged', () => {
      expect(plaintextToMarkdown('1. First\n2. Second')).toBe('1. First\n2. Second');
    });

    it('handles numbered items with content', () => {
      expect(plaintextToMarkdown('1) Install the game\n2) Launch it\n3) Have fun'))
        .toBe('1. Install the game\n2. Launch it\n3. Have fun');
    });
  });

  describe('heading detection', () => {
    it('converts ALL-CAPS line surrounded by blank lines to heading', () => {
      const input = 'GAMEPLAY\n\nSome description here.';
      expect(plaintextToMarkdown(input)).toBe('## GAMEPLAY\n\nSome description here.');
    });

    it('converts ALL-CAPS at start of text to heading', () => {
      const input = 'BUG FIXES\n\nFixed a crash.';
      expect(plaintextToMarkdown(input)).toBe('## BUG FIXES\n\nFixed a crash.');
    });

    it('converts ALL-CAPS with slashes and special chars', () => {
      const input = 'UI / UX\n\nNew interface.';
      expect(plaintextToMarkdown(input)).toBe('## UI / UX\n\nNew interface.');
    });

    it('does not convert long ALL-CAPS lines (likely content, not headings)', () => {
      const longLine = 'THIS IS A VERY LONG LINE THAT IS DEFINITELY NOT A HEADING BECAUSE IT GOES ON AND ON';
      const input = `${longLine}\n\nMore text.`;
      expect(plaintextToMarkdown(input)).toContain(longLine);
      expect(plaintextToMarkdown(input)).not.toContain('##');
    });

    it('does not convert ALL-CAPS lines ending with punctuation', () => {
      const input = 'WHAT IS THIS?\n\nSome text.';
      expect(plaintextToMarkdown(input)).not.toContain('##');
    });

    it('does not convert ALL-CAPS lines not preceded by blank line', () => {
      const input = 'Some text\nGAMEPLAY\n\nMore text.';
      // GAMEPLAY is not preceded by blank line, so not a heading
      expect(plaintextToMarkdown(input)).not.toContain('## GAMEPLAY');
    });

    it('converts multiple headings in a document', () => {
      const input = 'GAMEPLAY\n\n• New feature\n• Bug fix\n\nART\n\n• Updated models';
      const result = plaintextToMarkdown(input);
      expect(result).toContain('## GAMEPLAY');
      expect(result).toContain('## ART');
    });
  });

  describe('real-world examples', () => {
    it('normalizes a typical unformatted patch note', () => {
      const input = `GAMEPLAY

• Added new shrine event
• Capped currencies at 9999
• Renamed "Elite Enemies" to "Shiny Enemies"

BUG FIXES

• Fixed turrets passing through surfaces
• Fixed moleman leg tunnel glitch

KNOWN ISSUES

1) Performance tuning not complete
2) Some input buttons lack icons`;

      const result = plaintextToMarkdown(input);

      expect(result).toContain('## GAMEPLAY');
      expect(result).toContain('- Added new shrine event');
      expect(result).toContain('- Capped currencies at 9999');
      expect(result).toContain('## BUG FIXES');
      expect(result).toContain('- Fixed turrets passing through surfaces');
      expect(result).toContain('## KNOWN ISSUES');
      expect(result).toContain('1. Performance tuning not complete');
      expect(result).toContain('2. Some input buttons lack icons');
    });

    it('handles text with no detectable structure', () => {
      const input = 'Just some random thoughts about the game. Nothing structured here, just a paragraph of text that someone typed out.';
      expect(plaintextToMarkdown(input)).toBe(input);
    });

    it('handles mixed structured and unstructured content', () => {
      const input = `PATCH NOTES

We've been working hard on this update. Here's what changed:

• New shrine mechanic
• Balance tweaks

Thanks for playing!`;

      const result = plaintextToMarkdown(input);
      expect(result).toContain('## PATCH NOTES');
      expect(result).toContain('- New shrine mechanic');
      expect(result).toContain('- Balance tweaks');
      expect(result).toContain('Thanks for playing!');
    });
  });
});
