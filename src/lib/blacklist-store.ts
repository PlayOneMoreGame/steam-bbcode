// Blocked words storage
// Persists blocked word list to localStorage
// Ships with ~678 default terms from FrontGate Media list (39 common gaming/PG-13 terms removed)

import { DEFAULT_BLOCKED_WORDS } from './blocked-words-default';

const STORAGE_KEY = 'steambb-blacklist-terms';

export { DEFAULT_BLOCKED_WORDS };

/**
 * Get the current blocked words from localStorage.
 * Returns the default list if nothing is stored.
 */
export function getBlacklist(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...DEFAULT_BLOCKED_WORDS];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...DEFAULT_BLOCKED_WORDS];
    // Migrate from old empty default — previous versions shipped with []
    if (parsed.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return [...DEFAULT_BLOCKED_WORDS];
    }
    return parsed;
  } catch {
    return [...DEFAULT_BLOCKED_WORDS];
  }
}

/**
 * Replace the entire blocked word list in localStorage.
 */
export function setBlacklist(terms: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
}

/**
 * Add a term to the blocked words. No-op if already present (case-insensitive).
 */
export function addTerm(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const current = getBlacklist();
  const lowerTrimmed = trimmed.toLowerCase();
  if (current.some(t => t.toLowerCase() === lowerTrimmed)) return;
  current.push(trimmed);
  setBlacklist(current);
}

/**
 * Remove a term from the blocked words (case-insensitive match).
 */
export function removeTerm(term: string): void {
  const current = getBlacklist();
  const lowerTerm = term.toLowerCase();
  const filtered = current.filter(t => t.toLowerCase() !== lowerTerm);
  setBlacklist(filtered);
}

/**
 * Reset blocked words to the default list.
 */
export function resetBlacklist(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if a term is one of the shipped defaults.
 */
export function isDefaultBlockedWord(term: string): boolean {
  const lowerTerm = term.toLowerCase();
  return DEFAULT_BLOCKED_WORDS.includes(lowerTerm);
}
