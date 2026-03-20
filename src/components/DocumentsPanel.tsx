import { useState, useCallback, useRef, useEffect } from 'react';
import type { Document } from '@/lib/document-store';

interface DocumentsPanelProps {
  documents: Document[];
  activeDocId: string | null;
  activeDocName: string | null;
  onSave: (name: string) => void;
  onLoad: (docId: string) => void;
  onDelete: (docId: string) => void;
}

/** Format a relative date string ("just now", "2 hours ago", "Mar 18"). */
function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DocumentsPanel({
  documents,
  activeDocId,
  activeDocName,
  onSave,
  onLoad,
  onDelete,
}: DocumentsPanelProps) {
  const [saveName, setSaveName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the name input when it appears
  useEffect(() => {
    if (showNameInput) {
      nameInputRef.current?.focus();
    }
  }, [showNameInput]);

  // Auto-clear delete confirmation after 3 seconds
  useEffect(() => {
    if (deleteConfirmId === null) return;
    const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
    return () => clearTimeout(timer);
  }, [deleteConfirmId]);

  // Auto-clear save feedback after 2 seconds
  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(''), 2000);
    return () => clearTimeout(timer);
  }, [saveFeedback]);

  const handleSave = useCallback(() => {
    // If doc already has a name (loaded or previously saved), save immediately
    if (activeDocId && activeDocName) {
      onSave(activeDocName);
      setSaveFeedback('Saved!');
      return;
    }

    // Otherwise show the name input
    if (!showNameInput) {
      setShowNameInput(true);
      return;
    }

    // Submit the name
    const trimmed = saveName.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setSaveName('');
    setShowNameInput(false);
    setSaveFeedback('Saved!');
  }, [activeDocId, activeDocName, showNameInput, saveName, onSave]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = saveName.trim();
        if (!trimmed) return;
        onSave(trimmed);
        setSaveName('');
        setShowNameInput(false);
        setSaveFeedback('Saved!');
      }
      if (e.key === 'Escape') {
        setShowNameInput(false);
        setSaveName('');
      }
    },
    [saveName, onSave],
  );

  const handleDelete = useCallback(
    (docId: string) => {
      if (deleteConfirmId === docId) {
        onDelete(docId);
        setDeleteConfirmId(null);
      } else {
        setDeleteConfirmId(docId);
      }
    },
    [deleteConfirmId, onDelete],
  );

  return (
    <div className="documents-panel" data-testid="documents-panel">
      <div className="settings-section">
        <h3 className="settings-section-title">
          Documents
          {documents.length > 0 && (
            <span className="settings-count" data-testid="documents-count">
              {documents.length} saved
            </span>
          )}
        </h3>
        <p className="settings-section-desc">
          Save and restore your work. Documents are saved per title.
        </p>

        {/* Save action */}
        <div className="documents-save-row">
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            data-testid="doc-save-btn"
          >
            {saveFeedback || (activeDocId ? 'Save' : 'Save As...')}
          </button>

          {showNameInput && !activeDocId && (
            <input
              ref={nameInputRef}
              type="text"
              className="settings-input documents-name-input"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              placeholder="Document name..."
              data-testid="doc-name-input"
            />
          )}

          {activeDocName && (
            <span className="documents-active-name" data-testid="doc-active-name">
              {activeDocName}
            </span>
          )}
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <p className="settings-empty" data-testid="documents-empty">
            No saved documents for this title.
          </p>
        ) : (
          <div className="documents-list" data-testid="documents-list">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`documents-row ${doc.id === activeDocId ? 'documents-row-active' : ''}`}
                data-testid="documents-row"
              >
                <div className="documents-row-info">
                  <span className="documents-row-name" title={doc.name}>
                    {doc.name}
                  </span>
                  <span className="documents-row-date">
                    {formatRelativeDate(doc.updatedAt)}
                  </span>
                  {doc.translations && Object.keys(doc.translations).length > 0 && (
                    <span className="documents-row-langs" title="Saved translations">
                      {Object.keys(doc.translations).map(l => l.toUpperCase()).join(', ')}
                    </span>
                  )}
                </div>
                <div className="documents-row-actions">
                  {doc.id !== activeDocId && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onLoad(doc.id)}
                      data-testid="doc-load-btn"
                    >
                      Load
                    </button>
                  )}
                  <button
                    className={`btn btn-sm ${deleteConfirmId === doc.id ? 'btn-warning' : 'btn-secondary'}`}
                    onClick={() => handleDelete(doc.id)}
                    data-testid="doc-delete-btn"
                    title={deleteConfirmId === doc.id ? 'Click again to confirm' : `Delete "${doc.name}"`}
                  >
                    {deleteConfirmId === doc.id ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
