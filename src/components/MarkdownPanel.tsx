import { useState, useMemo, useCallback, useRef, useEffect, type MouseEvent } from 'react';
import { SyntaxEditor, type SyntaxEditorHandle } from './SyntaxEditor';
import { lintMarkdown } from '@/lib/markdown-linter';
import { confluenceToMarkdown } from '@/lib/confluence-converter';
import { googleDocsToMarkdown, isGoogleDocsHtml } from '@/lib/google-docs-converter';
import { plaintextToMarkdown } from '@/lib/plaintext-normalizer';
import { splitForDiscord } from '@/lib/splitter';
import { CHAR_LIMITS, type SteamContext } from '@/lib/contexts';
import type { InputFormat } from '@/lib/format-detector';
import { trackEvent, type InputMethod } from '@/lib/analytics';
import type { Document } from '@/lib/document-store';

/** Labels shown in the format selector dropdown */
const FORMAT_OPTIONS: { value: InputFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'google-docs', label: 'Google Docs' },
  { value: 'confluence', label: 'Confluence' },
  { value: 'plaintext', label: 'Plaintext' },
];

/**
 * Check if HTML clipboard content contains Confluence markers.
 * Covers both storage format (ac:/ri: namespace) and rendered clipboard
 * (data-renderer-start-pos, data-node-type="media", blob: atlassian URLs).
 */
function isConfluenceHtml(html: string): boolean {
  return /(<ac:[a-z-]+|<ri:[a-z-]+|atlassian|confluence|data-renderer-start-pos|data-node-type="media)/i.test(html);
}

/**
 * Check if HTML clipboard content has any meaningful formatting.
 * Catches rich text from Confluence Cloud, Google Docs, Word, etc.
 */
function isRichHtml(html: string): boolean {
  return /<(p|h[1-6]|ul|ol|li|strong|em|b|i|table|tr|td|th|blockquote|pre|code|br|hr|div|span)\b/i.test(html);
}

/** Format a relative date string ("just now", "2 hours ago", "Mar 18"). */
function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface MarkdownPanelProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string | null;
  onOpen: () => void;
  onSaveAs: () => void;
  detectedFormat?: InputFormat;
  selectedFormat?: InputFormat;
  onFormatChange?: (format: InputFormat) => void;
  context?: SteamContext;
  blacklist?: string[];
  onImageDrop?: (filename: string, dataUrl: string) => void;
  onFileDrop?: (filename: string, content: string) => void;
  onInputMethodChange?: (method: InputMethod, content: string) => void;
  // Document management (web only — hidden on desktop)
  documents?: Document[];
  onLoadDocument?: (docId: string) => void;
  onDeleteDocument?: (docId: string) => void;
  isDesktop?: boolean;
}

