// Google Docs HTML -> Markdown converter
// Normalizes Google Docs clipboard HTML into clean Markdown for the editor.
// Pure functions, browser-native DOMParser.
//
// Google Docs clipboard HTML characteristics:
// - Wrapper: <b id="docs-internal-guid-*" style="font-weight:normal">
// - Bold: <span style="font-weight:700"> (not <strong>)
// - Italic: <span style="font-style:italic"> (not <em>)
// - Strikethrough: <span style="text-decoration:line-through">
// - Headings: <p> with large font-size spans (no <h1>-<h6> tags)
// - Links: standard <a href="...">
// - Lists: <ul>/<ol> with <li> containing <p><span>

/**
 * Convert Google Docs clipboard HTML to clean Markdown.
 *
 * Returns { markdown, notes } matching the same interface as confluenceToMarkdown.
 */
export function googleDocsToMarkdown(html: string): { markdown: string; notes: string[] } {
  const notes: string[] = [];
  const parser = new DOMParser();

  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;

  // Strip the docs-internal-guid wrapper — walk its children directly
  const startNode = unwrapDocsGuid(root);
  const markdown = processGDocsNode(startNode, notes).trim();

  // Post-processing cleanup
  let cleaned = markdown;
  // Collapse 3+ newlines to 2 (blank line)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Remove trailing whitespace on lines
  cleaned = cleaned.replace(/[ \t]+$/gm, '');

  return { markdown: cleaned.trim(), notes };
}

/**
 * Check if an HTML string looks like Google Docs clipboard content.
 * Useful for paste handling before full parsing.
 */
export function isGoogleDocsHtml(html: string): boolean {
  return /docs-internal-guid/i.test(html);
}

// -- Internal helpers --

/**
 * Google Docs wraps all content in <b id="docs-internal-guid-*" style="font-weight:normal">.
 * Unwrap it so we process the actual content nodes.
 */
function unwrapDocsGuid(root: Element): Element {
  const guidWrapper = root.querySelector('[id^="docs-internal-guid"]');
  if (guidWrapper) return guidWrapper;
  return root;
}

/**
 * Infer heading level from font-size in a Google Docs paragraph.
 * Google Docs uses pt-based font sizes. Normal body text is ~11pt.
 * Returns 0 if not a heading, 1-3 for heading levels.
 */
function inferHeadingLevel(el: Element): number {
  // Check all child spans for font-size
  const spans = el.querySelectorAll('span[style]');
  let maxSize = 0;

  for (const span of Array.from(spans)) {
    const style = span.getAttribute('style') || '';
    const sizeMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)\s*pt/);
    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      if (size > maxSize) maxSize = size;
    }
  }

  // Map font sizes to heading levels
  // Google Docs defaults: Normal=11pt, H1=20pt, H2=16pt, H3=13.999pt
  if (maxSize >= 20) return 1;
  if (maxSize >= 16) return 2;
  if (maxSize >= 14) return 3;

  return 0;
}

/**
 * Check if a span has a specific style property set.
 */
function hasStyle(el: Element, property: string, value: string): boolean {
  const style = el.getAttribute('style') || '';
  return style.includes(`${property}:${value}`) || style.includes(`${property}: ${value}`);
}

function isBold(el: Element): boolean {
  return hasStyle(el, 'font-weight', '700') || hasStyle(el, 'font-weight', 'bold');
}

function isItalic(el: Element): boolean {
  return hasStyle(el, 'font-style', 'italic');
}

function isStrikethrough(el: Element): boolean {
  const style = el.getAttribute('style') || '';
  return style.includes('text-decoration:line-through') || style.includes('text-decoration: line-through');
}

