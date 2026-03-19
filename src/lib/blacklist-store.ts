// Blocked words storage — delegates to workspace-stores for the active title.
// Three tiers: studio (none currently) > title (from workspace config) > user (localStorage)

import { getBlacklistStore } from './workspace-stores';

export const getBlacklist = () => getBlacklistStore().getAll();
export const addTerm = (t: string) => getBlacklistStore().add(t);
export const removeTerm = (t: string) => getBlacklistStore().remove(t);
export const resetBlacklist = () => getBlacklistStore().reset();
export const isOrgTerm = (t: string) => getBlacklistStore().isTitleDefault(t);
export const isTitleTerm = (t: string) => getBlacklistStore().isTitleDefault(t);
export const getTier = (t: string) => getBlacklistStore().getTier(t);
