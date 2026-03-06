// Blacklist term detection
// Finds forbidden terms in text using word-boundary matching

export interface BlacklistMatch {
  term: string;
  line: number;   // 1-indexed
  column: number; // 1-indexed
  length: number;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect blacklisted terms in text using word-boundary matching.
 * - Case-insensitive
 * - Word boundaries: "kill" matches "kill" but not "skill", "killer", "overkill"
 */
export function detectBlacklistTerms(text: string, blacklist: string[]): BlacklistMatch[] {
  if (!text || blacklist.length === 0) return [];

  const matches: BlacklistMatch[] = [];
  const lines = text.split('\n');

  for (const term of blacklist) {
    const trimmed = term.trim();
    if (!trimmed) continue;

    const escaped = escapeRegex(trimmed);
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

    // Track character offset per line for efficient line/column lookup
    let lineStartOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      regex.lastIndex = 0;
      let match;

      while ((match = regex.exec(line)) !== null) {
        matches.push({
          term: trimmed,
          line: i + 1,
          column: match.index + 1,
          length: match[0].length,
        });
      }

      lineStartOffset += line.length + 1; // +1 for newline
    }
  }

  // Sort by line then column for consistent ordering
  matches.sort((a, b) => a.line - b.line || a.column - b.column);

  return matches;
}
