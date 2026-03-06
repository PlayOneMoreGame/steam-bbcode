// Confluence XHTML → Markdown converter
// Normalizes Confluence HTML (both storage format and rendered clipboard)
// into clean Markdown for the editor. Pure functions, browser-native DOMParser.

import type { SteamContext } from './contexts';

// Output format for the DOM walker (markdown is the only public path;
// bbcode kept internally for the walker's format-aware branches)
type OutputFormat = 'bbcode' | 'markdown';

/**
 * Convert Confluence XHTML to clean Markdown for the editor.
 *
 * Uses DOMParser to parse the XHTML into a DOM tree, then walks it
 * recursively to produce readable Markdown. The markdownToBBCode converter
 * then generates BBCode from this for the output panel.
 *
 * Handles both Confluence storage format (ac:/ri: namespaced tags) and
 * rendered clipboard HTML (data-renderer-start-pos, blob: URLs, etc.).
 */
export function confluenceToMarkdown(xhtml: string, context: SteamContext): { markdown: string; notes: string[] } {
  const notes: string[] = [];
  const parser = new DOMParser();

  const doc = parser.parseFromString(`<div>${xhtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;

  const markdown = processNode(root, notes, context, 'markdown').trim();

  // Post-processing cleanup
  let cleaned = markdown;
  // Collapse 3+ newlines to 2 (blank line)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Consecutive image drop markers should have single newline between them
  cleaned = cleaned.replace(/(<<<\*\*)\n\n(\*\*>>>)/g, '$1\n$2');

  return { markdown: cleaned.trim(), notes };
}

function processNode(node: Node, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
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
    return processConfluenceImage(el, notes, fmt);
  }
  if (tag === 'ac:link' || tag === 'ac-link') {
    return processConfluenceLink(el, notes, fmt);
  }
  if (tag === 'ac:structured-macro' || tag === 'ac-structured-macro') {
    return processConfluenceMacro(el, notes, context, fmt);
  }
  if (tag === 'ac:caption' || tag === 'ac-caption') {
    // Caption text follows the image on the next line
    return processChildren(el, notes, context, fmt).trim();
  }

  // Skip namespace-internal elements that shouldn't produce output directly
  if (tag.startsWith('ri:') || tag.startsWith('ri-')) {
    return '';
  }
  if (tag.startsWith('ac:') || tag.startsWith('ac-')) {
    // For unhandled ac: elements, just process children
    return processChildren(el, notes, context, fmt);
  }

  // Rendered clipboard: media wrapper div with data-file-name
  if (tag === 'div') {
    const nodeType = el.getAttribute('data-node-type');

    if (nodeType === 'mediaSingle') {
      return processRenderedMedia(el, notes, fmt);
    }

    // Skip media inner divs — handled by processRenderedMedia
    if (nodeType === 'media' || el.getAttribute('data-type') === 'file') {
      return '';
    }

    // Caption divs — handled by processRenderedMedia
    if (el.getAttribute('data-media-caption') === 'true') {
      return '';
    }

    return processChildren(el, notes, context, fmt);
  }

  // Standard HTML elements — output depends on format
  const isMd = fmt === 'markdown';

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3': {
      const text = stripRedundantFormatting(getInlineText(el, notes, context, fmt), fmt);
      if (isMd) {
        const level = tag === 'h1' ? '#' : tag === 'h2' ? '##' : '###';
        return `\n\n${level} ${text.trim()}\n`;
      }
      return `\n\n[${tag}]${text.trim()}[/${tag}]\n`;
    }

    case 'p': {
      const text = processChildren(el, notes, context, fmt).trim();
      if (!text) return '';
      return `\n${text}\n`;
    }

    case 'br':
      return '\n';

    case 'strong':
    case 'b': {
      const inner = processChildren(el, notes, context, fmt);
      return isMd ? `**${inner}**` : `[b]${inner}[/b]`;
    }

    case 'em':
    case 'i': {
      const inner = processChildren(el, notes, context, fmt);
      return isMd ? `*${inner}*` : `[i]${inner}[/i]`;
    }

    case 'u':
      // Markdown has no underline — just pass through text
      return isMd ? processChildren(el, notes, context, fmt) : `[u]${processChildren(el, notes, context, fmt)}[/u]`;

    case 'del':
    case 's': {
      const inner = processChildren(el, notes, context, fmt);
      return isMd ? `~~${inner}~~` : `[strike]${inner}[/strike]`;
    }

    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = processChildren(el, notes, context, fmt);
      return isMd ? `[${text}](${href})` : `[url=${href}]${text}[/url]`;
    }

    case 'ul':
      return processUnorderedList(el, notes, context, fmt);

    case 'ol':
      return processOrderedList(el, notes, context, fmt);

    case 'li':
      return processListItem(el, notes, context, fmt);

    case 'table':
      return processTable(el, notes, context, fmt);

    case 'tr':
      return isMd
        ? `| ${processChildren(el, notes, context, fmt)} |\n`
        : `[tr]${processChildren(el, notes, context, fmt)}[/tr]\n`;

    case 'td':
    case 'th': {
      const cell = processChildren(el, notes, context, fmt).trim();
      return isMd ? `${cell} | ` : `[${tag}]${cell}[/${tag}]`;
    }

    case 'code':
      return isMd ? `\`${el.textContent || ''}\`` : `[code]${el.textContent || ''}[/code]`;

    case 'pre': {
      const code = el.textContent || '';
      return isMd ? `\n\`\`\`\n${code}\n\`\`\`\n` : `[code]${code}[/code]`;
    }

    case 'blockquote': {
      if (isMd) {
        const inner = processChildren(el, notes, context, fmt).trim();
        return '\n' + inner.split('\n').map(line => `> ${line}`).join('\n') + '\n';
      }
      return `[quote]${processChildren(el, notes, context, fmt).trim()}[/quote]`;
    }

    case 'img': {
      // Inside a mediaSingle wrapper, the img is handled by processRenderedMedia
      const parent = el.parentElement;
      if (parent && (parent.getAttribute('data-node-type') === 'media' || parent.getAttribute('data-type') === 'file')) {
        return '';
      }

      // Handle <img> tags from rendered Confluence view (browser clipboard)
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';

      // blob: URLs are never valid outside the browser session
      if (src.startsWith('blob:')) {
        const filename = alt || 'image.png';
        addImageNote(notes);
        return `\n${imageDropMarker(filename, fmt)}\n`;
      }

      if (isConfluenceUrl(src)) {
        const filename = extractFilenameFromUrl(src) || alt || 'image.png';
        addImageNote(notes);
        return `\n${imageDropMarker(filename, fmt)}\n`;
      }
      // Non-Confluence URL — pass through
      if (src) return isMd ? `\n![](${src})\n` : `\n[img]${src}[/img]\n`;
      return '';
    }

    case 'hr':
      return isMd ? '\n---\n' : '\n[hr][/hr]\n';

    // Container elements — just process children
    case 'meta':
      return '';

    case 'span':
    case 'body':
    case 'html':
    case 'head':
      return processChildren(el, notes, context, fmt);

    default:
      return processChildren(el, notes, context, fmt);
  }
}

