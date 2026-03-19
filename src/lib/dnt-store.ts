// Do Not Translate term storage — delegates to workspace-stores for the active title.
// Three tiers: studio (none currently) > title (from workspace config) > user (localStorage)

import { getDntStore } from './workspace-stores';

export const getDntTerms = () => getDntStore().getAll();
export const addDntTerm = (t: string) => getDntStore().add(t);
export const removeDntTerm = (t: string) => getDntStore().remove(t);
export const resetDntTerms = () => getDntStore().reset();
export const isTitleTerm = (t: string) => getDntStore().isTitleDefault(t);
export const getTier = (t: string) => getDntStore().getTier(t);
export const setDntTerms = (terms: string[]) => getDntStore().setUserTerms(terms);

/** Check if a term is protected (in any immutable tier — studio or title). */
export function isProtectedTerm(term: string): boolean {
  const store = getDntStore();
  return store.isDefault(term) || store.isTitleDefault(term);
}

// Backward compat alias
export const isWorkspaceTerm = isProtectedTerm;
