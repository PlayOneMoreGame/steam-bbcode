// Blacklist term storage
// Persists team-specific blacklisted terms to localStorage

const STORAGE_KEY = 'steambb-blacklist-terms';

export const DEFAULT_BLACKLIST: string[] = [];

/**
 * Get the current blacklist from localStorage.
 * Returns an empty array if nothing is stored.
 */
export function getBlacklist(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...DEFAULT_BLACKLIST];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...DEFAULT_BLACKLIST];
    return parsed;
  } catch {
    return [...DEFAULT_BLACKLIST];
  }
}

/**
 * Replace the entire blacklist in localStorage.
 */
export function setBlacklist(terms: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
}

/**
 * Add a term to the blacklist. No-op if already present (case-insensitive).
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
 * Remove a term from the blacklist (case-insensitive match).
 */
export function removeTerm(term: string): void {
  const current = getBlacklist();
  const lowerTerm = term.toLowerCase();
  const filtered = current.filter(t => t.toLowerCase() !== lowerTerm);
  setBlacklist(filtered);
}
