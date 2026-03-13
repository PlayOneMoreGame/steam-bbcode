// Blocked words storage
// Org defaults (from blocked-words-default.ts) are immutable.
// Users can add custom terms stored separately in localStorage.
// Combined list = org defaults + user additions (deduplicated).

import { DEFAULT_BLOCKED_WORDS } from './blocked-words-default';

const USER_TERMS_KEY = 'steambb-blacklist-user-terms';
const OLD_TERMS_KEY = 'steambb-blacklist-terms';

export { DEFAULT_BLOCKED_WORDS };

// Build a Set for fast lookup of org defaults (lowercase)
const defaultsLower = new Set(DEFAULT_BLOCKED_WORDS.map(t => t.toLowerCase()));

/**
 * One-time migration from old single-array storage to new user-terms-only model.
 * Extracts non-default terms as user additions, saves to new key, deletes old key.
 */
function migrateOldStorage(): void {
  const old = localStorage.getItem(OLD_TERMS_KEY);
  if (old === null) return;

  try {
    const parsed = JSON.parse(old);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Extract terms that are NOT in the defaults list
      const userTerms = parsed.filter(
        (t: string) => !defaultsLower.has(t.toLowerCase())
      );
      if (userTerms.length > 0) {
        localStorage.setItem(USER_TERMS_KEY, JSON.stringify(userTerms));
      }
    }
  } catch {
    // Corrupted data — just discard it
  }

  localStorage.removeItem(OLD_TERMS_KEY);
}

/**
 * Get user-added terms from localStorage.
 */
function getUserTerms(): string[] {
  migrateOldStorage();
  try {
    const stored = localStorage.getItem(USER_TERMS_KEY);
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
  if (terms.length === 0) {
    localStorage.removeItem(USER_TERMS_KEY);
  } else {
    localStorage.setItem(USER_TERMS_KEY, JSON.stringify(terms));
  }
}

/**
 * Get the full blocked words list: org defaults + user additions (deduplicated).
 */
export function getBlacklist(): string[] {
  const userTerms = getUserTerms();
  if (userTerms.length === 0) return [...DEFAULT_BLOCKED_WORDS];

  // Deduplicate: skip user terms that match a default (case-insensitive)
  const unique = userTerms.filter(t => !defaultsLower.has(t.toLowerCase()));
  return [...DEFAULT_BLOCKED_WORDS, ...unique];
}

/**
 * Add a term to user additions. No-op if already in defaults or user terms (case-insensitive).
 */
export function addTerm(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const lowerTrimmed = trimmed.toLowerCase();

  // Already in org defaults — no-op
  if (defaultsLower.has(lowerTrimmed)) return;

  const userTerms = getUserTerms();
  if (userTerms.some(t => t.toLowerCase() === lowerTrimmed)) return;

  userTerms.push(trimmed);
  setUserTerms(userTerms);
}

/**
 * Remove a term from user additions. No-op for org defaults (they are immutable).
 */
export function removeTerm(term: string): void {
  const lowerTerm = term.toLowerCase();

  // Org defaults cannot be removed
  if (defaultsLower.has(lowerTerm)) return;

  const userTerms = getUserTerms();
  const filtered = userTerms.filter(t => t.toLowerCase() !== lowerTerm);
  setUserTerms(filtered);
}

/**
 * Reset: clear all user additions. Org defaults are always present.
 */
export function resetBlacklist(): void {
  localStorage.removeItem(USER_TERMS_KEY);
  // Also clean up old key if it somehow reappears
  localStorage.removeItem(OLD_TERMS_KEY);
}

/**
 * Check if a term is one of the org defaults.
 */
export function isOrgTerm(term: string): boolean {
  return defaultsLower.has(term.toLowerCase());
}

/**
 * @deprecated Use isOrgTerm instead. Kept for backward compatibility.
 */
export const isDefaultBlockedWord = isOrgTerm;

/**
 * Replace the entire blocked word list in localStorage.
 * @deprecated This was part of the old single-array API. Kept for migration compatibility only.
 */
export function setBlacklist(terms: string[]): void {
  localStorage.setItem(OLD_TERMS_KEY, JSON.stringify(terms));
}
