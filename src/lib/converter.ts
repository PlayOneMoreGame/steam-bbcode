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
  // Underscore italic: only match when _ is a standalone emphasis marker,
  // not part of an identifier like OMG_Brady or snake_case
  result = result.replace(/(?<=^|[\s(["'])_([^_\n]+)_(?=[\s.,;:!?)"'\]]|$)/gm, '[i]$1[/i]');

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
 * Classify a line as unordered list item, ordered list item, or plain text.
 * Returns the match type and captured content.
 */
function classifyListLine(line: string): { type: 'unordered' | 'ordered' | 'plain'; content: string } {
  const unorderedMatch = line.match(/^[\s]*[-*+] (.+)$/);
  if (unorderedMatch) return { type: 'unordered', content: unorderedMatch[1] };
  const orderedMatch = line.match(/^[\s]*\d+\. (.+)$/);
  if (orderedMatch) return { type: 'ordered', content: orderedMatch[1] };
  return { type: 'plain', content: line };
}

/**
 * Process Markdown lists to BBCode
 * Keeps formatting tight to avoid Steam parsing issues.
 *
 * Only converts list-marker lines when they appear in a run of 2+ consecutive
 * items of the same type. A single isolated `- text` line (e.g., a sign-off
 * like `- Jason`) is left as plain text.
 */
function processLists(text: string): string {
  const lines = text.split('\n');
  const classified = lines.map(classifyListLine);

  // Pre-compute run lengths: for each list-type line, how many consecutive
  // lines of the same type start at this position?
  const runLength: number[] = new Array(classified.length).fill(0);
  for (let i = classified.length - 1; i >= 0; i--) {
    const t = classified[i].type;
    if (t === 'plain') {
      runLength[i] = 0;
    } else if (i + 1 < classified.length && classified[i + 1].type === t) {
      runLength[i] = runLength[i + 1] + 1;
    } else {
      runLength[i] = 1;
    }
  }

  const result: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  for (let i = 0; i < classified.length; i++) {
    const { type, content } = classified[i];
    const isListCandidate = type !== 'plain' && runLength[i] >= 2;
    // Also treat a line as a list candidate if we're already inside a list
    // of the same type (handles lines that are continuations of a run)
    const inMatchingList =
      (type === 'unordered' && inUnorderedList) ||
      (type === 'ordered' && inOrderedList);

    if ((isListCandidate || inMatchingList) && type === 'unordered') {
      if (!inUnorderedList && !inOrderedList) {
        result.push('[list]');
        inUnorderedList = true;
      } else if (inOrderedList) {
        result.push('[/olist]');
        result.push('[list]');
        inOrderedList = false;
        inUnorderedList = true;
      }
      result.push(`[*]${content}`);
    } else if ((isListCandidate || inMatchingList) && type === 'ordered') {
      if (!inOrderedList && !inUnorderedList) {
        result.push('[olist]');
        inOrderedList = true;
      } else if (inUnorderedList) {
        result.push('[/list]');
        result.push('[olist]');
        inUnorderedList = false;
        inOrderedList = true;
      }
      result.push(`[*]${content}`);
    } else {
      if (inUnorderedList) {
        result.push('[/list]');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        result.push('[/olist]');
        inOrderedList = false;
      }
      // For isolated list-marker lines that didn't qualify, emit the original line
      result.push(lines[i]);
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
