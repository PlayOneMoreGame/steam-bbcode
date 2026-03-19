/**
 * Workspace configuration loader.
 *
 * Imports studio and title configs statically at build time.
 * Supports multiple studios, each with multiple titles.
 * Persists the user's studio/title selection in localStorage.
 */

import type { StudioConfig, TitleConfig, WorkspaceConfig, WorkspaceSelection } from './workspace-types';

// Static imports — add new studios/titles here
import omgStudio from '@/workspace/studios/one-more-game/studio.json';
import swapmeat from '@/workspace/studios/one-more-game/titles/swapmeat.json';
import bmgStudio from '@/workspace/studios/best-mega-gameco/studio.json';
import megaWedgie from '@/workspace/studios/best-mega-gameco/titles/mega-wedgie-3d.json';

// Registry
const studios: Record<string, StudioConfig> = {
  'one-more-game': omgStudio as StudioConfig,
  'best-mega-gameco': bmgStudio as StudioConfig,
};

const titlesByStudio: Record<string, Record<string, TitleConfig>> = {
  'one-more-game': {
    'swapmeat': swapmeat as TitleConfig,
  },
  'best-mega-gameco': {
    'mega-wedgie-3d': megaWedgie as TitleConfig,
  },
};

const STORAGE_KEY = 'steambb-workspace-selection';

const DEFAULT_SELECTION: WorkspaceSelection = {
  studioSlug: 'one-more-game',
  titleSlug: 'swapmeat',
};

/** Get persisted workspace selection (or default). */
export function getWorkspaceSelection(): WorkspaceSelection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SELECTION;
    const parsed = JSON.parse(stored) as WorkspaceSelection;
    // Validate the selection still exists in the registry
    if (studios[parsed.studioSlug] && titlesByStudio[parsed.studioSlug]?.[parsed.titleSlug]) {
      return parsed;
    }
    return DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

/** Persist workspace selection to localStorage. */
export function setWorkspaceSelection(sel: WorkspaceSelection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
}

/** List all available studios. */
export function getAvailableStudios(): StudioConfig[] {
  return Object.values(studios);
}

/** List titles for a given studio. */
export function getAvailableTitles(studioSlug: string): TitleConfig[] {
  return Object.values(titlesByStudio[studioSlug] ?? {});
}

/** Get full workspace config for a specific selection (defaults to persisted selection). */
export function getWorkspaceConfig(sel?: WorkspaceSelection): WorkspaceConfig {
  const { studioSlug, titleSlug } = sel ?? getWorkspaceSelection();

  const studio = studios[studioSlug];
  if (!studio) {
    throw new Error(`Unknown studio: "${studioSlug}". Available: ${Object.keys(studios).join(', ')}`);
  }

  const title = titlesByStudio[studioSlug]?.[titleSlug];
  if (!title) {
    const available = Object.keys(titlesByStudio[studioSlug] ?? {});
    throw new Error(`Unknown title: "${titleSlug}" for studio "${studioSlug}". Available: ${available.join(', ')}`);
  }

  return { studio, title };
}
