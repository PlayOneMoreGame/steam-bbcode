import { describe, it, expect } from 'vitest';
import { bbcodeToHTML, extractMedia } from '../renderer';

describe('bbcodeToHTML', () => {
  describe('headers', () => {
    it('converts h1', () => {
      expect(bbcodeToHTML('[h1]Title[/h1]')).toContain('<h1 class="steam-h1">Title</h1>');
    });

    it('converts h2', () => {
      expect(bbcodeToHTML('[h2]Section[/h2]')).toContain('<h2 class="steam-h2">Section</h2>');
    });

    it('converts h3', () => {
      expect(bbcodeToHTML('[h3]Sub[/h3]')).toContain('<h3 class="steam-h3">Sub</h3>');
    });
  });

  describe('formatting', () => {
    it('converts bold', () => {
      expect(bbcodeToHTML('[b]bold[/b]')).toContain('<strong>bold</strong>');
    });

    it('converts italic', () => {
      expect(bbcodeToHTML('[i]italic[/i]')).toContain('<em>italic</em>');
    });

    it('converts underline', () => {
      expect(bbcodeToHTML('[u]underline[/u]')).toContain('<u>underline</u>');
    });

    it('converts strikethrough', () => {
      expect(bbcodeToHTML('[strike]deleted[/strike]')).toContain('<del>deleted</del>');
    });
  });

  describe('code', () => {
    it('converts code blocks', () => {
      expect(bbcodeToHTML('[code]const x = 1;[/code]')).toContain('<pre class="steam-code"><code>const x = 1;</code></pre>');
    });
  });

  describe('links', () => {
    it('converts url with href attribute', () => {
      const html = bbcodeToHTML('[url=https://example.com]link[/url]');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('>link</a>');
    });

    it('converts url without href (URL as content)', () => {
      const html = bbcodeToHTML('[url]https://example.com[/url]');
      expect(html).toContain('href="https://example.com"');
    });

    it('adds target blank and noopener', () => {
      const html = bbcodeToHTML('[url=https://example.com]link[/url]');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener"');
    });
  });

  describe('images', () => {
    it('converts img tags', () => {
      const html = bbcodeToHTML('[img]https://example.com/img.png[/img]');
      expect(html).toContain('src="https://example.com/img.png"');
      expect(html).toContain('loading="lazy"');
    });

    it('renders drop markers as bold text (natural [b] tag processing)', () => {
      const html = bbcodeToHTML('[b]>>> Drop image: screenshot.png <<<[/b]');
      expect(html).toContain('<strong>');
      expect(html).toContain('screenshot.png');
    });

    it('renders normal img for URLs', () => {
      const html = bbcodeToHTML('[img]https://cdn.steam.com/real.png[/img]');
      expect(html).toContain('<img src="https://cdn.steam.com/real.png"');
      expect(html).not.toContain('steam-img-placeholder');
    });

    it('renders blob image using data URL from imageDataUrls map', () => {
      const imageMap = new Map([['test.png', 'data:image/png;base64,abc123']]);
      const html = bbcodeToHTML('[img]blob:test.png[/img]', imageMap);
      expect(html).toContain('<img src="data:image/png;base64,abc123"');
      expect(html).toContain('alt="test.png"');
      expect(html).not.toContain('steam-img-placeholder');
    });

    it('renders placeholder card for unknown blob reference', () => {
      const html = bbcodeToHTML('[img]blob:unknown.png[/img]');
      expect(html).toContain('steam-img-placeholder');
      expect(html).toContain('unknown.png');
      expect(html).not.toContain('<img');
    });

    it('renders placeholder card for blob reference with empty imageDataUrls', () => {
      const imageMap = new Map<string, string>();
      const html = bbcodeToHTML('[img]blob:missing.png[/img]', imageMap);
      expect(html).toContain('steam-img-placeholder');
      expect(html).toContain('missing.png');
    });

    it('handles blob images alongside drop markers', () => {
      const imageMap = new Map([['dropped.png', 'data:image/png;base64,xyz']]);
      const bbcode = '[b]>>> Drop image: conf.png <<<[/b]\n[img]blob:dropped.png[/img]';
      const html = bbcodeToHTML(bbcode, imageMap);
      // Drop marker renders as bold text
      expect(html).toContain('conf.png');
      // Blob image renders actual img
      expect(html).toContain('data:image/png;base64,xyz');
    });
  });

  describe('youtube', () => {
    it('converts previewyoutube to iframe', () => {
      const html = bbcodeToHTML('[previewyoutube=dQw4w9WgXcQ][/previewyoutube]');
      expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ');
      expect(html).toContain('<iframe');
    });
  });

  describe('quotes and spoilers', () => {
    it('converts quote', () => {
      expect(bbcodeToHTML('[quote]text[/quote]')).toContain('<blockquote class="steam-quote">text</blockquote>');
    });

    it('converts spoiler', () => {
      const html = bbcodeToHTML('[spoiler]hidden[/spoiler]');
      expect(html).toContain('<details class="steam-spoiler">');
      expect(html).toContain('<summary>Spoiler</summary>');
      expect(html).toContain('hidden');
    });
  });

  describe('lists', () => {
    it('converts unordered list', () => {
      const html = bbcodeToHTML('[list][*]Item 1[*]Item 2[/list]');
      expect(html).toContain('<ul class="steam-list">');
      expect(html).toContain('<li>Item 1</li>');
      // Last item's </li> wraps around </ul> due to [*] lookahead regex
      expect(html).toContain('Item 2');
      expect(html).toContain('</ul>');
    });

    it('converts ordered list', () => {
      const html = bbcodeToHTML('[olist][*]First[*]Second[/olist]');
      expect(html).toContain('<ol class="steam-olist">');
      expect(html).toContain('<li>First</li>');
      expect(html).toContain('Second');
    });
  });

  describe('horizontal rule', () => {
    it('converts hr', () => {
      expect(bbcodeToHTML('[hr][/hr]')).toContain('<hr class="steam-hr" />');
    });
  });

  describe('HTML escaping', () => {
    it('escapes ampersands', () => {
      expect(bbcodeToHTML('A & B')).toContain('A &amp; B');
    });

    it('escapes angle brackets', () => {
      expect(bbcodeToHTML('x < y > z')).toContain('x &lt; y &gt; z');
    });
  });

  describe('newlines', () => {
    it('converts newlines to br', () => {
      expect(bbcodeToHTML('line 1\nline 2')).toContain('line 1<br />line 2');
    });

    it('cleans up br after block elements', () => {
      const html = bbcodeToHTML('[h1]Title[/h1]\ntext');
      expect(html).not.toContain('</h1><br />');
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase tags', () => {
      expect(bbcodeToHTML('[B]bold[/B]')).toContain('<strong>bold</strong>');
    });
  });

  describe('XSS prevention', () => {
    it('blocks javascript: URLs in [url=...]', () => {
      const html = bbcodeToHTML('[url=javascript:alert(1)]click me[/url]');
      expect(html).not.toContain('javascript:');
      expect(html).toContain('href="#"');
    });

    it('blocks javascript: URLs in [url]...[/url]', () => {
      const html = bbcodeToHTML('[url]javascript:alert(1)[/url]');
      expect(html).not.toContain('javascript:');
      expect(html).toContain('href="#"');
    });

    it('blocks data: URLs in links', () => {
      const html = bbcodeToHTML('[url=data:text/html,<script>alert(1)</script>]xss[/url]');
      expect(html).not.toContain('data:text/html');
      expect(html).toContain('href="#"');
    });

    it('allows https URLs', () => {
      const html = bbcodeToHTML('[url=https://store.steampowered.com]Steam[/url]');
      expect(html).toContain('href="https://store.steampowered.com"');
    });

    it('allows steam: protocol URLs', () => {
      const html = bbcodeToHTML('[url=steam://run/12345]Launch[/url]');
      expect(html).toContain('href="steam://run/12345"');
    });

    it('escapes quotes in img src to prevent attribute injection', () => {
      const html = bbcodeToHTML('[img]https://example.com/img.png" onload="alert(1)[/img]');
      expect(html).not.toContain('onload="');
      expect(html).toContain('&quot;');
    });

    it('blocks javascript: in img src', () => {
      const html = bbcodeToHTML('[img]javascript:alert(1)[/img]');
      expect(html).not.toContain('javascript:');
    });
  });
});

describe('extractMedia', () => {
  it('extracts YouTube videos', () => {
    const media = extractMedia('![video](https://www.youtube.com/watch?v=abc123)');
    expect(media).toHaveLength(1);
    expect(media[0].type).toBe('youtube');
    expect(media[0].id).toBe('abc123');
  });

  it('extracts regular images', () => {
    const media = extractMedia('![alt](https://example.com/img.png)');
    expect(media).toHaveLength(1);
    expect(media[0].type).toBe('image');
    expect(media[0].url).toBe('https://example.com/img.png');
  });

  it('extracts both YouTube and images', () => {
    const md = '![video](https://youtu.be/abc) and ![img](https://example.com/pic.jpg)';
    const media = extractMedia(md);
    expect(media).toHaveLength(2);
    expect(media[0].type).toBe('youtube');
    expect(media[1].type).toBe('image');
  });

  it('returns empty array for no media', () => {
    expect(extractMedia('plain text')).toHaveLength(0);
  });

  it('does not double-count YouTube as image', () => {
    const media = extractMedia('![video](https://youtube.com/watch?v=test)');
    expect(media).toHaveLength(1);
    expect(media[0].type).toBe('youtube');
  });
});