function processGDocsNode(node: Node, notes: string[]): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'p': {
      const headingLevel = inferHeadingLevel(el);
      const text = processGDocsChildren(el, notes).trim();
      if (!text) return '\n';

      if (headingLevel > 0) {
        const prefix = '#'.repeat(headingLevel);
        return `\n${prefix} ${text}\n`;
      }

      return `\n${text}\n`;
    }

    case 'span': {
      const inner = processGDocsChildren(el, notes);
      if (!inner.trim()) return inner;

      let result = inner;

      // Apply formatting based on inline styles
      // Order: strikethrough wraps italic wraps bold (innermost first when nesting)
      if (isBold(el)) {
        result = `**${result}**`;
      }
      if (isItalic(el)) {
        result = `*${result}*`;
      }
      if (isStrikethrough(el)) {
        result = `~~${result}~~`;
      }

      return result;
    }

    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = processGDocsChildren(el, notes);
      if (!text.trim()) return '';
      // Google Docs wraps links in tracking redirects — try to extract the real URL
      const realUrl = extractGoogleRedirectUrl(href) || href;
      return `[${text}](${realUrl})`;
    }

    case 'ul':
      return processGDocsList(el, notes, false);

    case 'ol':
      return processGDocsList(el, notes, true);

    case 'li': {
      // List items are handled by processGDocsList
      const text = processGDocsChildren(el, notes).trim();
      return text;
    }

    case 'br':
      return '\n';

    case 'hr':
      return '\n---\n';

    case 'strong':
    case 'b': {
      // Google Docs sometimes uses <b> for the wrapper (id="docs-internal-guid")
      // with font-weight:normal. Only bold if no font-weight:normal override.
      const style = el.getAttribute('style') || '';
      const inner = processGDocsChildren(el, notes);
      if (style.includes('font-weight:normal') || style.includes('font-weight: normal')) {
        return inner;
      }
      return `**${inner}**`;
    }

    case 'em':
    case 'i': {
      const inner = processGDocsChildren(el, notes);
      return `*${inner}*`;
    }

    case 'img': {
      const src = el.getAttribute('src') || '';
      if (src && !src.startsWith('data:')) {
        return `![](${src})`;
      }
      // Embedded data: images from Google Docs — note it
      if (!notes.some(n => n.includes('embedded image'))) {
        notes.push('Embedded images from Google Docs cannot be transferred — re-add them manually');
      }
      return '';
    }

    case 'table':
      return processGDocsTable(el, notes);

    case 'tr':
    case 'td':
    case 'th':
    case 'tbody':
    case 'thead':
      return processGDocsChildren(el, notes);

    // Container elements — just process children
    case 'div':
    case 'body':
    case 'html':
    case 'head':
    case 'meta':
      return processGDocsChildren(el, notes);

    default:
      return processGDocsChildren(el, notes);
  }
}

function processGDocsChildren(el: Element, notes: string[]): string {
  let result = '';
  for (const child of Array.from(el.childNodes)) {
    result += processGDocsNode(child, notes);
  }
  return result;
}

function processGDocsList(el: Element, notes: string[], ordered: boolean): string {
  const items: string[] = [];
  let num = 1;

  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      const text = processGDocsChildren(child, notes).trim();
      if (ordered) {
        items.push(`${num}. ${text}`);
        num++;
      } else {
        items.push(`- ${text}`);
      }
    }
  }

  return '\n' + items.join('\n') + '\n';
}

function processGDocsTable(el: Element, notes: string[]): string {
  const tbody = el.querySelector('tbody') || el;
  const rows = Array.from(tbody.querySelectorAll('tr'));

  if (rows.length === 0) return '';

  const tableRows: string[][] = [];
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    tableRows.push(cells.map(cell => processGDocsChildren(cell, notes).trim()));
  }

  // Build markdown table
  let result = '\n';
  tableRows.forEach((row, i) => {
    result += '| ' + row.join(' | ') + ' |\n';
    if (i === 0) {
      result += '| ' + row.map(() => '---').join(' | ') + ' |\n';
    }
  });

  return result;
}

/**
 * Google Docs wraps links in a redirect:
 * https://www.google.com/url?q=https://example.com&sa=D&...
 * Extract the actual destination URL.
 */
function extractGoogleRedirectUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'www.google.com' && parsed.pathname === '/url') {
      const q = parsed.searchParams.get('q');
      if (q) return q;
    }
  } catch {
    // Not a valid URL — return null
  }
  return null;
}
