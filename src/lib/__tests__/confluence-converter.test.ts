// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { confluenceToBBCode } from '../confluence-converter';
import { SWAPMEAT_019_PATCH_NOTES, SWAPMEAT_019_EXPECTED_BBCODE } from './fixtures/confluence-patch-notes.fixture';

describe('confluenceToBBCode', () => {
  describe('golden-file test', () => {
    it('converts SWAPMEAT 0.19.0 patch notes to expected BBCode', () => {
      const result = confluenceToBBCode(SWAPMEAT_019_PATCH_NOTES, 'announcements');
      expect(result.bbcode).toBe(SWAPMEAT_019_EXPECTED_BBCODE);
    });

    it('produces conversion notes for image attachments', () => {
      const result = confluenceToBBCode(SWAPMEAT_019_PATCH_NOTES, 'announcements');
      expect(result.notes.some(n => n.includes('image attachment') || n.includes('Confluence files'))).toBe(true);
    });
  });

  describe('headings', () => {
    it('converts h1', () => {
      const result = confluenceToBBCode('<h1>Title</h1>', 'announcements');
      expect(result.bbcode).toBe('[h1]Title[/h1]');
    });

    it('converts h2', () => {
      const result = confluenceToBBCode('<h2>Section</h2>', 'announcements');
      expect(result.bbcode).toBe('[h2]Section[/h2]');
    });

    it('converts h3', () => {
      const result = confluenceToBBCode('<h3>Subsection</h3>', 'announcements');
      expect(result.bbcode).toBe('[h3]Subsection[/h3]');
    });

    it('strips redundant bold inside headings', () => {
      const result = confluenceToBBCode('<h2><strong>Bold Title</strong></h2>', 'announcements');
      expect(result.bbcode).toBe('[h2]Bold Title[/h2]');
    });

    it('strips redundant underline inside headings', () => {
      const result = confluenceToBBCode('<h2><u>Underlined Title</u></h2>', 'announcements');
      expect(result.bbcode).toBe('[h2]Underlined Title[/h2]');
    });

    it('strips redundant bold+underline inside headings', () => {
      const result = confluenceToBBCode('<h2><strong><u>Both</u></strong></h2>', 'announcements');
      expect(result.bbcode).toBe('[h2]Both[/h2]');
    });

    it('preserves heading text with local-id attributes stripped', () => {
      const result = confluenceToBBCode('<h2 local-id="abc123">Section</h2>', 'announcements');
      expect(result.bbcode).toBe('[h2]Section[/h2]');
      expect(result.bbcode).not.toContain('local-id');
    });
  });

  describe('paragraphs', () => {
    it('converts simple paragraph', () => {
      const result = confluenceToBBCode('<p>Hello world</p>', 'announcements');
      expect(result.bbcode).toBe('Hello world');
    });

    it('converts multiple paragraphs', () => {
      const result = confluenceToBBCode('<p>First</p><p>Second</p>', 'announcements');
      expect(result.bbcode).toContain('First');
      expect(result.bbcode).toContain('Second');
      // Should have blank line between paragraphs
      expect(result.bbcode).toMatch(/First\n\nSecond/);
    });

    it('strips empty paragraphs', () => {
      const result = confluenceToBBCode('<p></p><p>Content</p>', 'announcements');
      expect(result.bbcode.trim()).toBe('Content');
    });

    it('converts br to newline', () => {
      const result = confluenceToBBCode('<p>Line 1<br />Line 2</p>', 'announcements');
      expect(result.bbcode).toContain('Line 1\nLine 2');
    });
  });

  describe('inline formatting', () => {
    it('converts strong to bold', () => {
      const result = confluenceToBBCode('<p><strong>bold</strong></p>', 'announcements');
      expect(result.bbcode).toContain('[b]bold[/b]');
    });

    it('converts em to italic', () => {
      const result = confluenceToBBCode('<p><em>italic</em></p>', 'announcements');
      expect(result.bbcode).toContain('[i]italic[/i]');
    });

    it('converts u to underline', () => {
      const result = confluenceToBBCode('<p><u>underlined</u></p>', 'announcements');
      expect(result.bbcode).toContain('[u]underlined[/u]');
    });

    it('converts del to strikethrough', () => {
      const result = confluenceToBBCode('<p><del>deleted</del></p>', 'announcements');
      expect(result.bbcode).toContain('[strike]deleted[/strike]');
    });

    it('converts links', () => {
      const result = confluenceToBBCode('<p><a href="https://example.com">Click</a></p>', 'announcements');
      expect(result.bbcode).toContain('[url=https://example.com]Click[/url]');
    });
  });

  describe('lists', () => {
    it('converts unordered list', () => {
      const result = confluenceToBBCode('<ul><li>Item 1</li><li>Item 2</li></ul>', 'announcements');
      expect(result.bbcode).toContain('[list]');
      expect(result.bbcode).toContain('[*]Item 1');
      expect(result.bbcode).toContain('[*]Item 2');
      expect(result.bbcode).toContain('[/list]');
    });

    it('converts ordered list', () => {
      const result = confluenceToBBCode('<ol><li>First</li><li>Second</li></ol>', 'announcements');
      expect(result.bbcode).toContain('[olist]');
      expect(result.bbcode).toContain('[*]First');
      expect(result.bbcode).toContain('[*]Second');
      expect(result.bbcode).toContain('[/olist]');
    });

    it('strips p wrappers inside li elements', () => {
      const result = confluenceToBBCode('<ul><li><p>Wrapped text</p></li></ul>', 'announcements');
      expect(result.bbcode).toContain('[*]Wrapped text');
      expect(result.bbcode).not.toContain('<p>');
    });

    it('handles nested lists', () => {
      const result = confluenceToBBCode(
        '<ul><li><p>Parent</p><ul><li><p>Child 1</p></li><li><p>Child 2</p></li></ul></li></ul>',
        'announcements'
      );
      expect(result.bbcode).toContain('[*]Parent');
      expect(result.bbcode).toContain('[*]Child 1');
      expect(result.bbcode).toContain('[*]Child 2');
      // Should have nested [list]
      expect(result.bbcode.match(/\[list\]/g)?.length).toBe(2);
      expect(result.bbcode.match(/\[\/list\]/g)?.length).toBe(2);
    });

    it('handles inline formatting inside list items', () => {
      const result = confluenceToBBCode('<ul><li><p><strong>bold</strong> item</p></li></ul>', 'announcements');
      expect(result.bbcode).toContain('[*][b]bold[/b] item');
    });
  });

  describe('images', () => {
    it('converts ac:image with ri:attachment to placeholder [img]', () => {
      const result = confluenceToBBCode(
        '<ac:image><ri:attachment ri:filename="test.png" /></ac:image>',
        'announcements'
      );
      expect(result.bbcode).toContain('[img]{placeholder:test.png}[/img]');
    });

    it('preserves filenames with spaces in placeholder', () => {
      const result = confluenceToBBCode(
        '<ac:image><ri:attachment ri:filename="Screenshot 2026-03-04 at 1.09.26 PM.png" /></ac:image>',
        'announcements'
      );
      expect(result.bbcode).toContain('[img]{placeholder:Screenshot 2026-03-04 at 1.09.26 PM.png}[/img]');
    });

    it('extracts caption text after image', () => {
      const result = confluenceToBBCode(
        '<ac:image><ri:attachment ri:filename="map.png" /><ac:caption><p>The World Map</p></ac:caption></ac:image>',
        'announcements'
      );
      expect(result.bbcode).toContain('[img]{placeholder:map.png}[/img]');
      expect(result.bbcode).toContain('The World Map');
    });

    it('adds note about image attachments needing upload', () => {
      const result = confluenceToBBCode(
        '<ac:image><ri:attachment ri:filename="test.png" /></ac:image>',
        'announcements'
      );
      expect(result.notes.some(n => n.toLowerCase().includes('upload') || n.toLowerCase().includes('confluence'))).toBe(true);
    });

    it('converts <img> with Confluence src to placeholder', () => {
      const result = confluenceToBBCode(
        '<img src="https://onemoregame.atlassian.net/wiki/download/attachments/123/screenshot.png" alt="screenshot.png" />',
        'announcements'
      );
      expect(result.bbcode).toContain('[img]{placeholder:screenshot.png}[/img]');
      expect(result.bbcode).not.toContain('atlassian.net');
    });

    it('converts <img> with viewpageattachments URL to placeholder', () => {
      const result = confluenceToBBCode(
        '<img src="https://onemoregame.atlassian.net/wiki/pages/viewpageattachments.action?pageId=123&preview=/123/456/hero.png" />',
        'announcements'
      );
      expect(result.bbcode).toContain('{placeholder:');
      expect(result.bbcode).not.toContain('viewpageattachments');
    });

    it('passes through non-Confluence img src URLs', () => {
      const result = confluenceToBBCode(
        '<img src="https://cdn.steam.com/real-image.png" />',
        'announcements'
      );
      expect(result.bbcode).toContain('[img]https://cdn.steam.com/real-image.png[/img]');
      expect(result.bbcode).not.toContain('placeholder');
    });

    it('uses alt text as filename when URL has no extractable name', () => {
      const result = confluenceToBBCode(
        '<img src="https://onemoregame.atlassian.net/wiki/download/attachments/123/" alt="my-image.gif" />',
        'announcements'
      );
      expect(result.bbcode).toContain('{placeholder:my-image.gif}');
    });
  });

  describe('confluence macros', () => {
    it('converts code macro to [code]', () => {
      const result = confluenceToBBCode(
        '<ac:structured-macro ac:name="code"><ac:plain-text-body>const x = 1;</ac:plain-text-body></ac:structured-macro>',
        'announcements'
      );
      expect(result.bbcode).toContain('[code]const x = 1;[/code]');
    });

    it('converts info panel to plain text with note', () => {
      const result = confluenceToBBCode(
        '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Important info</p></ac:rich-text-body></ac:structured-macro>',
        'announcements'
      );
      expect(result.bbcode).toContain('Important info');
      expect(result.notes.some(n => n.includes('panel') || n.includes('info'))).toBe(true);
    });

    it('removes toc macro with note', () => {
      const result = confluenceToBBCode(
        '<ac:structured-macro ac:name="toc" />',
        'announcements'
      );
      expect(result.bbcode.trim()).toBe('');
      expect(result.notes.some(n => n.includes('Table of Contents'))).toBe(true);
    });
  });

  describe('tables', () => {
    it('converts simple table', () => {
      const result = confluenceToBBCode(
        '<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>',
        'announcements'
      );
      expect(result.bbcode).toContain('[table]');
      expect(result.bbcode).toContain('[th]Header[/th]');
      expect(result.bbcode).toContain('[td]Cell[/td]');
      expect(result.bbcode).toContain('[/table]');
    });
  });

  describe('HTML entities and unicode', () => {
    it('preserves unicode characters (smart quotes)', () => {
      const result = confluenceToBBCode('<p>Renamed \u201cElite\u201d to \u201cShiny\u201d</p>', 'announcements');
      expect(result.bbcode).toContain('\u201cElite\u201d');
      expect(result.bbcode).toContain('\u201cShiny\u201d');
    });

    it('preserves em dash', () => {
      const result = confluenceToBBCode('<p>Something \u2013 another thing</p>', 'announcements');
      expect(result.bbcode).toContain('\u2013');
    });

    it('preserves right arrow', () => {
      const result = confluenceToBBCode('<p>Options \u2192 Video</p>', 'announcements');
      expect(result.bbcode).toContain('\u2192');
    });

    it('preserves right single quote (apostrophe)', () => {
      const result = confluenceToBBCode('<p>it\u2019s</p>', 'announcements');
      expect(result.bbcode).toContain('\u2019');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = confluenceToBBCode('', 'announcements');
      expect(result.bbcode).toBe('');
    });

    it('handles plain text (no HTML)', () => {
      const result = confluenceToBBCode('Just plain text', 'announcements');
      expect(result.bbcode).toBe('Just plain text');
    });

    it('does not throw on malformed HTML', () => {
      expect(() => confluenceToBBCode('<p>Unclosed', 'announcements')).not.toThrow();
    });

    it('handles deeply nested elements', () => {
      const result = confluenceToBBCode(
        '<p><strong><em><u>deep</u></em></strong></p>',
        'announcements'
      );
      expect(result.bbcode).toContain('[b][i][u]deep[/u][/i][/b]');
    });

    it('works with different Steam contexts', () => {
      const xhtml = '<p>Test content</p>';
      expect(confluenceToBBCode(xhtml, 'announcements').bbcode).toBe('Test content');
      expect(confluenceToBBCode(xhtml, 'guides').bbcode).toBe('Test content');
      expect(confluenceToBBCode(xhtml, 'forums').bbcode).toBe('Test content');
      expect(confluenceToBBCode(xhtml, 'reviews').bbcode).toBe('Test content');
    });
  });
});
