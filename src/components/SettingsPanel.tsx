import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { isDefaultBlockedWord } from '@/lib/blacklist-store';
import { isDefaultTerm } from '@/lib/dnt-store';

interface SettingsPanelProps {
  blacklist: string[];
  onAddTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
  onResetBlacklist: () => void;
  dntTerms: string[];
  onAddDntTerm: (term: string) => void;
  onRemoveDntTerm: (term: string) => void;
  onResetDntTerms: () => void;
}

export function SettingsPanel({
  blacklist,
  onAddTerm,
  onRemoveTerm,
  onResetBlacklist,
  dntTerms,
  onAddDntTerm,
  onRemoveDntTerm,
  onResetDntTerms,
}: SettingsPanelProps) {
  const [blockedSearch, setBlockedSearch] = useState('');
  const [newDntTerm, setNewDntTerm] = useState('');
  const blockedInputRef = useRef<HTMLInputElement>(null);
  const dntInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    blockedInputRef.current?.focus();
  }, []);

  // Blocked words: filter matches when searching
  const filteredBlocked = useMemo(() => {
    const query = blockedSearch.trim().toLowerCase();
    if (!query) return [];
    return blacklist.filter(t => t.toLowerCase().includes(query));
  }, [blacklist, blockedSearch]);

  const handleBlockedAdd = useCallback(() => {
    const trimmed = blockedSearch.trim();
    if (!trimmed) return;
    onAddTerm(trimmed);
    setBlockedSearch('');
    blockedInputRef.current?.focus();
  }, [blockedSearch, onAddTerm]);

  const handleBlockedKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlockedAdd();
    }
  }, [handleBlockedAdd]);

  // Check if the current search term already exists in the list
  const blockedSearchExists = useMemo(() => {
    const query = blockedSearch.trim().toLowerCase();
    if (!query) return false;
    return blacklist.some(t => t.toLowerCase() === query);
  }, [blacklist, blockedSearch]);

  // DNT handlers
  const handleAddDnt = useCallback(() => {
    const trimmed = newDntTerm.trim();
    if (!trimmed) return;
    onAddDntTerm(trimmed);
    setNewDntTerm('');
    dntInputRef.current?.focus();
  }, [newDntTerm, onAddDntTerm]);

  const handleDntKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDnt();
    }
  }, [handleAddDnt]);

  return (
    <div className="settings-panel" data-testid="settings-panel">
      {/* Blocked Words — searchable list */}
      <div className="settings-section">
        <h3 className="settings-section-title">
          Blocked Words
          <span className="settings-count" data-testid="blocked-count">
            {blacklist.length} terms
          </span>
        </h3>
        <p className="settings-section-desc">
          Terms that trigger warnings in the editor and translation output. Search to find or remove terms — all terms are removable, including defaults.
        </p>

        <div className="settings-add-row">
          <input
            ref={blockedInputRef}
            type="text"
            className="settings-input"
            value={blockedSearch}
            onChange={e => setBlockedSearch(e.target.value)}
            onKeyDown={handleBlockedKeyDown}
            placeholder="Search or add a term..."
            data-testid="blocked-input"
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleBlockedAdd}
            disabled={!blockedSearch.trim() || blockedSearchExists}
            title={blockedSearchExists ? 'Term already in list' : 'Add term'}
            data-testid="blocked-add-btn"
          >
            Add
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={onResetBlacklist}
            title="Reset to default blocked words list"
            data-testid="blocked-reset-btn"
          >
            Reset
          </button>
        </div>

        {/* Show matching chips only when searching */}
        {blockedSearch.trim() && (
          <div className="settings-search-results">
            {filteredBlocked.length > 0 ? (
              <div className="settings-chip-list" data-testid="blocked-chips">
                {filteredBlocked.slice(0, 50).map(term => (
                  <span
                    key={term}
                    className={`settings-chip ${isDefaultBlockedWord(term) ? 'settings-chip-default' : ''}`}
                    data-testid="blocked-chip"
                  >
                    <span className="settings-chip-text">{term}</span>
                    <button
                      className="settings-chip-remove"
                      onClick={() => onRemoveTerm(term)}
                      aria-label={`Remove ${term}`}
                      title={`Remove "${term}"`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {filteredBlocked.length > 50 && (
                  <span className="settings-chip-overflow">
                    +{filteredBlocked.length - 50} more
                  </span>
                )}
              </div>
            ) : (
              <p className="settings-empty">
                No matches for &ldquo;{blockedSearch.trim()}&rdquo;
                {!blockedSearchExists && ' — press Add or Enter to add it'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Do Not Translate Terms — editable with defaults */}
      <div className="settings-section">
        <h3 className="settings-section-title">Do Not Translate</h3>
        <p className="settings-section-desc">
          These terms are preserved exactly when translating. Default game terms are shown in a muted style.
        </p>

        {dntTerms.length > 0 ? (
          <div className="settings-chip-list" data-testid="dnt-chips">
            {dntTerms.map(term => (
              <span
                key={term}
                className={`settings-chip ${isDefaultTerm(term) ? 'settings-chip-default' : ''}`}
                data-testid="dnt-chip"
              >
                <span className="settings-chip-text">{term}</span>
                <button
                  className="settings-chip-remove"
                  onClick={() => onRemoveDntTerm(term)}
                  aria-label={`Remove ${term}`}
                  title={`Remove "${term}"`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="settings-empty">No terms configured.</p>
        )}

        <div className="settings-add-row">
          <input
            ref={dntInputRef}
            type="text"
            className="settings-input"
            value={newDntTerm}
            onChange={e => setNewDntTerm(e.target.value)}
            onKeyDown={handleDntKeyDown}
            placeholder="Add a term..."
            data-testid="dnt-input"
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleAddDnt}
            disabled={!newDntTerm.trim()}
            data-testid="dnt-add-btn"
          >
            Add
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={onResetDntTerms}
            title="Reset to default SWAPMEAT glossary"
            data-testid="dnt-reset-btn"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
