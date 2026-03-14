import { describe, it, expect } from 'vitest';
import { detectFormat } from '../format-detector';

/**
 * Tests for the format detection logic underlying useFormatDetection.
 *
 * The hook itself is a thin debounce wrapper (300ms setTimeout) around
 * detectFormat(). Since the vitest environment is 'node' without React,
 * we test the pure function directly. The debounce behavior is covered
 * by E2E tests (multi-format.spec.ts).
 *
 * The existing format-detector.test.ts covers individual markers. These tests
 * focus on realistic content scenarios that exercise the hook's usage path:
 * full documents, mixed signals, and content that changes format mid-edit.
 */

describe('useFormatDetection — realistic content scenarios', () => {
  describe('markdown documents', () => {
    it('detects a typical markdown document with headers and lists', () => {
      const md = `# Steam Store Page

## About This Game

SWAPMEAT is a roguelite shooter where you:

- Fight through procedural arenas
- Swap weapons from defeated enemies
- Unlock permanent upgrades

### Key Features

1. Fast-paced combat
2. Hundreds of weapon combinations
3. Online co-op support

Check out the [trailer](https://youtube.com/watch?v=abc123).
`;
      expect(detectFormat(md)).toBe('markdown');
    });

    it('detects markdown with code fences', () => {
      const md = `## Config

\`\`\`json
{
  "resolution": "1920x1080",
  "fullscreen": true
}
\`\`\`

Save this to your settings folder.`;
      expect(detectFormat(md)).toBe('markdown');
    });

    it('detects markdown with images and bold', () => {
      const md = `Here is a **screenshot** of the new arena:

![Arena Screenshot](https://example.com/arena.png)

And here is **another** one with the boss fight.`;
      expect(detectFormat(md)).toBe('markdown');
    });
  });

  describe('Confluence XHTML documents', () => {
    it('detects a typical Confluence page export', () => {
      const xhtml = `<h1>Release Notes v1.5</h1>
<p>This update includes the following changes:</p>
<ac:structured-macro ac:name="toc" />
<h2>New Features</h2>
<ul>
<li>Added new arena: <strong>The Pit</strong></li>
<li>New weapon: <em>Plasma Rifle</em></li>
</ul>
<ac:structured-macro ac:name="info">
<ac:rich-text-body>
<p>This build requires a restart.</p>
</ac:rich-text-body>
</ac:structured-macro>`;
      expect(detectFormat(xhtml)).toBe('confluence');
    });

    it('detects Confluence with image attachments', () => {
      const xhtml = `<p>See the screenshot below:</p>
<ac:image>
<ri:attachment ri:filename="screenshot.png" />
</ac:image>
<p>The UI has been updated.</p>`;
      expect(detectFormat(xhtml)).toBe('confluence');
    });

    it('detects Confluence rendered clipboard format', () => {
      const clipboard = `<meta charset='utf-8'><h2 data-renderer-start-pos="1" data-local-id="abc123">Features</h2><p data-renderer-start-pos="12">New stuff here.</p>`;
      expect(detectFormat(clipboard)).toBe('confluence');
    });
  });

  describe('plain text documents', () => {
    it('detects plain sentences as plaintext', () => {
      expect(detectFormat('Just a regular sentence about the game.')).toBe('plaintext');
    });

    it('detects multi-paragraph plain text', () => {
      const text = `Welcome to the store page.

We are excited to announce our new game.

It will be available on Steam this fall.`;
      expect(detectFormat(text)).toBe('plaintext');
    });

    it('detects empty content as plaintext', () => {
      expect(detectFormat('')).toBe('plaintext');
    });

    it('detects whitespace-only as plaintext', () => {
      expect(detectFormat('   \n\n   ')).toBe('plaintext');
    });
  });

  describe('format transitions (simulating user editing)', () => {
    it('content starts plain, then adds markdown markers', () => {
      const step1 = 'Just some notes about the game';
      const step2 = '# Game Notes\n\nJust some notes about the game';

      expect(detectFormat(step1)).toBe('plaintext');
      expect(detectFormat(step2)).toBe('markdown');
    });

    it('pasting Confluence into markdown editor changes detected format', () => {
      const beforePaste = '# My Document\n\nSome content here.';
      const afterPaste = '# My Document\n\n<ac:structured-macro ac:name="code"><ac:plain-text-body>code</ac:plain-text-body></ac:structured-macro>';

      expect(detectFormat(beforePaste)).toBe('markdown');
      // Confluence markers take priority
      expect(detectFormat(afterPaste)).toBe('confluence');
    });
  });

  describe('ambiguous content', () => {
    it('single asterisk in prose is not markdown', () => {
      expect(detectFormat('Rating: 5 * out of 5 stars')).toBe('plaintext');
    });

    it('HTML without Confluence namespaces is not Confluence', () => {
      // Generic HTML (e.g., from a web page) should not be detected as Confluence
      const html = '<div><p>Hello <b>world</b></p><a href="http://example.com">link</a></div>';
      expect(detectFormat(html)).not.toBe('confluence');
    });

    it('BBCode is treated as plaintext (not markdown or confluence)', () => {
      const bbcode = '[h1]Title[/h1]\n[list]\n[*]Item 1\n[*]Item 2\n[/list]';
      // BBCode has no markdown or confluence markers, so it falls to plaintext
      expect(detectFormat(bbcode)).toBe('plaintext');
    });
  });
});
