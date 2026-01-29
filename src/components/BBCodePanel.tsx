import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SyntaxEditor, type SyntaxEditorHandle } from './SyntaxEditor';
import { lintBBCode } from '@/lib/linter';
import { CHAR_LIMITS, type SteamContext } from '@/lib/contexts';

interface BBCodePanelProps {
  value: string;
  onChange: (value: string) => void;
  context: SteamContext;
  onFocus: () => void;
  isActive: boolean;
  onOpen: () => void;
  onSaveAs: () => void;
  onRevert: () => void;
  isModified: boolean;
}

export function BBCodePanel({ 
  value, 
  onChange, 
  context,
  onFocus,
  isActive,
  onOpen,
  onSaveAs,
  onRevert,
  isModified,
}: BBCodePanelProps) {
  const [copyFeedback, setCopyFeedback] = useState('');
  const [, setSavedValue] = useState(value);
  const editorRef = useRef<SyntaxEditorHandle>(null);

  // Update saved value when value changes from conversion
  useEffect(() => {
    if (!isModified) {
      setSavedValue(value);
    }
  }, [value, isModified]);

  // Lint the BBCode
  const lintResult = useMemo(
    () => lintBBCode(value, context),
    [value, context]
  );

  const charLimit = CHAR_LIMITS[context];
  const charCount = value.length;
  const charPercent = Math.min(100, Math.round((charCount / charLimit) * 100));

  const handleSaveAs = useCallback(() => {
    onSaveAs();
    setSavedValue(value);
  }, [onSaveAs, value]);

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

  const hasErrors = lintResult.errors.length > 0;
  const hasWarnings = lintResult.warnings.length > 0;

  return (
    <section className={`panel ${isActive ? 'panel-active' : ''}`} onFocus={onFocus}>
      <div className="panel-header">
        <span className="panel-label">
          Steam BBCode
          {isModified && <span className="modified-indicator" title="Modified from source">●</span>}
          {hasErrors && (
            <span className="lint-badge error">{lintResult.errors.length}</span>
          )}
          {hasWarnings && (
            <span className="lint-badge warning">{lintResult.warnings.length}</span>
          )}
        </span>
        <div className="panel-actions">
          <button
            className="btn btn-secondary"
            onClick={onOpen}
            title="Open BBCode file"
          >
            Open
          </button>
          {isModified && (
            <button
              className="btn btn-secondary"
              onClick={onRevert}
              title="Revert to auto-converted BBCode"
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
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={hasErrors}
          >
            {copyFeedback || 'Copy'}
          </button>
        </div>
      </div>

      {/* Lint messages - clickable */}
      {(hasErrors || hasWarnings) && (
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
        </div>
      )}

      <SyntaxEditor
        ref={editorRef}
        value={value}
        onChange={onChange}
        language="bbcode"
        errorLines={lintResult.errorLines}
        warningLines={lintResult.warningLines}
        onSave={handleSaveAs}
      />

      <div className="panel-footer">
        <div className="char-bar-inline">
          <div 
            className={`char-fill ${charPercent > 100 ? 'error' : charPercent > 90 ? 'warning' : 'ok'}`}
            style={{ width: `${charPercent}%` }}
          />
        </div>
        <span className="char-count-inline">
          {charCount.toLocaleString()} / {charLimit.toLocaleString()}
        </span>
      </div>
    </section>
  );
}
