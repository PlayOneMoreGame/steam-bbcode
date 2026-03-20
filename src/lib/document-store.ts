/**
 * Per-title document storage.
 *
 * Stores documents in localStorage scoped by studio+title slug.
 * Each document captures the input markdown and output BBCode at a point in time.
 *
 * Storage key: `steambb-docs-{studioSlug}-{titleSlug}`
 * Value: JSON array of Document objects, ordered by updatedAt descending.
 */

export interface Document {
  id: string;
  name: string;
  inputMarkdown: string;
  outputBBCode: string;
  translations?: Record<string, string>; // language code -> translated BBCode
  context?: string; // Steam context (announcements, guides, etc.)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Build the scoped storage key for a studio+title pair. */
function storageKey(studioSlug: string, titleSlug: string): string {
  return `steambb-docs-${studioSlug}-${titleSlug}`;
}

/** Generate a short unique ID (good enough for localStorage documents). */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Retrieve all documents for a studio+title, ordered by updatedAt descending. */
export function getDocuments(studioSlug: string, titleSlug: string): Document[] {
  try {
    const raw = localStorage.getItem(storageKey(studioSlug, titleSlug));
    if (!raw) return [];
    const docs: Document[] = JSON.parse(raw);
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

/** Retrieve a single document by ID, or null if not found. */
export function getDocument(studioSlug: string, titleSlug: string, docId: string): Document | null {
  const docs = getDocuments(studioSlug, titleSlug);
  return docs.find(d => d.id === docId) ?? null;
}

/**
 * Save a document. If the document has no `id`, one is generated (create).
 * If a document with the same `id` exists, it is replaced (update).
 * Returns the saved document (with id, createdAt, updatedAt populated).
 */
export function saveDocument(
  studioSlug: string,
  titleSlug: string,
  doc: Partial<Document> & Pick<Document, 'name' | 'inputMarkdown' | 'outputBBCode'>,
): Document {
  const docs = getDocuments(studioSlug, titleSlug);
  const now = new Date().toISOString();

  let saved: Document;
  const existingIndex = doc.id ? docs.findIndex(d => d.id === doc.id) : -1;

  if (existingIndex >= 0) {
    // Update existing
    saved = {
      ...docs[existingIndex],
      name: doc.name,
      inputMarkdown: doc.inputMarkdown,
      outputBBCode: doc.outputBBCode,
      updatedAt: now,
    };
    if (doc.translations !== undefined) saved.translations = doc.translations;
    if (doc.context !== undefined) saved.context = doc.context;
    docs[existingIndex] = saved;
  } else {
    // Create new
    saved = {
      id: doc.id || generateId(),
      name: doc.name,
      inputMarkdown: doc.inputMarkdown,
      outputBBCode: doc.outputBBCode,
      createdAt: doc.createdAt || now,
      updatedAt: now,
    };
    if (doc.translations !== undefined) saved.translations = doc.translations;
    if (doc.context !== undefined) saved.context = doc.context;
    docs.push(saved);
  }

  localStorage.setItem(storageKey(studioSlug, titleSlug), JSON.stringify(docs));
  return saved;
}

/** Delete a document by ID. Returns true if a document was removed. */
export function deleteDocument(studioSlug: string, titleSlug: string, docId: string): boolean {
  const docs = getDocuments(studioSlug, titleSlug);
  const filtered = docs.filter(d => d.id !== docId);

  if (filtered.length === docs.length) return false;

  if (filtered.length === 0) {
    localStorage.removeItem(storageKey(studioSlug, titleSlug));
  } else {
    localStorage.setItem(storageKey(studioSlug, titleSlug), JSON.stringify(filtered));
  }
  return true;
}
