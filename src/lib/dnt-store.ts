// Do Not Translate term storage — thin wrapper over createTermStore
// DNT terms from the active title's workspace config are the defaults.
// No studio-level DNT terms exist yet (titleDefaults omitted).
// Users can add custom terms stored separately in localStorage.

import { createTermStore } from './term-store';
import { DO_NOT_TRANSLATE } from './glossary';

const store = createTermStore({
  defaults: DO_NOT_TRANSLATE,
  userStorageKey: 'steambb-dnt-user-terms',
  legacyStorageKey: 'steambb-dnt-terms',
});

export const getDntTerms = store.getAll;
export const addDntTerm = store.add;
export const removeDntTerm = store.remove;
export const resetDntTerms = store.reset;
export const isWorkspaceTerm = store.isDefault;
export const isTitleTerm = store.isTitleDefault;
export const getTier = store.getTier;
export const setDntTerms = store.setUserTerms;
