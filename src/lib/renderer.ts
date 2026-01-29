// BBCode to HTML renderer for Steam preview
// Approximates Steam's visual rendering

/**
 * Convert Steam BBCode to HTML for preview
 */
export function bbcodeToHTML(bbcode: string): string {
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

  // Links
  html = html.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" class="steam-link" target="_blank" rel="noopener">$2</a>');
  html = html.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" class="steam-link" target="_blank" rel="noopener">$1</a>');

  // Images
  html = html.replace(/\[img\]([\s\S]*?)\[\/img\]/gi, '<img src="$1" class="steam-img" alt="" loading="lazy" />');

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
  const youtubeRegex = /!\[([^\]]*)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)[^)]*)\)/g;
  let match;
  while ((match = youtubeRegex.exec(markdown)) !== null) {
    media.push({ type: 'youtube', url: match[2], id: match[3] });
  }

  // Regular images (excluding YouTube)
  const imgRegex = /!\[([^\]]*)\]\((?!https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be))([^)]+)\)/g;
  while ((match = imgRegex.exec(markdown)) !== null) {
    media.push({ type: 'image', url: match[2] });
  }

  return media;
}
