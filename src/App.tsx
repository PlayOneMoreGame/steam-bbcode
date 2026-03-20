import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MarkdownPanel, TagReference } from '@/components';
import { OutputPanel } from '@/components/OutputPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { markdownToBBCode } from '@/lib/converter';
import { lintBBCode } from '@/lib/linter';
import { extractPlaceholderImages } from '@/lib/image-placeholders';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAutoSave, formatLastSaved } from '@/hooks/useAutoSave';
import { useFileService, MD_FILTERS } from '@/hooks/useFileService';
import { useRecentFiles } from '@/hooks/useRecentFiles';
import { useImageStore } from '@/hooks/useImageStore';
import { useBlacklist } from '@/hooks/useBlacklist';
import { useDntTerms } from '@/hooks/useDntTerms';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormatDetection } from '@/hooks/useFormatDetection';
import { useDocuments } from '@/hooks/useDocuments';
import type { InputFormat } from '@/lib/format-detector';
import { useResizablePanes } from '@/hooks/useResizablePanes';
import { getWorkspaceSelection, setWorkspaceSelection } from '@/lib/workspace-loader';
import { switchWorkspace } from '@/lib/workspace-stores';
import type { WorkspaceSelection } from '@/lib/workspace-types';
import type { SteamContext } from '@/lib/contexts';
import { CONTEXT_LABELS } from '@/lib/contexts';
import { WELCOME_MARKDOWN } from '@/lib/welcome';
import { trackEvent, trackPageView, buildWorkflowProperties, type InputMethod } from '@/lib/analytics';

import '@/styles/app.css';
import '@/styles/steam-theme.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

// Desktop downloads are hosted on the same domain under /downloads/
// Updated on each release via: aws s3 sync binaries/ s3://BUCKET/downloads/
const DOWNLOADS_BASE = '/downloads';

// Auto-updater state for desktop app
interface UpdateInfo {
  version: string;
  status: 'available' | 'downloading' | 'ready' | 'error';
  progress?: number;
  error?: string;
}

function useAutoUpdater(isDesktop: boolean) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const checkedRef = useRef(false);

  // Check for updates on mount (desktop only, non-blocking)
  useEffect(() => {
    if (!isDesktop || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update) {
          setUpdateInfo({ version: update.version, status: 'available' });
        }
      } catch {
        // Silently fail — updater not configured or no network
      }
    })();
  }, [isDesktop]);

  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo || updateInfo.status !== 'available') return;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) return;

      setUpdateInfo(prev => prev ? { ...prev, status: 'downloading', progress: 0 } : null);

      let totalBytes = 0;
      let downloadedBytes = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          setUpdateInfo(prev => prev ? { ...prev, progress } : null);
        } else if (event.event === 'Finished') {
          setUpdateInfo(prev => prev ? { ...prev, status: 'ready', progress: 100 } : null);
        }
      });

      // After install completes, prompt restart
      setUpdateInfo(prev => prev ? { ...prev, status: 'ready' } : null);
    } catch (err) {
      setUpdateInfo(prev => prev ? { ...prev, status: 'error', error: String(err) } : null);
    }
  }, [updateInfo]);

  const restartApp = useCallback(async () => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch {
      // process plugin not available — tell user to restart manually
      setUpdateInfo(prev => prev ? { ...prev, status: 'error', error: 'Please restart the app manually to complete the update.' } : null);
    }
  }, []);

  return { updateInfo, downloadAndInstall, restartApp };
}

/** Detect platform and return a download link to the S3-hosted binary. */
function useDownloadLink(isDesktop: boolean): { url: string; label: string } | null {
  if (isDesktop) return null;

  const ua = navigator.userAgent;
  const isMacUA = /Macintosh|Mac OS X/.test(ua);
  const isWindows = /Windows/.test(ua);

  if (isMacUA) {
    // Most modern Macs are Apple Silicon — offer aarch64 by default
    return { url: `${DOWNLOADS_BASE}/SteamBBEditor-latest-aarch64.dmg`, label: 'Desktop App (macOS)' };
  }
  if (isWindows) {
    return { url: `${DOWNLOADS_BASE}/SteamBBEditor-latest.msi`, label: 'Desktop App (Windows)' };
  }
  return null;
}

