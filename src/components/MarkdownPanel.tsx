import { useState, useMemo, useCallback, useRef } from 'react';
import { SyntaxEditor, type SyntaxEditorHandle } from './SyntaxEditor';
import { lintMarkdown } from '@/lib/markdown-linter';
import { splitForDiscord } from '@/lib/splitter';
import { CHAR_LIMITS } from '@/lib/contexts';
import type { RecentFile } from '@/hooks/useRecentFiles';
import { trackEvent } from '@/lib/analytics';

interface MarkdownPanelProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string | null;
  onOpen: () => void;
  onOpenRecent?: (path: string) => void;
  onSaveAs: () => void;
  recentFiles?: RecentFile[];
  isDesktop?: boolean;
}

export function MarkdownPanel({
  value,
  onChange,
  fileName,
  onOpen,
  onOpenRecent,
  onSaveAs,
  recentFiles = [],
  isDesktop = false,
}: MarkdownPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState('');
  const [showDiscord, setShowDiscord] = useState(false);
  const [showRecentFiles, setShowRecentFiles] = useState(false);
  const [savedValue, setSavedValue] = useState(value);
  const editorRef = useRef<SyntaxEditorHandle>(null);

  const lintResult = useMemo(() => lintMarkdown(value), [value]);
  const discordSections = useMemo(
    () => splitForDiscord(value, CHAR_LIMITS.discord),
    [value]
  );

  const hasIssues = lintResult.errors.length > 0 || 
                    lintResult.warnings.length > 0 || 
                    lintResult.info.length > 0;

  const isDirty = value !== savedValue;

  const handleSaveAs = useCallback(() => {
    onSaveAs();
    setSavedValue(value);
  }, [onSaveAs, value]);

  const handleRevert = useCallback(() => {
    onChange(savedValue);
  }, [onChange, savedValue]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
      trackEvent('copy_clicked', { panel: 'markdown' });
    } catch {
      setCopyFeedback('Failed');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  }, [value]);

  const handleLintClick = useCallback((msg: { line?: number; start?: number; end?: number; column?: number; length?: number }) => {
    if (!editorRef.current) return;

    trackEvent('lint_error_clicked', { panel: 'markdown' });

    // Prefer start/end if available (direct character offsets)
    if (msg.start !== undefined && msg.end !== undefined) {
      editorRef.current.selectRange(msg.start, msg.end);
    } else if (msg.line) {
      // Fall back to line/column/length
      editorRef.current.scrollToLine(msg.line, msg.column, msg.length);
    }
  }, []);

  // Update saved value when file is opened
  const handleOpen = useCallback(() => {
    onOpen();
    // Note: savedValue will be updated after content changes
  }, [onOpen]);

  // When value changes from file open, update saved state
  // This is a bit hacky - ideally we'd have a callback after open completes
  // For now, we track if the value changed significantly
  
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-label">
          Markdown
          {fileName && <span className="file-name" title={fileName}>{fileName}</span>}
          {isDirty && <span className="modified-indicator" title="Unsaved changes">●</span>}
          {lintResult.errors.length > 0 && (
            <span className="lint-badge error">{lintResult.errors.length}</span>
          )}
          {lintResult.warnings.length > 0 && (
            <span className="lint-badge warning">{lintResult.warnings.length}</span>
          )}
        </span>
        <div className="panel-actions">
          <div className="btn-group">
            <button 
              className="btn btn-secondary" 
              onClick={handleOpen}
              title="Open file (Cmd+O)"
            >
              Open
            </button>
            {isDesktop && recentFiles.length > 0 && (
              <>
                <button
                  className="btn btn-secondary btn-dropdown"
                  onClick={() => setShowRecentFiles(!showRecentFiles)}
                  title="Recent files"
                >
                  ▾
                </button>
                {showRecentFiles && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">Recent Files</div>
                    {recentFiles.map((file) => (
                      <button
                        key={file.path}
                        className="dropdown-item"
                        onClick={() => {
                          onOpenRecent?.(file.path);
                          setShowRecentFiles(false);
                        }}
                        title={file.path}
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {isDirty && (
            <button 
              className="btn btn-secondary" 
              onClick={handleRevert}
              title="Revert to last saved state"
            >
              Revert
            </button>
          )}
          <button 
            className="btn btn-secondary" 
            onClick={handleSaveAs}
            title="Save As (Cmd+S)"
          >
            Save As
          </button>
          <button className="btn btn-secondary" onClick={handleCopy} title="Copy Markdown source">
            {copyFeedback || 'Copy MD'}
          </button>
        </div>
      </div>

      {/* Lint messages - clickable */}
      {hasIssues && (
        <div className="panel-lint">
          {lintResult.errors.map((msg, i) => (
            <div 
              key={`e${i}`} 
              className="lint-message error clickable"
              onClick={() => handleLintClick(msg)}
              role="button"
              tabIndex={0}
            >
              <span className="lint-icon">✗</span>
              {msg.line && <span className="lint-line">L{msg.line}</span>}
              <span className="lint-text">{msg.message}</span>
            </div>
          ))}
          {lintResult.warnings.map((msg, i) => (
            <div 
              key={`w${i}`} 
              className="lint-message warning clickable"
              onClick={() => handleLintClick(msg)}
              role="button"
              tabIndex={0}
            >
              <span className="lint-icon">⚠</span>
              {msg.line && <span className="lint-line">L{msg.line}</span>}
              <span className="lint-text">{msg.message}</span>
            </div>
          ))}
          {lintResult.info.map((msg, i) => (
            <div 
              key={`i${i}`} 
              className="lint-message note clickable"
              onClick={() => handleLintClick(msg)}
              role="button"
              tabIndex={0}
            >
              <span className="lint-icon">ℹ</span>
              {msg.line && <span className="lint-line">L{msg.line}</span>}
              <span className="lint-text">{msg.message}</span>
            </div>
          ))}
        </div>
      )}

      <SyntaxEditor
        ref={editorRef}
        value={value}
        onChange={onChange}
        language="markdown"
        placeholder="Paste your Markdown here, or click Open to load a file..."
        errorLines={lintResult.errorLines}
        warningLines={lintResult.warningLines}
        onSave={handleSaveAs}
      />

      <div className="panel-footer">
        <button 
          className={`btn btn-sm ${showDiscord ? 'btn-active' : 'btn-secondary'}`}
          onClick={() => {
            if (!showDiscord) {
              trackEvent('discord_split', { chunk_count: discordSections.length });
            }
            setShowDiscord(!showDiscord);
          }}
          title="Split for Discord (2000 char limit)"
        >
          Discord ({discordSections.length})
        </button>
        <span className="char-count-inline">
          {value.length.toLocaleString()} chars
        </span>
      </div>

      {/* Discord sections drawer */}
      {showDiscord && (
        <div className="discord-drawer">
          <div className="discord-drawer-header">
            <span>Discord Chunks</span>
            <span className="discord-drawer-limit">2000 char limit</span>
          </div>
          <div className="discord-drawer-content">
            {discordSections.map((section, i) => (
              <DiscordChunk
                key={i}
                index={i}
                total={discordSections.length}
                content={section.content}
                charCount={section.charCount}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface DiscordChunkProps {
  index: number;
  total: number;
  content: string;
  charCount: number;
}

function DiscordChunk({ index, total, content, charCount }: DiscordChunkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trackEvent('copy_clicked', { panel: 'markdown', discord_chunk: true });
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="discord-chunk">
      <div className="discord-chunk-header">
        <span className="discord-chunk-label">
          {total > 1 ? `Part ${index + 1} of ${total}` : 'Single message'}
        </span>
        <span className="discord-chunk-chars">{charCount} / 2000</span>
        <button className="btn btn-sm btn-discord" onClick={handleCopy}>
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
      <pre className="discord-chunk-preview">{content}</pre>
    </div>
  );
}
