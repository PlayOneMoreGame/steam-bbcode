/**
 * Custom title CRUD — user-created titles stored in localStorage.
 *
 * Storage key: steambb-custom-titles-{studioSlug}
 * Value: TitleConfig[] (same schema as build-time titles)
 *
 * Custom titles have empty DNT terms and blocked words by default.
 * Localization targets are copied from the studio's first build-time title
 * (or a sensible default set if no build-time titles exist).
 */

import type { TitleConfig } from './workspace-types';

const STORAGE_PREFIX = 'steambb-custom-titles-';

/** Default localization targets when no build-time title exists to copy from. */
const DEFAULT_LOCALIZATION_TARGETS = ['pt-BR', 'es-LATAM', 'ko', 'zh-Hans', 'ja', 'de', 'fr'];

function storageKey(studioSlug: string): string {
  return `${STORAGE_PREFIX}${studioSlug}`;
}

/** Generate a URL-safe slug from a display name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Read all custom titles for a studio from localStorage. */
export function getCustomTitles(studioSlug: string): TitleConfig[] {
  try {
    const stored = localStorage.getItem(storageKey(studioSlug));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** Write custom titles for a studio to localStorage. */
function writeCustomTitles(studioSlug: string, titles: TitleConfig[]): void {
  if (titles.length === 0) {
    localStorage.removeItem(storageKey(studioSlug));
  } else {
    localStorage.setItem(storageKey(studioSlug), JSON.stringify(titles));
  }
}

/**
 * Add a custom title to a studio.
 * Returns the created TitleConfig, or null if a title with the same slug already exists.
 *
 * @param studioSlug - The studio to add the title to.
 * @param displayName - Human-readable title name.
 * @param existingSlugs - Slugs of build-time titles (to prevent collisions).
 * @param localizationTargets - Localization targets to copy (defaults to DEFAULT_LOCALIZATION_TARGETS).
 */
export function addCustomTitle(
  studioSlug: string,
  displayName: string,
  existingSlugs: string[],
  localizationTargets?: string[],
): TitleConfig | null {
  const slug = slugify(displayName);
  if (!slug) return null;

  // Check for collision with build-time titles
  if (existingSlugs.includes(slug)) return null;

  const customs = getCustomTitles(studioSlug);

  // Check for collision with existing custom titles
  if (customs.some(t => t.slug === slug)) return null;

  const title: TitleConfig = {
    slug,
    displayName: displayName.trim(),
    studioSlug,
    dntTerms: [],
    blockedWords: [],
    localizationTargets: localizationTargets ?? DEFAULT_LOCALIZATION_TARGETS,
  };

  customs.push(title);
  writeCustomTitles(studioSlug, customs);
  return title;
}

/** Remove a custom title from a studio. No-op if the slug is not found. */
export function removeCustomTitle(studioSlug: string, titleSlug: string): void {
  const customs = getCustomTitles(studioSlug);
  const filtered = customs.filter(t => t.slug !== titleSlug);
  writeCustomTitles(studioSlug, filtered);
}

/** Check if a title slug belongs to a custom (user-created) title. */
export function isCustomTitle(studioSlug: string, titleSlug: string): boolean {
  const customs = getCustomTitles(studioSlug);
  return customs.some(t => t.slug === titleSlug);
}
