// @vitest-environment jsdom
//
// Format parity tests: verify the same reference content produces equivalent
// BBCode output across all supported input formats (Markdown, Confluence XHTML,
// Google Docs HTML, Plaintext).
//
// These tests catch regressions where one converter drifts out of alignment
// with the others — e.g., a list tag change in the Confluence converter that
// doesn't match the Markdown converter's output.

import { describe, it, expect } from 'vitest';
import { markdownToBBCode } from '../converter';
import { confluenceToMarkdown } from '../confluence-converter';
import { googleDocsToMarkdown } from '../google-docs-converter';
import { plaintextToMarkdown } from '../plaintext-normalizer';
import type { SteamContext } from '../contexts';

// ---------------------------------------------------------------------------
// Reference document — the same content expressed in each format
// ---------------------------------------------------------------------------

const CONTEXT: SteamContext = 'announcements';

// --- Markdown ---
const MARKDOWN_INPUT = `# Welcome to the Game

## Getting Started

This is a regular paragraph with some text.

Here is a paragraph with **bold text** and *italic text* for emphasis.

- First bullet item
- Second bullet item
- Third bullet item

1. First numbered item
2. Second numbered item
3. Third numbered item

Check out [our website](https://example.com) for more info.

---

That is all for now.`;

// --- Confluence XHTML ---
const CONFLUENCE_INPUT = [
  '<h1>Welcome to the Game</h1>',
  '<h2>Getting Started</h2>',
  '<p>This is a regular paragraph with some text.</p>',
  '<p>Here is a paragraph with <strong>bold text</strong> and <em>italic text</em> for emphasis.</p>',
  '<ul>',
  '  <li>First bullet item</li>',
  '  <li>Second bullet item</li>',
  '  <li>Third bullet item</li>',
  '</ul>',
  '<ol>',
  '  <li>First numbered item</li>',
  '  <li>Second numbered item</li>',
  '  <li>Third numbered item</li>',
  '</ol>',
  '<p><a href="https://example.com">Check out our website for more info.</a></p>',
  '<hr/>',
  '<p>That is all for now.</p>',
].join('\n');

// --- Google Docs HTML ---
// Google Docs uses <p> with <span style="font-size:XXpt"> for headings,
// <span style="font-weight:700"> for bold, <span style="font-style:italic">
// for italic, and standard <ul>/<ol> for lists.
function gdocWrap(inner: string): string {
  return `<meta charset="utf-8"><b id="docs-internal-guid-test-parity" style="font-weight:normal">${inner}</b>`;
}

const GOOGLE_DOCS_INPUT = gdocWrap([
  '<p><span style="font-size:20pt">Welcome to the Game</span></p>',
  '<p><span style="font-size:16pt">Getting Started</span></p>',
  '<p><span>This is a regular paragraph with some text.</span></p>',
  '<p><span>Here is a paragraph with </span><span style="font-weight:700">bold text</span><span> and </span><span style="font-style:italic">italic text</span><span> for emphasis.</span></p>',
  '<ul>',
  '  <li><p><span>First bullet item</span></p></li>',
  '  <li><p><span>Second bullet item</span></p></li>',
  '  <li><p><span>Third bullet item</span></p></li>',
  '</ul>',
  '<ol>',
  '  <li><p><span>First numbered item</span></p></li>',
  '  <li><p><span>Second numbered item</span></p></li>',
  '  <li><p><span>Third numbered item</span></p></li>',
  '</ol>',
  '<p><a href="https://example.com"><span>Check out our website for more info.</span></a></p>',
  '<hr>',
  '<p><span>That is all for now.</span></p>',
].join('\n'));

