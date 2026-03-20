/**
 * Manages the Anthropic API key in localStorage, scoped per studio.
 *
 * A studio has one Anthropic account, so the key is scoped by studio slug
 * (not by title). On first call, migrates the legacy global key if present.
 */

import { getCurrentSelection } from './workspace-stores';

const LEGACY_KEY = 'steambb-anthropic-api-key';

/** Build the scoped storage key for a given studio slug. */
function scopedKey(studioSlug: string): string {
  return `steambb-api-key-${studioSlug}`;
}

/**
 * Migrate the legacy global key to the current studio's scoped key.
 * Runs at most once per page load (idempotent: skips if scoped key already exists).
 */
let migrated = false;
function migrateIfNeeded(studioSlug: string): void {
  if (migrated) return;
  migrated = true;

  try {
    const legacyValue = localStorage.getItem(LEGACY_KEY);
    if (!legacyValue) return;

    const target = scopedKey(studioSlug);
    // Only copy if the scoped key doesn't already have a value
    if (!localStorage.getItem(target)) {
      localStorage.setItem(target, legacyValue);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // localStorage unavailable — silently skip migration
  }
}

/** Retrieve the stored Anthropic API key for the current studio, or null if not set. */
export function getApiKey(): string | null {
  try {
    const { studioSlug } = getCurrentSelection();
    migrateIfNeeded(studioSlug);
    return localStorage.getItem(scopedKey(studioSlug));
  } catch {
    return null;
  }
}

/** Store the Anthropic API key for the current studio in localStorage. */
export function setApiKey(key: string): void {
  const { studioSlug } = getCurrentSelection();
  migrateIfNeeded(studioSlug);
  localStorage.setItem(scopedKey(studioSlug), key);
}

/** Remove the stored Anthropic API key for the current studio from localStorage. */
export function clearApiKey(): void {
  const { studioSlug } = getCurrentSelection();
  migrateIfNeeded(studioSlug);
  localStorage.removeItem(scopedKey(studioSlug));
}

/**
 * Reset the migration flag. Exposed for testing only.
 * @internal
 */
export function _resetMigrationFlag(): void {
  migrated = false;
}
