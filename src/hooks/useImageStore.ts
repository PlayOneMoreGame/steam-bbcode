import { useState, useCallback, useMemo } from 'react';

export interface ImageEntry {
  filename: string;
  dataUrl: string;
}

export interface ImageStore {
  /** Add an image to the store. Overwrites if filename already exists. */
  addImage: (filename: string, dataUrl: string) => void;
  /** Get the data URL for a filename, or undefined if not stored. */
  getImage: (filename: string) => string | undefined;
  /** Remove an image from the store. */
  removeImage: (filename: string) => void;
  /** Clear all stored images. */
  clear: () => void;
  /** The underlying map of filename to data URL. */
  images: Map<string, string>;
  /** Array of entries for rendering (thumbnails, lists). */
  imageList: ImageEntry[];
}

/**
 * In-memory image store for drag-and-drop / pasted images.
 * Images are stored as data URLs (base64). Not persisted to localStorage
 * because image data is too large. Lost on page reload -- this is intentional.
 */
export function useImageStore(): ImageStore {
  const [images, setImages] = useState<Map<string, string>>(new Map());

  const addImage = useCallback((filename: string, dataUrl: string) => {
    setImages(prev => {
      const next = new Map(prev);
      next.set(filename, dataUrl);
      return next;
    });
  }, []);

  const getImage = useCallback((filename: string): string | undefined => {
    return images.get(filename);
  }, [images]);

  const removeImage = useCallback((filename: string) => {
    setImages(prev => {
      const next = new Map(prev);
      next.delete(filename);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setImages(new Map());
  }, []);

  const imageList = useMemo((): ImageEntry[] => {
    return Array.from(images.entries()).map(([filename, dataUrl]) => ({
      filename,
      dataUrl,
    }));
  }, [images]);

  return { addImage, getImage, removeImage, clear, images, imageList };
}