// --- Plaintext ---
// Plain text has no formatting markers. The plaintext normalizer can detect
// heading-like lines (ALL-CAPS or Title Case followed by blank lines) and
// bullet characters, but standard mixed-case text and plain dashes will not
// be converted to formatting. This is expected — plaintext is lossy.
const PLAINTEXT_INPUT = `WELCOME TO THE GAME

GETTING STARTED

This is a regular paragraph with some text.

Here is a paragraph with bold text and italic text for emphasis.

- First bullet item
- Second bullet item
- Third bullet item

1. First numbered item
2. Second numbered item
3. Third numbered item

Check out our website for more info.

That is all for now.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert markdown through the full pipeline to BBCode */
function mdToBBCode(md: string): string {
  return markdownToBBCode(md, CONTEXT).bbcode;
}

/** Strip all BBCode tags to extract plain text content */
function stripBBCode(bbcode: string): string {
  return bbcode
    .replace(/\[\/?(?:h[1-3]|b|i|u|strike|list|olist|url(?:=[^\]]*)?|img|hr|code|quote|table|tr|td|th|previewyoutube(?:=[^\]]*)?)\]/g, '')
    .replace(/\[\*\]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Normalize whitespace for content comparison */
function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Convert each format through the pipeline
// ---------------------------------------------------------------------------

function getMarkdownBBCode(): string {
  return mdToBBCode(MARKDOWN_INPUT);
}

function getConfluenceBBCode(): string {
  const { markdown } = confluenceToMarkdown(CONFLUENCE_INPUT, CONTEXT);
  return mdToBBCode(markdown);
}

function getGoogleDocsBBCode(): string {
  const { markdown } = googleDocsToMarkdown(GOOGLE_DOCS_INPUT);
  return mdToBBCode(markdown);
}

function getPlaintextBBCode(): string {
  const markdown = plaintextToMarkdown(PLAINTEXT_INPUT);
  return mdToBBCode(markdown);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('format parity: Markdown -> BBCode', () => {
  it('produces [h1] heading', () => {
    expect(getMarkdownBBCode()).toContain('[h1]Welcome to the Game[/h1]');
  });

  it('produces [h2] subheading', () => {
    expect(getMarkdownBBCode()).toContain('[h2]Getting Started[/h2]');
  });

  it('produces [b] bold text', () => {
    expect(getMarkdownBBCode()).toContain('[b]bold text[/b]');
  });

  it('produces [i] italic text', () => {
    expect(getMarkdownBBCode()).toContain('[i]italic text[/i]');
  });

  it('produces [list] with [*] items', () => {
    const bbcode = getMarkdownBBCode();
    expect(bbcode).toContain('[list]');
    expect(bbcode).toContain('[*]First bullet item');
    expect(bbcode).toContain('[*]Second bullet item');
    expect(bbcode).toContain('[*]Third bullet item');
    expect(bbcode).toContain('[/list]');
  });

  it('produces [olist] with [*] items', () => {
    const bbcode = getMarkdownBBCode();
    expect(bbcode).toContain('[olist]');
    expect(bbcode).toContain('[*]First numbered item');
    expect(bbcode).toContain('[*]Second numbered item');
    expect(bbcode).toContain('[*]Third numbered item');
    expect(bbcode).toContain('[/olist]');
  });

  it('produces [url=...] link', () => {
    expect(getMarkdownBBCode()).toContain('[url=https://example.com]');
  });

  it('produces [hr][/hr] horizontal rule', () => {
    expect(getMarkdownBBCode()).toContain('[hr][/hr]');
  });
});

describe('format parity: Confluence XHTML -> BBCode', () => {
  it('produces [h1] heading', () => {
    expect(getConfluenceBBCode()).toContain('[h1]Welcome to the Game[/h1]');
  });

  it('produces [h2] subheading', () => {
    expect(getConfluenceBBCode()).toContain('[h2]Getting Started[/h2]');
  });

  it('produces [b] bold text', () => {
    expect(getConfluenceBBCode()).toContain('[b]bold text[/b]');
  });

  it('produces [i] italic text', () => {
    expect(getConfluenceBBCode()).toContain('[i]italic text[/i]');
  });

  it('produces [list] with [*] items', () => {
    const bbcode = getConfluenceBBCode();
    expect(bbcode).toContain('[list]');
    expect(bbcode).toContain('[*]First bullet item');
    expect(bbcode).toContain('[*]Second bullet item');
    expect(bbcode).toContain('[*]Third bullet item');
    expect(bbcode).toContain('[/list]');
  });

  it('produces [olist] with [*] items', () => {
    const bbcode = getConfluenceBBCode();
    expect(bbcode).toContain('[olist]');
    expect(bbcode).toContain('[*]First numbered item');
    expect(bbcode).toContain('[*]Second numbered item');
    expect(bbcode).toContain('[*]Third numbered item');
    expect(bbcode).toContain('[/olist]');
  });

  it('produces [url=...] link', () => {
    expect(getConfluenceBBCode()).toContain('[url=https://example.com]');
  });

  it('produces [hr][/hr] horizontal rule', () => {
    expect(getConfluenceBBCode()).toContain('[hr][/hr]');
  });
});

describe('format parity: Google Docs HTML -> BBCode', () => {
  it('produces [h1] heading', () => {
    expect(getGoogleDocsBBCode()).toContain('[h1]Welcome to the Game[/h1]');
  });

  it('produces [h2] subheading', () => {
    expect(getGoogleDocsBBCode()).toContain('[h2]Getting Started[/h2]');
  });

  it('produces [b] bold text', () => {
    expect(getGoogleDocsBBCode()).toContain('[b]bold text[/b]');
  });

  it('produces [i] italic text', () => {
    expect(getGoogleDocsBBCode()).toContain('[i]italic text[/i]');
  });

  it('produces [list] with [*] items', () => {
    const bbcode = getGoogleDocsBBCode();
    expect(bbcode).toContain('[list]');
    expect(bbcode).toContain('[*]First bullet item');
    expect(bbcode).toContain('[*]Second bullet item');
    expect(bbcode).toContain('[*]Third bullet item');
    expect(bbcode).toContain('[/list]');
  });

  it('produces [olist] with [*] items', () => {
    const bbcode = getGoogleDocsBBCode();
    expect(bbcode).toContain('[olist]');
    expect(bbcode).toContain('[*]First numbered item');
    expect(bbcode).toContain('[*]Second numbered item');
    expect(bbcode).toContain('[*]Third numbered item');
    expect(bbcode).toContain('[/olist]');
  });

  it('produces [url=...] link', () => {
    expect(getGoogleDocsBBCode()).toContain('[url=https://example.com]');
  });

  it('produces [hr][/hr] horizontal rule', () => {
    expect(getGoogleDocsBBCode()).toContain('[hr][/hr]');
  });
});

describe('format parity: Plaintext -> BBCode', () => {
  it('produces heading tags for ALL-CAPS heading-like lines', () => {
    const bbcode = getPlaintextBBCode();
    // plaintextToMarkdown converts ALL-CAPS lines preceded/followed by blank lines to ## headings
    expect(bbcode).toContain('[h2]WELCOME TO THE GAME[/h2]');
    expect(bbcode).toContain('[h2]GETTING STARTED[/h2]');
  });

  it('produces [list] for dash-prefixed items', () => {
    const bbcode = getPlaintextBBCode();
    expect(bbcode).toContain('[list]');
    expect(bbcode).toContain('[*]First bullet item');
    expect(bbcode).toContain('[*]Second bullet item');
    expect(bbcode).toContain('[*]Third bullet item');
    expect(bbcode).toContain('[/list]');
  });

  it('produces [olist] for numbered items', () => {
    const bbcode = getPlaintextBBCode();
    expect(bbcode).toContain('[olist]');
    expect(bbcode).toContain('[*]First numbered item');
    expect(bbcode).toContain('[*]Second numbered item');
    expect(bbcode).toContain('[*]Third numbered item');
    expect(bbcode).toContain('[/olist]');
  });

  it('does NOT produce bold or italic (no formatting markers in plain text)', () => {
    const bbcode = getPlaintextBBCode();
    expect(bbcode).not.toContain('[b]bold text[/b]');
    expect(bbcode).not.toContain('[i]italic text[/i]');
  });

  it('does NOT produce links (no URL syntax in plain text)', () => {
    const bbcode = getPlaintextBBCode();
    expect(bbcode).not.toContain('[url=');
  });
});

describe('format parity: cross-format tag presence', () => {
  // Markdown, Confluence, and Google Docs should all produce the same set of tags
  const RICH_FORMATS = ['Markdown', 'Confluence', 'Google Docs'] as const;
  const RICH_BBCODE: Record<string, string> = {};

  // Compute once, reuse across tests
  RICH_BBCODE['Markdown'] = getMarkdownBBCode();
  RICH_BBCODE['Confluence'] = getConfluenceBBCode();
  RICH_BBCODE['Google Docs'] = getGoogleDocsBBCode();

  const EXPECTED_TAGS = [
    '[h1]',
    '[/h1]',
    '[h2]',
    '[/h2]',
    '[b]',
    '[/b]',
    '[i]',
    '[/i]',
    '[list]',
    '[/list]',
    '[olist]',
    '[/olist]',
    '[*]',
    '[url=',
    '[hr][/hr]',
  ];

  for (const tag of EXPECTED_TAGS) {
    it(`all rich formats produce ${tag}`, () => {
      for (const format of RICH_FORMATS) {
        expect(RICH_BBCODE[format]).toContain(tag);
      }
    });
  }
});

describe('format parity: content extraction', () => {
  // Strip all BBCode tags and compare the plain text content across formats.
  // The text content should match across Markdown, Confluence, and Google Docs.

  it('extracted text contains the same key phrases across all rich formats', () => {
    const mdText = normalizeWhitespace(stripBBCode(getMarkdownBBCode()));
    const confText = normalizeWhitespace(stripBBCode(getConfluenceBBCode()));
    const gdocText = normalizeWhitespace(stripBBCode(getGoogleDocsBBCode()));

    const KEY_PHRASES = [
      'Welcome to the Game',
      'Getting Started',
      'regular paragraph with some text',
      'bold text',
      'italic text',
      'First bullet item',
      'Second bullet item',
      'Third bullet item',
      'First numbered item',
      'Second numbered item',
      'Third numbered item',
      'That is all for now',
    ];

    for (const phrase of KEY_PHRASES) {
      expect(mdText).toContain(phrase);
      expect(confText).toContain(phrase);
      expect(gdocText).toContain(phrase);
    }
  });

  it('plaintext output preserves the same body text', () => {
    const ptText = normalizeWhitespace(stripBBCode(getPlaintextBBCode()));

    const BODY_PHRASES = [
      'regular paragraph with some text',
      'bold text',
      'italic text',
      'First bullet item',
      'Second bullet item',
      'Third bullet item',
      'First numbered item',
      'Second numbered item',
      'Third numbered item',
      'That is all for now',
    ];

    for (const phrase of BODY_PHRASES) {
      expect(ptText).toContain(phrase);
    }
  });
});
