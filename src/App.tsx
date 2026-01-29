import { useState, useMemo, useEffect } from 'react';
import { MarkdownPanel, BBCodePanel, PreviewPanel } from '@/components';
import type { PreviewMode } from '@/components/PreviewPanel';
import { markdownToBBCode } from '@/lib/converter';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { SteamContext } from '@/lib/contexts';
import { CONTEXT_LABELS } from '@/lib/contexts';

import '@/styles/app.css';
import '@/styles/steam-theme.css';

const DEFAULT_MARKDOWN = `# SWAPMEAT Patch 0.4.2

## Bug Fixes
- Fixed crash when entering the **Meat Locker** on floor 3
- Resolved issue where ~~permadeath~~ was *actually* permanent
- Item tooltips no longer clip through the UI

## Balance Changes
1. Reduced difficulty spike in early game
2. Adjusted spawn rates for rare items
3. Buffed the \`TENDERLOIN\` weapon class

---

### Known Issues
> Some players report frame drops in areas with many entities

For more info, visit [our Discord](https://discord.gg/example)

![screenshot](https://example.com/screenshot.png)
`;

export function App() {
  // Persisted state
  const [markdown, setMarkdown] = useLocalStorage('steam-bbcode-markdown', DEFAULT_MARKDOWN);
  const [context, setContext] = useLocalStorage<SteamContext>('steam-bbcode-context', 'announcements');
  const [showTagRef, setShowTagRef] = useState(false);

  // Active editor tracking
  const [activeEditor, setActiveEditor] = useState<PreviewMode>('markdown');

  // Convert Markdown to BBCode
  const { bbcode: convertedBBCode, notes } = useMemo(
    () => markdownToBBCode(markdown, context),
    [markdown, context]
  );

  // BBCode state - starts with converted value, can be edited independently
  const [bbcode, setBBCode] = useState(convertedBBCode);

  // Sync BBCode with conversion when markdown changes (unless user has manually edited)
  const [userEditedBBCode, setUserEditedBBCode] = useState(false);
  
  useEffect(() => {
    if (!userEditedBBCode) {
      setBBCode(convertedBBCode);
    }
  }, [convertedBBCode, userEditedBBCode]);

  // When context changes, always re-convert
  useEffect(() => {
    setBBCode(convertedBBCode);
    setUserEditedBBCode(false);
  }, [context]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle BBCode changes (track that user has edited)
  const handleBBCodeChange = (newBBCode: string) => {
    setUserEditedBBCode(true);
    setBBCode(newBBCode);
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there are unsaved changes
      // (In a real app, we'd track this more precisely)
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
          />

          <BBCodePanel
            value={bbcode}
            onChange={handleBBCodeChange}
            context={context}
            onFocus={() => setActiveEditor('bbcode')}
            isActive={activeEditor === 'bbcode'}
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
            Markdown → Steam BBCode converter with live preview
          </div>
        </footer>
      </div>
    </div>
  );
}
