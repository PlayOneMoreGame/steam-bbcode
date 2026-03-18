// Shared utilities for text processing
// Used by linter, markdown-linter, converter, and renderer

/**
 * Get 1-indexed line number for a character position in text
 */
export function getLineNumber(text: string, position: number): number {
  const upToPosition = text.slice(0, position);
  return (upToPosition.match(/\n/g) || []).length + 1;
}

/**
 * Get 1-indexed column for a character position within its line
 */
export function getColumnInLine(text: string, position: number): number {
  const lastNewline = text.lastIndexOf('\n', position - 1);
  return position - lastNewline; // 1-indexed (position after newline = column 1)
}

/**
 * Markdown image syntax matching a YouTube URL.
 * Returns a new RegExp each call because /g flag is stateful.
 */
export function youtubeImageRegex(): RegExp {
  return /!\[([^\]]*)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)[^)]*)\)/g;
}

/**
 * Markdown image syntax matching a non-YouTube image URL.
 * Returns a new RegExp each call because /g flag is stateful.
 */
export function imageRegex(): RegExp {
  return /!\[([^\]]*)\]\((?!https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be))([^)]+)\)/g;
}
