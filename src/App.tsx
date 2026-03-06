import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MarkdownPanel, TagReference } from '@/components';
import { OutputPanel, type TranslationState } from '@/components/OutputPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { getBlacklist, addTerm as addBlacklistTerm, removeTerm as removeBlacklistTerm } from '@/lib/blacklist-store';
import { markdownToBBCode } from '@/lib/converter';
import { confluenceToBBCode } from '@/lib/confluence-converter';
import { detectFormat, type InputFormat } from '@/lib/format-detector';
import { extractPlaceholderImages, resolvePlaceholders, type ImageUrlMap } from '@/lib/image-placeholders';
import { translateBBCode, hashString } from '@/lib/translation-service';
import { getApiKey } from '@/lib/api-key-store';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAutoSave, formatLastSaved } from '@/hooks/useAutoSave';
import { useFileService, MD_FILTERS } from '@/hooks/useFileService';
import { useRecentFiles } from '@/hooks/useRecentFiles';
import { useImageStore } from '@/hooks/useImageStore';
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
  const baseContentRef = useRef(WELCOME_MARKDOWN);

  // Context persists across sessions
  const [context, setContext] = useLocalStorage<SteamContext>('steam-bbcode-context', 'announcements');
  const [showTagRef, setShowTagRef] = useState(false);
  const tagsBtnRef = useRef<HTMLButtonElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Blacklist state — loaded from localStorage
  const [blacklist, setBlacklist] = useState<string[]>(() => getBlacklist());

  const handleAddBlacklistTerm = useCallback((term: string) => {
    addBlacklistTerm(term);
    setBlacklist(getBlacklist());
  }, []);

  const handleRemoveBlacklistTerm = useCallback((term: string) => {
    removeBlacklistTerm(term);
    setBlacklist(getBlacklist());
  }, []);

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

  // In-memory image store for drag-and-drop / pasted images
  const imageStore = useImageStore();

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

  // Handle drag-and-drop / pasted images — store in memory
  const handleImageDrop = useCallback((filename: string, dataUrl: string) => {
    imageStore.addImage(filename, dataUrl);
  }, [imageStore]);

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
      baseContentRef.current = content;
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

  // Reset editor to welcome document (New)
  const handleNew = useCallback(() => {
    setMarkdown(WELCOME_MARKDOWN);
    setMdFileName(null);
    baseContentRef.current = WELCOME_MARKDOWN;
    trackEvent('new_document');
  }, []);

  const handleSaveMarkdownAs = useCallback(async () => {
    const defaultName = mdFileName || 'document.md';
    const savedPath = await saveFileAs(markdown, defaultName, MD_FILTERS);
    if (savedPath) {
      const name = savedPath.split('/').pop() || defaultName;
      setMdFileName(name);
      baseContentRef.current = markdown;
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
  // Native menu captures Cmd+N, Cmd+O, Cmd+S in desktop mode; this handler covers web mode.
  // Cmd+Shift+C (Copy BBCode) is not in the native menu — handled here in both modes.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+C or Ctrl+Shift+C - Copy BBCode (not in native menu, handle in both modes)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        handleCopyBBCode();
        return;
      }
      // In desktop mode, Tauri native menu handles Cmd+N/O/S — skip to avoid double-fire
      if (isDesktop) return;
      // Cmd+N or Ctrl+N - New
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNew();
      }
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, handleNew, handleOpenMarkdown, handleSaveMarkdownAs, handleCopyBBCode]);

  // Listen for native menu events from Tauri (desktop only)
  useEffect(() => {
    if (!('__TAURI__' in window)) return;

    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string>('menu-event', (event) => {
        switch (event.payload) {
          case 'new':
            handleNew();
            break;
          case 'open':
            handleOpenMarkdown();
            break;
          case 'save-as':
            handleSaveMarkdownAs();
            break;
          case 'toggle-tags':
            setShowTagRef(prev => !prev);
            break;
          case 'toggle-settings':
            setShowSettings(prev => !prev);
            break;
        }
      }).then((fn) => {
        unlisten = fn;
      });
    });

    return () => {
      unlisten?.();
    };
  }, [handleNew, handleOpenMarkdown, handleSaveMarkdownAs]);

  // Warn before leaving with unsaved changes
  const hasChanges = markdown !== baseContentRef.current;

  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Translation state
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const sourceHashRef = useRef<number>(0);

  // Track source BBCode hash for stale detection
  useEffect(() => {
    const newHash = hashString(resolvedBBCode);
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
  }, [resolvedBBCode]);

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

    const result = await translateBBCode(resolvedBBCode, lang);

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
  }, [resolvedBBCode]);

  const handleApiKeySaved = useCallback(() => {
    setApiKeyDialogOpen(false);
  }, []);

  return (
    <div className="app">
      <div className="app-content">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <h1 className="title">
              SteamBBEditor

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
              <div className="tag-reference-wrapper">
                <button
                  ref={tagsBtnRef}
                  className={`btn btn-sm ${showTagRef ? 'btn-active' : 'btn-secondary'}`}
                  onClick={() => setShowTagRef(!showTagRef)}
                  title="BBCode tag reference"
                >
                  Tags
                </button>
                {showTagRef && (
                  <TagReference
                    onClose={() => setShowTagRef(false)}
                    anchorRef={tagsBtnRef}
                  />
                )}
              </div>
              <button
                className={`btn btn-sm ${showSettings ? 'btn-active' : 'btn-secondary'}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
                data-testid="settings-btn"
              >
                Settings
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

          {/* Settings panel */}
          {showSettings && (
            <SettingsPanel
              blacklist={blacklist}
              onAddTerm={handleAddBlacklistTerm}
              onRemoveTerm={handleRemoveBlacklistTerm}
            />
          )}
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
            blacklist={blacklist}
            onImageDrop={handleImageDrop}
          />

          <OutputPanel
            bbcode={resolvedBBCode}
            context={context}
            isDesktop={isDesktop}
            placeholderImages={placeholderImages}
            imageUrls={imageUrls}
            onImageUrlChange={handleImageUrlChange}
            imageDataUrls={imageStore.images}
            translations={translations}
            onTranslate={handleTranslate}
            apiKeyDialogOpen={apiKeyDialogOpen}
            onApiKeyDialogClose={() => setApiKeyDialogOpen(false)}
            onApiKeySaved={handleApiKeySaved}
          />
        </main>

        {/* Footer */}
        <footer className="footer">
          <span className="keyboard-hints">
            <kbd>⌘N</kbd> New
            <kbd>⌘O</kbd> Open
            <kbd>⌘S</kbd> Save As
            <kbd>⌘⇧C</kbd> Copy BBCode
          </span>
          <div className="footer-right">
            <div className="footer-save-status">
              {saveStatus === 'saving' && <span className="save-indicator saving">Saving...</span>}
              {saveStatus === 'saved' && lastSaved && (
                <span className="save-indicator saved">Saved {formatLastSaved(lastSaved)}</span>
              )}
              {saveStatus === 'unsaved' && <span className="save-indicator unsaved">●</span>}
            </div>
            <a
              href="https://github.com/PlayOneMoreGame/steam-bbcode/issues/new/choose"
              target="_blank"
              rel="noopener"
              className="feedback-link"
            >
              Feedback
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
