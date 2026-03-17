// Markdown to Steam BBCode converter
// Pure functions, no React dependencies

import type { SteamContext } from './contexts';
import { youtubeImageRegex, imageRegex } from './utils';

export interface ConversionResult {
  bbcode: string;
  notes: string[];
}

/**
 * Convert Markdown to Steam BBCode
 */
export function markdownToBBCode(markdown: string, context: SteamContext): ConversionResult {
  let result = markdown;
  const notes: string[] = [];

  // Extract fenced code blocks FIRST to protect their contents from
  // header/list/inline conversions (fixes SMD-4384)
  const codeBlocks: string[] = [];
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push((code as string).trim());
    return `\x00CODEBLOCK${index}\x00`;
  });

  // Headers (must be done before other inline processing)
  result = result.replace(/^### (.+)$/gm, '[h3]$1[/h3]');
  result = result.replace(/^## (.+)$/gm, '[h2]$1[/h2]');
  result = result.replace(/^# (.+)$/gm, '[h1]$1[/h1]');

  // Horizontal rules (before lists to avoid conflict with ---)
  result = result.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '[hr][/hr]');

  // Lists - process EARLY before italic conversion to avoid * conflicts
  result = processLists(result);

  // Inline code → [b] (Steam has no inline code!)
  const inlineCodeMatches = result.match(/`[^`\n]+`/g) || [];
  if (inlineCodeMatches.length > 0) {
    notes.push(`Converted ${inlineCodeMatches.length} inline code span(s) to [b] (Steam has no inline code)`);
  }
  result = result.replace(/`([^`\n]+)`/g, '[b]$1[/b]');

  // Images (must be before links)
  // Extract video URLs (YouTube, Steam)
  result = processMedia(result, context, notes);

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[url=$2]$1[/url]');

  // Bold (** or __) - use lazy matching to handle nested formatting
  result = result.replace(/\*\*(.+?)\*\*/g, '[b]$1[/b]');
  result = result.replace(/__(.+?)__/g, '[b]$1[/b]');

  // Italic (* or _) - must come after bold, careful not to match inside words
  result = result.replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, '[i]$1[/i]');
  result = result.replace(/(?<![_\w])_([^_\n]+)_(?![_\w])/g, '[i]$1[/i]');

  // Strikethrough
  result = result.replace(/~~([^~]+)~~/g, '[strike]$1[/strike]');

  // Blockquotes (simple single-line)
  result = result.replace(/^> (.+)$/gm, '[quote]$1[/quote]');

  // Merge consecutive quotes
  result = result.replace(/\[\/quote\]\n\[quote\]/g, '\n');

  // Reinsert code blocks
  result = result.replace(/\x00CODEBLOCK(\d+)\x00/g, (_match, index) => {
    return `[code]${codeBlocks[parseInt(index, 10)]}[/code]`;
  });

  return { bbcode: result, notes };
}

/**
 * Process images and videos from Markdown
 */
function processMedia(text: string, context: SteamContext, notes: string[]): string {
  let result = text;

  // YouTube URLs in image syntax or raw
  const youtubeMatches = result.match(youtubeImageRegex()) || [];
  
  if (youtubeMatches.length > 0) {
    if (context === 'forums' || context === 'reviews') {
      notes.push(`Found ${youtubeMatches.length} YouTube video(s). Videos are not supported in ${context}.`);
    } else {
      notes.push(`Found ${youtubeMatches.length} YouTube video(s). Use [previewyoutube] for Steam embedding.`);
    }
  }

  // Convert YouTube links to previewyoutube tags
  result = result.replace(
    youtubeImageRegex(),
    '[previewyoutube=$3;full][/previewyoutube]'
  );

  // Regular images
  const imgMatches = result.match(imageRegex()) || [];
  
  if (imgMatches.length > 0) {
    if (context === 'guides') {
      notes.push(`Found ${imgMatches.length} image(s). In guides, upload images first and use [previewimg] tags.`);
    } else if (context === 'reviews') {
      notes.push(`Found ${imgMatches.length} image(s). Images are not supported in reviews.`);
    }
  }

  // Convert regular images
  result = result.replace(
    imageRegex(),
    '[img]$2[/img]'
  );

  return result;
}

/**
 * Process Markdown lists to BBCode
 * Keeps formatting tight to avoid Steam parsing issues
 */
function processLists(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  for (const line of lines) {
    const unorderedMatch = line.match(/^[\s]*[-*+] (.+)$/);
    const orderedMatch = line.match(/^[\s]*\d+\. (.+)$/);

    if (unorderedMatch) {
      if (!inUnorderedList && !inOrderedList) {
        result.push('[list]');
        inUnorderedList = true;
      } else if (inOrderedList) {
        result.push('[/olist]');
        result.push('[list]');
        inOrderedList = false;
        inUnorderedList = true;
      }
      result.push(`[*]${unorderedMatch[1]}`);
    } else if (orderedMatch) {
      if (!inOrderedList && !inUnorderedList) {
        result.push('[olist]');
        inOrderedList = true;
      } else if (inUnorderedList) {
        result.push('[/list]');
        result.push('[olist]');
        inUnorderedList = false;
        inOrderedList = true;
      }
      result.push(`[*]${orderedMatch[1]}`);
    } else {
      if (inUnorderedList) {
        result.push('[/list]');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        result.push('[/olist]');
        inOrderedList = false;
      }
      result.push(line);
    }
  }

  // Close any open lists
  if (inUnorderedList) result.push('[/list]');
  if (inOrderedList) result.push('[/olist]');

  return result.join('\n');
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
