// Input format detection for multi-format support
// Pure function, no dependencies

export type InputFormat = 'markdown' | 'confluence' | 'google-docs' | 'plaintext';

/**
 * Detect the input format of pasted or loaded text.
 *
 * Heuristics (in priority order):
 * 1. Confluence XHTML: contains ac: or ri: namespace tags
 * 2. Google Docs HTML: contains docs-internal-guid wrapper
 * 3. Markdown: contains # headers, **bold**, [links](url), - lists, etc.
 * 4. Plain text: everything else (treated as markdown by the converter)
 */
export function detectFormat(text: string): InputFormat {
  if (!text || !text.trim()) return 'plaintext';

  // Confluence XHTML detection — look for Atlassian-specific namespace prefixes
  if (hasConfluenceMarkers(text)) return 'confluence';

  // Google Docs HTML detection — check for docs-internal-guid wrapper
  if (hasGoogleDocsMarkers(text)) return 'google-docs';

  // Markdown detection — look for common markdown syntax patterns
  if (hasMarkdownMarkers(text)) return 'markdown';

  return 'plaintext';
}

function hasConfluenceMarkers(text: string): boolean {
  // ac: namespace tags (ac:image, ac:structured-macro, ac:link, ac:caption, etc.)
  if (/<ac:[a-z-]+/i.test(text)) return true;

  // ri: namespace tags (ri:attachment, ri:page, ri:url, etc.)
  if (/<ri:[a-z-]+/i.test(text)) return true;

  // Confluence local-id attributes (present on nearly every element in both storage and rendered)
  if (/\blocal-id="[a-f0-9-]+"/.test(text)) return true;

  // Rendered clipboard: data-renderer-start-pos attribute
  if (/data-renderer-start-pos=/.test(text)) return true;

  // Rendered clipboard: mediaSingle/media data attributes with blob: Confluence URLs
  if (/data-node-type="media/.test(text)) return true;

  return false;
}

function hasGoogleDocsMarkers(text: string): boolean {
  // Google Docs clipboard HTML wraps content in a span/b with id="docs-internal-guid-*"
  if (/docs-internal-guid/i.test(text)) return true;

  // Google Docs also uses specific data attributes
  if (/data-docs-has-editors/i.test(text)) return true;

  return false;
}

function hasMarkdownMarkers(text: string): boolean {
  const lines = text.split('\n');
  let score = 0;
  const threshold = 2;

  for (const line of lines) {
    // ATX headers
    if (/^#{1,6}\s/.test(line)) { score += 2; break; }
    // Unordered list items
    if (/^\s*[-*+]\s/.test(line)) score++;
    // Ordered list items
    if (/^\s*\d+\.\s/.test(line)) score++;
    // Blockquotes
    if (/^>\s/.test(line)) score++;
    // Horizontal rules
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) score++;
    // Fenced code blocks
    if (/^```/.test(line)) { score += 2; break; }

    if (score >= threshold) break;
  }

  // Inline patterns (check a sample to avoid scanning huge docs)
  const sample = text.slice(0, 2000);

  // Bold — strong signal
  if (/\*\*[^*]+\*\*/.test(sample)) score += 2;
  // Links — strong signal (very specific syntax)
  if (/\[[^\]]+\]\([^)]+\)/.test(sample)) score += 2;
  // Images
  if (/!\[[^\]]*\]\([^)]+\)/.test(sample)) score += 2;
  // Inline code
  if (/`[^`\n]+`/.test(sample)) score++;

  return score >= threshold;
}