function processChildren(el: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
  let result = '';
  for (const child of Array.from(el.childNodes)) {
    result += processNode(child, notes, context, fmt);
  }
  return result;
}

/**
 * Get inline text content, processing inline formatting but stripping block elements.
 * Used for headings where we want to keep b/i/u but strip the text from any p wrappers.
 */
function getInlineText(el: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
  let result = '';
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || '';
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element;
      const childTag = childEl.tagName.toLowerCase();
      if (['strong', 'b', 'em', 'i', 'u', 'del', 's', 'a', 'span'].includes(childTag)) {
        result += processNode(child, notes, context, fmt);
      } else {
        result += getInlineText(childEl, notes, context, fmt);
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
function stripRedundantFormatting(text: string, fmt: OutputFormat = 'bbcode'): string {
  let result = text;
  if (fmt === 'markdown') {
    // Strip **...** wrapper
    const boldMatch = result.match(/^\*\*([\s\S]*)\*\*$/);
    if (boldMatch) result = boldMatch[1];
  } else {
    // Strip [b]...[/b] wrapper if it wraps the entire text
    const boldMatch = result.match(/^\[b\]([\s\S]*)\[\/b\]$/);
    if (boldMatch) result = boldMatch[1];
    // Strip [u]...[/u] wrapper if it wraps the entire text
    const underlineMatch = result.match(/^\[u\]([\s\S]*)\[\/u\]$/);
    if (underlineMatch) result = underlineMatch[1];
  }
  return result;
}

function findByTagName(el: Element, ...names: string[]): Element | null {
  for (const name of names) {
    const found = el.getElementsByTagName(name);
    if (found.length > 0) return found[0];
  }
  return null;
}

/** Format an image drop marker — visible, searchable, harmless if left in Steam */
function imageDropMarker(filename: string, fmt: OutputFormat = 'bbcode'): string {
  if (fmt === 'markdown') {
    return `**>>> Drop image: ${filename} <<<**`;
  }
  return `[b]>>> Drop image: ${filename} <<<[/b]`;
}

function addImageNote(notes: string[]): void {
  if (!notes.some(n => n.includes('image'))) {
    notes.push('Images marked with >>> Drop image <<< — upload to Steam and drag into position');
  }
}

/**
 * Process rendered clipboard media wrapper.
 * Structure: <div data-node-type="mediaSingle">
 *              <div data-file-name="x.gif" data-node-type="media"><img src="blob:..."></div>
 *              <div data-media-caption="true">Caption text</div>
 *            </div>
 */
function processRenderedMedia(el: Element, notes: string[], fmt: OutputFormat = 'bbcode'): string {
  const mediaDiv = el.querySelector('[data-file-name]');
  if (!mediaDiv) return '';

  const filename = mediaDiv.getAttribute('data-file-name') || mediaDiv.getAttribute('data-alt') || 'image.png';
  addImageNote(notes);

  let result = `\n${imageDropMarker(filename, fmt)}`;

  // Check for caption
  const captionDiv = el.querySelector('[data-media-caption]');
  if (captionDiv) {
    const captionText = captionDiv.textContent?.trim() || '';
    if (captionText) {
      result += `\n${captionText}`;
    }
  }

  return result + '\n';
}

function processConfluenceImage(el: Element, notes: string[], fmt: OutputFormat = 'bbcode'): string {
  const attachment = findByTagName(el, 'ri:attachment', 'ri-attachment');
  if (attachment) {
    const filename = attachment.getAttribute('ri:filename') || attachment.getAttribute('filename') || '';
    if (filename) {
      const caption = findByTagName(el, 'ac:caption', 'ac-caption');
      const captionText = caption ? caption.textContent?.trim() || '' : '';

      addImageNote(notes);

      let result = `\n${imageDropMarker(filename, fmt)}`;
      if (captionText) {
        result += `\n${captionText}`;
      }
      return result + '\n';
    }
  }

  const urlEl = findByTagName(el, 'ri:url', 'ri-url');
  if (urlEl) {
    const url = urlEl.getAttribute('ri:value') || urlEl.getAttribute('value') || '';
    if (url) {
      if (isConfluenceUrl(url)) {
        const filename = extractFilenameFromUrl(url) || 'image.png';
        addImageNote(notes);
        return `\n${imageDropMarker(filename, fmt)}\n`;
      }
      return fmt === 'markdown' ? `\n![](${url})\n` : `\n[img]${url}[/img]\n`;
    }
  }

  return '';
}

function processConfluenceLink(el: Element, notes: string[], fmt: OutputFormat = 'bbcode'): string {
  const page = findByTagName(el, 'ri:page', 'ri-page');
  if (page) {
    const title = page.getAttribute('ri:content-title') || page.getAttribute('content-title') || '';
    const linkText = el.textContent?.trim() || title || 'link';
    notes.push(`Internal Confluence link to "${title}" — replace with Steam URL`);
    return fmt === 'markdown' ? `[${linkText}]()` : `[url=]${linkText}[/url]`;
  }

  const urlEl = findByTagName(el, 'ri:url', 'ri-url');
  if (urlEl) {
    const url = urlEl.getAttribute('ri:value') || urlEl.getAttribute('value') || '';
    const linkText = el.textContent?.trim() || url;
    return fmt === 'markdown' ? `[${linkText}](${url})` : `[url=${url}]${linkText}[/url]`;
  }

  return el.textContent || '';
}

function processConfluenceMacro(el: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
  const macroName = el.getAttribute('ac:name') || el.getAttribute('name') || '';

  switch (macroName) {
    case 'code': {
      const body = findByTagName(el, 'ac:plain-text-body', 'ac-plain-text-body');
      const code = body?.textContent || el.textContent || '';
      if (fmt === 'markdown') {
        return `\n\`\`\`\n${code.trim()}\n\`\`\`\n`;
      }
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
      return body ? processChildren(body, notes, context, fmt) : processChildren(el, notes, context, fmt);
    }

    case 'toc':
      notes.push('Table of Contents macro removed — no BBCode equivalent');
      return '';

    default:
      if (!notes.some(n => n.includes(macroName))) {
        notes.push(`Unsupported Confluence macro "${macroName}" — content preserved as plain text`);
      }
      return processChildren(el, notes, context, fmt);
  }
}

function processUnorderedList(el: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
  if (fmt === 'markdown') {
    const items: string[] = [];
    for (const child of Array.from(el.children)) {
      if (child.tagName.toLowerCase() === 'li') {
        items.push(processListItem(child, notes, context, fmt));
      }
    }
    return '\n' + items.join('\n') + '\n';
  }
  const items: string[] = ['[list]'];
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      items.push(processListItem(child, notes, context, fmt));
    }
  }
  items.push('[/list]');
  return items.join('\n') + '\n';
}

