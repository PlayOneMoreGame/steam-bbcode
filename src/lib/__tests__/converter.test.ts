import { describe, it, expect } from 'vitest';
import { markdownToBBCode, extractYouTubeId } from '../converter';

describe('markdownToBBCode', () => {
  describe('headers', () => {
    it('converts h1 headers', () => {
      const result = markdownToBBCode('# Hello World', 'announcements');
      expect(result.bbcode).toBe('[h1]Hello World[/h1]');
    });

    it('converts h2 headers', () => {
      const result = markdownToBBCode('## Section Title', 'announcements');
      expect(result.bbcode).toBe('[h2]Section Title[/h2]');
    });

    it('converts h3 headers', () => {
      const result = markdownToBBCode('### Subsection', 'announcements');
      expect(result.bbcode).toBe('[h3]Subsection[/h3]');
    });

    it('handles multiple headers', () => {
      const md = '# Title\n## Section\n### Sub';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[h1]Title[/h1]\n[h2]Section[/h2]\n[h3]Sub[/h3]');
    });
  });

  describe('text formatting', () => {
    it('converts bold with **', () => {
      const result = markdownToBBCode('This is **bold** text', 'announcements');
      expect(result.bbcode).toBe('This is [b]bold[/b] text');
    });

    it('converts bold with __', () => {
      const result = markdownToBBCode('This is __bold__ text', 'announcements');
      expect(result.bbcode).toBe('This is [b]bold[/b] text');
    });

    it('converts italic with *', () => {
      const result = markdownToBBCode('This is *italic* text', 'announcements');
      expect(result.bbcode).toBe('This is [i]italic[/i] text');
    });

    it('converts italic with _', () => {
      const result = markdownToBBCode('This is _italic_ text', 'announcements');
      expect(result.bbcode).toBe('This is [i]italic[/i] text');
    });

    it('converts strikethrough', () => {
      const result = markdownToBBCode('This is ~~deleted~~ text', 'announcements');
      expect(result.bbcode).toBe('This is [strike]deleted[/strike] text');
    });

    it('handles nested bold and italic', () => {
      const result = markdownToBBCode('**bold and *italic* inside**', 'announcements');
      expect(result.bbcode).toBe('[b]bold and [i]italic[/i] inside[/b]');
    });
  });

  describe('code', () => {
    it('converts fenced code blocks', () => {
      const md = '```\nconst x = 1;\n```';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[code]const x = 1;[/code]');
    });

    it('converts fenced code blocks with language', () => {
      const md = '```javascript\nconst x = 1;\n```';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[code]const x = 1;[/code]');
    });

    it('converts inline code to bold and adds note', () => {
      const result = markdownToBBCode('Use the `command` here', 'announcements');
      expect(result.bbcode).toBe('Use the [b]command[/b] here');
      expect(result.notes).toContain('Converted 1 inline code span(s) to [b] (Steam has no inline code)');
    });

    it('counts multiple inline code spans', () => {
      const result = markdownToBBCode('Run `cmd1` and `cmd2`', 'announcements');
      expect(result.notes).toContain('Converted 2 inline code span(s) to [b] (Steam has no inline code)');
    });
  });

  describe('links', () => {
    it('converts markdown links', () => {
      const result = markdownToBBCode('[Click here](https://example.com)', 'announcements');
      expect(result.bbcode).toBe('[url=https://example.com]Click here[/url]');
    });

    it('handles links with special characters in text', () => {
      const result = markdownToBBCode('[Visit us!](https://example.com)', 'announcements');
      expect(result.bbcode).toBe('[url=https://example.com]Visit us![/url]');
    });
  });

  describe('images', () => {
    it('converts images', () => {
      const result = markdownToBBCode('![alt text](https://example.com/image.png)', 'announcements');
      expect(result.bbcode).toBe('[img]https://example.com/image.png[/img]');
    });

    it('adds note about images in guides context', () => {
      const result = markdownToBBCode('![alt](https://example.com/img.png)', 'guides');
      expect(result.notes.some(n => n.includes('guides') && n.includes('[previewimg]'))).toBe(true);
    });

    it('adds note about images in reviews context', () => {
      const result = markdownToBBCode('![alt](https://example.com/img.png)', 'reviews');
      expect(result.notes.some(n => n.includes('not supported in reviews'))).toBe(true);
    });
  });

  describe('YouTube videos', () => {
    it('converts YouTube watch URLs', () => {
      const result = markdownToBBCode('![video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)', 'announcements');
      expect(result.bbcode).toBe('[previewyoutube=dQw4w9WgXcQ][/previewyoutube]');
    });

    it('converts youtu.be short URLs', () => {
      const result = markdownToBBCode('![video](https://youtu.be/dQw4w9WgXcQ)', 'announcements');
      expect(result.bbcode).toBe('[previewyoutube=dQw4w9WgXcQ][/previewyoutube]');
    });

    it('adds note about videos in forums context', () => {
      const result = markdownToBBCode('![video](https://youtu.be/dQw4w9WgXcQ)', 'forums');
      expect(result.notes.some(n => n.includes('not supported in forums'))).toBe(true);
    });
  });

  describe('lists', () => {
    it('converts unordered lists with -', () => {
      const md = '- Item 1\n- Item 2\n- Item 3';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[list]\n[*]Item 1\n[*]Item 2\n[*]Item 3\n[/list]');
    });

    it('converts unordered lists with *', () => {
      const md = '* Item 1\n* Item 2';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[list]\n[*]Item 1\n[*]Item 2\n[/list]');
    });

    it('converts unordered lists with +', () => {
      const md = '+ Item 1\n+ Item 2';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[list]\n[*]Item 1\n[*]Item 2\n[/list]');
    });

    it('converts ordered lists', () => {
      const md = '1. First\n2. Second\n3. Third';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[olist]\n[*]First\n[*]Second\n[*]Third\n[/olist]');
    });

    it('handles list followed by text', () => {
      const md = '- Item 1\n- Item 2\n\nSome text after';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toContain('[/list]');
      expect(result.bbcode).toContain('Some text after');
    });
  });

  describe('blockquotes', () => {
    it('converts single line quotes', () => {
      const result = markdownToBBCode('> This is a quote', 'announcements');
      expect(result.bbcode).toBe('[quote]This is a quote[/quote]');
    });

    it('merges consecutive quotes', () => {
      const md = '> Line 1\n> Line 2';
      const result = markdownToBBCode(md, 'announcements');
      expect(result.bbcode).toBe('[quote]Line 1\nLine 2[/quote]');
    });
  });

  describe('horizontal rules', () => {
    it('converts --- to hr', () => {
      const result = markdownToBBCode('---', 'announcements');
      expect(result.bbcode).toBe('[hr][/hr]');
    });

    it('converts *** to hr', () => {
      const result = markdownToBBCode('***', 'announcements');
      expect(result.bbcode).toBe('[hr][/hr]');
    });

    it('converts ___ to hr', () => {
      const result = markdownToBBCode('___', 'announcements');
      expect(result.bbcode).toBe('[hr][/hr]');
    });

    it('converts longer hr markers', () => {
      const result = markdownToBBCode('----------', 'announcements');
      expect(result.bbcode).toBe('[hr][/hr]');
    });
  });

  describe('complex documents', () => {
    it('handles a full patch notes example', () => {
      const md = `# Patch 1.2.3

## Bug Fixes
- Fixed **crash** on startup
- Resolved *memory leak* in loader

## New Features
1. Added ~~removed~~ feature
2. New \`command\` available

---

For more info, visit [our site](https://example.com)`;

      const result = markdownToBBCode(md, 'announcements');
      
      expect(result.bbcode).toContain('[h1]Patch 1.2.3[/h1]');
      expect(result.bbcode).toContain('[h2]Bug Fixes[/h2]');
      expect(result.bbcode).toContain('[b]crash[/b]');
      expect(result.bbcode).toContain('[i]memory leak[/i]');
      expect(result.bbcode).toContain('[strike]removed[/strike]');
      expect(result.bbcode).toContain('[list]');
      expect(result.bbcode).toContain('[olist]');
      expect(result.bbcode).toContain('[hr][/hr]');
      expect(result.bbcode).toContain('[url=https://example.com]our site[/url]');
    });
  });
});

describe('extractYouTubeId', () => {
  it('extracts ID from watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractYouTubeId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeId('https://example.com/video')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(extractYouTubeId('not a url')).toBeNull();
  });
});
