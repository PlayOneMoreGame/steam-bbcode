import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDocuments, getDocument, saveDocument, deleteDocument, type Document } from '../document-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

const STUDIO = 'test-studio';
const TITLE = 'test-title';

describe('document-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getDocuments', () => {
    it('returns empty array when no documents stored', () => {
      expect(getDocuments(STUDIO, TITLE)).toEqual([]);
    });

    it('returns documents sorted by updatedAt descending', () => {
      const docs: Document[] = [
        { id: '1', name: 'Old', inputMarkdown: '', outputBBCode: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
        { id: '2', name: 'New', inputMarkdown: '', outputBBCode: '', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
        { id: '3', name: 'Mid', inputMarkdown: '', outputBBCode: '', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' },
      ];
      localStorageMock.setItem(`steambb-docs-${STUDIO}-${TITLE}`, JSON.stringify(docs));
      vi.clearAllMocks();

      const result = getDocuments(STUDIO, TITLE);
      expect(result.map(d => d.id)).toEqual(['2', '3', '1']);
    });

    it('returns empty array on corrupted JSON', () => {
      localStorageMock.setItem(`steambb-docs-${STUDIO}-${TITLE}`, 'not json');
      vi.clearAllMocks();
      expect(getDocuments(STUDIO, TITLE)).toEqual([]);
    });
  });

  describe('getDocument', () => {
    it('returns null when document not found', () => {
      expect(getDocument(STUDIO, TITLE, 'nonexistent')).toBeNull();
    });

    it('returns the matching document by ID', () => {
      const doc: Document = {
        id: 'abc',
        name: 'Test Doc',
        inputMarkdown: '# Hello',
        outputBBCode: '[h1]Hello[/h1]',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      };
      localStorageMock.setItem(`steambb-docs-${STUDIO}-${TITLE}`, JSON.stringify([doc]));
      vi.clearAllMocks();

      const result = getDocument(STUDIO, TITLE, 'abc');
      expect(result).toEqual(doc);
    });
  });

  describe('saveDocument', () => {
    it('creates a new document with generated ID', () => {
      const saved = saveDocument(STUDIO, TITLE, {
        name: 'New Doc',
        inputMarkdown: '# Test',
        outputBBCode: '[h1]Test[/h1]',
      });

      expect(saved.id).toBeTruthy();
      expect(saved.name).toBe('New Doc');
      expect(saved.inputMarkdown).toBe('# Test');
      expect(saved.outputBBCode).toBe('[h1]Test[/h1]');
      expect(saved.createdAt).toBeTruthy();
      expect(saved.updatedAt).toBeTruthy();

      // Verify persisted
      const docs = getDocuments(STUDIO, TITLE);
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe(saved.id);
    });

    it('updates an existing document by ID', () => {
      // Create with a fixed earlier timestamp
      const original = saveDocument(STUDIO, TITLE, {
        name: 'Original',
        inputMarkdown: 'v1',
        outputBBCode: 'v1',
        createdAt: '2026-01-01T00:00:00Z',
      });

      const updated = saveDocument(STUDIO, TITLE, {
        id: original.id,
        name: 'Updated',
        inputMarkdown: 'v2',
        outputBBCode: 'v2',
      });

      expect(updated.id).toBe(original.id);
      expect(updated.name).toBe('Updated');
      expect(updated.inputMarkdown).toBe('v2');
      expect(updated.createdAt).toBe('2026-01-01T00:00:00Z');
      // updatedAt should be newer than the fixed createdAt
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime());

      // Should still be one document
      expect(getDocuments(STUDIO, TITLE)).toHaveLength(1);
    });

    it('preserves existing documents when adding new ones', () => {
      saveDocument(STUDIO, TITLE, { name: 'Doc 1', inputMarkdown: '1', outputBBCode: '1' });
      saveDocument(STUDIO, TITLE, { name: 'Doc 2', inputMarkdown: '2', outputBBCode: '2' });
      saveDocument(STUDIO, TITLE, { name: 'Doc 3', inputMarkdown: '3', outputBBCode: '3' });

      expect(getDocuments(STUDIO, TITLE)).toHaveLength(3);
    });

    it('uses provided ID if given', () => {
      const saved = saveDocument(STUDIO, TITLE, {
        id: 'custom-id',
        name: 'Custom',
        inputMarkdown: '',
        outputBBCode: '',
      });

      expect(saved.id).toBe('custom-id');
    });

    it('saves translations when provided', () => {
      const saved = saveDocument(STUDIO, TITLE, {
        name: 'With Translations',
        inputMarkdown: '# Hello',
        outputBBCode: '[h1]Hello[/h1]',
        translations: { 'pt-BR': '[h1]Ola[/h1]', 'es-LATAM': '[h1]Hola[/h1]' },
      });

      expect(saved.translations).toEqual({ 'pt-BR': '[h1]Ola[/h1]', 'es-LATAM': '[h1]Hola[/h1]' });

      // Verify persisted
      const loaded = getDocument(STUDIO, TITLE, saved.id);
      expect(loaded?.translations).toEqual({ 'pt-BR': '[h1]Ola[/h1]', 'es-LATAM': '[h1]Hola[/h1]' });
    });

    it('saves context when provided', () => {
      const saved = saveDocument(STUDIO, TITLE, {
        name: 'With Context',
        inputMarkdown: '# Hello',
        outputBBCode: '[h1]Hello[/h1]',
        context: 'announcements',
      });

      expect(saved.context).toBe('announcements');

      const loaded = getDocument(STUDIO, TITLE, saved.id);
      expect(loaded?.context).toBe('announcements');
    });

    it('does not include translations when not provided', () => {
      const saved = saveDocument(STUDIO, TITLE, {
        name: 'No Translations',
        inputMarkdown: '# Hello',
        outputBBCode: '[h1]Hello[/h1]',
      });

      expect(saved.translations).toBeUndefined();
    });

    it('updates translations on existing document', () => {
      const original = saveDocument(STUDIO, TITLE, {
        name: 'Doc',
        inputMarkdown: 'v1',
        outputBBCode: 'v1',
        translations: { 'pt-BR': 'v1-pt' },
      });

      const updated = saveDocument(STUDIO, TITLE, {
        id: original.id,
        name: 'Doc',
        inputMarkdown: 'v2',
        outputBBCode: 'v2',
        translations: { 'pt-BR': 'v2-pt', 'es-LATAM': 'v2-es' },
      });

      expect(updated.translations).toEqual({ 'pt-BR': 'v2-pt', 'es-LATAM': 'v2-es' });
    });
  });

  describe('deleteDocument', () => {
    it('removes a document by ID', () => {
      const doc = saveDocument(STUDIO, TITLE, { name: 'To Delete', inputMarkdown: '', outputBBCode: '' });

      const result = deleteDocument(STUDIO, TITLE, doc.id);
      expect(result).toBe(true);
      expect(getDocuments(STUDIO, TITLE)).toHaveLength(0);
    });

    it('returns false when document not found', () => {
      expect(deleteDocument(STUDIO, TITLE, 'nonexistent')).toBe(false);
    });

    it('removes localStorage key when last document is deleted', () => {
      const doc = saveDocument(STUDIO, TITLE, { name: 'Only Doc', inputMarkdown: '', outputBBCode: '' });
      vi.clearAllMocks();

      deleteDocument(STUDIO, TITLE, doc.id);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`steambb-docs-${STUDIO}-${TITLE}`);
    });

    it('preserves other documents when one is deleted', () => {
      const doc1 = saveDocument(STUDIO, TITLE, { name: 'Keep', inputMarkdown: '1', outputBBCode: '1' });
      const doc2 = saveDocument(STUDIO, TITLE, { name: 'Delete', inputMarkdown: '2', outputBBCode: '2' });

      deleteDocument(STUDIO, TITLE, doc2.id);

      const remaining = getDocuments(STUDIO, TITLE);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(doc1.id);
    });
  });

  describe('tenant isolation', () => {
    it('documents are isolated between different titles', () => {
      saveDocument(STUDIO, 'game-a', { name: 'Game A Doc', inputMarkdown: 'a', outputBBCode: 'a' });
      saveDocument(STUDIO, 'game-b', { name: 'Game B Doc', inputMarkdown: 'b', outputBBCode: 'b' });

      expect(getDocuments(STUDIO, 'game-a')).toHaveLength(1);
      expect(getDocuments(STUDIO, 'game-a')[0].name).toBe('Game A Doc');

      expect(getDocuments(STUDIO, 'game-b')).toHaveLength(1);
      expect(getDocuments(STUDIO, 'game-b')[0].name).toBe('Game B Doc');
    });

    it('documents are isolated between different studios', () => {
      saveDocument('studio-x', TITLE, { name: 'Studio X Doc', inputMarkdown: 'x', outputBBCode: 'x' });
      saveDocument('studio-y', TITLE, { name: 'Studio Y Doc', inputMarkdown: 'y', outputBBCode: 'y' });

      expect(getDocuments('studio-x', TITLE)).toHaveLength(1);
      expect(getDocuments('studio-y', TITLE)).toHaveLength(1);
    });

    it('uses correct scoped storage key', () => {
      saveDocument('my-studio', 'my-game', { name: 'Test', inputMarkdown: '', outputBBCode: '' });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'steambb-docs-my-studio-my-game',
        expect.any(String),
      );
    });
  });
});
