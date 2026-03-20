import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { isOrgTerm } from '@/lib/blacklist-store';
import { isWorkspaceTerm } from '@/lib/dnt-store';
import { getWorkspaceConfig, getAvailableTitles, getBuiltInTitleSlugs } from '@/lib/workspace-loader';
import { addCustomTitle, isCustomTitle, removeCustomTitle } from '@/lib/custom-titles';
import type { WorkspaceSelection } from '@/lib/workspace-types';

interface SettingsPanelProps {
  blacklist: string[];
  onAddTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
  onResetBlacklist: () => void;
  dntTerms: string[];
  onAddDntTerm: (term: string) => void;
  onRemoveDntTerm: (term: string) => void;
  onResetDntTerms: () => void;
  workspaceSelection: WorkspaceSelection;
  onSwitchWorkspace: (sel: WorkspaceSelection) => void;
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
  workspaceSelection,
  onSwitchWorkspace,
}: SettingsPanelProps) {
  const [blockedSearch, setBlockedSearch] = useState('');
  const [newDntTerm, setNewDntTerm] = useState('');
  const [resetConfirm, setResetConfirm] = useState<'blacklist' | 'dnt' | null>(null);
  const [showAddTitle, setShowAddTitle] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(null);
  const [titleListKey, setTitleListKey] = useState(0);
  const blockedInputRef = useRef<HTMLInputElement>(null);
  const dntInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  const workspaceConfig = useMemo(() => getWorkspaceConfig(workspaceSelection), [workspaceSelection]);
  const availableTitles = useMemo(
    () => getAvailableTitles(workspaceSelection.studioSlug),
    // titleListKey forces re-read after adding/removing custom titles
    [workspaceSelection.studioSlug, titleListKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const builtInSlugs = useMemo(
    () => getBuiltInTitleSlugs(workspaceSelection.studioSlug),
    [workspaceSelection.studioSlug]
  );

  const handleTitleChange = useCallback((titleSlug: string) => {
    onSwitchWorkspace({ studioSlug: workspaceSelection.studioSlug, titleSlug });
  }, [workspaceSelection.studioSlug, onSwitchWorkspace]);

  // Auto-clear delete confirmation after 3 seconds
  useEffect(() => {
    if (deleteConfirmSlug === null) return;
    const timer = setTimeout(() => setDeleteConfirmSlug(null), 3000);
    return () => clearTimeout(timer);
  }, [deleteConfirmSlug]);

  const handleAddTitle = useCallback(() => {
    const trimmed = newTitleName.trim();
    if (!trimmed) return;

    // Copy localization targets from the first build-in title if available
    const firstBuiltIn = availableTitles.find(t => builtInSlugs.includes(t.slug));
    const locTargets = firstBuiltIn?.localizationTargets;

    const created = addCustomTitle(
      workspaceSelection.studioSlug,
      trimmed,
      builtInSlugs,
      locTargets,
    );

    if (created) {
      setNewTitleName('');
      setShowAddTitle(false);
      setTitleListKey(k => k + 1);
      // Switch to the newly created title
      onSwitchWorkspace({ studioSlug: workspaceSelection.studioSlug, titleSlug: created.slug });
    }
  }, [newTitleName, workspaceSelection.studioSlug, builtInSlugs, availableTitles, onSwitchWorkspace]);

  const handleAddTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTitle();
    }
    if (e.key === 'Escape') {
      setShowAddTitle(false);
      setNewTitleName('');
    }
  }, [handleAddTitle]);

  const handleDeleteTitle = useCallback((titleSlug: string) => {
    if (deleteConfirmSlug === titleSlug) {
      removeCustomTitle(workspaceSelection.studioSlug, titleSlug);
      setDeleteConfirmSlug(null);
      setTitleListKey(k => k + 1);
      // If we just deleted the active title, switch to the first available
      if (workspaceSelection.titleSlug === titleSlug) {
        const remaining = getAvailableTitles(workspaceSelection.studioSlug);
        if (remaining.length > 0) {
          onSwitchWorkspace({ studioSlug: workspaceSelection.studioSlug, titleSlug: remaining[0].slug });
        }
      }
    } else {
      setDeleteConfirmSlug(titleSlug);
    }
  }, [deleteConfirmSlug, workspaceSelection.studioSlug, workspaceSelection.titleSlug, onSwitchWorkspace]);

  // Focus the title input when the add form is shown
  useEffect(() => {
    if (showAddTitle) {
      titleInputRef.current?.focus();
    }
  }, [showAddTitle]);

  return (
    <div className="settings-panel" data-testid="settings-panel">
      {/* Workspace — studio is locked by auth, only title is switchable */}
      <div className="settings-section">
        <h3 className="settings-section-title">Workspace</h3>
        <p className="settings-section-desc">
          Your studio is set by your login. Switch titles below, or create a new one for your project.
        </p>
        <div className="settings-workspace-info" data-testid="workspace-info">
          <div className="settings-workspace-row">
            <span className="settings-workspace-label">Studio</span>
            <span className="settings-workspace-value" data-testid="studio-display">{workspaceConfig.studio.displayName}</span>
          </div>
          <div className="settings-workspace-row">
            <span className="settings-workspace-label">Title</span>
            <div className="settings-title-controls">
              <select
                className="control-select"
                value={workspaceSelection.titleSlug}
                onChange={e => handleTitleChange(e.target.value)}
                data-testid="title-select"
              >
                {/* Built-in titles */}
                {availableTitles.filter(t => builtInSlugs.includes(t.slug)).length > 0 && (
                  <optgroup label="Built-in">
                    {availableTitles.filter(t => builtInSlugs.includes(t.slug)).map(t => (
                      <option key={t.slug} value={t.slug}>{t.displayName}</option>
                    ))}
                  </optgroup>
                )}
                {/* Custom titles */}
                {availableTitles.filter(t => !builtInSlugs.includes(t.slug)).length > 0 && (
                  <optgroup label="Custom">
                    {availableTitles.filter(t => !builtInSlugs.includes(t.slug)).map(t => (
                      <option key={t.slug} value={t.slug}>{t.displayName}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {isCustomTitle(workspaceSelection.studioSlug, workspaceSelection.titleSlug) && (
                <button
                  className={`btn btn-sm ${deleteConfirmSlug === workspaceSelection.titleSlug ? 'btn-warning' : 'btn-secondary'}`}
                  onClick={() => handleDeleteTitle(workspaceSelection.titleSlug)}
                  title={deleteConfirmSlug === workspaceSelection.titleSlug ? 'Click again to confirm deletion' : 'Delete this custom title'}
                  data-testid="delete-title-btn"
                >
                  {deleteConfirmSlug === workspaceSelection.titleSlug ? 'Confirm?' : 'Delete'}
                </button>
              )}
              <button
                className={`btn btn-sm ${showAddTitle ? 'btn-active' : 'btn-secondary'}`}
                onClick={() => setShowAddTitle(!showAddTitle)}
                title="Add a new title"
                data-testid="add-title-btn"
              >
                + Title
              </button>
            </div>
          </div>
          {showAddTitle && (
            <div className="settings-workspace-row settings-add-title-form">
              <span className="settings-workspace-label" />
              <div className="settings-add-row">
                <input
                  ref={titleInputRef}
                  type="text"
                  className="settings-input"
                  value={newTitleName}
                  onChange={e => setNewTitleName(e.target.value)}
                  onKeyDown={handleAddTitleKeyDown}
                  placeholder="New title name..."
                  data-testid="new-title-input"
                />
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleAddTitle}
                  disabled={!newTitleName.trim()}
                  data-testid="create-title-btn"
                >
                  Create
                </button>
              </div>
            </div>
          )}
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
            {resetConfirm === 'dnt' ? 'Confirm reset?' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
}
