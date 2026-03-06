// Image placeholder utilities for Confluence attachment resolution
// Pure functions — no React dependencies

/**
 * A map from placeholder filename to Steam URL (or empty string if unresolved).
 */
export type ImageUrlMap = Record<string, string>;

/**
 * Extract all placeholder image filenames from BBCode.
 * Returns an array of unique filenames in order of first appearance.
 */
export function extractPlaceholderImages(bbcode: string): string[] {
  const pattern = /\[img\]\{placeholder:([^}]+)\}\[\/img\]/gi;
  const seen = new Set<string>();
  const filenames: string[] = [];
  let match;

  while ((match = pattern.exec(bbcode)) !== null) {
    const filename = match[1];
    if (!seen.has(filename)) {
      seen.add(filename);
      filenames.push(filename);
    }
  }

  return filenames;
}

/**
 * Replace placeholder URLs in BBCode with resolved Steam URLs.
 * Only replaces placeholders that have a non-empty URL in the map.
 */
export function resolvePlaceholders(bbcode: string, imageUrls: ImageUrlMap): string {
  return bbcode.replace(
    /\[img\]\{placeholder:([^}]+)\}\[\/img\]/gi,
    (original, filename: string) => {
      const url = imageUrls[filename];
      if (url && url.trim()) {
        return `[img]${url.trim()}[/img]`;
      }
      return original;
    }
  );
}

/**
 * Count how many placeholders are unresolved (no URL provided).
 */
export function countUnresolved(filenames: string[], imageUrls: ImageUrlMap): number {
  return filenames.filter(f => !imageUrls[f] || !imageUrls[f].trim()).length;
}
