import { useState, useCallback, useRef, useEffect } from 'react';
import { DO_NOT_TRANSLATE } from '@/lib/glossary';

interface SettingsPanelProps {
  blacklist: string[];
  onAddTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
}

export function SettingsPanel({ blacklist, onAddTerm, onRemoveTerm }: SettingsPanelProps) {
  const [newTerm, setNewTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = newTerm.trim();
    if (!trimmed) return;
    onAddTerm(trimmed);
    setNewTerm('');
    inputRef.current?.focus();
  }, [newTerm, onAddTerm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }, [handleAdd]);

  return (
    <div className="settings-panel" data-testid="settings-panel">
      {/* Blacklisted Terms — editable */}
      <div className="settings-section">
        <h3 className="settings-section-title">Blacklisted Terms</h3>
        <p className="settings-section-desc">
          Terms that will trigger warnings in the editor. Each team configures their own list.
        </p>

        {blacklist.length > 0 ? (
          <div className="settings-chip-list" data-testid="blacklist-chips">
            {blacklist.map(term => (
              <span key={term} className="settings-chip" data-testid="blacklist-chip">
                <span className="settings-chip-text">{term}</span>
                <button
                  className="settings-chip-remove"
                  onClick={() => onRemoveTerm(term)}
                  aria-label={`Remove ${term}`}
                  title={`Remove "${term}"`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="settings-empty">No terms added yet.</p>
        )}

        <div className="settings-add-row">
          <input
            ref={inputRef}
            type="text"
            className="settings-input"
            value={newTerm}
            onChange={e => setNewTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a term..."
            data-testid="blacklist-input"
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleAdd}
            disabled={!newTerm.trim()}
            data-testid="blacklist-add-btn"
          >
            Add
          </button>
        </div>
      </div>

      {/* Do Not Translate Terms — read-only */}
      <div className="settings-section">
        <h3 className="settings-section-title">Do Not Translate Terms</h3>
        <p className="settings-section-desc">
          These terms are preserved exactly when translating. Read-only — defined in code.
        </p>
        <div className="settings-chip-list settings-chip-list-readonly">
          {DO_NOT_TRANSLATE.map(term => (
            <span key={term} className="settings-chip settings-chip-readonly">
              <span className="settings-chip-text">{term}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
