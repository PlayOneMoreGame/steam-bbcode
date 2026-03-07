// Discord section splitter
// Breaks Markdown into chunks that fit Discord's 2000 character limit

import { CHAR_LIMITS } from './contexts';

export interface DiscordSection {
  index: number;
  content: string;
  charCount: number;
}

/**
 * Split Markdown into Discord-friendly sections
 * Tries to break at natural boundaries (headers, paragraphs, list ends)
 */
export function splitForDiscord(markdown: string, maxLength: number = CHAR_LIMITS.discord): DiscordSection[] {
  if (markdown.length <= maxLength) {
    return [{
      index: 0,
      content: markdown,
      charCount: markdown.length,
    }];
  }

  const sections: DiscordSection[] = [];
  let remaining = markdown;
  let index = 0;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      sections.push({
        index,
        content: remaining.trim(),
        charCount: remaining.trim().length,
      });
      break;
    }

    // Find the best break point within the limit
    const chunk = remaining.slice(0, maxLength);
    const breakPoint = findBreakPoint(chunk);
    
    const section = remaining.slice(0, breakPoint).trim();
    sections.push({
      index,
      content: section,
      charCount: section.length,
    });

    remaining = remaining.slice(breakPoint).trim();
    index++;

    // Safety valve - prevent infinite loops
    if (index > 100) {
      console.warn('Discord splitter hit safety limit');
      break;
    }
  }

  return sections;
}

/**
 * Find the best break point in a chunk of Markdown
 * Priority: header > hr > paragraph > list item > sentence > word > hard cut
 */
function findBreakPoint(chunk: string): number {
  const priorities = [
    // Headers (break BEFORE the header)
    /\n(?=#{1,3} )/g,
    // Horizontal rules
    /\n(?:---|\*\*\*|___)\n?/g,
    // Double newline (paragraph break)
    /\n\n/g,
    // List items (break before next item)
    /\n(?=[-*+] |\d+\. )/g,
    // Single newline
    /\n/g,
    // Sentence end
    /[.!?]\s+/g,
    // Space (word boundary)
    /\s+/g,
  ];

  for (const pattern of priorities) {
    const lastMatch = findLastMatch(chunk, pattern);
    if (lastMatch !== -1 && lastMatch > chunk.length * 0.3) {
      // Don't break too early (at least 30% of max length)
      return lastMatch;
    }
  }

  // Hard cut at the limit if no good break point found
  return chunk.length;
}

/**
 * Find the last occurrence of a pattern in a string
 */
function findLastMatch(text: string, pattern: RegExp): number {
  let lastIndex = -1;
  let match;
  
  // Create a new regex to avoid state issues
  const regex = new RegExp(pattern.source, pattern.flags);
  
  while ((match = regex.exec(text)) !== null) {
    lastIndex = match.index + match[0].length;
    
    // Prevent infinite loop for zero-length matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }
  
  return lastIndex;
}

/** Format a section header with index/total for multi-part Discord messages. */
export function formatSectionHeader(index: number, total: number): string {
  if (total === 1) return '';
  return `[${index + 1}/${total}]\n`;
}

/** Check if the content exceeds the character limit and needs splitting. */
export function needsSplitting(bbcode: string, maxLength: number = CHAR_LIMITS.discord): boolean {
  return bbcode.length > maxLength;
}
