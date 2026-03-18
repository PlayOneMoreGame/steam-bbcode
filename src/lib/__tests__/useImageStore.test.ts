import { describe, it, expect } from 'vitest';

/**
 * Tests for the useImageStore hook's core algorithm.
 *
 * useImageStore uses an in-memory Map<string, string> (no localStorage).
 * The hook wraps React state (useState, useCallback, useMemo) around Map
 * operations. We test the Map-based algorithm directly.
 *
 * React lifecycle behavior is covered by E2E tests.
 */

interface ImageEntry {
  filename: string;
  dataUrl: string;
}

/**
 * Simulates the useImageStore hook's core data structure and operations.
 * The real hook uses useState<Map<string, string>> — we use a plain Map.
 */
function createImageStoreSimulation() {
  let images = new Map<string, string>();

  function addImage(filename: string, dataUrl: string) {
    const next = new Map(images);
    next.set(filename, dataUrl);
    images = next;
  }

  function getImage(filename: string): string | undefined {
    return images.get(filename);
  }

  function removeImage(filename: string) {
    const next = new Map(images);
    next.delete(filename);
    images = next;
  }

  function clear() {
    images = new Map();
  }

  function getImageList(): ImageEntry[] {
    return Array.from(images.entries()).map(([filename, dataUrl]) => ({
      filename,
      dataUrl,
    }));
  }

  return {
    addImage,
    getImage,
    removeImage,
    clear,
    getImages: () => images,
    getImageList,
  };
}

