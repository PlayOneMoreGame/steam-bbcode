// Image placeholder utilities for Confluence attachment resolution
// Pure functions — no React dependencies

/**
 * A map from placeholder filename to Steam URL (or empty string if unresolved).
 */
export type ImageUrlMap = Record<string, string>;

/**
 * Extract all placeholder image filenames from BBCode.
 * Detects `{image: filename}` (rendered clipboard), `{placeholder:filename}` (storage format),
 * and `blob:filename` (drag/drop/paste).
 * Returns an array of unique filenames in order of first appearance.
 */
export function extractPlaceholderImages(bbcode: string): string[] {
  const pattern = /\[img\](?:\{image:\s*([^}]+)\}|\{placeholder:([^}]+)\}|blob:([^\[]+))\[\/img\]/gi;
  const seen = new Set<string>();
  const filenames: string[] = [];
  let match;

  while ((match = pattern.exec(bbcode)) !== null) {
    const filename = match[1] || match[2] || match[3];
    if (filename && !seen.has(filename)) {
      seen.add(filename);
      filenames.push(filename);
    }
  }

  return filenames;
}

/**
 * Replace placeholder URLs in BBCode with resolved Steam URLs.
 * Handles `{image: filename}`, `{placeholder:filename}`, and `blob:filename` patterns.
 * Only replaces entries that have a non-empty URL in the map.
 */
export function resolvePlaceholders(bbcode: string, imageUrls: ImageUrlMap): string {
  // Resolve {image: ...} patterns (rendered clipboard)
  let result = bbcode.replace(
    /\[img\]\{image:\s*([^}]+)\}\[\/img\]/gi,
    (original, filename: string) => {
      const url = imageUrls[filename];
      if (url && url.trim()) {
        return `[img]${url.trim()}[/img]`;
      }
      return original;
    }
  );

  // Resolve {placeholder:...} patterns (storage format)
  result = result.replace(
    /\[img\]\{placeholder:([^}]+)\}\[\/img\]/gi,
    (original, filename: string) => {
      const url = imageUrls[filename];
      if (url && url.trim()) {
        return `[img]${url.trim()}[/img]`;
      }
      return original;
    }
  );

  // Resolve blob:... patterns
  result = result.replace(
    /\[img\]blob:([^\[]+)\[\/img\]/gi,
    (original, filename: string) => {
      const url = imageUrls[filename];
      if (url && url.trim()) {
        return `[img]${url.trim()}[/img]`;
      }
      return original;
    }
  );

  return result;
}

/**
 * Count how many placeholders are unresolved (no URL provided).
 */
export function countUnresolved(filenames: string[], imageUrls: ImageUrlMap): number {
  return filenames.filter(f => !imageUrls[f] || !imageUrls[f].trim()).length;
}
