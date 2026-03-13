import { useState, useCallback } from 'react';
import { getDntTerms, addDntTerm, removeDntTerm, resetDntTerms as resetDntTermsStore, isWorkspaceTerm } from '@/lib/dnt-store';
import { trackEvent } from '@/lib/analytics';

export interface UseDntTermsReturn {
  dntTerms: string[];
  addTerm: (term: string) => void;
  removeTerm: (term: string) => void;
  resetTerms: () => void;
  isWorkspaceTerm: (term: string) => boolean;
}

export function useDntTerms(): UseDntTermsReturn {
  const [dntTerms, setDntTerms] = useState<string[]>(() => getDntTerms());

  const addTerm = useCallback((term: string) => {
    addDntTerm(term);
    setDntTerms(getDntTerms());
    trackEvent('dnt_term_added', { term });
  }, []);

  const removeTerm = useCallback((term: string) => {
    removeDntTerm(term);
    setDntTerms(getDntTerms());
    trackEvent('dnt_term_removed', { term });
  }, []);

  const resetTerms = useCallback(() => {
    resetDntTermsStore();
    setDntTerms(getDntTerms());
    trackEvent('dnt_terms_reset');
  }, []);

  return { dntTerms, addTerm, removeTerm, resetTerms, isWorkspaceTerm };
}
