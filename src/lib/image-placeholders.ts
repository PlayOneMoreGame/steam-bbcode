// Image placeholder utilities for Confluence attachment detection
// Pure functions — no React dependencies

/**
 * Regex to match image drop markers in BBCode output.
 * Format: [b]>>> Drop image: filename <<<[/b]
 */
const DROP_MARKER_PATTERN = /\[b\]>>> Drop image: (.+?) <<<\[\/b\]/gi;

/**
 * Extract all image filenames from drop markers in BBCode.
 * Returns an array of unique filenames in order of first appearance.
 */
export function extractPlaceholderImages(bbcode: string): string[] {
  const seen = new Set<string>();
  const filenames: string[] = [];
  let match;

  const pattern = new RegExp(DROP_MARKER_PATTERN.source, 'gi');
  while ((match = pattern.exec(bbcode)) !== null) {
    const filename = match[1];
    if (filename && !seen.has(filename)) {
      seen.add(filename);
      filenames.push(filename);
    }
  }

  return filenames;
}
