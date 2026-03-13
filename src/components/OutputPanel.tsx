import { useState, useCallback, useMemo, useRef, useEffect, type MouseEvent } from 'react';
import { PreviewPanel } from './PreviewPanel';
import { ImagesPanel } from './ImagesPanel';
import { ApiKeyDialog } from './ApiKeyDialog';
import { lintBBCode, type LintResult } from '@/lib/linter';
import { SUPPORTED_LANGUAGES } from '@/lib/translation-service';
import { CHAR_LIMITS, type SteamContext } from '@/lib/contexts';
import type { ImageDataUrlMap } from '@/lib/renderer';
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
  bbcodeLint: LintResult;
  blacklist: string[];
  isDesktop: boolean;
  placeholderImages?: string[];
  imageDataUrls?: ImageDataUrlMap;
  translations: Record<string, TranslationState>;
  onTranslate: (lang: string) => void;
  apiKeyDialogOpen: boolean;
  onApiKeyDialogClose: () => void;
  onApiKeySaved: () => void;
  onWorkflowComplete?: () => void;
}

export function OutputPanel({
  bbcode,
  context,
  bbcodeLint,
  blacklist,
  isDesktop,
  placeholderImages = [],
  imageDataUrls,
  translations,
  onTranslate,
  apiKeyDialogOpen,
  onApiKeyDialogClose,
  onApiKeySaved,
  onWorkflowComplete,
}: OutputPanelProps) {
  // Two independent dimensions
  const [viewMode, setViewMode] = useState<'preview' | 'bbcode'>('preview');
  const [activeLang, setActiveLang] = useState<string>('en');

  const [copyFeedback, setCopyFeedback] = useState('');
  const [expandedHelp, setExpandedHelp] = useState<Set<string>>(new Set());
  const [lintExpanded, setLintExpanded] = useState(false);
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

  const hasErrors = bbcodeLint.errors.length > 0;
  const hasWarnings = bbcodeLint.warnings.length > 0;
  const errorCount = bbcodeLint.errors.length;
  const warningCount = bbcodeLint.warnings.length;

  // Resolve the active translation (if any)
  const activeTranslation = activeLang !== 'en' ? translations[activeLang] : undefined;

  // The BBCode content for the active language
  const activeBBCode = useMemo(() => {
    if (activeLang === 'en') return bbcode;
    const t = translations[activeLang];
    if (t && t.status === 'done') return t.bbcode;
    return '';
  }, [activeLang, bbcode, translations]);

  // Lint for the active language
  const activeLint = useMemo(() => {
    if (activeLang === 'en') return bbcodeLint;
    if (!activeBBCode) return { errors: [], warnings: [], errorLines: new Set<number>(), warningLines: new Set<number>() };
    return lintBBCode(activeBBCode, context, { blacklist });
  }, [activeLang, activeBBCode, bbcodeLint, context, blacklist]);

  // Character count for the active language (not always English)
  const charLimit = CHAR_LIMITS[context];
  const charCount = activeBBCode.length;
  const charPercent = Math.min(100, Math.round((charCount / charLimit) * 100));

  // Copy content is always the raw BBCode for the active language
  const activeCopyContent = activeBBCode;

  const activeCopyLabel = activeLang === 'en'
    ? 'Copy BBCode'
    : `Copy ${activeLang.toUpperCase()}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeCopyContent);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
      trackEvent('copy_clicked', { panel: activeLang === 'en' ? 'bbcode' : 'translation', lang: activeLang });
      if (activeLang === 'en') {
        onWorkflowComplete?.();
      }
    } catch {
      setCopyFeedback('Failed');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  }, [activeCopyContent, activeLang, onWorkflowComplete]);

  const handleTranslateSelect = useCallback((lang: string) => {
    setTranslateMenuOpen(false);
    onTranslate(lang);
    setActiveLang(lang);
  }, [onTranslate]);

  // Copy button state
  const isEnglish = activeLang === 'en';
  const copyDisabled = isEnglish && hasErrors;
  const copyTitle = copyDisabled
    ? 'Fix errors before copying'
    : isDesktop && isEnglish
      ? 'Copy BBCode (\u2318\u21e7C)'
      : activeCopyLabel;

  // Get active translation languages (requested at least once)
  const activeTranslationLangs = Object.entries(translations).filter(
    ([, t]) => t.status !== 'idle' || t.bbcode !== ''
  );

  // Whether the active language has content to display
  const hasContent = activeLang === 'en' || (activeTranslation?.status === 'done' && activeBBCode);

  return (
    <section className="panel output-panel">
      {/* Row 1: View mode — Steam Preview | BBCode */}
      <div className="panel-header">
        <div className="output-tabs" data-testid="view-mode-tabs">
          <button
            className={`preview-tab ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            Steam Preview
          </button>
          <button
            className={`preview-tab ${viewMode === 'bbcode' ? 'active' : ''}`}
            onClick={() => setViewMode('bbcode')}
          >
            BBCode
          </button>
        </div>
        <div className="panel-actions">
          {/* Lint status indicator */}
          {hasErrors ? (
            <button
              className="lint-status lint-status-error"
              onClick={() => setLintExpanded(!lintExpanded)}
              title={lintExpanded ? 'Hide issues' : 'Show issues'}
            >
              <span className="lint-status-icon">!</span>
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              {hasWarnings && <>, {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</>}
              <span className={`lint-status-chevron ${lintExpanded ? 'expanded' : ''}`}>&#x25BE;</span>
            </button>
          ) : hasWarnings ? (
            <button
              className="lint-status lint-status-warning"
              onClick={() => setLintExpanded(!lintExpanded)}
              title={lintExpanded ? 'Hide issues' : 'Show issues'}
            >
              <span className="lint-status-icon">!</span>
              {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              <span className={`lint-status-chevron ${lintExpanded ? 'expanded' : ''}`}>&#x25BE;</span>
            </button>
          ) : (
            <span className="lint-status lint-status-ready">Ready</span>
          )}
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={copyDisabled || !activeBBCode}
            title={copyTitle}
          >
            {copyFeedback || activeCopyLabel}
          </button>
        </div>
      </div>

      {/* Row 2: Language selector — English | translations | + Translate */}
      <div className="lang-bar" data-testid="lang-bar">
        <div className="lang-pills">
          <button
            className={`lang-pill ${activeLang === 'en' ? 'active' : ''}`}
            onClick={() => setActiveLang('en')}
            data-testid="lang-english"
          >
            English
          </button>

          {activeTranslationLangs.map(([lang, t]) => (
            <button
              key={lang}
              className={`lang-pill ${activeLang === lang ? 'active' : ''} ${t.stale ? 'stale' : ''}`}
              onClick={() => setActiveLang(lang)}
              data-testid={`lang-${lang}`}
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
                  title="Source content has changed"
                >&#x25CF;</span>
              )}
              {t.status === 'error' && (
                <span className="translation-badge error-badge" title={t.error || 'Translation error'}>!</span>
              )}
            </button>
          ))}

          {/* + Translate action button */}
          <div className="translate-dropdown-wrapper" ref={translateMenuRef}>
            <button
              className="lang-pill translate-action"
              onClick={() => setTranslateMenuOpen(!translateMenuOpen)}
              title="Translate BBCode to another language"
              data-testid="translate-add"
            >
              + Translate
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
      </div>

      {/* Collapsible lint message list (for active language) */}
      {lintExpanded && (activeLint.errors.length > 0 || activeLint.warnings.length > 0) && (
        <div className="panel-lint collapsible-lint">
          {activeLint.errors.map((msg, i) => {
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
          {activeLint.warnings.map((msg, i) => {
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

      {/* Translation status overlays (loading, error, stale) */}
      {activeLang !== 'en' && activeTranslation && (
        <>
          {activeTranslation.stale && activeTranslation.status === 'done' && (
            <div className="translation-stale-banner">
              <span className="translation-stale-dot" />
              <span>Source content has changed</span>
              <button className="btn btn-sm btn-secondary" onClick={() => onTranslate(activeLang)}>
                Re-translate
              </button>
            </div>
          )}
        </>
      )}

      {/* Content area */}
      {activeLang !== 'en' && activeTranslation?.status === 'translating' ? (
        <div className="translation-tab-loading">
          <div className="translation-spinner" />
          <p>Translating to {SUPPORTED_LANGUAGES[activeLang] || activeLang}...</p>
        </div>
      ) : activeLang !== 'en' && activeTranslation?.status === 'error' ? (
        <div className="translation-tab-error">
          <p className="translation-error-message">{activeTranslation.error}</p>
          <button className="btn btn-secondary" onClick={() => onTranslate(activeLang)}>
            Retry
          </button>
        </div>
      ) : activeLang !== 'en' && !hasContent ? (
        <div className="translation-tab-empty">
          <p>No translation available for {activeLang.toUpperCase()}.</p>
        </div>
      ) : viewMode === 'preview' ? (
        <PreviewPanel content={activeBBCode} imageDataUrls={activeLang === 'en' ? imageDataUrls : undefined} />
      ) : (
        <div className="output-bbcode-tab">
          <pre className="bbcode-readonly">{activeBBCode}</pre>
        </div>
      )}

      {/* Images panel — upload checklist for Confluence image placeholders */}
      {placeholderImages.length > 0 && (
        <ImagesPanel
          filenames={placeholderImages}
          imageDataUrls={imageDataUrls}
        />
      )}

      {/* Character count footer */}
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
