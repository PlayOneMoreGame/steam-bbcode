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

import '@/styles/app.css';
import '@/styles/steam-theme.css';

const DEFAULT_MARKDOWN = `# Patch Notes

## What's New
- Feature one with **bold** text
- Feature two with *italic* text
- Bug fix for the thing

## Known Issues
> Some players may experience issues

For more info, visit [our Discord](https://discord.gg/example)
`;

export function App() {
  // File service
  const { openFile, openFilePath, saveFileAs, isDesktop, currentFile } = useFileService();
  
  // Recent files (desktop only)
  const { recentFiles, addRecentFile } = useRecentFiles();
  
  // File names
  const [mdFileName, setMdFileName] = useState<string | null>(null);
  
  // Persisted state
  const [markdown, setMarkdown] = useLocalStorage('steam-bbcode-markdown', DEFAULT_MARKDOWN);
  const [context, setContext] = useLocalStorage<SteamContext>('steam-bbcode-context', 'announcements');
  const [showTagRef, setShowTagRef] = useState(false);

  // Auto-save draft
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
  const previewLabel = activeEditor === 'markdown' ? 'Markdown Preview' : 'Steam Preview';

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
              <div className="tag-ref-section">
                <h4>Formatting</h4>
                <code>[b]bold[/b]</code>
                <code>[i]italic[/i]</code>
                <code>[u]underline[/u]</code>
                <code>[strike]strikethrough[/strike]</code>
              </div>
              <div className="tag-ref-section">
                <h4>Headers</h4>
                <code>[h1]Title[/h1]</code>
                <code>[h2]Section[/h2]</code>
                <code>[h3]Subsection[/h3]</code>
              </div>
              <div className="tag-ref-section">
                <h4>Lists</h4>
                <code>[list][*]Item[/list]</code>
                <code>[olist][*]Item[/olist]</code>
              </div>
              <div className="tag-ref-section">
                <h4>Links &amp; Media</h4>
                <code>[url=https://...]text[/url]</code>
                <code>[img]url[/img]</code>
                <code>[previewyoutube=ID][/previewyoutube]</code>
              </div>
              <div className="tag-ref-section">
                <h4>Blocks</h4>
                <code>[code]code[/code]</code>
                <code>[quote]text[/quote]</code>
                <code>[spoiler]hidden[/spoiler]</code>
                <code>[hr][/hr]</code>
              </div>
              <div className="tag-ref-section">
                <h4>Tables</h4>
                <code>[table][tr][td]cell[/td][/tr][/table]</code>
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
              <span className="panel-label">{previewLabel}</span>
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
          <div className="footer-note">
            {isDesktop ? 'Cmd+O Open • Cmd+S Save As • ' : ''}
            Markdown → Steam BBCode converter • <a href="https://github.com/PlayOneMoreGame/steam-bbcode/issues/new/choose" target="_blank" rel="noopener" className="feedback-link">Feedback?</a>
          </div>
          <div className="footer-save-status">
            {saveStatus === 'saving' && <span className="save-indicator saving">Saving...</span>}
            {saveStatus === 'saved' && lastSaved && (
              <span className="save-indicator saved">Saved {formatLastSaved(lastSaved)}</span>
            )}
            {saveStatus === 'unsaved' && <span className="save-indicator unsaved">•</span>}
          </div>
        </footer>
      </div>
    </div>
  );
}
