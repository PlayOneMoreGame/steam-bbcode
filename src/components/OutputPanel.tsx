import { useState, useCallback, useMemo, useRef, useEffect, type MouseEvent } from 'react';
import { PreviewPanel } from './PreviewPanel';
import { ImagesPanel } from './ImagesPanel';
import { ApiKeyDialog } from './ApiKeyDialog';
import { lintBBCode } from '@/lib/linter';
import { SUPPORTED_LANGUAGES } from '@/lib/translation-service';
import { CHAR_LIMITS, type SteamContext } from '@/lib/contexts';
import type { ImageUrlMap } from '@/lib/image-placeholders';
import { trackEvent } from '@/lib/analytics';

export type OutputTab = 'preview' | 'bbcode' | string; // string for translation lang codes

export interface TranslationState {
  bbcode: string;
  status: 'idle' | 'translating' | 'done' | 'error';
  error?: string;
  stale: boolean;
}

interface OutputPanelProps {
  bbcode: string;
  context: SteamContext;
  isDesktop: boolean;
  placeholderImages?: string[];
  imageUrls?: ImageUrlMap;
  onImageUrlChange?: (filename: string, url: string) => void;
  translations: Record<string, TranslationState>;
  onTranslate: (lang: string) => void;
  apiKeyDialogOpen: boolean;
  onApiKeyDialogClose: () => void;
  onApiKeySaved: () => void;
}

export function OutputPanel({
  bbcode,
  context,
  isDesktop,
  placeholderImages = [],
  imageUrls = {},
  onImageUrlChange,
  translations,
  onTranslate,
  apiKeyDialogOpen,
  onApiKeyDialogClose,
  onApiKeySaved,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>('preview');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [expandedHelp, setExpandedHelp] = useState<Set<string>>(new Set());
  const [translateMenuOpen, setTranslateMenuOpen] = useState(false);
  const translateMenuRef = useRef<HTMLDivElement>(null);

  // Close translate menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!translateMenuOpen) return;
    const handleClick = (e: globalThis.MouseEvent) => {
      if (translateMenuRef.current && !translateMenuRef.current.contains(e.target as Node)) {
        setTranslateMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTranslateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [translateMenuOpen]);

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

  // Lint the source BBCode
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

  // Determine what content to copy based on active tab
  const activeCopyContent = useMemo(() => {
    if (activeTab === 'preview' || activeTab === 'bbcode') {
      return bbcode;
    }
    // Translation tab
    const t = translations[activeTab];
    if (t && t.status === 'done') {
      return t.bbcode;
    }
    return bbcode;
  }, [activeTab, bbcode, translations]);

  const activeCopyLabel = useMemo(() => {
    if (activeTab === 'preview' || activeTab === 'bbcode') {
      return 'Copy BBCode';
    }
    return `Copy ${activeTab.toUpperCase()}`;
  }, [activeTab]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeCopyContent);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
      trackEvent('copy_clicked', { panel: activeTab === 'preview' || activeTab === 'bbcode' ? 'bbcode' : 'translation', lang: activeTab });
    } catch {
      setCopyFeedback('Failed');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  }, [activeCopyContent, activeTab]);

  const handleLintClick = useCallback(() => {
    setActiveTab('bbcode');
  }, []);

  const handleTranslateSelect = useCallback((lang: string) => {
    setTranslateMenuOpen(false);
    onTranslate(lang);
    setActiveTab(lang);
  }, [onTranslate]);

  // Build the copy button title/tooltip
  const copyTitle = hasErrors && (activeTab === 'preview' || activeTab === 'bbcode')
    ? 'Fix errors before copying'
    : isDesktop && (activeTab === 'preview' || activeTab === 'bbcode')
      ? 'Copy BBCode (\u2318\u21e7C)'
      : activeCopyLabel;

  const copyDisabled = hasErrors && (activeTab === 'preview' || activeTab === 'bbcode');

  // Get active translation tabs (languages that have been requested)
  const activeTranslationTabs = Object.entries(translations).filter(
    ([, t]) => t.status !== 'idle' || t.bbcode !== ''
  );

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

          {/* Translation tabs */}
          {activeTranslationTabs.map(([lang, t]) => (
            <button
              key={lang}
              className={`preview-tab ${activeTab === lang ? 'active' : ''}`}
              onClick={() => setActiveTab(lang)}
            >
              {lang.toUpperCase()}
              {t.status === 'translating' && (
                <span className="translation-badge translating" title="Translating...">...</span>
              )}
              {t.status === 'done' && !t.stale && (
                <span className="translation-badge done" title="Translation complete">&#x2713;</span>
              )}
              {t.stale && t.status === 'done' && (
                <span
                  className="translation-badge stale"
                  title="Source content has changed -- click Re-translate to update"
                >&#x25CF;</span>
              )}
              {t.status === 'error' && (
                <span className="translation-badge error-badge" title={t.error || 'Translation error'}>!</span>
              )}
            </button>
          ))}

          {/* Translate dropdown */}
          <div className="translate-dropdown-wrapper" ref={translateMenuRef}>
            <button
              className="preview-tab translate-trigger"
              onClick={() => setTranslateMenuOpen(!translateMenuOpen)}
              title="Translate BBCode to another language"
            >
              Translate &#x25BE;
            </button>
            {translateMenuOpen && (
              <div className="translate-dropdown-menu">
                <div className="dropdown-header">Target Language</div>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <button
                    key={code}
                    className="dropdown-item"
                    onClick={() => handleTranslateSelect(code)}
                  >
                    {name} ({code})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="panel-actions">
          {/* Lint status indicator -- visible on all tabs */}
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
            disabled={copyDisabled}
            title={copyTitle}
          >
            {copyFeedback || activeCopyLabel}
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <PreviewPanel content={bbcode} />
      ) : activeTab === 'bbcode' ? (
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
      ) : (
        /* Translation tab */
        <TranslationTabContent
          lang={activeTab}
          translation={translations[activeTab]}
          context={context}
          onRetranslate={() => onTranslate(activeTab)}
          expandedHelp={expandedHelp}
          toggleHelp={toggleHelp}
        />
      )}

      {/* Images panel -- visible when document has Confluence image placeholders */}
      {placeholderImages.length > 0 && onImageUrlChange && (
        <ImagesPanel
          filenames={placeholderImages}
          imageUrls={imageUrls}
          onUrlChange={onImageUrlChange}
          context={context}
        />
      )}

      {/* Character count footer -- always visible regardless of active tab */}
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

      {/* API Key Dialog */}
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onClose={onApiKeyDialogClose}
        onSaved={onApiKeySaved}
      />
    </section>
  );
}