function processOrderedList(el: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
  if (fmt === 'markdown') {
    const items: string[] = [];
    let num = 1;
    for (const child of Array.from(el.children)) {
      if (child.tagName.toLowerCase() === 'li') {
        const text = processListItem(child, notes, context, fmt);
        // Replace the leading `- ` with `N. `
        items.push(text.replace(/^- /, `${num}. `));
        num++;
      }
    }
    return '\n' + items.join('\n') + '\n';
  }
  const items: string[] = ['[olist]'];
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      items.push(processListItem(child, notes, context, fmt));
    }
  }
  items.push('[/olist]');
  return items.join('\n') + '\n';
}

/**
 * Collect flat [*] items from a nested list, without [list]/[/list] wrappers.
 * Used to flatten nested lists in rendered clipboard output.
 */
function collectFlatListItems(el: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string[] {
  const items: string[] = [];
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      items.push(...collectListItemParts(child, notes, context, fmt));
    }
  }
  return items;
}

/**
 * Collect parts from a single list item, flattening any nested lists.
 * Returns an array of lines (each starting with [*]).
 */
function collectListItemParts(li: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string[] {
  const isMd = fmt === 'markdown';
  const prefix = isMd ? '- ' : '[*]';
  const lines: string[] = [];
  const textParts: string[] = [];

  for (const child of Array.from(li.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent || '';
      if (t.trim()) textParts.push(t.trim());
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const childEl = child as Element;
    const childTag = childEl.tagName.toLowerCase();

    if (childTag === 'ul' || childTag === 'ol') {
      // Flatten: emit current text as a line, then collect nested items
      if (textParts.length > 0) {
        lines.push(`${prefix}${textParts.join('\n')}`);
        textParts.length = 0;
      }
      lines.push(...collectFlatListItems(childEl, notes, context, fmt));
    } else if (childTag === 'div' && childEl.getAttribute('data-node-type') === 'mediaSingle') {
      const mediaText = processRenderedMedia(childEl, notes, fmt).trim();
      textParts.push(mediaText);
    } else if (childTag === 'p') {
      const pText = processChildren(childEl, notes, context, fmt).trim();
      if (pText) textParts.push(pText);
    } else {
      const nodeText = processNode(child, notes, context, fmt);
      if (nodeText.trim()) textParts.push(nodeText.trim());
    }
  }

  // Emit any remaining text
  if (textParts.length > 0) {
    lines.push(`${prefix}${textParts.join('\n')}`);
  }

  return lines;
}

/**
 * Process a list item. Confluence wraps list item text in <p> tags,
 * which we strip. Nested lists are flattened (Steam doesn't render nested lists well).
 * Rendered clipboard may include mediaSingle divs (images) inside list items.
 */
function processListItem(li: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
  const parts = collectListItemParts(li, notes, context, fmt);
  return parts.join('\n');
}

function processTable(el: Element, notes: string[], context: SteamContext, fmt: OutputFormat = 'bbcode'): string {
  const isMd = fmt === 'markdown';
  const tbody = el.querySelector('tbody') || el;
  const rows = Array.from(tbody.children).filter(c => c.tagName.toLowerCase() === 'tr');

  if (isMd) {
    // Markdown table
    let result = '\n';
    rows.forEach((row, i) => {
      result += processNode(row, notes, context, fmt);
      // Add separator after header row
      if (i === 0) {
        const cols = row.children.length;
        result += '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |\n';
      }
    });
    return result;
  }

  let result = '\n[table]\n';
  for (const row of rows) {
    result += processNode(row, notes, context, fmt);
  }
  result += '[/table]\n';
  return result;
}

/** Check if a URL points to a Confluence instance (auth-protected, won't work externally) */
function isConfluenceUrl(url: string): boolean {
  return /atlassian\.net\/wiki|\/wiki\/download\/|\/wiki\/pages\/viewpageattachments|\/rest\/documentConversion|confluence.*\/download\/attachments/i.test(url);
}

/** Extract a filename from a Confluence attachment URL */
function extractFilenameFromUrl(url: string): string {
  try {
    // Try to get filename from URL path or query params
    const decoded = decodeURIComponent(url);
    // Match /filename.ext at end of path or in query params
    const filenameMatch = decoded.match(/(?:\/|=)([^/?=&]+\.\w{2,4})(?:\?|$|&)/);
    if (filenameMatch) return filenameMatch[1];
    // Fallback: last path segment
    const pathMatch = decoded.match(/\/([^/?]+)$/);
    if (pathMatch) return pathMatch[1];
  } catch {
    // decodeURIComponent can throw on malformed URLs
  }
  return '';
}
