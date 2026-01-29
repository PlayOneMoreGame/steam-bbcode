import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'steam-bbcode-recent-files';
const MAX_RECENT = 5;

export interface RecentFile {
  path: string;
  name: string;
  timestamp: number;
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentFiles(JSON.parse(stored));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Save to localStorage when changed
  const saveToStorage = useCallback((files: RecentFile[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch {
      // Ignore errors
    }
  }, []);

  // Add a file to recent list
  const addRecentFile = useCallback((path: string, name: string) => {
    if (!path) return; // Don't add browser files (no path)
    
    setRecentFiles(prev => {
      // Remove if already exists
      const filtered = prev.filter(f => f.path !== path);
      
      // Add to front
      const updated = [
        { path, name, timestamp: Date.now() },
        ...filtered
      ].slice(0, MAX_RECENT);
      
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Remove a file from recent list
  const removeRecentFile = useCallback((path: string) => {
    setRecentFiles(prev => {
      const updated = prev.filter(f => f.path !== path);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Clear all recent files
  const clearRecentFiles = useCallback(() => {
    setRecentFiles([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    recentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
  };
}
