import { useState, useEffect, useRef, useCallback } from 'react';

interface AutoSaveState {
  status: 'saved' | 'saving' | 'unsaved';
  lastSaved: Date | null;
}

/**
 * Hook for auto-saving content to localStorage with debouncing
 */
export function useAutoSave<T>(
  key: string,
  value: T,
  delay: number = 2000 // 2 seconds default
): AutoSaveState & { save: () => void } {
  const [state, setState] = useState<AutoSaveState>({
    status: 'saved',
    lastSaved: null,
  });
  
  const timeoutRef = useRef<number | null>(null);
  const lastValueRef = useRef<string>(JSON.stringify(value));

  // Load initial saved time
  useEffect(() => {
    const savedTime = localStorage.getItem(`${key}-saved-at`);
    if (savedTime) {
      setState(s => ({ ...s, lastSaved: new Date(savedTime) }));
    }
  }, [key]);

  // Manual save
  const save = useCallback(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      const now = new Date();
      localStorage.setItem(`${key}-saved-at`, now.toISOString());
      lastValueRef.current = JSON.stringify(value);
      setState({ status: 'saved', lastSaved: now });
    } catch (error) {
      console.warn(`Error saving to localStorage:`, error);
    }
  }, [key, value]);

  // Debounced auto-save
  useEffect(() => {
    const currentValue = JSON.stringify(value);
    
    // No change
    if (currentValue === lastValueRef.current) {
      return;
    }

    // Mark as unsaved
    setState(s => ({ ...s, status: 'unsaved' }));

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = window.setTimeout(() => {
      setState(s => ({ ...s, status: 'saving' }));
      
      try {
        localStorage.setItem(key, currentValue);
        const now = new Date();
        localStorage.setItem(`${key}-saved-at`, now.toISOString());
        lastValueRef.current = currentValue;
        setState({ status: 'saved', lastSaved: now });
      } catch (error) {
        console.warn(`Error auto-saving:`, error);
        setState(s => ({ ...s, status: 'unsaved' }));
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay]);

  return { ...state, save };
}

/**
 * Format last saved time as relative string
 */
export function formatLastSaved(date: Date | null): string {
  if (!date) return '';
  
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  
  return date.toLocaleDateString();
}
