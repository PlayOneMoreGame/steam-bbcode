/**
 * Terms that must NOT be translated or localized.
 * Used by the translation feature (SMD-4370) to instruct the LLM
 * to preserve these terms exactly as written.
 *
 * Workspace defaults are loaded from src/workspace/dnt-defaults.json,
 * which can be swapped per-game at build time.
 */

import dntDefaults from '@/workspace/dnt-defaults.json';

export const DO_NOT_TRANSLATE: string[] = dntDefaults;

/**
 * Regex patterns for terms that should not be translated.
 * These are checked dynamically against the source text.
 */
export const DO_NOT_TRANSLATE_PATTERNS: RegExp[] = [
  // @mentions (e.g., @cloudkicker76)
  /@\w+/g,
];
