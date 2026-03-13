import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { isOrgTerm } from '@/lib/blacklist-store';
import { isWorkspaceTerm } from '@/lib/dnt-store';

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
          Terms that trigger warnings in the editor and translation output. Org defaults cannot be removed. Search to find terms or add your own.
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
            title="Remove all custom terms (org defaults are always present)"
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
                {filteredBlocked.slice(0, 50).map(term => {
                  const isOrg = isOrgTerm(term);
                  return (
                    <span
                      key={term}
                      className={`settings-chip ${isOrg ? 'settings-chip-org' : ''}`}
                      data-testid="blocked-chip"
                    >
                      {isOrg && (
                        <span className="settings-chip-lock" aria-label="Org default" title="Org default — cannot be removed">
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a4 4 0 0 0-4 4v2H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v2H6V5z"/></svg>
                        </span>
                      )}
                      <span className="settings-chip-text">{term}</span>
                      {!isOrg && (
                        <button
                          className="settings-chip-remove"
                          onClick={() => onRemoveTerm(term)}
                          aria-label={`Remove ${term}`}
                          title={`Remove "${term}"`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
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
          These terms are preserved exactly when translating. Workspace defaults cannot be removed. Add your own terms below.
        </p>

        {dntTerms.length > 0 ? (
          <div className="settings-chip-list" data-testid="dnt-chips">
            {dntTerms.map(term => {
              const isWs = isWorkspaceTerm(term);
              return (
                <span
                  key={term}
                  className={`settings-chip ${isWs ? 'settings-chip-org' : ''}`}
                  data-testid="dnt-chip"
                >
                  {isWs && (
                    <span className="settings-chip-lock" aria-label="Workspace default" title="Workspace default — cannot be removed">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a4 4 0 0 0-4 4v2H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v2H6V5z"/></svg>
                    </span>
                  )}
                  <span className="settings-chip-text">{term}</span>
                  {!isWs && (
                    <button
                      className="settings-chip-remove"
                      onClick={() => onRemoveDntTerm(term)}
                      aria-label={`Remove ${term}`}
                      title={`Remove "${term}"`}
                    >
                      x
                    </button>
                  )}
                </span>
              );
            })}
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
            title="Remove all custom terms (workspace defaults are always present)"
            data-testid="dnt-reset-btn"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
