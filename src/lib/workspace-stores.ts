/**
 * Re-instantiable workspace stores.
 *
 * Manages the current blacklist and DNT stores for the active workspace.
 * Calling switchWorkspace() rebuilds both stores with the new title's config.
 * localStorage keys are scoped by studio+title to isolate user additions.
 */

import { createTermStore, type TermStore } from './term-store';
import { getWorkspaceConfig, getWorkspaceSelection } from './workspace-loader';
import type { WorkspaceSelection } from './workspace-types';

let currentSelection = getWorkspaceSelection();
let blacklistStore: TermStore;
let dntStore: TermStore;

function buildStores(sel: WorkspaceSelection): void {
  const config = getWorkspaceConfig(sel);
  const scope = `${sel.studioSlug}-${sel.titleSlug}`;

  blacklistStore = createTermStore({
    defaults: [],
    titleDefaults: config.title.blockedWords,
    userStorageKey: `steambb-blacklist-user-${scope}`,
    // Migrate old unscoped key from before workspaces were scoped
    ...(sel.studioSlug === 'example-studio' && sel.titleSlug === 'example-game'
      ? { legacyStorageKey: 'steambb-blacklist-user-terms', legacyCleanupKeys: ['steambb-blacklist-terms'] }
      : {}),
  });

  dntStore = createTermStore({
    defaults: [],
    titleDefaults: config.title.dntTerms,
    userStorageKey: `steambb-dnt-user-${scope}`,
    // Migrate old unscoped key from before workspaces were scoped
    ...(sel.studioSlug === 'example-studio' && sel.titleSlug === 'example-game'
      ? { legacyStorageKey: 'steambb-dnt-user-terms', legacyCleanupKeys: ['steambb-dnt-terms'] }
      : {}),
  });
}

// Initialize with current selection
buildStores(currentSelection);

/** Switch to a different workspace. Rebuilds all stores. */
export function switchWorkspace(sel: WorkspaceSelection): void {
  currentSelection = sel;
  buildStores(sel);
}

export function getCurrentSelection(): WorkspaceSelection {
  return currentSelection;
}

export function getBlacklistStore(): TermStore {
  return blacklistStore;
}

export function getDntStore(): TermStore {
  return dntStore;
}