export function App() {
  // File service
  const { openFile, saveFileAs, isDesktop, currentFile } = useFileService();

  // Desktop app download link (web only)
  const downloadInfo = useDownloadLink(isDesktop);
  const [showInstallTip, setShowInstallTip] = useState(false);

  // Auto-updater (desktop only)
  const { updateInfo, downloadAndInstall, restartApp } = useAutoUpdater(isDesktop);

  // Analytics: session start + page view on mount
  const inputMethodRef = useRef<InputMethod>('unknown');
  const pasteTimestampRef = useRef<number | null>(null);
  const contentAtPasteRef = useRef<string>('');

  useEffect(() => {
    trackPageView();
    trackEvent('session_start', {
      is_desktop: isDesktop,
      user_agent: navigator.userAgent,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recent files (desktop only)
  const { addRecentFile } = useRecentFiles();

  // File name persists across sessions so the window title restores on relaunch
  const [mdFileName, setMdFileName] = useLocalStorage<string | null>('steam-bbcode-filename', null);

  // Context persists across sessions
  const [context, setContext] = useLocalStorage<SteamContext>('steam-bbcode-context', 'announcements');
  const [showTagRef, setShowTagRef] = useState(false);
  const tagsBtnRef = useRef<HTMLButtonElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  // Workspace selection (studio + title) — must be declared before draftKey
  const [workspaceSelection, setWorkspaceSelectionState] = useState<WorkspaceSelection>(() => getWorkspaceSelection());
  const workspaceKey = `${workspaceSelection.studioSlug}/${workspaceSelection.titleSlug}`;

  // Draft storage key scoped by studio+title so switching workspaces doesn't overwrite work
  const draftKey = `steam-bbcode-draft-${workspaceSelection.studioSlug}-${workspaceSelection.titleSlug}`;

  // Markdown content — restore saved draft for returning users, welcome doc for first visit
  const [markdown, setMarkdown] = useState(() => {
    // Migrate legacy unscoped draft to current workspace on first load
    try {
      const legacyDraft = localStorage.getItem('steam-bbcode-draft');
      if (legacyDraft && !localStorage.getItem(draftKey)) {
        localStorage.setItem(draftKey, legacyDraft);
        // Also migrate the saved-at timestamp
        const legacySavedAt = localStorage.getItem('steam-bbcode-draft-saved-at');
        if (legacySavedAt) {
          localStorage.setItem(`${draftKey}-saved-at`, legacySavedAt);
          localStorage.removeItem('steam-bbcode-draft-saved-at');
        }
        localStorage.removeItem('steam-bbcode-draft');
      }
    } catch { /* migration failed, continue */ }

    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const { markdown: savedMarkdown } = JSON.parse(saved);
        // Return visitor with work in progress — restore it
        if (savedMarkdown && savedMarkdown !== WELCOME_MARKDOWN) return savedMarkdown;
        // Return visitor with nothing in progress — start empty
        if (savedMarkdown === WELCOME_MARKDOWN) return '';
      }
    } catch { /* corrupted draft, fall through */ }
    // First visit — show welcome doc
    return WELCOME_MARKDOWN;
  });
  const baseContentRef = useRef(markdown);

  const handleSwitchWorkspace = useCallback((sel: WorkspaceSelection) => {
    setWorkspaceSelection(sel);
    switchWorkspace(sel);
    setWorkspaceSelectionState(sel);

    // Load the new workspace's draft (or start empty)
    const newDraftKey = `steam-bbcode-draft-${sel.studioSlug}-${sel.titleSlug}`;
    let newMarkdown = '';
    try {
      const saved = localStorage.getItem(newDraftKey);
      if (saved) {
        const { markdown: savedMarkdown } = JSON.parse(saved);
        if (savedMarkdown && savedMarkdown !== WELCOME_MARKDOWN) {
          newMarkdown = savedMarkdown;
        }
      }
    } catch { /* corrupted draft, start empty */ }
    setMarkdown(newMarkdown);
    setMdFileName(null);
    baseContentRef.current = newMarkdown;

    trackEvent('workspace_switched', { studio: sel.studioSlug, title: sel.titleSlug });
  }, []);

  // Blacklist state — loaded from localStorage, refreshes on workspace switch
  const { blacklist, addTerm: handleAddBlacklistTerm, removeTerm: handleRemoveBlacklistTerm, resetBlacklist: handleResetBlacklist } = useBlacklist(workspaceKey);

  // DNT (Do Not Translate) state — loaded from localStorage, refreshes on workspace switch
  const { dntTerms, addTerm: handleAddDntTerm, removeTerm: handleRemoveDntTerm, resetTerms: handleResetDntTerms } = useDntTerms(workspaceKey);

  // Format detection (debounced auto-detection + manual override)
  const detectedFormat = useFormatDetection(markdown);
  const [selectedFormat, setSelectedFormat] = useState<InputFormat | null>(null);

  // When user manually selects a format, override auto-detection
  const handleFormatChange = useCallback((format: InputFormat) => {
    setSelectedFormat(format);
  }, []);

  // Resizable split panes
  const { splitRatio, handleMouseDown: handleResizeMouseDown, handleDoubleClick: handleResizeDoubleClick, containerRef } = useResizablePanes();

  // Auto-save draft for crash recovery (scoped per studio+title)
  const { status: saveStatus, lastSaved } = useAutoSave(draftKey, { markdown, context }, 2000);

  // Convert editor markdown to BBCode — one pipeline, no exceptions
  const { bbcode, notes } = useMemo(
    () => markdownToBBCode(markdown, context),
    [markdown, context]
  );

  // Lint BBCode output — used by both panels (status indicator + error list)
  const bbcodeLint = useMemo(
    () => lintBBCode(bbcode, context, { blacklist }),
    [bbcode, context, blacklist]
  );

  // In-memory image store for drag-and-drop / pasted images
  const imageStore = useImageStore();

  // Extract image filenames from drop markers in BBCode
  const placeholderImages = useMemo(
    () => extractPlaceholderImages(bbcode),
    [bbcode]
  );

  // Handle drag-and-drop / pasted images — store in memory
  const handleImageDrop = useCallback((filename: string, dataUrl: string) => {
    imageStore.addImage(filename, dataUrl);
  }, [imageStore]);

  // Handle text file drop — load file content into editor
  const handleFileDrop = useCallback((filename: string, content: string) => {
    setMarkdown(content);
    setMdFileName(filename);
    baseContentRef.current = content;
    inputMethodRef.current = 'file_open';
    pasteTimestampRef.current = Date.now();
    contentAtPasteRef.current = content;
    trackEvent('file_opened', { source: 'drag_drop' });
  }, []);

  // File operations
  const handleOpenMarkdown = useCallback(async () => {
    const content = await openFile(MD_FILTERS);
    if (content !== null) {
      setMarkdown(content);
      baseContentRef.current = content;
      inputMethodRef.current = 'file_open';
      pasteTimestampRef.current = Date.now();
      contentAtPasteRef.current = content;
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
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().setTitle(title);
    }).catch(() => {});
  }, [mdFileName, isDesktop]);

  // Document storage — save/load/delete per title
  const { documents, activeDocId, saveCurrentDoc, loadDoc, deleteDoc, clearActiveDoc } = useDocuments(workspaceKey);

  // Reset editor to welcome document (New)
  const handleNew = useCallback(() => {
    if (markdown !== baseContentRef.current) {
      if (!window.confirm('You have unsaved changes. Discard and start a new document?')) {
        return;
      }
    }
    setMarkdown(WELCOME_MARKDOWN);
    setMdFileName(null);
    baseContentRef.current = WELCOME_MARKDOWN;
    clearActiveDoc();
    trackEvent('new_document');
  }, [markdown, clearActiveDoc]);

  const handleSaveMarkdownAs = useCallback(async () => {
    const defaultName = mdFileName || 'document.md';
    const savedPath = await saveFileAs(markdown, defaultName, MD_FILTERS);
    if (savedPath) {
      const name = savedPath.split('/').pop() || defaultName;
      setMdFileName(name);
      baseContentRef.current = markdown;
    }
  }, [saveFileAs, markdown, mdFileName]);

  // Translation state
  const { translations, apiKeyDialogOpen, setApiKeyDialogOpen, handleTranslate, handleApiKeySaved } = useTranslation(bbcode, dntTerms);

  // Derive active document name from the documents list
  const activeDocName = useMemo(() => {
    if (!activeDocId) return null;
    const doc = documents.find(d => d.id === activeDocId);
    return doc?.name ?? null;
  }, [activeDocId, documents]);

  // Save current document (captures all state)
  const handleSaveDocument = useCallback((name: string) => {
    // Collect completed translations as a simple lang -> bbcode map
    const translationMap: Record<string, string> = {};
    for (const [lang, t] of Object.entries(translations)) {
      if (t.status === 'done' && t.bbcode) {
        translationMap[lang] = t.bbcode;
      }
    }
    saveCurrentDoc({
      name,
      inputMarkdown: markdown,
      outputBBCode: bbcode,
      translations: Object.keys(translationMap).length > 0 ? translationMap : undefined,
      context,
    });
    trackEvent('document_saved', { has_translations: Object.keys(translationMap).length > 0 });
  }, [markdown, bbcode, translations, context, saveCurrentDoc]);

  // Load a saved document
  const handleLoadDocument = useCallback((docId: string) => {
    const doc = loadDoc(docId);
    if (!doc) return;
    setMarkdown(doc.inputMarkdown);
    setMdFileName(null);
    baseContentRef.current = doc.inputMarkdown;
    if (doc.context) {
      setContext(doc.context as SteamContext);
    }
    trackEvent('document_loaded');
  }, [loadDoc]);

  // Delete a saved document
  const handleDeleteDocument = useCallback((docId: string) => {
    deleteDoc(docId);
    trackEvent('document_deleted');
  }, [deleteDoc]);

  // Copy BBCode to clipboard (for keyboard shortcut)
  const handleCopyBBCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bbcode);
      trackEvent('copy_clicked', { panel: 'bbcode', source: 'shortcut' });
      trackEvent('workflow_completed', buildWorkflowProperties({
        inputMethod: inputMethodRef.current,
        bbcodeLength: bbcode.length,
        imageCount: placeholderImages.length,
        lintErrorCount: bbcodeLint.errors.length,
        lintWarningCount: bbcodeLint.warnings.length,
        pasteTimestamp: pasteTimestampRef.current,
        context,
        editedAfterPaste: contentAtPasteRef.current !== '' && markdown !== contentAtPasteRef.current,
      }));
    } catch {
      // Silently fail — OutputPanel has its own copy button with feedback
    }
  }, [bbcode, bbcodeLint, context, markdown, placeholderImages.length]);

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
    if (!('__TAURI_INTERNALS__' in window) && !('__TAURI__' in window)) return;

    let unlistenMenu: (() => void) | undefined;
    let unlistenFileOpen: (() => void) | undefined;

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
        unlistenMenu = fn;
      });

      // Listen for file-open events (launched with file argument or file association)
      listen<{ filename: string; content: string; path: string }>('file-open', (event) => {
        const { filename, content } = event.payload;
        setMarkdown(content);
        setMdFileName(filename);
        baseContentRef.current = content;
        inputMethodRef.current = 'file_open';
        pasteTimestampRef.current = Date.now();
        contentAtPasteRef.current = content;
        trackEvent('file_opened', { source: 'file_association' });
      }).then((fn) => {
        unlistenFileOpen = fn;
      });
    });

    return () => {
      unlistenMenu?.();
      unlistenFileOpen?.();
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

  return (
    <div className="app">
      <div className="app-content">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <h1 className="title">SteamBBEditor</h1>

            <div className="controls">
              <div className="control-group">
                <label className="control-label">Post Type:</label>
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
                className={`btn btn-sm ${showDocuments ? 'btn-active' : 'btn-secondary'}`}
                onClick={() => setShowDocuments(!showDocuments)}
                title="Saved documents"
                data-testid="documents-btn"
              >
                Documents{documents.length > 0 ? ` (${documents.length})` : ''}
              </button>
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

          {/* Documents panel */}
          {showDocuments && (
            <DocumentsPanel
              documents={documents}
              activeDocId={activeDocId}
              activeDocName={activeDocName}
              onSave={handleSaveDocument}
              onLoad={handleLoadDocument}
              onDelete={handleDeleteDocument}
            />
          )}

          {/* Settings panel */}
          {showSettings && (
            <SettingsPanel
              blacklist={blacklist}
              onAddTerm={handleAddBlacklistTerm}
              onRemoveTerm={handleRemoveBlacklistTerm}
              onResetBlacklist={handleResetBlacklist}
              dntTerms={dntTerms}
              onAddDntTerm={handleAddDntTerm}
              onRemoveDntTerm={handleRemoveDntTerm}
              onResetDntTerms={handleResetDntTerms}
              workspaceSelection={workspaceSelection}
              onSwitchWorkspace={handleSwitchWorkspace}
            />
          )}
        </header>

        {/* Two-panel layout */}
        <main
          className="main-grid two-panel"
          ref={containerRef}
          style={{ gridTemplateColumns: `${splitRatio}fr 5px ${1 - splitRatio}fr` } as React.CSSProperties}
        >
          <MarkdownPanel
            value={markdown}
            onChange={setMarkdown}
            fileName={activeDocName || mdFileName}
            onOpen={handleOpenMarkdown}
            onSaveAs={handleSaveMarkdownAs}
            detectedFormat={detectedFormat}
            selectedFormat={selectedFormat ?? undefined}
            onFormatChange={handleFormatChange}
            context={context}
            blacklist={blacklist}
            onImageDrop={handleImageDrop}
            onFileDrop={handleFileDrop}
            onInputMethodChange={(method: InputMethod, content: string) => {
              inputMethodRef.current = method;
              pasteTimestampRef.current = Date.now();
              contentAtPasteRef.current = content;
            }}
          />

          <div
            className="resize-handle"
            data-testid="resize-handle"
            onMouseDown={handleResizeMouseDown}
            onDoubleClick={handleResizeDoubleClick}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            title="Drag to resize panels. Double-click to reset."
          />

          <OutputPanel
            bbcode={bbcode}
            context={context}
            bbcodeLint={bbcodeLint}
            blacklist={blacklist}
            isDesktop={isDesktop}
            placeholderImages={placeholderImages}
            imageDataUrls={imageStore.images}
            translations={translations}
            onTranslate={handleTranslate}
            apiKeyDialogOpen={apiKeyDialogOpen}
            onApiKeyDialogClose={() => setApiKeyDialogOpen(false)}
            onApiKeySaved={handleApiKeySaved}
            onWorkflowComplete={() => {
              trackEvent('workflow_completed', buildWorkflowProperties({
                inputMethod: inputMethodRef.current,
                bbcodeLength: bbcode.length,
                imageCount: placeholderImages.length,
                lintErrorCount: bbcodeLint.errors.length,
                lintWarningCount: bbcodeLint.warnings.length,
                pasteTimestamp: pasteTimestampRef.current,
                context,
                editedAfterPaste: contentAtPasteRef.current !== '' && markdown !== contentAtPasteRef.current,
              }));
            }}
          />
        </main>

        {/* Footer */}
        <footer className="footer">
          <span className="keyboard-hints">
            <kbd>{isMac ? '⌘' : 'Ctrl+'}N</kbd> New
            <kbd>{isMac ? '⌘' : 'Ctrl+'}O</kbd> Open
            <kbd>{isMac ? '⌘' : 'Ctrl+'}S</kbd> Save As
            <kbd>{isMac ? '⌘⇧' : 'Ctrl+Shift+'}C</kbd> Copy BBCode
            <kbd>{isMac ? '⌘' : 'Ctrl+'}1</kbd> Preview
            <kbd>{isMac ? '⌘' : 'Ctrl+'}2</kbd> BBCode
          </span>
          <div className="footer-right">
            <div className="footer-save-status">
              {saveStatus === 'saving' && <span className="save-indicator saving">Saving...</span>}
              {saveStatus === 'saved' && lastSaved && (
                <span className="save-indicator saved">Saved {formatLastSaved(lastSaved)}</span>
              )}
              {saveStatus === 'unsaved' && <span className="save-indicator unsaved">●</span>}
            </div>
            {isDesktop && updateInfo && (
              <span className="update-badge" data-testid="update-badge">
                {updateInfo.status === 'available' && (
                  <button
                    className="update-badge-btn"
                    onClick={downloadAndInstall}
                    title={`Update to v${updateInfo.version}`}
                  >
                    Update v{updateInfo.version}
                  </button>
                )}
                {updateInfo.status === 'downloading' && (
                  <span className="update-badge-progress">
                    Downloading{updateInfo.progress != null ? ` ${updateInfo.progress}%` : '...'}
                  </span>
                )}
                {updateInfo.status === 'ready' && (
                  <button
                    className="update-badge-btn update-badge-restart"
                    onClick={restartApp}
                  >
                    Restart to update
                  </button>
                )}
                {updateInfo.status === 'error' && (
                  <span className="update-badge-error" title={updateInfo.error}>
                    Update failed
                  </span>
                )}
              </span>
            )}
            {!isDesktop && downloadInfo && (
              <span className="download-app-wrapper">
                <a
                  href={downloadInfo.url}
                  className="feedback-link"
                  target="_blank"
                  rel="noopener"
                >
                  {downloadInfo.label} ↓
                </a>
                <button
                  className="install-tip-btn"
                  onClick={() => setShowInstallTip(prev => !prev)}
                  aria-label="Installation instructions"
                  title="Installation instructions"
                >
                  ?
                </button>
                {showInstallTip && (
                  <div className="install-tip-popover">
                    <p><strong>macOS:</strong> Right-click the app &rarr; Open &rarr; Click &ldquo;Open&rdquo;</p>
                    <p className="install-tip-code">If that doesn&rsquo;t work: <code>xattr -d com.apple.quarantine /Applications/SteamBBEditor.app</code></p>
                    <p><strong>Windows:</strong> Click &ldquo;More info&rdquo; &rarr; &ldquo;Run anyway&rdquo;</p>
                  </div>
                )}
              </span>
            )}
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
