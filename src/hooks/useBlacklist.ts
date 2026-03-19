import { useState, useCallback, useEffect } from 'react';
import { getBlacklist, addTerm as addBlacklistTerm, removeTerm as removeBlacklistTerm, resetBlacklist as resetBlacklistStore, isOrgTerm } from '@/lib/blacklist-store';
import { trackEvent } from '@/lib/analytics';

export { isOrgTerm };

export interface UseBlacklistReturn {
  blacklist: string[];
  addTerm: (term: string) => void;
  removeTerm: (term: string) => void;
  resetBlacklist: () => void;
  isOrgTerm: (term: string) => boolean;
}

export function useBlacklist(workspaceKey?: string): UseBlacklistReturn {
  const [blacklist, setBlacklist] = useState<string[]>(() => getBlacklist());

  // Re-read from store when workspace switches
  useEffect(() => {
    setBlacklist(getBlacklist());
  }, [workspaceKey]);

  const addTerm = useCallback((term: string) => {
    addBlacklistTerm(term);
    setBlacklist(getBlacklist());
    trackEvent('blacklist_term_added', { term });
  }, []);

  const removeTerm = useCallback((term: string) => {
    removeBlacklistTerm(term);
    setBlacklist(getBlacklist());
    trackEvent('blacklist_term_removed', { term });
  }, []);

  const resetBlacklist = useCallback(() => {
    resetBlacklistStore();
    setBlacklist(getBlacklist());
    trackEvent('blacklist_terms_reset');
  }, []);

  return { blacklist, addTerm, removeTerm, resetBlacklist, isOrgTerm };
}
