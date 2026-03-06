import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MarkdownPanel, TagReference } from '@/components';
import { OutputPanel } from '@/components/OutputPanel';
import { markdownToBBCode } from '@/lib/converter';
import { confluenceToBBCode } from '@/lib/confluence-converter';
import { detectFormat, type InputFormat } from '@/lib/format-detector';
import { extractPlaceholderImages, resolvePlaceholders, type ImageUrlMap } from '@/lib/image-placeholders';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAutoSave, formatLastSaved } from '@/hooks/useAutoSave';
import { useFileService, MD_FILTERS } from '@/hooks/useFileService';
import { useRecentFiles } from '@/hooks/useRecentFiles';
import type { SteamContext } from '@/lib/contexts';
import { CONTEXT_LABELS } from '@/lib/contexts';
import { WELCOME_MARKDOWN } from '@/lib/welcome';
import { trackEvent } from '@/lib/analytics';

import '@/styles/app.css';
import '@/styles/steam-theme.css';

export function App() {
  // File service
  const { openFile, saveFileAs, isDesktop, currentFile } = useFileService();

  // Recent files (desktop only)
  const { addRecentFile } = useRecentFiles();

  // File names - null means we're showing the welcome doc
  const [mdFileName, setMdFileName] = useState<string | null>(null);

  // Markdown content - always starts with welcome doc on fresh load
  const [markdown, setMarkdown] = useState(WELCOME_MARKDOWN);

  // Context persists across sessions
  const [context, setContext] = useLocalStorage<SteamContext>('steam-bbcode-context', 'announcements');
  const [showTagRef, setShowTagRef] = useState(false);

  // Format detection (debounced)
  const [detectedFormat, setDetectedFormat] = useState<InputFormat>('markdown');
  const formatTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (formatTimerRef.current) {
      clearTimeout(formatTimerRef.current);
    }
    formatTimerRef.current = setTimeout(() => {
      setDetectedFormat(detectFormat(markdown));
    }, 300);
    return () => {
      if (formatTimerRef.current) {
        clearTimeout(formatTimerRef.current);
      }
    };
  }, [markdown]);

  // Auto-save draft for crash recovery
  const { status: saveStatus, lastSaved } = useAutoSave('steam-bbcode-draft', { markdown, context }, 2000);

  // Convert to BBCode using the appropriate converter based on detected format
  const { bbcode, notes } = useMemo(
    () => {
      if (detectedFormat === 'confluence') {
        return confluenceToBBCode(markdown, context);
      }
      return markdownToBBCode(markdown, context);
    },
    [markdown, context, detectedFormat]
  );

  // Image placeholder state — maps filename to Steam URL
  const [imageUrls, setImageUrls] = useState<ImageUrlMap>({});

  // Extract placeholder filenames from BBCode
  const placeholderImages = useMemo(
    () => extractPlaceholderImages(bbcode),
    [bbcode]
  );

  // Resolve placeholders in BBCode using user-provided URLs
  const resolvedBBCode = useMemo(
    () => resolvePlaceholders(bbcode, imageUrls),
    [bbcode, imageUrls]
  );

  // Handle image URL changes from the Images panel
  const handleImageUrlChange = useCallback((filename: string, url: string) => {
    setImageUrls(prev => ({ ...prev, [filename]: url }));
  }, []);

  // Clear image URLs when content changes significantly (new file opened)
  const prevPlaceholdersRef = useRef<string[]>([]);
  useEffect(() => {
    const prev = prevPlaceholdersRef.current;
    const curr = placeholderImages;
    // If the set of filenames changed completely, reset the URL map
    // but preserve URLs for filenames that still exist
    if (prev.length > 0 && curr.length > 0) {
      const currSet = new Set(curr);
      const removed = prev.filter(f => !currSet.has(f));
      if (removed.length > 0) {
        setImageUrls(prevUrls => {
          const next = { ...prevUrls };
          for (const f of removed) {
            delete next[f];
          }
          return next;
        });
      }
    }
    prevPlaceholdersRef.current = curr;
  }, [placeholderImages]);

  // File operations
  const handleOpenMarkdown = useCallback(async () => {
    const content = await openFile(MD_FILTERS);
    if (content !== null) {
      setMarkdown(content);
      trackEvent('file_opened', { source: 'dialog' });
    }
  }, [openFile, setMarkdown]);

  // Track opened files in recent list
  useEffect(() => {
    if (currentFile?.path && currentFile?.name) {
      addRecentFile(currentFile.path, currentFile.name);
      setMdFileName(currentFile.name);
    }
  }, [currentFile, addRecentFile]);

  // Update window title with document name (Tauri only)
  useEffect(() => {
    if (!isDesktop) return;
    const title = mdFileName
      ? `${mdFileName} - SteamBBEditor`
      : 'SteamBBEditor';
    import('@tauri-apps/api/window').then(({ appWindow }) => {
      appWindow.setTitle(title);
    }).catch(() => {});
  }, [mdFileName, isDesktop]);

  const handleSaveMarkdownAs = useCallback(async () => {
    const defaultName = mdFileName || 'document.md';
    const savedPath = await saveFileAs(markdown, defaultName, MD_FILTERS);
    if (savedPath) {
      const name = savedPath.split('/').pop() || defaultName;
      setMdFileName(name);
    }
  }, [saveFileAs, markdown, mdFileName]);

  // Copy BBCode to clipboard (for keyboard shortcut)
  const handleCopyBBCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(resolvedBBCode);
      trackEvent('copy_clicked', { panel: 'bbcode', source: 'shortcut' });
    } catch {
      // Silently fail — OutputPanel has its own copy button with feedback
    }
  }, [resolvedBBCode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+O or Ctrl+O - Open
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenMarkdown();
      }
      // Cmd+S or Ctrl+S - Save As
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveMarkdownAs();
      }
      // Cmd+Shift+C or Ctrl+Shift+C - Copy BBCode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        handleCopyBBCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenMarkdown, handleSaveMarkdownAs, handleCopyBBCode]);

  // Warn before leaving with unsaved changes
  const hasChanges = markdown !== WELCOME_MARKDOWN;

  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  return (
    <div className="app">
      <div className="app-content">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <h1 className="title">
              SteamBBEditor
              {isDesktop && <span className="title-badge">Desktop</span>}
            </h1>

            <div className="controls">
              <div className="control-group">
                <label className="control-label">Steam Context:</label>
                <select
                  className="control-select"
                  value={context}
                  onChange={(e) => {
                    const newContext = e.target.value as SteamContext;
                    setContext(newContext);
                    trackEvent('context_changed', { context: newContext });
                  }}
                >
                  {Object.entries(CONTEXT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className={`btn btn-sm ${showTagRef ? 'btn-active' : 'btn-secondary'}`}
                onClick={() => setShowTagRef(!showTagRef)}
                title="BBCode tag reference"
              >
                Tags
              </button>
            </div>
          </div>

          {/* Conversion notes */}
          {notes.length > 0 && (
            <div className="conversion-notes">
              {notes.map((note, i) => (
                <span key={i} className="conversion-note">
                  ℹ {note}
                </span>
              ))}
            </div>
          )}

          {/* Tag reference panel */}
          {showTagRef && <TagReference />}
        </header>

        {/* Two-panel layout */}
        <main className="main-grid two-panel">
          <MarkdownPanel
            value={markdown}
            onChange={setMarkdown}
            fileName={mdFileName}
            onOpen={handleOpenMarkdown}
            onSaveAs={handleSaveMarkdownAs}
            detectedFormat={detectedFormat}
            context={context}
          />

          <OutputPanel
            bbcode={resolvedBBCode}
            context={context}
            isDesktop={isDesktop}
            placeholderImages={placeholderImages}
            imageUrls={imageUrls}
            onImageUrlChange={handleImageUrlChange}
          />
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-left">
            <span className="keyboard-hints">
              <kbd>⌘O</kbd> Open
              <kbd>⌘S</kbd> Save
              <kbd>⌘⇧C</kbd> Copy BBCode
            </span>
            <span className="footer-label">SteamBBEditor</span>
            <a
              href="https://github.com/PlayOneMoreGame/steam-bbcode/issues/new/choose"
              target="_blank"
              rel="noopener"
              className="feedback-link"
            >
              Feedback
            </a>
          </div>
          <div className="footer-save-status">
            {saveStatus === 'saving' && <span className="save-indicator saving">Saving...</span>}
            {saveStatus === 'saved' && lastSaved && (
              <span className="save-indicator saved">Saved {formatLastSaved(lastSaved)}</span>
            )}
            {saveStatus === 'unsaved' && <span className="save-indicator unsaved">●</span>}
          </div>
        </footer>
      </div>
    </div>
  );
}
