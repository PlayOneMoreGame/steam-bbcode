import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiKey, setApiKey } from '@/lib/api-key-store';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ApiKeyDialog({ open, onClose, onSaved }: ApiKeyDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const existing = getApiKey();
      setValue(existing || '');
      setError('');
      // Focus the input after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter an API key.');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      setError('API key should start with "sk-".');
      return;
    }
    setApiKey(trimmed);
    setError('');
    onSaved();
  }, [value, onSaved]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  if (!open) return null;

  return (
    <div className="api-key-overlay" onClick={onClose}>
      <div
        className="api-key-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Anthropic API Key"
      >
        <div className="api-key-dialog-header">
          <h3 className="api-key-dialog-title">Anthropic API Key</h3>
          <button
            className="api-key-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="api-key-dialog-body">
          <p className="api-key-dialog-description">
            Enter your Anthropic API key to enable translation.
            The key is stored locally in your browser and never sent to our servers.
          </p>

          <input
            ref={inputRef}
            type="password"
            className="api-key-dialog-input"
            placeholder="sk-ant-..."
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />

          {error && (
            <p className="api-key-dialog-error">{error}</p>
          )}
        </div>

        <div className="api-key-dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}
