// Confluence XHTML storage format to Steam BBCode converter
// Pure functions, uses browser-native DOMParser

import type { SteamContext } from './contexts';
import type { ConversionResult } from './converter';

/**
 * Convert Confluence XHTML storage format to Steam BBCode.
 *
 * Uses DOMParser to parse the XHTML into a DOM tree, then walks it
 * recursively to produce BBCode output. This runs in the browser
 * (both web build and Tauri webview) where DOMParser is always available.
 */
export function confluenceToBBCode(xhtml: string, context: SteamContext): ConversionResult {
  const notes: string[] = [];
  const parser = new DOMParser();

  // Wrap in a root element to ensure valid HTML for the parser
  const doc = parser.parseFromString(`<div>${xhtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;

  const bbcode = processNode(root, notes, context).trim();

  // Post-processing cleanup
  let cleaned = bbcode;
  // Collapse 3+ newlines to 2 (blank line)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Remove blank line between heading and following content (heading → single newline → content)
  cleaned = cleaned.replace(/(\[\/h[123]\])\n\n/g, '$1\n');
  // Consecutive images should have single newline between them
  cleaned = cleaned.replace(/(\[\/img\])\n\n(\[img\])/g, '$1\n$2');

  return { bbcode: cleaned.trim(), notes };
}

function processNode(node: Node, notes: string[], context: SteamContext): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // Handle Confluence-specific namespaced elements
  // DOMParser lowercases tag names and strips namespace colons in text/html mode
  if (tag === 'ac:image' || tag === 'ac-image') {
    return processConfluenceImage(el, notes);
  }
  if (tag === 'ac:link' || tag === 'ac-link') {
    return processConfluenceLink(el, notes);
  }
  if (tag === 'ac:structured-macro' || tag === 'ac-structured-macro') {
    return processConfluenceMacro(el, notes, context);
  }
  if (tag === 'ac:caption' || tag === 'ac-caption') {
    // Caption text follows the image on the next line
    return processChildren(el, notes, context).trim();
  }

  // Skip namespace-internal elements that shouldn't produce output directly
  if (tag.startsWith('ri:') || tag.startsWith('ri-')) {
    return '';
  }
  if (tag.startsWith('ac:') || tag.startsWith('ac-')) {
    // For unhandled ac: elements, just process children
    return processChildren(el, notes, context);
  }

  // Standard HTML elements
  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3': {
      const text = stripRedundantFormatting(getInlineText(el, notes, context));
      return `\n\n[${tag}]${text.trim()}[/${tag}]\n`;
    }

    case 'p': {
      const text = processChildren(el, notes, context).trim();
      if (!text) return '';
      return `\n${text}\n`;
    }

    case 'br':
      return '\n';

    case 'strong':
    case 'b':
      return `[b]${processChildren(el, notes, context)}[/b]`;

    case 'em':
    case 'i':
      return `[i]${processChildren(el, notes, context)}[/i]`;

    case 'u':
      return `[u]${processChildren(el, notes, context)}[/u]`;

    case 'del':
    case 's':
      return `[strike]${processChildren(el, notes, context)}[/strike]`;

    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = processChildren(el, notes, context);
      return `[url=${href}]${text}[/url]`;
    }

    case 'ul':
      return processUnorderedList(el, notes, context);

    case 'ol':
      return processOrderedList(el, notes, context);

    case 'li':
      return processListItem(el, notes, context);

    case 'table':
      return processTable(el, notes, context);

    case 'tr':
      return `[tr]${processChildren(el, notes, context)}[/tr]\n`;

    case 'td':
      return `[td]${processChildren(el, notes, context).trim()}[/td]`;

    case 'th':
      return `[th]${processChildren(el, notes, context).trim()}[/th]`;

    case 'code':
      return `[code]${el.textContent || ''}[/code]`;

    case 'pre':
      return `[code]${el.textContent || ''}[/code]`;

    case 'blockquote':
      return `[quote]${processChildren(el, notes, context).trim()}[/quote]`;

    case 'hr':
      return '\n[hr][/hr]\n';

    // Container elements — just process children
    case 'div':
    case 'span':
    case 'body':
    case 'html':
    case 'head':
      return processChildren(el, notes, context);

    default:
      return processChildren(el, notes, context);
  }
}

function processChildren(el: Element, notes: string[], context: SteamContext): string {
  let result = '';
  for (const child of Array.from(el.childNodes)) {
    result += processNode(child, notes, context);
  }
  return result;
}

/**
 * Get inline text content, processing inline formatting but stripping block elements.
 * Used for headings where we want to keep b/i/u but strip the text from any p wrappers.
 */
function getInlineText(el: Element, notes: string[], context: SteamContext): string {
  let result = '';
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || '';
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element;
      const childTag = childEl.tagName.toLowerCase();
      // For headings, process inline formatting normally
      if (['strong', 'b', 'em', 'i', 'u', 'del', 's', 'a', 'span'].includes(childTag)) {
        result += processNode(child, notes, context);
      } else {
        // For block elements inside headings, just get their text
        result += getInlineText(childEl, notes, context);
      }
    }
  }
  return result;
}

/**
 * Strip redundant bold/underline wrapping from heading text.
 * Confluence often wraps heading content in <strong><u>...</u></strong>.
 * Since headings are already visually prominent, strip these wrappers.
 */
function stripRedundantFormatting(text: string): string {
  let result = text;
  // Strip [b]...[/b] wrapper if it wraps the entire text
  const boldMatch = result.match(/^\[b\]([\s\S]*)\[\/b\]$/);
  if (boldMatch) result = boldMatch[1];
  // Strip [u]...[/u] wrapper if it wraps the entire text
  const underlineMatch = result.match(/^\[u\]([\s\S]*)\[\/u\]$/);
  if (underlineMatch) result = underlineMatch[1];
  return result;
}

function findByTagName(el: Element, ...names: string[]): Element | null {
  for (const name of names) {
    const found = el.getElementsByTagName(name);
    if (found.length > 0) return found[0];
  }
  return null;
}

function processConfluenceImage(el: Element, notes: string[]): string {
  // Find ri:attachment child for the filename
  const attachment = findByTagName(el, 'ri:attachment', 'ri-attachment');
  if (attachment) {
    const filename = attachment.getAttribute('ri:filename') || attachment.getAttribute('filename') || '';
    if (filename) {
      // Check for caption sibling
      const caption = findByTagName(el, 'ac:caption', 'ac-caption');
      const captionText = caption ? caption.textContent?.trim() || '' : '';

      if (!notes.some(n => n.includes('image attachment'))) {
        notes.push('Image attachments reference Confluence files — upload to Steam and update URLs');
      }

      let result = `\n[img]{placeholder:${filename}}[/img]`;
      if (captionText) {
        result += `\n${captionText}`;
      }
      return result + '\n';
    }
  }

  // Fallback: try ri:url
  const urlEl = findByTagName(el, 'ri:url', 'ri-url');
  if (urlEl) {
    const url = urlEl.getAttribute('ri:value') || urlEl.getAttribute('value') || '';
    if (url) return `\n[img]${url}[/img]\n`;
  }

  return '';
}

function processConfluenceLink(el: Element, notes: string[]): string {
  // ri:page for internal Confluence links
  const page = findByTagName(el, 'ri:page', 'ri-page');
  if (page) {
    const title = page.getAttribute('ri:content-title') || page.getAttribute('content-title') || '';
    const linkText = el.textContent?.trim() || title || 'link';
    notes.push(`Internal Confluence link to "${title}" — replace with Steam URL`);
    return `[url=]${linkText}[/url]`;
  }

  // ri:url for external links
  const urlEl = findByTagName(el, 'ri:url', 'ri-url');
  if (urlEl) {
    const url = urlEl.getAttribute('ri:value') || urlEl.getAttribute('value') || '';
    const linkText = el.textContent?.trim() || url;
    return `[url=${url}]${linkText}[/url]`;
  }

  return el.textContent || '';
}

function processConfluenceMacro(el: Element, notes: string[], context: SteamContext): string {
  const macroName = el.getAttribute('ac:name') || el.getAttribute('name') || '';

  switch (macroName) {
    case 'code': {
      // Find the plain-text-body
      const body = findByTagName(el, 'ac:plain-text-body', 'ac-plain-text-body');
      const code = body?.textContent || el.textContent || '';
      return `[code]${code.trim()}[/code]`;
    }

    case 'info':
    case 'warning':
    case 'note':
    case 'tip': {
      if (!notes.some(n => n.includes('Confluence panel'))) {
        notes.push(`Confluence panel macros (${macroName}) have no BBCode equivalent — converted to plain text`);
      }
      const body = findByTagName(el, 'ac:rich-text-body', 'ac-rich-text-body');
      return body ? processChildren(body, notes, context) : processChildren(el, notes, context);
    }

    case 'toc':
      notes.push('Table of Contents macro removed — no BBCode equivalent');
      return '';

    default:
      if (!notes.some(n => n.includes(macroName))) {
        notes.push(`Unsupported Confluence macro "${macroName}" — content preserved as plain text`);
      }
      return processChildren(el, notes, context);
  }
}

function processUnorderedList(el: Element, notes: string[], context: SteamContext): string {
  const items: string[] = ['[list]'];
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      items.push(processListItem(child, notes, context));
    }
  }
  items.push('[/list]');
  return items.join('\n') + '\n';
}

function processOrderedList(el: Element, notes: string[], context: SteamContext): string {
  const items: string[] = ['[olist]'];
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      items.push(processListItem(child, notes, context));
    }
  }
  items.push('[/olist]');
  return items.join('\n') + '\n';
}

/**
 * Process a list item. Confluence wraps list item text in <p> tags,
 * which we strip. Nested lists become nested [list] blocks.
 */
function processListItem(li: Element, notes: string[], context: SteamContext): string {
  let text = '';
  let nestedList = '';

  for (const child of Array.from(li.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent || '';
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const childEl = child as Element;
    const childTag = childEl.tagName.toLowerCase();

    if (childTag === 'ul') {
      nestedList += processUnorderedList(childEl, notes, context);
    } else if (childTag === 'ol') {
      nestedList += processOrderedList(childEl, notes, context);
    } else if (childTag === 'p') {
      // Strip the <p> wrapper, just use its inline content
      text += processChildren(childEl, notes, context).trim();
    } else {
      text += processNode(child, notes, context);
    }
  }

  const itemText = text.trim();
  if (nestedList) {
    return `[*]${itemText}\n${nestedList.trim()}`;
  }
  return `[*]${itemText}`;
}

function processTable(el: Element, notes: string[], context: SteamContext): string {
  let result = '\n[table]\n';
  const tbody = el.querySelector('tbody') || el;
  for (const child of Array.from(tbody.children)) {
    if (child.tagName.toLowerCase() === 'tr') {
      result += processNode(child, notes, context);
    }
  }
  result += '[/table]\n';
  return result;
}
