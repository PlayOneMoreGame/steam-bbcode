// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { confluenceToMarkdown } from '../confluence-converter';
import { markdownToBBCode } from '../converter';
import { SWAPMEAT_019_PATCH_NOTES } from './fixtures/confluence-patch-notes.fixture';
import { CONFLUENCE_RENDERED_CLIPBOARD_HTML } from './fixtures/confluence-rendered-clipboard.fixture';

describe('confluenceToMarkdown', () => {
  describe('headings', () => {
    it('converts h1 to ATX heading', () => {
      const result = confluenceToMarkdown('<h1>Title</h1>', 'announcements');
      expect(result.markdown).toBe('# Title');
    });

    it('converts h2 to ATX heading', () => {
      const result = confluenceToMarkdown('<h2>Section</h2>', 'announcements');
      expect(result.markdown).toBe('## Section');
    });

    it('converts h3 to ATX heading', () => {
      const result = confluenceToMarkdown('<h3>Subsection</h3>', 'announcements');
      expect(result.markdown).toBe('### Subsection');
    });

    it('strips redundant bold inside headings', () => {
      const result = confluenceToMarkdown('<h2><strong>Bold Title</strong></h2>', 'announcements');
      expect(result.markdown).toBe('## Bold Title');
      expect(result.markdown).not.toContain('**');
    });

    it('strips redundant underline inside headings', () => {
      const result = confluenceToMarkdown('<h2><u>Underlined Title</u></h2>', 'announcements');
      expect(result.markdown).toBe('## Underlined Title');
    });

    it('strips redundant bold+underline inside headings', () => {
      const result = confluenceToMarkdown('<h2><strong><u>Both</u></strong></h2>', 'announcements');
      expect(result.markdown).toBe('## Both');
    });

    it('preserves heading text with local-id attributes stripped', () => {
      const result = confluenceToMarkdown('<h2 local-id="abc123">Section</h2>', 'announcements');
      expect(result.markdown).toBe('## Section');
      expect(result.markdown).not.toContain('local-id');
    });
  });

  describe('paragraphs', () => {
    it('converts simple paragraph', () => {
      const result = confluenceToMarkdown('<p>Hello world</p>', 'announcements');
      expect(result.markdown).toBe('Hello world');
    });

    it('converts multiple paragraphs', () => {
      const result = confluenceToMarkdown('<p>First</p><p>Second</p>', 'announcements');
      expect(result.markdown).toMatch(/First\n\nSecond/);
    });

    it('strips empty paragraphs', () => {
      const result = confluenceToMarkdown('<p></p><p>Content</p>', 'announcements');
      expect(result.markdown.trim()).toBe('Content');
    });

    it('converts br to newline', () => {
      const result = confluenceToMarkdown('<p>Line 1<br />Line 2</p>', 'announcements');
      expect(result.markdown).toContain('Line 1\nLine 2');
    });
  });

  describe('inline formatting', () => {
    it('converts strong to bold', () => {
      const result = confluenceToMarkdown('<p><strong>bold</strong></p>', 'announcements');
      expect(result.markdown).toContain('**bold**');
    });

    it('converts em to italic', () => {
      const result = confluenceToMarkdown('<p><em>italic</em></p>', 'announcements');
      expect(result.markdown).toContain('*italic*');
    });

    it('passes through underline text (no markdown equivalent)', () => {
      const result = confluenceToMarkdown('<p><u>underlined</u></p>', 'announcements');
      expect(result.markdown).toContain('underlined');
      expect(result.markdown).not.toContain('[u]');
    });

    it('converts del to strikethrough', () => {
      const result = confluenceToMarkdown('<p><del>deleted</del></p>', 'announcements');
      expect(result.markdown).toContain('~~deleted~~');
    });

    it('converts links to markdown syntax', () => {
      const result = confluenceToMarkdown('<p><a href="https://example.com">Click</a></p>', 'announcements');
      expect(result.markdown).toContain('[Click](https://example.com)');
    });
  });

  describe('lists', () => {
    it('converts unordered list to dash items', () => {
      const result = confluenceToMarkdown('<ul><li>Item 1</li><li>Item 2</li></ul>', 'announcements');
      expect(result.markdown).toContain('- Item 1');
      expect(result.markdown).toContain('- Item 2');
      expect(result.markdown).not.toContain('[list]');
    });

    it('converts ordered list to numbered items', () => {
      const result = confluenceToMarkdown('<ol><li>First</li><li>Second</li></ol>', 'announcements');
      expect(result.markdown).toContain('1. First');
      expect(result.markdown).toContain('2. Second');
      expect(result.markdown).not.toContain('[olist]');
    });

    it('strips p wrappers inside li elements', () => {
      const result = confluenceToMarkdown('<ul><li><p>Wrapped text</p></li></ul>', 'announcements');
      expect(result.markdown).toContain('- Wrapped text');
      expect(result.markdown).not.toContain('<p>');
    });

    it('flattens nested lists', () => {
      const result = confluenceToMarkdown(
        '<ul><li><p>Parent</p><ul><li><p>Child 1</p></li><li><p>Child 2</p></li></ul></li></ul>',
        'announcements'
      );
      expect(result.markdown).toContain('- Parent');
      expect(result.markdown).toContain('- Child 1');
      expect(result.markdown).toContain('- Child 2');
    });

    it('handles inline formatting inside list items', () => {
      const result = confluenceToMarkdown('<ul><li><p><strong>bold</strong> item</p></li></ul>', 'announcements');
      expect(result.markdown).toContain('- **bold** item');
    });
  });

  describe('images', () => {
    it('converts ac:image with ri:attachment to markdown drop marker', () => {
      const result = confluenceToMarkdown(
        '<ac:image><ri:attachment ri:filename="test.png" /></ac:image>',
        'announcements'
      );
      expect(result.markdown).toContain('**>>> Drop image: test.png <<<**');
      expect(result.markdown).not.toContain('[b]');
    });

    it('preserves filenames with spaces in marker', () => {
      const result = confluenceToMarkdown(
        '<ac:image><ri:attachment ri:filename="Screenshot 2026-03-04 at 1.09.26 PM.png" /></ac:image>',
        'announcements'
      );
      expect(result.markdown).toContain('**>>> Drop image: Screenshot 2026-03-04 at 1.09.26 PM.png <<<**');
    });

    it('extracts caption text after image', () => {
      const result = confluenceToMarkdown(
        '<ac:image><ri:attachment ri:filename="map.png" /><ac:caption><p>The World Map</p></ac:caption></ac:image>',
        'announcements'
      );
      expect(result.markdown).toContain('**>>> Drop image: map.png <<<**');
      expect(result.markdown).toContain('The World Map');
    });

    it('adds note about image attachments needing upload', () => {
      const result = confluenceToMarkdown(
        '<ac:image><ri:attachment ri:filename="test.png" /></ac:image>',
        'announcements'
      );
      expect(result.notes.some(n => n.toLowerCase().includes('upload') || n.toLowerCase().includes('image'))).toBe(true);
    });

    it('converts <img> with Confluence src to drop marker', () => {
      const result = confluenceToMarkdown(
        '<img src="https://example.atlassian.net/wiki/download/attachments/123/screenshot.png" alt="screenshot.png" />',
        'announcements'
      );
      expect(result.markdown).toContain('**>>> Drop image: screenshot.png <<<**');
      expect(result.markdown).not.toContain('atlassian.net');
    });

    it('passes through non-Confluence img src URLs as markdown images', () => {
      const result = confluenceToMarkdown(
        '<img src="https://cdn.steam.com/real-image.png" />',
        'announcements'
      );
      expect(result.markdown).toContain('![](https://cdn.steam.com/real-image.png)');
      expect(result.markdown).not.toContain('[img]');
    });

    it('uses alt text as filename when URL has no extractable name', () => {
      const result = confluenceToMarkdown(
        '<img src="https://example.atlassian.net/wiki/download/attachments/123/" alt="my-image.gif" />',
        'announcements'
      );
      expect(result.markdown).toContain('>>> Drop image: my-image.gif <<<');
    });
  });

  describe('confluence macros', () => {
    it('converts code macro to fenced code block', () => {
      const result = confluenceToMarkdown(
        '<ac:structured-macro ac:name="code"><ac:plain-text-body>const x = 1;</ac:plain-text-body></ac:structured-macro>',
        'announcements'
      );
      expect(result.markdown).toContain('```');
      expect(result.markdown).toContain('const x = 1;');
    });

    it('converts info panel to plain text with note', () => {
      const result = confluenceToMarkdown(
        '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Important info</p></ac:rich-text-body></ac:structured-macro>',
        'announcements'
      );
      expect(result.markdown).toContain('Important info');
      expect(result.notes.some(n => n.includes('panel') || n.includes('info'))).toBe(true);
    });

    it('removes toc macro with note', () => {
      const result = confluenceToMarkdown(
        '<ac:structured-macro ac:name="toc" />',
        'announcements'
      );
      expect(result.markdown.trim()).toBe('');
      expect(result.notes.some(n => n.includes('Table of Contents'))).toBe(true);
    });
  });

  describe('tables', () => {
    it('converts simple table to markdown table', () => {
      const result = confluenceToMarkdown(
        '<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>',
        'announcements'
      );
      expect(result.markdown).toContain('Header');
      expect(result.markdown).toContain('Cell');
      expect(result.markdown).toContain('---');
      expect(result.markdown).not.toContain('[table]');
    });
  });

  describe('horizontal rules', () => {
    it('converts hr to markdown thematic break', () => {
      const result = confluenceToMarkdown('<p>Above</p><hr/><p>Below</p>', 'announcements');
      expect(result.markdown).toContain('---');
    });
  });

  describe('HTML entities and unicode', () => {
    it('preserves unicode characters (smart quotes)', () => {
      const result = confluenceToMarkdown('<p>Renamed \u201cElite\u201d to \u201cShiny\u201d</p>', 'announcements');
      expect(result.markdown).toContain('\u201cElite\u201d');
      expect(result.markdown).toContain('\u201cShiny\u201d');
    });

    it('preserves em dash', () => {
      const result = confluenceToMarkdown('<p>Something \u2013 another thing</p>', 'announcements');
      expect(result.markdown).toContain('\u2013');
    });

    it('preserves right arrow', () => {
      const result = confluenceToMarkdown('<p>Options \u2192 Video</p>', 'announcements');
      expect(result.markdown).toContain('\u2192');
    });

    it('preserves right single quote (apostrophe)', () => {
      const result = confluenceToMarkdown('<p>it\u2019s</p>', 'announcements');
      expect(result.markdown).toContain('\u2019');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = confluenceToMarkdown('', 'announcements');
      expect(result.markdown).toBe('');
    });

    it('handles plain text (no HTML)', () => {
      const result = confluenceToMarkdown('Just plain text', 'announcements');
      expect(result.markdown).toBe('Just plain text');
    });

    it('does not throw on malformed HTML', () => {
      expect(() => confluenceToMarkdown('<p>Unclosed', 'announcements')).not.toThrow();
    });

    it('handles deeply nested formatting', () => {
      const result = confluenceToMarkdown(
        '<p><strong><em>deep</em></strong></p>',
        'announcements'
      );
      expect(result.markdown).toContain('***deep***');
    });

    it('works with different Steam contexts', () => {
      const xhtml = '<p>Test content</p>';
      expect(confluenceToMarkdown(xhtml, 'announcements').markdown).toBe('Test content');
      expect(confluenceToMarkdown(xhtml, 'guides').markdown).toBe('Test content');
      expect(confluenceToMarkdown(xhtml, 'forums').markdown).toBe('Test content');
      expect(confluenceToMarkdown(xhtml, 'reviews').markdown).toBe('Test content');
    });
  });

  describe('rendered clipboard elements', () => {
    it('extracts image from mediaSingle div with data-file-name', () => {
      const html = '<div data-node-type="mediaSingle"><div data-type="file" data-node-type="media" data-file-name="test.gif"><img src="blob:https://example.com/fake" alt="test.gif"></div></div>';
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toContain('**>>> Drop image: test.gif <<<**');
    });

    it('extracts caption from data-media-caption div', () => {
      const html = '<div data-node-type="mediaSingle"><div data-type="file" data-node-type="media" data-file-name="map.png"><img src="blob:https://example.com/fake" alt="map.png"></div><div data-media-caption="true">The World Map</div></div>';
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toContain('**>>> Drop image: map.png <<<**');
      expect(result.markdown).toContain('The World Map');
    });

    it('converts blob: img src to drop marker using alt text', () => {
      const html = '<img src="blob:https://example.atlassian.net/fake-id" alt="screenshot.png">';
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toContain('**>>> Drop image: screenshot.png <<<**');
      expect(result.markdown).not.toContain('blob:');
    });

    it('strips inline styles and data attributes from output', () => {
      const html = '<p data-renderer-start-pos="10" data-local-id="abc" style="margin: 0px; font: 600 1.4em;">Hello world</p>';
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toBe('Hello world');
      expect(result.markdown).not.toContain('data-');
      expect(result.markdown).not.toContain('style=');
    });

    it('strips strong+underline inside headings from rendered clipboard', () => {
      const html = '<h2 data-local-id="abc" data-renderer-start-pos="1"><strong data-renderer-mark="true"><u data-renderer-mark="true">Section Title</u></strong></h2>';
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toBe('## Section Title');
    });

    it('flattens nested lists from rendered clipboard', () => {
      const html = '<ul class="ak-ul"><li><p>Parent item</p><ul class="ak-ul"><li><p>Child 1</p></li><li><p>Child 2</p></li></ul></li></ul>';
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toContain('- Parent item');
      expect(result.markdown).toContain('- Child 1');
      expect(result.markdown).toContain('- Child 2');
    });

    it('handles images inside list items', () => {
      const html = '<ul><li><p>Item text</p><div data-node-type="mediaSingle"><div data-type="file" data-node-type="media" data-file-name="inline.png"><img src="blob:fake" alt="inline.png"></div></div></li></ul>';
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toContain('- Item text');
      expect(result.markdown).toContain('**>>> Drop image: inline.png <<<**');
    });

    it('skips meta charset element', () => {
      const html = "<meta charset='utf-8'><p>Content</p>";
      const result = confluenceToMarkdown(html, 'announcements');
      expect(result.markdown).toBe('Content');
      expect(result.markdown).not.toContain('meta');
    });
  });
});

