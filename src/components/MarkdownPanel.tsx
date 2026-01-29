import { useState, useMemo, useCallback, useRef } from 'react';
import { SyntaxEditor, type SyntaxEditorHandle } from './SyntaxEditor';
import { lintMarkdown } from '@/lib/markdown-linter';
import { splitForDiscord } from '@/lib/splitter';
import { CHAR_LIMITS } from '@/lib/contexts';

interface MarkdownPanelProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  isActive: boolean;
}

export function MarkdownPanel({ value, onChange, onFocus, isActive }: MarkdownPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState('');
  const [showDiscord, setShowDiscord] = useState(false);
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

  const handleSave = useCallback(() => {
    const blob = new Blob([value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
    setSavedValue(value);
  }, [value]);

  const handleRevert = useCallback(() => {
    onChange(savedValue);
  }, [onChange, savedValue]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('Failed');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  }, [value]);

  const handleLintClick = useCallback((line?: number) => {
    if (line && editorRef.current) {
      editorRef.current.scrollToLine(line);
      editorRef.current.focus();
    }
  }, []);

  return (
    <section className={`panel ${isActive ? 'panel-active' : ''}`} onFocus={onFocus}>
      <div className="panel-header">
        <span className="panel-label">
          Markdown
          {isDirty && <span className="modified-indicator" title="Unsaved changes">●</span>}
          {lintResult.errors.length > 0 && (
            <span className="lint-badge error">{lintResult.errors.length}</span>
          )}
          {lintResult.warnings.length > 0 && (
            <span className="lint-badge warning">{lintResult.warnings.length}</span>
          )}
        </span>
        <div className="panel-actions">
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
            onClick={handleSave}
            title="Save file (Ctrl+S)"
          >
            Save
          </button>
          <button className="btn btn-primary" onClick={handleCopy}>
            {copyFeedback || 'Copy'}
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
              onClick={() => handleLintClick(msg.line)}
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
              onClick={() => handleLintClick(msg.line)}
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
              onClick={() => handleLintClick(msg.line)}
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
        placeholder="Paste your Markdown here..."
        errorLines={lintResult.errorLines}
        warningLines={lintResult.warningLines}
        onSave={handleSave}
      />

      <div className="panel-footer">
        <button 
          className={`btn btn-sm ${showDiscord ? 'btn-active' : 'btn-secondary'}`}
          onClick={() => setShowDiscord(!showDiscord)}
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
