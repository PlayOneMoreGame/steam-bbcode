// Do Not Translate term storage
// Split model: workspace defaults (from JSON, immutable) + user additions (localStorage)
// Mirrors the blacklist-store pattern (SMD-4410)

import { DO_NOT_TRANSLATE } from './glossary';

const STORAGE_KEY = 'steambb-dnt-terms';
const USER_STORAGE_KEY = 'steambb-dnt-user-terms';

/**
 * Check if a term is one of the workspace defaults (case-insensitive).
 */
export function isWorkspaceTerm(term: string): boolean {
  const lowerTerm = term.toLowerCase();
  return DO_NOT_TRANSLATE.some(t => t.toLowerCase() === lowerTerm);
}

// Keep the old name as an alias for backward compatibility
export const isDefaultTerm = isWorkspaceTerm;

/**
 * Get user-added terms from localStorage.
 */
function getUserTerms(): string[] {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Save user-added terms to localStorage.
 */
function setUserTerms(terms: string[]): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(terms));
}

/**
 * Migrate from the old single-list format (steambb-dnt-terms) to the new
 * split format (workspace defaults + steambb-dnt-user-terms).
 *
 * Old format stored ALL terms (defaults + user) in one array.
 * New format only stores user additions separately.
 *
 * This runs once, then removes the old key.
 */
function migrateOldFormat(): void {
  const oldStored = localStorage.getItem(STORAGE_KEY);
  if (!oldStored) return;

  try {
    const oldTerms = JSON.parse(oldStored);
    if (!Array.isArray(oldTerms)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // Extract terms that are NOT workspace defaults — those are user additions
    const userAdditions = oldTerms.filter(
      (t: string) => !DO_NOT_TRANSLATE.some(d => d.toLowerCase() === t.toLowerCase())
    );

    if (userAdditions.length > 0) {
      setUserTerms(userAdditions);
    }

    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Get the combined DNT terms: workspace defaults + user additions.
 * Deduplicates case-insensitively (workspace terms win).
 */
export function getDntTerms(): string[] {
  migrateOldFormat();

  const userTerms = getUserTerms();
  if (userTerms.length === 0) return [...DO_NOT_TRANSLATE];

  // Deduplicate: workspace defaults first, then user terms that aren't already present
  const seen = new Set(DO_NOT_TRANSLATE.map(t => t.toLowerCase()));
  const combined = [...DO_NOT_TRANSLATE];
  for (const term of userTerms) {
    const lower = term.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      combined.push(term);
    }
  }
  return combined;
}

/**
 * Replace the entire user terms list in localStorage.
 * Workspace defaults are not affected.
 */
export function setDntTerms(terms: string[]): void {
  // Filter out workspace defaults — only store user additions
  const userOnly = terms.filter(
    t => !DO_NOT_TRANSLATE.some(d => d.toLowerCase() === t.toLowerCase())
  );
  setUserTerms(userOnly);
}

/**
 * Add a term to the user DNT list. No-op if already present in
 * workspace defaults or user terms (case-insensitive).
 */
export function addDntTerm(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const lowerTrimmed = trimmed.toLowerCase();

  // Skip if already in workspace defaults
  if (DO_NOT_TRANSLATE.some(t => t.toLowerCase() === lowerTrimmed)) return;

  // Skip if already in user terms
  const userTerms = getUserTerms();
  if (userTerms.some(t => t.toLowerCase() === lowerTrimmed)) return;

  userTerms.push(trimmed);
  setUserTerms(userTerms);
}

/**
 * Remove a term from the user DNT list (case-insensitive).
 * Workspace default terms cannot be removed.
 */
export function removeDntTerm(term: string): void {
  // Workspace terms are immutable
  if (isWorkspaceTerm(term)) return;

  const userTerms = getUserTerms();
  const lowerTerm = term.toLowerCase();
  const filtered = userTerms.filter(t => t.toLowerCase() !== lowerTerm);
  setUserTerms(filtered);
}

/**
 * Reset DNT terms by clearing all user additions.
 * Workspace defaults remain unchanged.
 */
export function resetDntTerms(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}
