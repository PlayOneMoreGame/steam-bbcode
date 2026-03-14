/**
 * Terms that must NOT be translated or localized.
 * Used by the translation feature (SMD-4370) to instruct the LLM
 * to preserve these terms exactly as written.
 *
 * DNT terms are loaded from the active title's workspace config (SMD-4413).
 */

import { getWorkspaceConfig } from './workspace-loader';

export const DO_NOT_TRANSLATE: string[] = getWorkspaceConfig().title.dntTerms;

/**
 * Regex patterns for terms that should not be translated.
 * These are checked dynamically against the source text.
 */
export const DO_NOT_TRANSLATE_PATTERNS: RegExp[] = [
  // @mentions (e.g., @cloudkicker76)
  /@\w+/g,
];
