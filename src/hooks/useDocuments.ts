import { useState, useCallback, useMemo } from 'react';
import {
  getDocuments,
  saveDocument,
  deleteDocument,
  type Document,
} from '@/lib/document-store';

export interface UseDocumentsReturn {
  /** All documents for the current workspace, most recent first. */
  documents: Document[];
  /** ID of the currently loaded document, or null if new/unsaved. */
  activeDocId: string | null;
  /** Save (create or update) a document. Returns the saved document. */
  saveCurrentDoc: (params: {
    name: string;
    inputMarkdown: string;
    outputBBCode: string;
    translations?: Record<string, string>;
    context?: string;
  }) => Document;
  /** Load a document by ID. Returns the document data or null. */
  loadDoc: (docId: string) => Document | null;
  /** Delete a document by ID. */
  deleteDoc: (docId: string) => boolean;
  /** Clear the active document (e.g., after "New"). */
  clearActiveDoc: () => void;
}

/**
 * React hook wrapping document-store with state management.
 * Documents are scoped per studio+title via workspaceKey ("studioSlug/titleSlug").
 */
export function useDocuments(workspaceKey: string): UseDocumentsReturn {
  const [studioSlug, titleSlug] = useMemo(() => {
    const parts = workspaceKey.split('/');
    return [parts[0] || '', parts[1] || ''];
  }, [workspaceKey]);

  // Revision counter — incremented on every write to force re-reads
  const [revision, setRevision] = useState(0);

  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const documents = useMemo(
    () => getDocuments(studioSlug, titleSlug),
    [studioSlug, titleSlug, revision] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const saveCurrentDoc = useCallback(
    (params: {
      name: string;
      inputMarkdown: string;
      outputBBCode: string;
      translations?: Record<string, string>;
      context?: string;
    }) => {
      const saved = saveDocument(studioSlug, titleSlug, {
        id: activeDocId ?? undefined,
        name: params.name,
        inputMarkdown: params.inputMarkdown,
        outputBBCode: params.outputBBCode,
        translations: params.translations,
        context: params.context,
      });
      setActiveDocId(saved.id);
      setRevision(r => r + 1);
      return saved;
    },
    [studioSlug, titleSlug, activeDocId],
  );

  const loadDoc = useCallback(
    (docId: string): Document | null => {
      const doc = documents.find(d => d.id === docId) ?? null;
      if (doc) {
        setActiveDocId(doc.id);
      }
      return doc;
    },
    [documents],
  );

  const deleteDoc = useCallback(
    (docId: string): boolean => {
      const result = deleteDocument(studioSlug, titleSlug, docId);
      if (result) {
        if (activeDocId === docId) {
          setActiveDocId(null);
        }
        setRevision(r => r + 1);
      }
      return result;
    },
    [studioSlug, titleSlug, activeDocId],
  );

  const clearActiveDoc = useCallback(() => {
    setActiveDocId(null);
  }, []);

  return { documents, activeDocId, saveCurrentDoc, loadDoc, deleteDoc, clearActiveDoc };
}
