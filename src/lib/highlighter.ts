// Syntax highlighting for Markdown and BBCode

export interface HighlightToken {
  type: string;
  start: number;
  end: number;
}

/**
 * Tokenize Markdown for syntax highlighting
 */
export function tokenizeMarkdown(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  
  const patterns: [RegExp, string][] = [
    // Headers
    [/^(#{1,6})\s+(.+)$/gm, 'md-header'],
    // Bold
    [/\*\*([^*]+)\*\*/g, 'md-bold'],
    [/__([^_]+)__/g, 'md-bold'],
    // Italic
    [/(?<![*_])\*([^*]+)\*(?![*_])/g, 'md-italic'],
    [/(?<![*_])_([^_]+)_(?![*_])/g, 'md-italic'],
    // Strikethrough
    [/~~([^~]+)~~/g, 'md-strike'],
    // Code blocks
    [/```[\s\S]*?```/g, 'md-codeblock'],
    // Inline code
    [/`[^`\n]+`/g, 'md-code'],
    // Links
    [/\[([^\]]+)\]\(([^)]+)\)/g, 'md-link'],
    // Images
    [/!\[([^\]]*)\]\(([^)]+)\)/g, 'md-image'],
    // Blockquotes
    [/^>\s+.+$/gm, 'md-quote'],
    // Horizontal rules
    [/^(-{3,}|\*{3,}|_{3,})$/gm, 'md-hr'],
    // List items
    [/^[\s]*[-*+]\s+/gm, 'md-list'],
    [/^[\s]*\d+\.\s+/gm, 'md-list'],
  ];

  for (const [pattern, type] of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return tokens.sort((a, b) => a.start - b.start);
}

/**
 * Tokenize BBCode for syntax highlighting
 */
export function tokenizeBBCode(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  
  // Match all BBCode tags
  const tagPattern = /\[(\/?)(h[123]|b|i|u|strike|code|quote|list|olist|table|tr|td|img|url|spoiler|hr|previewyoutube)(?:=[^\]]*)?\]/gi;
  
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    
    let type = 'bb-tag';
    if (['h1', 'h2', 'h3'].includes(tagName)) {
      type = 'bb-header';
    } else if (['b', 'i', 'u', 'strike'].includes(tagName)) {
      type = 'bb-format';
    } else if (['list', 'olist'].includes(tagName)) {
      type = 'bb-list';
    } else if (['url', 'img'].includes(tagName)) {
      type = 'bb-link';
    } else if (tagName === 'code') {
      type = 'bb-code';
    }
    
    tokens.push({
      type: isClosing ? `${type} bb-closing` : type,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  
  // Match list item markers
  const listItemPattern = /\[\*\]/g;
  while ((match = listItemPattern.exec(text)) !== null) {
    tokens.push({
      type: 'bb-list-item',
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens.sort((a, b) => a.start - b.start);
}

/**
 * Apply syntax highlighting to text
 * Returns HTML with spans for styling
 */
export function applyHighlighting(text: string, tokens: HighlightToken[]): string {
  if (tokens.length === 0) {
    return escapeHtml(text);
  }

  const result: string[] = [];
  let lastIndex = 0;

  // Filter out overlapping tokens, keeping the first one
  const nonOverlapping: HighlightToken[] = [];
  for (const token of tokens) {
    const overlaps = nonOverlapping.some(
      t => (token.start >= t.start && token.start < t.end) ||
           (token.end > t.start && token.end <= t.end)
    );
    if (!overlaps) {
      nonOverlapping.push(token);
    }
  }

  for (const token of nonOverlapping) {
    // Add unhighlighted text before this token
    if (token.start > lastIndex) {
      result.push(escapeHtml(text.slice(lastIndex, token.start)));
    }
    
    // Add highlighted token
    const tokenText = escapeHtml(text.slice(token.start, token.end));
    result.push(`<span class="${token.type}">${tokenText}</span>`);
    
    lastIndex = token.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(escapeHtml(text.slice(lastIndex)));
  }

  return result.join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
