// Generic term store factory
// Shared pattern: immutable defaults + user additions in localStorage
// Used by blacklist-store and dnt-store
//
// Three tiers (studio > title > user):
//   studio defaults  — org-wide compliance terms (immutable)
//   title defaults   — title-specific terms (immutable)
//   user additions   — per-person terms in localStorage (mutable)

export interface TermStoreConfig {
  /** Immutable studio-level default terms */
  defaults: string[];
  /** Immutable title-level default terms (optional second tier) */
  titleDefaults?: string[];
  /** localStorage key for user-added terms */
  userStorageKey: string;
  /** Old localStorage key to migrate from (single-array format) */
  legacyStorageKey?: string;
  /** Additional legacy keys to clean up on reset */
  legacyCleanupKeys?: string[];
}

export interface TermStore {
  /** Get combined list: defaults + title defaults + user additions, deduplicated case-insensitively */
  getAll(): string[];
  /** Add a user term. No-op if already present or is a default/title default */
  add(term: string): void;
  /** Remove a user term. No-op for defaults and title defaults */
  remove(term: string): void;
  /** Clear all user additions */
  reset(): void;
  /** Check if a term is in the studio defaults set (case-insensitive) */
  isDefault(term: string): boolean;
  /** Check if a term is in the title defaults set (case-insensitive) */
  isTitleDefault(term: string): boolean;
  /** Get which tier a term belongs to: 'studio' | 'title' | 'user' | null */
  getTier(term: string): 'studio' | 'title' | 'user' | null;
  /** Replace entire user terms list, filtering out defaults and title defaults */
  setUserTerms(terms: string[]): void;
}

export function createTermStore(config: TermStoreConfig): TermStore {
  const { defaults, titleDefaults = [], userStorageKey, legacyStorageKey, legacyCleanupKeys } = config;

  // Pre-compute Sets for O(1) lookups
  const defaultsLower = new Set(defaults.map(t => t.toLowerCase()));
  const titleDefaultsLower = new Set(titleDefaults.map(t => t.toLowerCase()));

  /** Check if a term is protected (in either default set) */
  function isProtected(term: string): boolean {
    const lower = term.toLowerCase();
    return defaultsLower.has(lower) || titleDefaultsLower.has(lower);
  }

  // Migration is self-guarding: it reads the legacy key and removes it on
  // first run.  Subsequent calls find null and return immediately, so a
  // separate `migrated` boolean would only save one getItem() per read and
  // would break test isolation (the store instance outlives beforeEach).

  function migrateOldStorage(): void {
    if (!legacyStorageKey) return;
    const old = localStorage.getItem(legacyStorageKey);
    if (old === null) return;

    try {
      const parsed = JSON.parse(old);
      if (Array.isArray(parsed)) {
        const userAdditions = parsed.filter(
          (t: string) => !isProtected(t)
        );
        if (userAdditions.length > 0) {
          localStorage.setItem(userStorageKey, JSON.stringify(userAdditions));
        }
      }
    } catch {
      // Corrupted data — discard
    }

    localStorage.removeItem(legacyStorageKey);
  }

  function getUserTerms(): string[] {
    migrateOldStorage();
    try {
      const stored = localStorage.getItem(userStorageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  function writeUserTerms(terms: string[]): void {
    if (terms.length === 0) {
      localStorage.removeItem(userStorageKey);
    } else {
      localStorage.setItem(userStorageKey, JSON.stringify(terms));
    }
  }

  function getAll(): string[] {
    const userTerms = getUserTerms();

    // Start with studio defaults
    const seen = new Set(defaults.map(t => t.toLowerCase()));
    const combined = [...defaults];

    // Add title defaults (dedup against studio)
    for (const term of titleDefaults) {
      const lower = term.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(term);
      }
    }

    if (userTerms.length === 0) return combined;

    // Add user terms (dedup against both default sets)
    for (const term of userTerms) {
      const lower = term.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(term);
      }
    }
    return combined;
  }

  function add(term: string): void {
    const trimmed = term.trim();
    if (!trimmed) return;
    const lowerTrimmed = trimmed.toLowerCase();

    if (isProtected(trimmed)) return;

    const userTerms = getUserTerms();
    if (userTerms.some(t => t.toLowerCase() === lowerTrimmed)) return;

    userTerms.push(trimmed);
    writeUserTerms(userTerms);
  }

  function remove(term: string): void {
    if (isProtected(term)) return;

    const userTerms = getUserTerms();
    const lowerTerm = term.toLowerCase();
    const filtered = userTerms.filter(t => t.toLowerCase() !== lowerTerm);
    writeUserTerms(filtered);
  }

  function reset(): void {
    localStorage.removeItem(userStorageKey);
    if (legacyCleanupKeys) {
      for (const key of legacyCleanupKeys) {
        localStorage.removeItem(key);
      }
    }
  }

  function isDefault(term: string): boolean {
    return defaultsLower.has(term.toLowerCase());
  }

  function isTitleDefault(term: string): boolean {
    return titleDefaultsLower.has(term.toLowerCase());
  }

  function getTier(term: string): 'studio' | 'title' | 'user' | null {
    const lower = term.toLowerCase();
    if (defaultsLower.has(lower)) return 'studio';
    if (titleDefaultsLower.has(lower)) return 'title';
    const userTerms = getUserTerms();
    if (userTerms.some(t => t.toLowerCase() === lower)) return 'user';
    return null;
  }

  function setUserTerms(terms: string[]): void {
    const userOnly = terms.filter(t => !isProtected(t));
    writeUserTerms(userOnly);
  }

  return { getAll, add, remove, reset, isDefault, isTitleDefault, getTier, setUserTerms };
}