describe('confluence → markdown → BBCode pipeline', () => {
  it('storage format patch notes produce valid BBCode through pipeline', () => {
    const { markdown, notes } = confluenceToMarkdown(SWAPMEAT_019_PATCH_NOTES, 'announcements');
    const { bbcode } = markdownToBBCode(markdown, 'announcements');

    // Markdown intermediate should be readable
    expect(markdown).toContain('## Shrines');
    expect(markdown).toContain('## Gameplay');
    expect(markdown).toContain('**>>> Drop image: Shrine_InGame_FirstPass_PatchEmbed.gif <<<**');
    expect(markdown).not.toContain('<ac:');
    expect(markdown).not.toContain('local-id');

    // BBCode output should have correct tags
    expect(bbcode).toContain('[h2]Shrines[/h2]');
    expect(bbcode).toContain('[h2]Gameplay[/h2]');
    expect(bbcode).toContain('[list]');
    expect(bbcode).toContain('[b]>>> Drop image: Shrine_InGame_FirstPass_PatchEmbed.gif <<<[/b]');

    // Should produce image notes
    expect(notes.some(n => n.includes('Drop image') || n.includes('upload'))).toBe(true);
  });

  it('rendered clipboard HTML produces valid BBCode through pipeline', () => {
    const { markdown, notes } = confluenceToMarkdown(CONFLUENCE_RENDERED_CLIPBOARD_HTML, 'announcements');
    const { bbcode } = markdownToBBCode(markdown, 'announcements');

    // Markdown intermediate should be clean
    expect(markdown).toContain('## Shrines');
    expect(markdown).toContain('## Bug Fixes');
    expect(markdown).toContain('**>>> Drop image: Shrine_InGame_FirstPass_PatchEmbed.gif <<<**');
    expect(markdown).not.toContain('data-renderer-start-pos');
    expect(markdown).not.toContain('blob:');

    // BBCode output
    expect(bbcode).toContain('[h2]Shrines[/h2]');
    expect(bbcode).toContain('[h2]Bug Fixes[/h2]');
    expect(bbcode).toContain('[list]');
    expect(bbcode).toContain('[b]>>> Drop image: Shrine_InGame_FirstPass_PatchEmbed.gif <<<[/b]');

    // Image notes
    expect(notes.some(n => n.includes('Drop image') || n.includes('upload'))).toBe(true);
  });

  it('simple element converts cleanly through full pipeline', () => {
    const html = '<h1>Patch Notes</h1><p>Fixed <strong>critical bug</strong>.</p><ul><li>One</li><li>Two</li></ul>';
    const { markdown } = confluenceToMarkdown(html, 'announcements');
    const { bbcode } = markdownToBBCode(markdown, 'announcements');

    expect(bbcode).toContain('[h1]Patch Notes[/h1]');
    expect(bbcode).toContain('[b]critical bug[/b]');
    expect(bbcode).toContain('[list]');
    expect(bbcode).toContain('[*]One');
    expect(bbcode).toContain('[*]Two');
    expect(bbcode).toContain('[/list]');
  });

  it('output contains no raw HTML tags', () => {
    const html = '<p>Hello <strong>world</strong></p><ac:image><ri:attachment ri:filename="screenshot.png"/></ac:image>';
    const { markdown } = confluenceToMarkdown(html, 'announcements');
    const { bbcode } = markdownToBBCode(markdown, 'announcements');

    expect(markdown).not.toContain('<p>');
    expect(markdown).not.toContain('<strong>');
    expect(markdown).not.toContain('<ac:');
    expect(bbcode).not.toContain('<p>');
    expect(bbcode).not.toContain('<strong>');
    expect(bbcode).not.toContain('<ac:');
  });

  it('Confluence link notes propagate through pipeline', () => {
    const html = '<h1>Title</h1><ac:link><ri:page ri:content-title="Internal Page"/></ac:link>';
    const { markdown, notes } = confluenceToMarkdown(html, 'announcements');

    expect(notes.some(n => n.includes('Internal Confluence link'))).toBe(true);
    expect(markdown).toContain('[Internal Page](');
  });
});
