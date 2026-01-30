import { useState, useMemo, useEffect, useCallback } from 'react';
import { MarkdownPanel, BBCodePanel, PreviewPanel } from '@/components';
import type { PreviewMode } from '@/components/PreviewPanel';
import { markdownToBBCode } from '@/lib/converter';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAutoSave, formatLastSaved } from '@/hooks/useAutoSave';
import { useFileService, MD_FILTERS, BBCODE_FILTERS } from '@/hooks/useFileService';
import { useRecentFiles } from '@/hooks/useRecentFiles';
import type { SteamContext } from '@/lib/contexts';
import { CONTEXT_LABELS } from '@/lib/contexts';
import { WELCOME_MARKDOWN } from '@/lib/welcome';

import '@/styles/app.css';
import '@/styles/steam-theme.css';

export function App() {
  // File service
  const { openFile, openFilePath, saveFileAs, isDesktop, currentFile } = useFileService();
  
  // Recent files (desktop only)
  const { recentFiles, addRecentFile } = useRecentFiles();
  
  // File names - null means we're showing the welcome doc
  const [mdFileName, setMdFileName] = useState<string | null>(null);
  
  // Markdown content - always starts with welcome doc on fresh load
  // (useState, not useLocalStorage, so welcome doc shows every time)
  const [markdown, setMarkdown] = useState(WELCOME_MARKDOWN);
  
  // Context persists across sessions
  const [context, setContext] = useLocalStorage<SteamContext>('steam-bbcode-context', 'announcements');
  const [showTagRef, setShowTagRef] = useState(false);

  // Auto-save draft for crash recovery (but we don't auto-restore it)
  const { status: saveStatus, lastSaved } = useAutoSave('steam-bbcode-draft', { markdown, context }, 2000);

  // Active editor tracking
  const [activeEditor, setActiveEditor] = useState<PreviewMode>('markdown');

  // Convert Markdown to BBCode
  const { bbcode: convertedBBCode, notes } = useMemo(
    () => markdownToBBCode(markdown, context),
    [markdown, context]
  );

  // BBCode state - starts with converted value, can be edited independently
  const [bbcode, setBBCode] = useState(convertedBBCode);

  // Track if user has manually edited BBCode
  const [bbcodeModified, setBBCodeModified] = useState(false);
  
  // Sync BBCode with conversion when markdown changes (unless user has manually edited)
  useEffect(() => {
    if (!bbcodeModified) {
      setBBCode(convertedBBCode);
    }
  }, [convertedBBCode, bbcodeModified]);

  // When context changes, always re-convert
  useEffect(() => {
    setBBCode(convertedBBCode);
    setBBCodeModified(false);
  }, [context]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle BBCode changes (track that user has edited)
  const handleBBCodeChange = useCallback((newBBCode: string) => {
    setBBCodeModified(true);
    setBBCode(newBBCode);
  }, []);

  // Revert BBCode to auto-converted version
  const handleBBCodeRevert = useCallback(() => {
    setBBCode(convertedBBCode);
    setBBCodeModified(false);
  }, [convertedBBCode]);

  // File operations
  const handleOpenMarkdown = useCallback(async () => {
    const content = await openFile(MD_FILTERS);
    if (content !== null) {
      setMarkdown(content);
      setBBCodeModified(false);
    }
  }, [openFile, setMarkdown]);

  // Track opened files in recent list
  useEffect(() => {
    if (currentFile?.path && currentFile?.name) {
      addRecentFile(currentFile.path, currentFile.name);
      setMdFileName(currentFile.name);
    }
  }, [currentFile, addRecentFile]);

  // Open a recent file by path
  const handleOpenRecentFile = useCallback(async (path: string) => {
    const content = await openFilePath(path);
    if (content !== null) {
      setMarkdown(content);
      setBBCodeModified(false);
    }
  }, [openFilePath, setMarkdown]);

  const handleOpenBBCode = useCallback(async () => {
    const content = await openFile(BBCODE_FILTERS);
    if (content !== null) {
      setBBCode(content);
      setBBCodeModified(true);
    }
  }, [openFile]);

  const handleSaveMarkdownAs = useCallback(async () => {
    const defaultName = mdFileName || 'document.md';
    const savedPath = await saveFileAs(markdown, defaultName, MD_FILTERS);
    if (savedPath) {
      const name = savedPath.split('/').pop() || defaultName;
      setMdFileName(name);
    }
  }, [saveFileAs, markdown, mdFileName]);

  const handleSaveBBCodeAs = useCallback(async () => {
    const baseName = mdFileName?.replace(/\.(md|markdown)$/i, '') || 'steam-post';
    const defaultName = `${baseName}.txt`;
    await saveFileAs(bbcode, defaultName, BBCODE_FILTERS);
  }, [saveFileAs, bbcode, mdFileName]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+O or Ctrl+O - Open
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenMarkdown();
      }
      // Cmd+S or Ctrl+S - Save As (context-aware)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeEditor === 'markdown') {
          handleSaveMarkdownAs();
        } else {
          handleSaveBBCodeAs();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenMarkdown, handleSaveMarkdownAs, handleSaveBBCodeAs, activeEditor]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Determine preview content based on active editor
  const previewContent = activeEditor === 'markdown' ? markdown : bbcode;
  const previewLabel = activeEditor === 'markdown' 
    ? 'Source Preview' 
    : 'Steam Preview';
  const previewSubtitle = activeEditor === 'markdown'
    ? '(not final output)'
    : '(as it will appear)';

  return (
    <div className="app">
      <div className="app-content">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <h1 className="title">
              <span className="title-md">MD</span>
              <span className="title-arrow">→</span>
              <span className="title-bb">BB</span>
              {isDesktop && <span className="title-badge">Desktop</span>}
            </h1>

            <div className="controls">
              <div className="control-group">
                <label className="control-label">Steam Context:</label>
                <select
                  className="control-select"
                  value={context}
                  onChange={(e) => setContext(e.target.value as SteamContext)}
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
          {showTagRef && (
            <div className="tag-reference">
              <table className="tag-ref-table">
                <thead>
                  <tr>
                    <th>Format</th>
                    <th>Markdown</th>
                    <th>BBCode</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Bold</td>
                    <td><code>**text**</code></td>
                    <td><code>[b]text[/b]</code></td>
                  </tr>
                  <tr>
                    <td>Italic</td>
                    <td><code>*text*</code></td>
                    <td><code>[i]text[/i]</code></td>
                  </tr>
                  <tr>
                    <td>Strikethrough</td>
                    <td><code>~~text~~</code></td>
                    <td><code>[strike]text[/strike]</code></td>
                  </tr>
                  <tr>
                    <td>Header 1</td>
                    <td><code># Title</code></td>
                    <td><code>[h1]Title[/h1]</code></td>
                  </tr>
                  <tr>
                    <td>Header 2</td>
                    <td><code>## Section</code></td>
                    <td><code>[h2]Section[/h2]</code></td>
                  </tr>
                  <tr>
                    <td>Header 3</td>
                    <td><code>### Sub</code></td>
                    <td><code>[h3]Sub[/h3]</code></td>
                  </tr>
                  <tr>
                    <td>Link</td>
                    <td><code>[text](url)</code></td>
                    <td><code>[url=url]text[/url]</code></td>
                  </tr>
                  <tr>
                    <td>Image</td>
                    <td><code>![alt](url)</code></td>
                    <td><code>[img]url[/img]</code></td>
                  </tr>
                  <tr>
                    <td>Bullet list</td>
                    <td><code>- Item</code></td>
                    <td><code>[list][*]Item[/list]</code></td>
                  </tr>
                  <tr>
                    <td>Numbered list</td>
                    <td><code>1. Item</code></td>
                    <td><code>[olist][*]Item[/olist]</code></td>
                  </tr>
                  <tr>
                    <td>Quote</td>
                    <td><code>&gt; text</code></td>
                    <td><code>[quote]text[/quote]</code></td>
                  </tr>
                  <tr>
                    <td>Code</td>
                    <td><code>`code`</code></td>
                    <td><code>[code]code[/code]</code></td>
                  </tr>
                  <tr>
                    <td>Horizontal rule</td>
                    <td><code>---</code></td>
                    <td><code>[hr][/hr]</code></td>
                  </tr>
                  <tr>
                    <td>Table</td>
                    <td><code>| A | B |</code><br/><code>|---|---|</code><br/><code>| 1 | 2 |</code></td>
                    <td><code>[table][tr][th]A[/th]...</code></td>
                  </tr>
                  <tr>
                    <td>YouTube</td>
                    <td><code>![](youtube:ID)</code></td>
                    <td><code>[previewyoutube=ID;full]</code></td>
                  </tr>
                </tbody>
              </table>
              <div className="tag-ref-note">
                Underline (<code>[u]</code>) and Spoiler (<code>[spoiler]</code>) have no Markdown equivalent — edit BBCode directly.
              </div>
            </div>
          )}
        </header>

        {/* Three-panel layout */}
        <main className="main-grid three-panel">
          <MarkdownPanel
            value={markdown}
            onChange={setMarkdown}
            onFocus={() => setActiveEditor('markdown')}
            isActive={activeEditor === 'markdown'}
            fileName={mdFileName}
            onOpen={handleOpenMarkdown}
            onOpenRecent={handleOpenRecentFile}
            onSaveAs={handleSaveMarkdownAs}
            recentFiles={recentFiles}
            isDesktop={isDesktop}
          />

          <BBCodePanel
            value={bbcode}
            onChange={handleBBCodeChange}
            context={context}
            onFocus={() => setActiveEditor('bbcode')}
            isActive={activeEditor === 'bbcode'}
            onOpen={handleOpenBBCode}
            onSaveAs={handleSaveBBCodeAs}
            onRevert={handleBBCodeRevert}
            isModified={bbcodeModified}
          />

          <section className="panel preview-panel">
            <div className="panel-header">
              <span className="panel-label">
                {previewLabel}
                <span className="preview-subtitle">{previewSubtitle}</span>
              </span>
              <div className="preview-tabs">
                <button
                  className={`preview-tab ${activeEditor === 'markdown' ? 'active' : ''}`}
                  onClick={() => setActiveEditor('markdown')}
                >
                  MD
                </button>
                <button
                  className={`preview-tab ${activeEditor === 'bbcode' ? 'active' : ''}`}
                  onClick={() => setActiveEditor('bbcode')}
                >
                  BB
                </button>
              </div>
            </div>
            <PreviewPanel content={previewContent} mode={activeEditor} />
          </section>
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-left">
            {isDesktop && (
              <span className="keyboard-hints">
                <kbd>⌘O</kbd> Open
                <kbd>⌘S</kbd> Save
              </span>
            )}
            <span className="footer-label">Markdown → Steam BBCode</span>
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
