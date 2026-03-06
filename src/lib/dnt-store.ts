// Do Not Translate term storage
// Persists user-customized DNT glossary to localStorage
// Ships with default SWAPMEAT terms that are removable and restorable

import { DO_NOT_TRANSLATE } from './glossary';

const STORAGE_KEY = 'steambb-dnt-terms';

/**
 * Get the current DNT terms from localStorage.
 * Returns the default glossary if nothing is stored.
 */
export function getDntTerms(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...DO_NOT_TRANSLATE];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...DO_NOT_TRANSLATE];
    return parsed;
  } catch {
    return [...DO_NOT_TRANSLATE];
  }
}

/**
 * Replace the entire DNT list in localStorage.
 */
export function setDntTerms(terms: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
}

/**
 * Add a term to the DNT list. No-op if already present (case-insensitive).
 */
export function addDntTerm(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const current = getDntTerms();
  const lowerTrimmed = trimmed.toLowerCase();
  if (current.some(t => t.toLowerCase() === lowerTrimmed)) return;
  current.push(trimmed);
  setDntTerms(current);
}

/**
 * Remove a term from the DNT list (case-insensitive match).
 */
export function removeDntTerm(term: string): void {
  const current = getDntTerms();
  const lowerTerm = term.toLowerCase();
  const filtered = current.filter(t => t.toLowerCase() !== lowerTerm);
  setDntTerms(filtered);
}

/**
 * Reset DNT terms to the default SWAPMEAT glossary.
 * Clears localStorage so defaults are used.
 */
export function resetDntTerms(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if a term is one of the shipped defaults.
 */
export function isDefaultTerm(term: string): boolean {
  const lowerTerm = term.toLowerCase();
  return DO_NOT_TRANSLATE.some(t => t.toLowerCase() === lowerTerm);
}
