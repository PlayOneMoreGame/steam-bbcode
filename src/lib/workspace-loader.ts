/**
 * Workspace configuration loader.
 *
 * Auto-discovers studio and title configs at build time using import.meta.glob.
 * Adding a new studio only requires dropping JSON files into src/workspace/studios/ —
 * no code changes needed.
 *
 * Directory structure:
 *   src/workspace/studios/{studio-slug}/studio.json
 *   src/workspace/studios/{studio-slug}/titles/{title-slug}.json
 *
 * External studios can be injected at build time via the WORKSPACE_DIR env var
 * (see the copyWorkspaceDir plugin in vite.config.ts).
 *
 * Persists the user's studio/title selection in localStorage.
 */

import type { StudioConfig, TitleConfig, WorkspaceConfig, WorkspaceSelection } from './workspace-types';
import { getStudioFromCookie } from './cookie-utils';

// Auto-discover all studio.json and title JSON files at build time.
// import.meta.glob with { eager: true } resolves them synchronously.
const studioModules = import.meta.glob<StudioConfig>(
  '@/workspace/studios/*/studio.json',
  { eager: true, import: 'default' },
);

const titleModules = import.meta.glob<TitleConfig>(
  '@/workspace/studios/*/titles/*.json',
  { eager: true, import: 'default' },
);

// Build the registry from glob results.
// Path format: /src/workspace/studios/{slug}/studio.json
const studios: Record<string, StudioConfig> = {};
for (const [path, config] of Object.entries(studioModules)) {
  const slug = extractStudioSlug(path);
  if (slug) {
    studios[slug] = config;
  }
}

// Path format: /src/workspace/studios/{studioSlug}/titles/{titleSlug}.json
const titlesByStudio: Record<string, Record<string, TitleConfig>> = {};
for (const [path, config] of Object.entries(titleModules)) {
  const parts = extractTitleParts(path);
  if (parts) {
    if (!titlesByStudio[parts.studioSlug]) {
      titlesByStudio[parts.studioSlug] = {};
    }
    titlesByStudio[parts.studioSlug][parts.titleSlug] = config;
  }
}

/** Extract studio slug from a glob path like ".../studios/one-more-game/studio.json" */
function extractStudioSlug(path: string): string | null {
  const match = path.match(/\/studios\/([^/]+)\/studio\.json$/);
  return match ? match[1] : null;
}

/** Extract studio and title slugs from ".../studios/one-more-game/titles/swapmeat.json" */
function extractTitleParts(path: string): { studioSlug: string; titleSlug: string } | null {
  const match = path.match(/\/studios\/([^/]+)\/titles\/([^/]+)\.json$/);
  return match ? { studioSlug: match[1], titleSlug: match[2] } : null;
}

const STORAGE_KEY = 'steambb-workspace-selection';

/**
 * Default selection: studio with `"default": true`, or first alphabetically.
 * Within the studio, first title alphabetically.
 * Throws if the registry is empty — a build with no studios is misconfigured.
 */
function getDefaultSelection(): WorkspaceSelection {
  const studioSlugs = Object.keys(studios).sort();
  if (studioSlugs.length === 0) {
    throw new Error('No studios found in workspace registry. Check src/workspace/studios/ directory.');
  }

  // Prefer a studio marked as default; fall back to first alphabetically
  const defaultStudioSlug = studioSlugs.find(slug => studios[slug].default) ?? studioSlugs[0];

  const titleSlugs = Object.keys(titlesByStudio[defaultStudioSlug] ?? {}).sort();
  if (titleSlugs.length === 0) {
    throw new Error(`Studio "${defaultStudioSlug}" has no titles. Add at least one title JSON to its titles/ directory.`);
  }
  return { studioSlug: defaultStudioSlug, titleSlug: titleSlugs[0] };
}

const DEFAULT_SELECTION = getDefaultSelection();

/** Get persisted workspace selection (or default).
 *  Priority: localStorage > steambb-studio cookie (from CloudFront auth) > default.
 */
export function getWorkspaceSelection(): WorkspaceSelection {
  try {
    // 1. Check localStorage for explicit user selection
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WorkspaceSelection;
      if (studios[parsed.studioSlug] && titlesByStudio[parsed.studioSlug]?.[parsed.titleSlug]) {
        return parsed;
      }
    }

    // 2. Check steambb-studio cookie (set by CloudFront basic auth)
    const cookieStudio = getStudioFromCookie();
    if (cookieStudio && studios[cookieStudio] && titlesByStudio[cookieStudio]) {
      const titleSlugs = Object.keys(titlesByStudio[cookieStudio]).sort();
      if (titleSlugs.length > 0) {
        return { studioSlug: cookieStudio, titleSlug: titleSlugs[0] };
      }
    }

    // 3. Fall back to default
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
