// BBCode to HTML renderer for Steam preview
// Approximates Steam's visual rendering

import { youtubeImageRegex, imageRegex } from './utils';

/** Sanitize URLs to prevent javascript: and other dangerous protocols */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Allow http, https, steam, and relative URLs
  if (/^(https?:|steam:|\/)/i.test(trimmed) || !trimmed.includes(':')) {
    return trimmed;
  }
  return '#';
}

/** Escape a string for safe use inside an HTML attribute value */
function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * A map from blob filename to data URL, used to resolve in-memory images
 * in the preview renderer.
 */
export type ImageDataUrlMap = Map<string, string>;

/**
 * Convert Steam BBCode to HTML for preview.
 * @param bbcode - The BBCode content to render
 * @param imageDataUrls - Optional map of blob:filename to data URL for in-memory images
 */
export function bbcodeToHTML(bbcode: string, imageDataUrls?: ImageDataUrlMap): string {
  let html = bbcode;

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;');
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi, '<h1 class="steam-h1">$1</h1>');
  html = html.replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, '<h2 class="steam-h2">$1</h2>');
  html = html.replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, '<h3 class="steam-h3">$1</h3>');

  // Horizontal rule
  html = html.replace(/\[hr\]\[\/hr\]/gi, '<hr class="steam-hr" />');

  // Basic formatting
  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
  html = html.replace(/\[strike\]([\s\S]*?)\[\/strike\]/gi, '<del>$1</del>');

  // Code (block-level, Steam style)
  html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre class="steam-code"><code>$1</code></pre>');

  // Links — sanitize URL protocol to prevent javascript: XSS
  html = html.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_m, url: string, text: string) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" class="steam-link" target="_blank" rel="noopener">${text}</a>`;
  });
  html = html.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_m, url: string) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" class="steam-link" target="_blank" rel="noopener">${safeUrl}</a>`;
  });

  // Images — placeholder cards for Confluence attachments, blob images, normal img for URLs
  html = html.replace(/\[img\]([\s\S]*?)\[\/img\]/gi, (_match, src: string) => {
    // Placeholder images (Confluence attachments)
    const placeholderMatch = src.match(/^\{(?:image:\s*|placeholder:)(.+)\}$/);
    if (placeholderMatch) {
      const filename = placeholderMatch[1]
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<div class="steam-img-placeholder"><div class="steam-img-placeholder-icon">&#x1F5BC;</div><div class="steam-img-placeholder-filename">${filename}</div><div class="steam-img-placeholder-hint">Enter Steam URL in Images panel</div></div>`;
    }

    // In-memory blob images (drag-and-drop / paste)
    const blobMatch = src.match(/^blob:(.+)$/);
    if (blobMatch) {
      const filename = blobMatch[1];
      const dataUrl = imageDataUrls?.get(filename);
      if (dataUrl) {
        const safeSrc = escapeHtmlAttr(dataUrl);
        const safeFilename = filename
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<img src="${safeSrc}" class="steam-img" alt="${safeFilename}" loading="lazy" />`;
      }
      // No data URL available — show placeholder card
      const safeFilename = filename
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<div class="steam-img-placeholder"><div class="steam-img-placeholder-icon">&#x1F5BC;</div><div class="steam-img-placeholder-filename">${safeFilename}</div><div class="steam-img-placeholder-hint">Enter Steam URL in Images panel</div></div>`;
    }

    const safeSrc = escapeHtmlAttr(sanitizeUrl(src));
    return `<img src="${safeSrc}" class="steam-img" alt="" loading="lazy" />`;
  });

  // YouTube videos (previewyoutube tag)
  html = html.replace(
    /\[previewyoutube=([a-zA-Z0-9_-]+)\]\[\/previewyoutube\]/gi,
    '<div class="steam-video"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>'
  );

  // Quotes
  html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote class="steam-quote">$1</blockquote>');

  // Spoilers
  html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<details class="steam-spoiler"><summary>Spoiler</summary><div>$1</div></details>');

  // Lists
  html = html.replace(/\[list\]/gi, '<ul class="steam-list">');
  html = html.replace(/\[\/list\]/gi, '</ul>');
  html = html.replace(/\[olist\]/gi, '<ol class="steam-olist">');
  html = html.replace(/\[\/olist\]/gi, '</ol>');

  // List items
  html = html.replace(/\[\*\]([^\[]*?)(?=\[\*\]|\[\/list\]|\[\/olist\]|\[list\]|\[olist\]|$)/gi, '<li>$1</li>');

  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br />');

  // Clean up <br> after/before block elements
  const blockTags = ['h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'details', 'hr'];
  blockTags.forEach(tag => {
    html = html.replace(new RegExp(`(</${tag}>)<br />`, 'gi'), '$1');
    html = html.replace(new RegExp(`<br />(<${tag})`, 'gi'), '$1');
  });
  html = html.replace(/<br \/><li>/gi, '<li>');
  html = html.replace(/(<hr[^>]*>)<br \/>/gi, '$1');

  return html;
}

/**
 * Extract media URLs from markdown for preview
 */
export interface MediaItem {
  type: 'image' | 'youtube';
  url: string;
  id?: string;
}

export function extractMedia(markdown: string): MediaItem[] {
  const media: MediaItem[] = [];

  // YouTube URLs
  const youtubeRe = youtubeImageRegex();
  let match;
  while ((match = youtubeRe.exec(markdown)) !== null) {
    media.push({ type: 'youtube', url: match[2], id: match[3] });
  }

  // Regular images (excluding YouTube)
  const imgRe = imageRegex();
  while ((match = imgRe.exec(markdown)) !== null) {
    media.push({ type: 'image', url: match[2] });
  }

  return media;
}
