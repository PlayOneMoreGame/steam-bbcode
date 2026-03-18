import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MarkdownPanel, TagReference } from '@/components';
import { OutputPanel } from '@/components/OutputPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
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
import { useResizablePanes } from '@/hooks/useResizablePanes';
import type { SteamContext } from '@/lib/contexts';
import { CONTEXT_LABELS } from '@/lib/contexts';
import { WELCOME_MARKDOWN } from '@/lib/welcome';
import { trackEvent, trackPageView, buildWorkflowProperties, type InputMethod } from '@/lib/analytics';

import '@/styles/app.css';
import '@/styles/steam-theme.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const GITHUB_RELEASES_URL = 'https://github.com/PlayOneMoreGame/steam-bbcode/releases';
const GITHUB_API_LATEST = 'https://api.github.com/repos/PlayOneMoreGame/steam-bbcode/releases/latest';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  assets: ReleaseAsset[];
}

function detectPlatformAsset(assets: ReleaseAsset[]): { url: string; label: string } | null {
  const ua = navigator.userAgent;
  const isMacUA = /Macintosh|Mac OS X/.test(ua);
  const isWindows = /Windows/.test(ua);

  if (isMacUA) {
    // Detect Apple Silicon vs Intel via GPU renderer or platform heuristics
    // navigator.platform is deprecated but still widely supported
    const isARM = /ARM/.test(navigator.platform) ||
      // Chrome/Safari on Apple Silicon report this in userAgent
      /Mac OS X.*AppleWebKit/.test(ua) && typeof (navigator as unknown as Record<string, unknown>).userAgentData !== 'undefined';

    // Try aarch64 first for Apple Silicon, fall back to x64
    const armAsset = assets.find(a => a.name.endsWith('_aarch64.dmg'));
    const x64Asset = assets.find(a => a.name.endsWith('_x64.dmg'));

    if (isARM && armAsset) return { url: armAsset.browser_download_url, label: 'Desktop App (Apple Silicon)' };
    if (armAsset && !x64Asset) return { url: armAsset.browser_download_url, label: 'Desktop App (macOS)' };
    if (x64Asset && !armAsset) return { url: x64Asset.browser_download_url, label: 'Desktop App (macOS)' };
    // If both exist but we can't reliably detect arch, prefer aarch64 (most modern Macs)
    if (armAsset) return { url: armAsset.browser_download_url, label: 'Desktop App (macOS)' };
  }

  if (isWindows) {
    const msiAsset = assets.find(a => a.name.endsWith('.msi'));
    if (msiAsset) return { url: msiAsset.browser_download_url, label: 'Desktop App (Windows)' };
  }

  return null;
}

function useLatestRelease(isDesktop: boolean) {
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; label: string } | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (isDesktop || fetchedRef.current) return;
    fetchedRef.current = true;

    fetch(GITHUB_API_LATEST)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GitHubRelease>;
      })
      .then(release => {
        const match = detectPlatformAsset(release.assets);
        if (match) {
          setDownloadInfo(match);
        } else {
          setDownloadInfo({ url: GITHUB_RELEASES_URL, label: 'Desktop App' });
        }
      })
      .catch(() => {
        setDownloadInfo({ url: GITHUB_RELEASES_URL, label: 'Desktop App' });
      });
  }, [isDesktop]);

  return downloadInfo;
}

export function App() {
  // File service
  const { openFile, saveFileAs, isDesktop, currentFile } = useFileService();

  // Desktop app download link (web only)
  const downloadInfo = useLatestRelease(isDesktop);
  const [showInstallTip, setShowInstallTip] = useState(false);

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

  // Markdown content — restore saved draft for returning users, welcome doc for first visit
  const [markdown, setMarkdown] = useState(() => {
    try {
      const saved = localStorage.getItem('steam-bbcode-draft');
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

  // Context persists across sessions
  const [context, setContext] = useLocalStorage<SteamContext>('steam-bbcode-context', 'announcements');
  const [showTagRef, setShowTagRef] = useState(false);
  const tagsBtnRef = useRef<HTMLButtonElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Blacklist state — loaded from localStorage
  const { blacklist, addTerm: handleAddBlacklistTerm, removeTerm: handleRemoveBlacklistTerm, resetBlacklist: handleResetBlacklist } = useBlacklist();

  // DNT (Do Not Translate) state — loaded from localStorage
  const { dntTerms, addTerm: handleAddDntTerm, removeTerm: handleRemoveDntTerm, resetTerms: handleResetDntTerms } = useDntTerms();

  // Format detection (debounced)
  const detectedFormat = useFormatDetection(markdown);

  // Resizable split panes
  const { splitRatio, handleMouseDown: handleResizeMouseDown, handleDoubleClick: handleResizeDoubleClick, containerRef } = useResizablePanes();

  // Auto-save draft for crash recovery
  const { status: saveStatus, lastSaved } = useAutoSave('steam-bbcode-draft', { markdown, context }, 2000);

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
    trackEvent('new_document');
  }, [markdown]);

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
              onResetBlacklist={handleResetBlacklist}
              dntTerms={dntTerms}
              onAddDntTerm={handleAddDntTerm}
              onRemoveDntTerm={handleRemoveDntTerm}
              onResetDntTerms={handleResetDntTerms}
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
            fileName={mdFileName}
            onOpen={handleOpenMarkdown}
            onSaveAs={handleSaveMarkdownAs}
            detectedFormat={detectedFormat}
            context={context}
            blacklist={blacklist}
            onImageDrop={handleImageDrop}
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
