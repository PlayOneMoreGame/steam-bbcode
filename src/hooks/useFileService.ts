// File service for Tauri (desktop) and browser fallback
// Provides Open/Save As dialogs in desktop, download fallback in browser

import { useState, useCallback } from 'react';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Dynamically import Tauri APIs only when in Tauri environment
const getTauriApis = async () => {
  if (!isTauri()) return null;
  
  const [dialog, fs] = await Promise.all([
    import('@tauri-apps/api/dialog'),
    import('@tauri-apps/api/fs'),
  ]);
  
  return { dialog, fs };
};

export interface FileInfo {
  name: string;
  path: string | null;
  content: string;
}

export interface UseFileServiceReturn {
  // Current file info
  currentFile: FileInfo | null;
  
  // Actions
  openFile: (filters?: FileFilter[]) => Promise<string | null>;
  openFilePath: (path: string) => Promise<string | null>;
  saveFileAs: (content: string, defaultName: string, filters?: FileFilter[]) => Promise<string | null>;
  
  // State
  isDesktop: boolean;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

const DEFAULT_MD_FILTERS: FileFilter[] = [
  { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
  { name: 'All Files', extensions: ['*'] },
];

const DEFAULT_TXT_FILTERS: FileFilter[] = [
  { name: 'Text', extensions: ['txt', 'bbcode'] },
  { name: 'All Files', extensions: ['*'] },
];

/**
 * Hook for file operations - works in both Tauri (desktop) and browser
 */
export function useFileService() {
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const isDesktop = isTauri();

  /**
   * Open a file via native dialog (Tauri) or file input (browser)
   */
  const openFile = useCallback(async (filters: FileFilter[] = DEFAULT_MD_FILTERS): Promise<string | null> => {
    if (isDesktop) {
      try {
        const apis = await getTauriApis();
        if (!apis) return null;
        
        const selected = await apis.dialog.open({
          multiple: false,
          filters,
        });
        
        if (!selected || Array.isArray(selected)) return null;
        
        const content = await apis.fs.readTextFile(selected);
        const name = selected.replace(/^.*[\\/]/, '') || 'untitled';
        
        setCurrentFile({ name, path: selected, content });
        return content;
      } catch (err) {
        console.error('Failed to open file:', err);
        return null;
      }
    } else {
      // Browser fallback - use file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = filters.flatMap(f => f.extensions.map(e => `.${e}`)).join(',');
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          
          const content = await file.text();
          setCurrentFile({ name: file.name, path: null, content });
          resolve(content);
        };
        
        input.click();
      });
    }
  }, [isDesktop]);

  /**
   * Open a file directly by path (desktop only)
   */
  const openFilePath = useCallback(async (path: string): Promise<string | null> => {
    if (!isDesktop) return null;
    
    try {
      const apis = await getTauriApis();
      if (!apis) return null;
      
      const content = await apis.fs.readTextFile(path);
      const name = path.replace(/^.*[\\/]/, '') || 'untitled';
      
      setCurrentFile({ name, path, content });
      return content;
    } catch (err) {
      console.error('Failed to open file by path:', err);
      return null;
    }
  }, [isDesktop]);

  /**
   * Save file via native dialog (Tauri) or download (browser)
   * Always prompts for location - non-destructive "Save As" behavior
   */
  const saveFileAs = useCallback(async (
    content: string, 
    defaultName: string, 
    filters: FileFilter[] = DEFAULT_TXT_FILTERS
  ): Promise<string | null> => {
    if (isDesktop) {
      try {
        const apis = await getTauriApis();
        if (!apis) return null;
        
        const savePath = await apis.dialog.save({
          defaultPath: defaultName,
          filters,
        });
        
        if (!savePath) return null;
        
        await apis.fs.writeTextFile(savePath, content);
        
        const name = savePath.replace(/^.*[\\/]/, '') || defaultName;
        setCurrentFile({ name, path: savePath, content });
        
        return savePath;
      } catch (err) {
        console.error('Failed to save file:', err);
        return null;
      }
    } else {
      // Browser fallback - download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      
      setCurrentFile({ name: defaultName, path: null, content });
      return defaultName;
    }
  }, [isDesktop]);

  return {
    currentFile,
    openFile,
    openFilePath,
    saveFileAs,
    isDesktop,
  };
}

// Preset filters for convenience
export const MD_FILTERS = DEFAULT_MD_FILTERS;
export const TXT_FILTERS = DEFAULT_TXT_FILTERS;
export const BBCODE_FILTERS: FileFilter[] = [
  { name: 'BBCode', extensions: ['txt', 'bbcode'] },
  { name: 'All Files', extensions: ['*'] },
];
