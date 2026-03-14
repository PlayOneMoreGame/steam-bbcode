import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { isOrgTerm } from '@/lib/blacklist-store';
import { isWorkspaceTerm } from '@/lib/dnt-store';
import { getWorkspaceConfig } from '@/lib/workspace-loader';

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
  const [resetConfirm, setResetConfirm] = useState<'blacklist' | 'dnt' | null>(null);
  const blockedInputRef = useRef<HTMLInputElement>(null);
  const dntInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    blockedInputRef.current?.focus();
  }, []);

  // Auto-clear reset confirmation after 3 seconds
  useEffect(() => {
    if (resetConfirm === null) return;
    const timer = setTimeout(() => setResetConfirm(null), 3000);
    return () => clearTimeout(timer);
  }, [resetConfirm]);

  const handleResetBlacklist = useCallback(() => {
    if (resetConfirm === 'blacklist') {
      onResetBlacklist();
      setResetConfirm(null);
    } else {
      setResetConfirm('blacklist');
    }
  }, [resetConfirm, onResetBlacklist]);

  const handleResetDnt = useCallback(() => {
    if (resetConfirm === 'dnt') {
      onResetDntTerms();
      setResetConfirm(null);
    } else {
      setResetConfirm('dnt');
    }
  }, [resetConfirm, onResetDntTerms]);

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

  // Check if the current DNT input already exists in the list
  const dntTermExists = useMemo(() => {
    const query = newDntTerm.trim().toLowerCase();
    if (!query) return false;
    return dntTerms.some(t => t.toLowerCase() === query);
  }, [dntTerms, newDntTerm]);

  const workspaceConfig = useMemo(() => getWorkspaceConfig(), []);

  return (
    <div className="settings-panel" data-testid="settings-panel">
      {/* Workspace info — read-only display */}
      <div className="settings-section">
        <h3 className="settings-section-title">Workspace</h3>
        <p className="settings-section-desc">
          Current workspace configuration.
        </p>
        <div className="settings-workspace-info" data-testid="workspace-info">
          <div className="settings-workspace-row">
            <span className="settings-workspace-label">Studio</span>
            <span className="settings-workspace-value">{workspaceConfig.studio.studio}</span>
          </div>
          <div className="settings-workspace-row">
            <span className="settings-workspace-label">Title</span>
            <span className="settings-workspace-value">{workspaceConfig.title.title}</span>
          </div>
          <div className="settings-workspace-row">
            <span className="settings-workspace-label">Languages</span>
            <span className="settings-workspace-value">{workspaceConfig.title.localizationTargets.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Blocked Words — searchable list */}
      <div className="settings-section">
        <h3 className="settings-section-title">
          Blocked Words
          <span className="settings-count" data-testid="blocked-count">
            {blacklist.length} terms
          </span>
        </h3>
        <p className="settings-section-desc">
          Terms that trigger warnings in the editor and translation output. Built-in terms cannot be removed. Search to find terms or add your own.
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
            className={`btn btn-sm ${resetConfirm === 'blacklist' ? 'btn-warning' : 'btn-secondary'}`}
            onClick={handleResetBlacklist}
            title="Remove all custom terms (built-in terms are always present)"
            data-testid="blocked-reset-btn"
          >
            {resetConfirm === 'blacklist' ? 'Confirm reset?' : 'Reset'}
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
                        <span className="settings-chip-lock" role="img" aria-label="Built-in default" title="Built-in default — cannot be removed">
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
                          &times;
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
          These terms are preserved exactly when translating. Built-in terms cannot be removed. Add your own terms below.
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
                    <span className="settings-chip-lock" role="img" aria-label="Built-in default" title="Built-in default — cannot be removed">
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
                      &times;
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
            disabled={!newDntTerm.trim() || dntTermExists}
            title={dntTermExists ? 'Term already in list' : 'Add term'}
            data-testid="dnt-add-btn"
          >
            Add
          </button>
          <button
            className={`btn btn-sm ${resetConfirm === 'dnt' ? 'btn-warning' : 'btn-secondary'}`}
            onClick={handleResetDnt}
            title="Remove all custom terms (built-in terms are always present)"
            data-testid="dnt-reset-btn"
          >
            {resetConfirm === 'dnt' ? 'Confirm reset?' : 'Reset to defaults'}
          </button>
        </div>
      </div>
    </div>
  );
}
