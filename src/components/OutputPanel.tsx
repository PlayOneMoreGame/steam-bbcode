import { useState, useCallback, useMemo, type MouseEvent } from 'react';
import { PreviewPanel } from './PreviewPanel';
import { ImagesPanel } from './ImagesPanel';
import { lintBBCode } from '@/lib/linter';
import { CHAR_LIMITS, type SteamContext } from '@/lib/contexts';
import type { ImageUrlMap } from '@/lib/image-placeholders';
import { trackEvent } from '@/lib/analytics';

export type OutputTab = 'preview' | 'bbcode';

interface OutputPanelProps {
  bbcode: string;
  context: SteamContext;
  isDesktop: boolean;
  placeholderImages?: string[];
  imageUrls?: ImageUrlMap;
  onImageUrlChange?: (filename: string, url: string) => void;
}

export function OutputPanel({ bbcode, context, isDesktop, placeholderImages = [], imageUrls = {}, onImageUrlChange }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>('preview');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [expandedHelp, setExpandedHelp] = useState<Set<string>>(new Set());

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

  // Lint the BBCode
  const lintResult = useMemo(
    () => lintBBCode(bbcode, context),
    [bbcode, context]
  );

  const charLimit = CHAR_LIMITS[context];
  const charCount = bbcode.length;
  const charPercent = Math.min(100, Math.round((charCount / charLimit) * 100));

  const hasErrors = lintResult.errors.length > 0;
  const hasWarnings = lintResult.warnings.length > 0;
  const errorCount = lintResult.errors.length;
  const warningCount = lintResult.warnings.length;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bbcode);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
      trackEvent('copy_clicked', { panel: 'bbcode' });
    } catch {
      setCopyFeedback('Failed');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  }, [bbcode]);

  const handleLintClick = useCallback(() => {
    setActiveTab('bbcode');
  }, []);

  // Build the copy button title/tooltip
  const copyTitle = hasErrors
    ? 'Fix errors before copying'
    : isDesktop
      ? 'Copy BBCode (\u2318\u21e7C)'
      : 'Copy BBCode';

  return (
    <section className="panel output-panel">
      <div className="panel-header">
        <div className="output-tabs">
          <button
            className={`preview-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Steam Preview
          </button>
          <button
            className={`preview-tab ${activeTab === 'bbcode' ? 'active' : ''}`}
            onClick={() => setActiveTab('bbcode')}
          >
            BBCode
            {hasErrors && (
              <span className="lint-badge error">{errorCount}</span>
            )}
            {hasWarnings && (
              <span className="lint-badge warning">{warningCount}</span>
            )}
          </button>
        </div>
        <div className="panel-actions">
          {/* Lint status indicator — visible on all tabs */}
          {hasErrors ? (
            <button
              className="lint-status lint-status-error"
              onClick={handleLintClick}
              title="Switch to BBCode tab to see errors"
            >
              <span className="lint-status-icon">!</span>
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </button>
          ) : hasWarnings ? (
            <span className="lint-status lint-status-warning">
              <span className="lint-status-icon">!</span>
              {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
            </span>
          ) : (
            <span className="lint-status lint-status-ready">Ready</span>
          )}
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={hasErrors}
            title={copyTitle}
          >
            {copyFeedback || 'Copy BBCode'}
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <PreviewPanel content={bbcode} />
      ) : (
        <div className="output-bbcode-tab">
          {/* Lint messages */}
          {(hasErrors || hasWarnings) && (
            <div className="panel-lint">
              {lintResult.errors.map((msg, i) => {
                const key = `e${i}`;
                return (
                  <div key={key} className="lint-message-group">
                    <div className="lint-message error">
                      <span className="lint-icon">&#x2717;</span>
                      {msg.line && <span className="lint-line">L{msg.line}</span>}
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
                    <div className="lint-message warning">
                      <span className="lint-icon">&#x26a0;</span>
                      {msg.line && <span className="lint-line">L{msg.line}</span>}
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

          {/* Read-only BBCode display */}
          <pre className="bbcode-readonly">{bbcode}</pre>
        </div>
      )}

      {/* Images panel — visible when document has Confluence image placeholders */}
      {placeholderImages.length > 0 && onImageUrlChange && (
        <ImagesPanel
          filenames={placeholderImages}
          imageUrls={imageUrls}
          onUrlChange={onImageUrlChange}
          context={context}
        />
      )}

      {/* Character count footer — always visible regardless of active tab */}
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