describe('useImageStore algorithm simulation', () => {
  describe('addImage', () => {
    it('stores a filename to dataUrl mapping', () => {
      const store = createImageStoreSimulation();
      store.addImage('hero.png', 'data:image/png;base64,abc123');
      expect(store.getImage('hero.png')).toBe('data:image/png;base64,abc123');
    });

    it('stores multiple images', () => {
      const store = createImageStoreSimulation();
      store.addImage('hero.png', 'data:image/png;base64,hero');
      store.addImage('logo.jpg', 'data:image/jpeg;base64,logo');
      store.addImage('banner.gif', 'data:image/gif;base64,banner');

      expect(store.getImage('hero.png')).toBe('data:image/png;base64,hero');
      expect(store.getImage('logo.jpg')).toBe('data:image/jpeg;base64,logo');
      expect(store.getImage('banner.gif')).toBe('data:image/gif;base64,banner');
      expect(store.getImages().size).toBe(3);
    });

    it('overwrites existing image with same filename', () => {
      const store = createImageStoreSimulation();
      store.addImage('hero.png', 'data:image/png;base64,old');
      store.addImage('hero.png', 'data:image/png;base64,new');

      expect(store.getImage('hero.png')).toBe('data:image/png;base64,new');
      expect(store.getImages().size).toBe(1);
    });

    it('treats filenames as case-sensitive', () => {
      const store = createImageStoreSimulation();
      store.addImage('Hero.png', 'data:image/png;base64,upper');
      store.addImage('hero.png', 'data:image/png;base64,lower');

      expect(store.getImages().size).toBe(2);
      expect(store.getImage('Hero.png')).toBe('data:image/png;base64,upper');
      expect(store.getImage('hero.png')).toBe('data:image/png;base64,lower');
    });
  });

  describe('getImage', () => {
    it('returns the data URL for a stored filename', () => {
      const store = createImageStoreSimulation();
      store.addImage('test.png', 'data:image/png;base64,testdata');
      expect(store.getImage('test.png')).toBe('data:image/png;base64,testdata');
    });

    it('returns undefined for unstored filename', () => {
      const store = createImageStoreSimulation();
      expect(store.getImage('nonexistent.png')).toBeUndefined();
    });

    it('returns undefined after image is removed', () => {
      const store = createImageStoreSimulation();
      store.addImage('test.png', 'data:image/png;base64,testdata');
      store.removeImage('test.png');
      expect(store.getImage('test.png')).toBeUndefined();
    });
  });

  describe('removeImage', () => {
    it('removes an image by filename', () => {
      const store = createImageStoreSimulation();
      store.addImage('hero.png', 'data:image/png;base64,hero');
      store.addImage('logo.png', 'data:image/png;base64,logo');

      store.removeImage('hero.png');

      expect(store.getImage('hero.png')).toBeUndefined();
      expect(store.getImage('logo.png')).toBe('data:image/png;base64,logo');
      expect(store.getImages().size).toBe(1);
    });

    it('is a no-op for nonexistent filename', () => {
      const store = createImageStoreSimulation();
      store.addImage('hero.png', 'data:image/png;base64,hero');
      store.removeImage('nonexistent.png');

      expect(store.getImages().size).toBe(1);
      expect(store.getImage('hero.png')).toBe('data:image/png;base64,hero');
    });

    it('can remove the last remaining image', () => {
      const store = createImageStoreSimulation();
      store.addImage('only.png', 'data:image/png;base64,only');
      store.removeImage('only.png');

      expect(store.getImages().size).toBe(0);
    });
  });

  describe('clear', () => {
    it('removes all stored images', () => {
      const store = createImageStoreSimulation();
      store.addImage('a.png', 'data:image/png;base64,a');
      store.addImage('b.png', 'data:image/png;base64,b');
      store.addImage('c.png', 'data:image/png;base64,c');

      store.clear();

      expect(store.getImages().size).toBe(0);
      expect(store.getImage('a.png')).toBeUndefined();
      expect(store.getImage('b.png')).toBeUndefined();
      expect(store.getImage('c.png')).toBeUndefined();
    });

    it('is a no-op when already empty', () => {
      const store = createImageStoreSimulation();
      store.clear();
      expect(store.getImages().size).toBe(0);
    });

    it('allows adding images after clear', () => {
      const store = createImageStoreSimulation();
      store.addImage('old.png', 'data:image/png;base64,old');
      store.clear();
      store.addImage('new.png', 'data:image/png;base64,new');

      expect(store.getImages().size).toBe(1);
      expect(store.getImage('new.png')).toBe('data:image/png;base64,new');
      expect(store.getImage('old.png')).toBeUndefined();
    });
  });

  describe('imageList', () => {
    it('returns empty array when no images stored', () => {
      const store = createImageStoreSimulation();
      expect(store.getImageList()).toEqual([]);
    });

    it('returns array of { filename, dataUrl } entries', () => {
      const store = createImageStoreSimulation();
      store.addImage('hero.png', 'data:image/png;base64,hero');
      store.addImage('logo.jpg', 'data:image/jpeg;base64,logo');

      const list = store.getImageList();
      expect(list).toHaveLength(2);
      expect(list).toContainEqual({ filename: 'hero.png', dataUrl: 'data:image/png;base64,hero' });
      expect(list).toContainEqual({ filename: 'logo.jpg', dataUrl: 'data:image/jpeg;base64,logo' });
    });

    it('reflects additions', () => {
      const store = createImageStoreSimulation();
      expect(store.getImageList()).toHaveLength(0);

      store.addImage('new.png', 'data:image/png;base64,new');
      expect(store.getImageList()).toHaveLength(1);
    });

    it('reflects removals', () => {
      const store = createImageStoreSimulation();
      store.addImage('a.png', 'data:image/png;base64,a');
      store.addImage('b.png', 'data:image/png;base64,b');

      store.removeImage('a.png');
      const list = store.getImageList();
      expect(list).toHaveLength(1);
      expect(list[0].filename).toBe('b.png');
    });

    it('is empty after clear', () => {
      const store = createImageStoreSimulation();
      store.addImage('a.png', 'data:image/png;base64,a');
      store.clear();
      expect(store.getImageList()).toEqual([]);
    });
  });
});