/** Inner component for translation tab content */
function TranslationTabContent({
  lang,
  translation,
  context,
  onRetranslate,
  expandedHelp,
  toggleHelp,
}: {
  lang: string;
  translation: TranslationState | undefined;
  context: SteamContext;
  onRetranslate: () => void;
  expandedHelp: Set<string>;
  toggleHelp: (key: string, e: MouseEvent) => void;
}) {
  if (!translation) {
    return (
      <div className="translation-tab-empty">
        <p>No translation available for {lang.toUpperCase()}.</p>
      </div>
    );
  }

  if (translation.status === 'translating') {
    return (
      <div className="translation-tab-loading">
        <div className="translation-spinner" />
        <p>Translating to {SUPPORTED_LANGUAGES[lang] || lang}...</p>
      </div>
    );
  }

  if (translation.status === 'error') {
    return (
      <div className="translation-tab-error">
        <p className="translation-error-message">{translation.error}</p>
        <button className="btn btn-secondary" onClick={onRetranslate}>
          Retry
        </button>
      </div>
    );
  }

  // status === 'done'
  const lintResult = lintBBCode(translation.bbcode, context);
  const hasLintErrors = lintResult.errors.length > 0;
  const hasLintWarnings = lintResult.warnings.length > 0;

  return (
    <div className="output-bbcode-tab">
      {/* Stale indicator */}
      {translation.stale && (
        <div className="translation-stale-banner">
          <span className="translation-stale-dot" />
          <span>Source content has changed</span>
          <button className="btn btn-sm btn-secondary" onClick={onRetranslate}>
            Re-translate
          </button>
        </div>
      )}

      {/* Lint messages for translated content */}
      {(hasLintErrors || hasLintWarnings) && (
        <div className="panel-lint">
          {lintResult.errors.map((msg, i) => {
            const key = `te${i}`;
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
            const key = `tw${i}`;
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

      <pre className="bbcode-readonly">{translation.bbcode}</pre>
    </div>
  );
}
