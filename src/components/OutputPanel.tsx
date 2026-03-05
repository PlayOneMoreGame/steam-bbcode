import { useState, useCallback, useMemo } from 'react';
import { PreviewPanel } from './PreviewPanel';
import { lintBBCode } from '@/lib/linter';
import { CHAR_LIMITS, type SteamContext } from '@/lib/contexts';
import { trackEvent } from '@/lib/analytics';

export type OutputTab = 'preview' | 'bbcode';

interface OutputPanelProps {
  bbcode: string;
  context: SteamContext;
  isDesktop: boolean;
}

export function OutputPanel({ bbcode, context, isDesktop }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>('preview');
  const [copyFeedback, setCopyFeedback] = useState('');

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
              <span className="lint-badge error">{lintResult.errors.length}</span>
            )}
            {hasWarnings && (
              <span className="lint-badge warning">{lintResult.warnings.length}</span>
            )}
          </button>
        </div>
        <div className="panel-actions">
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={hasErrors}
            title={isDesktop ? 'Copy BBCode (⌘⇧C)' : 'Copy BBCode'}
          >
            {copyFeedback || 'Copy BBCode'}
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <PreviewPanel content={bbcode} mode="bbcode" />
      ) : (
        <div className="output-bbcode-tab">
          {/* Lint messages */}
          {(hasErrors || hasWarnings) && (
            <div className="panel-lint">
              {lintResult.errors.map((msg, i) => (
                <div key={`e${i}`} className="lint-message error">
                  <span className="lint-icon">✗</span>
                  {msg.line && <span className="lint-line">L{msg.line}</span>}
                  <span className="lint-text">{msg.message}</span>
                </div>
              ))}
              {lintResult.warnings.map((msg, i) => (
                <div key={`w${i}`} className="lint-message warning">
                  <span className="lint-icon">⚠</span>
                  {msg.line && <span className="lint-line">L{msg.line}</span>}
                  <span className="lint-text">{msg.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Read-only BBCode display */}
          <pre className="bbcode-readonly">{bbcode}</pre>

          {/* Character count bar */}
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
        </div>
      )}
    </section>
  );
}