export function MarkdownPanel({
  value,
  onChange,
  fileName,
  onOpen,
  onSaveAs,
  detectedFormat = 'markdown',
  selectedFormat,
  onFormatChange,
  context = 'announcements',
  blacklist = [],
  onImageDrop,
  onFileDrop,
  onInputMethodChange,
  documents = [],
  onLoadDocument,
  onDeleteDocument,
  isDesktop = false,
}: MarkdownPanelProps) {
  const activeFormat = selectedFormat ?? detectedFormat;
  const [showDiscord, setShowDiscord] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState<Set<string>>(new Set());
  const editorRef = useRef<SyntaxEditorHandle>(null);

  // Document management state (web only)
  const [showDocs, setShowDocs] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-clear delete confirmation after 3 seconds
  useEffect(() => {
    if (deleteConfirmId === null) return;
    const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
    return () => clearTimeout(timer);
  }, [deleteConfirmId]);

  const handleDocDelete = useCallback(
    (docId: string) => {
      if (deleteConfirmId === docId) {
        onDeleteDocument?.(docId);
        setDeleteConfirmId(null);
      } else {
        setDeleteConfirmId(docId);
      }
    },
    [deleteConfirmId, onDeleteDocument],
  );

  // Whether to show web document management features
  const showWebDocs = !isDesktop && !!onLoadDocument;

  const toggleHelp = useCallback((key: string, e: MouseEvent) => {
    e.stopPropagation();
    setExpandedHelp(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Lint the editor content (always markdown)
  const lintResult = useMemo(
    () => lintMarkdown(value, { blacklist }),
    [value, blacklist]
  );
  const discordSections = useMemo(
    () => splitForDiscord(value, CHAR_LIMITS.discord),
    [value]
  );

  const hasIssues = lintResult.errors.length > 0 ||
                    lintResult.warnings.length > 0 ||
                    lintResult.info.length > 0;

  // Handle paste: normalize input to markdown regardless of source
  // Priority: Confluence markers -> Google Docs markers -> generic rich HTML -> plain text
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (html) {
      // Confluence takes highest priority
      if (isConfluenceHtml(html)) {
        e.preventDefault();
        const { markdown } = confluenceToMarkdown(html, context);
        const textarea = e.currentTarget;
        const before = value.substring(0, textarea.selectionStart);
        const after = value.substring(textarea.selectionEnd);
        onChange(before + markdown + after);
        onFormatChange?.('confluence');
        onInputMethodChange?.('confluence_paste', markdown);
        trackEvent('paste_confluence', { source: 'clipboard_html' });
        return;
      }

      // Google Docs HTML
      if (isGoogleDocsHtml(html)) {
        e.preventDefault();
        const { markdown } = googleDocsToMarkdown(html);
        const textarea = e.currentTarget;
        const before = value.substring(0, textarea.selectionStart);
        const after = value.substring(textarea.selectionEnd);
        onChange(before + markdown + after);
        onFormatChange?.('google-docs');
        onInputMethodChange?.('google_docs_paste', markdown);
        trackEvent('paste_google_docs', { source: 'clipboard_html' });
        return;
      }

      // Generic rich HTML (Word, other sources) — route through Confluence converter
      if (isRichHtml(html)) {
        e.preventDefault();
        const { markdown } = confluenceToMarkdown(html, context);
        const textarea = e.currentTarget;
        const before = value.substring(0, textarea.selectionStart);
        const after = value.substring(textarea.selectionEnd);
        onChange(before + markdown + after);
        onInputMethodChange?.('confluence_paste', markdown);
        trackEvent('paste_richtext', { source: 'clipboard_richtext' });
        return;
      }
    }

    // Plain text paste — apply light markdown formatting if structured
    const plain = e.clipboardData.getData('text/plain');
    if (plain && !html) {
      const normalized = plaintextToMarkdown(plain);
      if (normalized !== plain) {
        e.preventDefault();
        const textarea = e.currentTarget;
        const before = value.substring(0, textarea.selectionStart);
        const after = value.substring(textarea.selectionEnd);
        onChange(before + normalized + after);
        onInputMethodChange?.('plaintext_paste', normalized);
        trackEvent('paste_plaintext', { source: 'clipboard_plain', normalized: true });
        return;
      }
      // Unstructured plain text — browser handles paste, track the method
      onInputMethodChange?.('markdown_paste', plain);
      return;
    }
    // Default paste (e.g. markdown from clipboard)
    if (plain) {
      onInputMethodChange?.('markdown_paste', plain);
    }
  }, [value, onChange, context, onFormatChange, onInputMethodChange]);

  // "Paste as Confluence" context menu action: read clipboard HTML and run Confluence conversion
  const handlePasteAsConfluence = useCallback(async () => {
    try {
      // Try to read HTML from clipboard via the Clipboard API
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          const { markdown } = confluenceToMarkdown(html, context);
          onChange(markdown);
          onInputMethodChange?.('confluence_paste', markdown);
          trackEvent('paste_confluence', { source: 'context_menu' });
          return;
        }
      }
      // No HTML on clipboard — try plain text and convert as Confluence storage format
      const plain = await navigator.clipboard.readText();
      if (plain) {
        const { markdown } = confluenceToMarkdown(plain, context);
        onChange(markdown);
        onInputMethodChange?.('confluence_paste', markdown);
        trackEvent('paste_confluence', { source: 'context_menu_plain' });
      }
    } catch {
      // Clipboard read denied — silently fail
    }
  }, [onChange, context, onInputMethodChange]);

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
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-label">
          Editor
          <select
            className={`format-selector format-${activeFormat}`}
            data-testid="format-selector"
            value={activeFormat}
            onChange={(e) => {
              const newFormat = e.target.value as InputFormat;
              onFormatChange?.(newFormat);
              trackEvent('format_changed', { from: activeFormat, to: newFormat });
            }}
            aria-label="Input format"
          >
            {FORMAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {fileName && <span className="file-name" title={fileName}>{fileName}</span>}
        </span>
        <div className="panel-actions">
          {lintResult.errors.length > 0 && (
            <span className="lint-badge error">{lintResult.errors.length}</span>
          )}
          {lintResult.warnings.length > 0 && (
            <span className="lint-badge warning">{lintResult.warnings.length}</span>
          )}
          <button
            className="btn btn-secondary"
            onClick={onOpen}
            title="Open file"
          >
            Open
          </button>
          {showWebDocs && (
            <button
              className={`btn ${showDocs ? 'btn-active' : 'btn-secondary'}`}
              onClick={() => setShowDocs(!showDocs)}
              title="Saved documents"
              data-testid="documents-btn"
            >
              Docs{documents.length > 0 ? ` (${documents.length})` : ''}
            </button>
          )}
        </div>
      </div>

      {/* Documents drawer (web only) */}
      {showWebDocs && showDocs && (
        <div className="editor-docs-drawer" data-testid="documents-panel">
          {documents.length === 0 ? (
            <p className="settings-empty" data-testid="documents-empty">
              No saved documents for this title.
            </p>
          ) : (
            <div className="documents-list" data-testid="documents-list">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="documents-row"
                  data-testid="documents-row"
                >
                  <div className="documents-row-info">
                    <span className="documents-row-name" title={doc.name}>
                      {doc.name}
                    </span>
                    <span className="documents-row-date">
                      {formatRelativeDate(doc.updatedAt)}
                    </span>
                    {doc.translations && Object.keys(doc.translations).length > 0 && (
                      <span className="documents-row-langs" title="Saved translations">
                        {Object.keys(doc.translations).map(l => l.toUpperCase()).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="documents-row-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onLoadDocument?.(doc.id)}
                      data-testid="doc-load-btn"
                    >
                      Load
                    </button>
                    <button
                      className={`btn btn-sm ${deleteConfirmId === doc.id ? 'btn-warning' : 'btn-secondary'}`}
                      onClick={() => handleDocDelete(doc.id)}
                      data-testid="doc-delete-btn"
                      title={deleteConfirmId === doc.id ? 'Click again to confirm' : `Delete "${doc.name}"`}
                    >
                      {deleteConfirmId === doc.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lint messages - clickable */}
      {hasIssues && (
        <div className="panel-lint">
          {lintResult.errors.map((msg, i) => {
            const key = `e${i}`;
            return (
              <div key={key} className="lint-message-group">
                <div
                  className="lint-message error clickable"
                  onClick={() => handleLintClick(msg)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLintClick(msg); } }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="lint-icon">✗</span>
                  {msg.line && <span className="lint-line">Line {msg.line}</span>}
                  <span className="lint-text">{msg.message}</span>
                  {msg.help && (
                    <button
                      className="lint-help-toggle"
                      onClick={(e) => toggleHelp(key, e)}
                      aria-expanded={expandedHelp.has(key)}
                    >
                      {expandedHelp.has(key) ? 'Hide' : 'Why?'}
                    </button>
                  )}
                </div>
                {msg.help && expandedHelp.has(key) && (
                  <div className="lint-help-text">{msg.help}</div>
                )}
              </div>
            );
          })}
          {lintResult.warnings.map((msg, i) => {
            const key = `w${i}`;
            return (
              <div key={key} className="lint-message-group">
                <div
                  className="lint-message warning clickable"
                  onClick={() => handleLintClick(msg)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLintClick(msg); } }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="lint-icon">⚠</span>
                  {msg.line && <span className="lint-line">Line {msg.line}</span>}
                  <span className="lint-text">{msg.message}</span>
                  {msg.help && (
                    <button
                      className="lint-help-toggle"
                      onClick={(e) => toggleHelp(key, e)}
                      aria-expanded={expandedHelp.has(key)}
                    >
                      {expandedHelp.has(key) ? 'Hide' : 'Why?'}
                    </button>
                  )}
                </div>
                {msg.help && expandedHelp.has(key) && (
                  <div className="lint-help-text">{msg.help}</div>
                )}
              </div>
            );
          })}
          {lintResult.info.map((msg, i) => {
            const key = `i${i}`;
            return (
              <div key={key} className="lint-message-group">
                <div
                  className="lint-message note clickable"
                  onClick={() => handleLintClick(msg)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLintClick(msg); } }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="lint-icon">ℹ</span>
                  {msg.line && <span className="lint-line">Line {msg.line}</span>}
                  <span className="lint-text">{msg.message}</span>
                  {msg.help && (
                    <button
                      className="lint-help-toggle"
                      onClick={(e) => toggleHelp(key, e)}
                      aria-expanded={expandedHelp.has(key)}
                    >
                      {expandedHelp.has(key) ? 'Hide' : 'Why?'}
                    </button>
                  )}
                </div>
                {msg.help && expandedHelp.has(key) && (
                  <div className="lint-help-text">{msg.help}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SyntaxEditor
        ref={editorRef}
        value={value}
        onChange={onChange}
        language="markdown"
        placeholder="Paste your content here, or drop a file to get started..."
        errorLines={lintResult.errorLines}
        warningLines={lintResult.warningLines}
        onSave={onSaveAs}
        onPaste={handlePaste}
        onImageDrop={onImageDrop}
        onFileDrop={onFileDrop}
        onPasteAsConfluence={handlePasteAsConfluence}
        blacklistTerms={blacklist}
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
