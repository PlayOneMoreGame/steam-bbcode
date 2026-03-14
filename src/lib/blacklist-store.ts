// Blocked words storage — thin wrapper over createTermStore
// Three tiers:
//   studio defaults  — org-wide compliance baseline (from blocked-words-default.ts)
//   title defaults   — title-specific additions (from workspace config)
//   user additions   — per-person terms in localStorage
//
// All default tiers are immutable — users cannot add/remove them.

import { createTermStore } from './term-store';
import { DEFAULT_BLOCKED_WORDS } from './blocked-words-default';
import { getWorkspaceConfig } from './workspace-loader';

export { DEFAULT_BLOCKED_WORDS };

const { title } = getWorkspaceConfig();

const store = createTermStore({
  defaults: DEFAULT_BLOCKED_WORDS,
  titleDefaults: title.blockedWords ?? [],
  userStorageKey: 'steambb-blacklist-user-terms',
  legacyStorageKey: 'steambb-blacklist-terms',
  legacyCleanupKeys: ['steambb-blacklist-terms'],
});

export const getBlacklist = store.getAll;
export const addTerm = store.add;
export const removeTerm = store.remove;
export const resetBlacklist = store.reset;
export const isOrgTerm = store.isDefault;
export const isTitleTerm = store.isTitleDefault;
export const getTier = store.getTier;
