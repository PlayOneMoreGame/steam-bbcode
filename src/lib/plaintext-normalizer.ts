// Light markdown formatting for unstructured plain text
// Detects heading-like lines, bullet patterns, numbered lists, paragraphs.
// If the text already has markdown structure, returns it unchanged.
// Pure function, no dependencies.

/**
 * Apply light markdown formatting to plain text.
 *
 * Detects common structural patterns people use in unformatted text:
 * - ALL-CAPS or Title Case lines followed by blank lines → # headings
 * - Lines starting with •, ●, ◦, ▪, -, *, + → - bullet items
 * - Lines starting with digits followed by . or ) → 1. numbered items
 * - Blank-line-separated blocks → paragraphs (already valid markdown)
 *
 * If the text already looks like markdown (has # headings, **bold**, etc.),
 * returns it unchanged to avoid double-formatting.
 */
export function plaintextToMarkdown(text: string): string {
  if (!text || !text.trim()) return text;

  // If it already has markdown structure, don't touch it
  if (hasMarkdownSyntax(text)) return text;

  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines pass through (paragraph separators)
    if (!trimmed) {
      result.push('');
      continue;
    }

    // Normalize bullet characters to markdown list syntax
    const bulletMatch = trimmed.match(/^[•●◦▪▸►–]\s*(.*)/);
    if (bulletMatch) {
      result.push(`- ${bulletMatch[1]}`);
      continue;
    }

    // Normalize numbered list patterns: "1)" or "1." with content
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      result.push(`${numberedMatch[1]}. ${numberedMatch[2]}`);
      continue;
    }

    // Detect heading-like lines: short ALL-CAPS or Title Case lines
    // followed by a blank line or at the start of the document
    const nextLine = i + 1 < lines.length ? lines[i + 1]?.trim() : '';
    const prevLine = i > 0 ? lines[i - 1]?.trim() : '';
    const isFollowedByBlank = nextLine === '' || i === lines.length - 1;
    const isPrecededByBlank = prevLine === '' || i === 0;

    if (isPrecededByBlank && isFollowedByBlank && isHeadingLike(trimmed)) {
      result.push(`## ${trimmed}`);
      continue;
    }

    // Pass through as-is
    result.push(line);
  }

  return result.join('\n');
}

/** Check if the text already has markdown syntax — don't double-format */
function hasMarkdownSyntax(text: string): boolean {
  const sample = text.slice(0, 2000);
  // ATX headings
  if (/^#{1,6}\s/m.test(sample)) return true;
  // Bold
  if (/\*\*[^*]+\*\*/.test(sample)) return true;
  // Links
  if (/\[[^\]]+\]\([^)]+\)/.test(sample)) return true;
  // Fenced code blocks
  if (/^```/m.test(sample)) return true;
  return false;
}

/**
 * Heuristic: is this line likely a heading?
 * - Short (under 60 chars)
 * - ALL CAPS with at least 2 word characters
 * - Or Title Case (most words capitalized, no trailing period)
 * - Not a sentence (no trailing punctuation except : or -)
 */
function isHeadingLike(line: string): boolean {
  // Too long for a heading
  if (line.length > 60) return false;
  // Too short — single words are ambiguous
  if (line.length < 3) return false;
  // Sentences end with periods, questions, exclamations — not headings
  if (/[.!?]$/.test(line)) return false;

  // ALL CAPS with at least 2 word characters (e.g. "GAMEPLAY", "BUG FIXES")
  if (/^[A-Z][A-Z0-9\s/&:–-]{1,}$/.test(line) && /[A-Z].*[A-Z]/.test(line)) {
    return true;
  }

  return false;
}
