import { useState, useCallback, useRef, useEffect } from 'react';
import { translateBBCode, hashString } from '@/lib/translation-service';
import { getApiKey } from '@/lib/api-key-store';
import { trackEvent } from '@/lib/analytics';
import type { TranslationState } from '@/components/OutputPanel';

export interface UseTranslationReturn {
  translations: Record<string, TranslationState>;
  apiKeyDialogOpen: boolean;
  setApiKeyDialogOpen: (open: boolean) => void;
  handleTranslate: (lang: string) => Promise<void>;
  handleApiKeySaved: () => void;
}

export function useTranslation(bbcode: string, dntTerms: string[]): UseTranslationReturn {
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const sourceHashRef = useRef<number>(0);

  // Track source BBCode hash for stale detection
  useEffect(() => {
    const newHash = hashString(bbcode);
    if (sourceHashRef.current !== 0 && sourceHashRef.current !== newHash) {
      // Source changed — mark all completed translations as stale
      setTranslations(prev => {
        const next = { ...prev };
        for (const lang of Object.keys(next)) {
          if (next[lang].status === 'done') {
            next[lang] = { ...next[lang], stale: true };
          }
        }
        return next;
      });
    }
    sourceHashRef.current = newHash;
  }, [bbcode]);

  const handleTranslate = useCallback(async (lang: string) => {
    // Check for API key first
    if (!getApiKey()) {
      setApiKeyDialogOpen(true);
      return;
    }

    // Set translating state
    setTranslations(prev => ({
      ...prev,
      [lang]: { bbcode: '', status: 'translating', stale: false },
    }));

    trackEvent('translate_started', { lang });

    const result = await translateBBCode(bbcode, lang, dntTerms);

    if (result.ok) {
      setTranslations(prev => ({
        ...prev,
        [lang]: { bbcode: result.bbcode, status: 'done', stale: false },
      }));
      trackEvent('translate_completed', { lang });
    } else {
      if (result.code === 'missing_api_key') {
        setApiKeyDialogOpen(true);
        setTranslations(prev => ({
          ...prev,
          [lang]: { bbcode: '', status: 'idle', stale: false },
        }));
      } else {
        setTranslations(prev => ({
          ...prev,
          [lang]: { bbcode: '', status: 'error', error: result.error, stale: false },
        }));
        trackEvent('translate_error', { lang, error: result.error });
      }
    }
  }, [bbcode, dntTerms]);

  const handleApiKeySaved = useCallback(() => {
    setApiKeyDialogOpen(false);
  }, []);

  return { translations, apiKeyDialogOpen, setApiKeyDialogOpen, handleTranslate, handleApiKeySaved };
}
