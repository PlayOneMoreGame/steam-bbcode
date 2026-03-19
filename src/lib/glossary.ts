/**
 * Terms that must NOT be translated or localized.
 * Used by the translation feature to instruct the LLM
 * to preserve these terms exactly as written.
 *
 * DNT terms are loaded from the active workspace's store.
 */

import { getDntTerms } from './dnt-store';

/** Get the current DNT terms for the active workspace. */
export function getDoNotTranslateTerms(): string[] {
  return getDntTerms();
}

/**
 * Regex patterns for terms that should not be translated.
 * These are checked dynamically against the source text.
 */
export const DO_NOT_TRANSLATE_PATTERNS: RegExp[] = [
  // @mentions (e.g., @cloudkicker76)
  /@\w+/g,
];
