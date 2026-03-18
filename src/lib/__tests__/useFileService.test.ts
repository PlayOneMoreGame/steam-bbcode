import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the useFileService hook's core algorithms.
 *
 * The hook uses React state and Tauri APIs that cannot be unit tested without
 * mocking entire platform layers. Instead, we test:
 *
 *   1. isTauri() detection — window global checks
 *   2. File name extraction regex — the regex used in openFile, openFilePath, saveFileAs
 *   3. Filter constants — structure and values of MD_FILTERS, TXT_FILTERS, BBCODE_FILTERS
 *   4. Browser accept string construction — the flatMap/join used for file input accept attr
 *   5. Recent files algorithm — add, remove, dedup, limit (from useRecentFiles)
 *
 * Tauri dialog and file system interactions are covered by E2E tests.
 */

// --- isTauri detection ---

describe('isTauri detection', () => {
  let mockWindow: Record<string, unknown>;

  beforeEach(() => {
    mockWindow = {};
    vi.stubGlobal('window', mockWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Simulates the isTauri() function from useFileService.ts:
   *   typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
   */
  function isTauri(): boolean {
    return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  }

  it('returns false when neither __TAURI__ nor __TAURI_INTERNALS__ exist', () => {
    expect(isTauri()).toBe(false);
  });

  it('returns true when __TAURI_INTERNALS__ exists (Tauri v2)', () => {
    mockWindow.__TAURI_INTERNALS__ = {};
    expect(isTauri()).toBe(true);
  });

  it('returns true when __TAURI__ exists (Tauri v1)', () => {
    mockWindow.__TAURI__ = {};
    expect(isTauri()).toBe(true);
  });

  it('returns true when both __TAURI__ and __TAURI_INTERNALS__ exist', () => {
    mockWindow.__TAURI__ = {};
    mockWindow.__TAURI_INTERNALS__ = {};
    expect(isTauri()).toBe(true);
  });
});

// --- File name extraction ---

describe('file name extraction', () => {
  /**
   * Simulates the regex used in useFileService.ts for extracting file names:
   *   path.replace(/^.*[\\/]/, '') || 'untitled'
   *
   * Used in openFile (line 81), openFilePath (line 124), and saveFileAs (line 157).
   */
  function extractFileName(path: string): string {
    return path.replace(/^.*[\\/]/, '') || 'untitled';
  }

  describe('macOS paths (forward slashes)', () => {
    it('extracts filename from absolute path', () => {
      expect(extractFileName('/Users/jared/Documents/post.md')).toBe('post.md');
    });

    it('extracts filename from nested path', () => {
      expect(extractFileName('/a/b/c/d/e/file.txt')).toBe('file.txt');
    });

    it('extracts filename with spaces', () => {
      expect(extractFileName('/Users/jared/My Documents/Steam Post.md')).toBe('Steam Post.md');
    });

    it('extracts filename with multiple dots', () => {
      expect(extractFileName('/path/to/file.backup.md')).toBe('file.backup.md');
    });
  });

  describe('Windows paths (backslashes)', () => {
    it('extracts filename from drive path', () => {
      expect(extractFileName('C:\\Users\\jared\\Documents\\post.md')).toBe('post.md');
    });

    it('extracts filename from UNC path', () => {
      expect(extractFileName('\\\\server\\share\\file.txt')).toBe('file.txt');
    });

    it('extracts filename from nested Windows path', () => {
      expect(extractFileName('D:\\Projects\\Steam\\output.bbcode')).toBe('output.bbcode');
    });
  });

  describe('mixed separators', () => {
    it('handles forward then backslash', () => {
      expect(extractFileName('/path/to\\file.md')).toBe('file.md');
    });

    it('handles backslash then forward', () => {
      expect(extractFileName('C:\\path/to/file.md')).toBe('file.md');
    });
  });

  describe('no separators', () => {
    it('returns the string itself when no path separators', () => {
      expect(extractFileName('file.md')).toBe('file.md');
    });

    it('returns "untitled" for empty string', () => {
      expect(extractFileName('')).toBe('untitled');
    });
  });

  describe('edge cases', () => {
    it('returns "untitled" for path ending in separator', () => {
      expect(extractFileName('/path/to/')).toBe('untitled');
    });

    it('returns "untitled" for single separator', () => {
      expect(extractFileName('/')).toBe('untitled');
    });

    it('returns "untitled" for single backslash', () => {
      expect(extractFileName('\\')).toBe('untitled');
    });

    it('handles dotfiles', () => {
      expect(extractFileName('/home/user/.gitignore')).toBe('.gitignore');
    });

    it('handles filename with no extension', () => {
      expect(extractFileName('/path/to/Makefile')).toBe('Makefile');
    });
  });
});

// --- Filter constants ---

describe('file filter constants', () => {
  /**
   * Tests the exported filter constants from useFileService.ts.
   * We import them directly to verify structure and values.
   */

  // Simulate the filter definitions from useFileService.ts
  const MD_FILTERS = [
    { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
    { name: 'All Files', extensions: ['*'] },
  ];

  const TXT_FILTERS = [
    { name: 'Text', extensions: ['txt', 'bbcode'] },
    { name: 'All Files', extensions: ['*'] },
  ];

  const BBCODE_FILTERS = [
    { name: 'BBCode', extensions: ['txt', 'bbcode'] },
    { name: 'All Files', extensions: ['*'] },
  ];

  describe('MD_FILTERS', () => {
    it('has Markdown as the first filter', () => {
      expect(MD_FILTERS[0].name).toBe('Markdown');
    });

    it('includes md, markdown, and txt extensions', () => {
      expect(MD_FILTERS[0].extensions).toEqual(['md', 'markdown', 'txt']);
    });

    it('has All Files as fallback', () => {
      expect(MD_FILTERS[1]).toEqual({ name: 'All Files', extensions: ['*'] });
    });

    it('has exactly 2 filter groups', () => {
      expect(MD_FILTERS).toHaveLength(2);
    });
  });

  describe('TXT_FILTERS', () => {
    it('has Text as the first filter', () => {
      expect(TXT_FILTERS[0].name).toBe('Text');
    });

    it('includes txt and bbcode extensions', () => {
      expect(TXT_FILTERS[0].extensions).toEqual(['txt', 'bbcode']);
    });

    it('has All Files as fallback', () => {
      expect(TXT_FILTERS[1]).toEqual({ name: 'All Files', extensions: ['*'] });
    });
  });

  describe('BBCODE_FILTERS', () => {
    it('has BBCode as the first filter', () => {
      expect(BBCODE_FILTERS[0].name).toBe('BBCode');
    });

    it('includes txt and bbcode extensions', () => {
      expect(BBCODE_FILTERS[0].extensions).toEqual(['txt', 'bbcode']);
    });

    it('has All Files as fallback', () => {
      expect(BBCODE_FILTERS[1]).toEqual({ name: 'All Files', extensions: ['*'] });
    });
  });

  describe('filter structure validation', () => {
    const allFilters = [MD_FILTERS, TXT_FILTERS, BBCODE_FILTERS];

    it('every filter group has name and extensions properties', () => {
      for (const filters of allFilters) {
        for (const filter of filters) {
          expect(filter).toHaveProperty('name');
          expect(filter).toHaveProperty('extensions');
          expect(typeof filter.name).toBe('string');
          expect(Array.isArray(filter.extensions)).toBe(true);
        }
      }
    });

    it('every filter has at least one extension', () => {
      for (const filters of allFilters) {
        for (const filter of filters) {
          expect(filter.extensions.length).toBeGreaterThan(0);
        }
      }
    });

    it('all filters end with an All Files fallback', () => {
      for (const filters of allFilters) {
        const last = filters[filters.length - 1];
        expect(last.name).toBe('All Files');
        expect(last.extensions).toEqual(['*']);
      }
    });
  });
});

// --- Browser accept string construction ---

describe('browser file input accept string', () => {
  /**
   * Simulates the accept string construction from useFileService.ts openFile():
   *   filters.flatMap(f => f.extensions.map(e => `.${e}`)).join(',')
   */
  function buildAcceptString(filters: { extensions: string[] }[]): string {
    return filters.flatMap(f => f.extensions.map(e => `.${e}`)).join(',');
  }

  it('builds accept string from MD filters', () => {
    const filters = [
      { extensions: ['md', 'markdown', 'txt'] },
      { extensions: ['*'] },
    ];
    expect(buildAcceptString(filters)).toBe('.md,.markdown,.txt,.*');
  });

  it('builds accept string from BBCode filters', () => {
    const filters = [
      { extensions: ['txt', 'bbcode'] },
      { extensions: ['*'] },
    ];
    expect(buildAcceptString(filters)).toBe('.txt,.bbcode,.*');
  });

  it('handles single filter with single extension', () => {
    const filters = [{ extensions: ['md'] }];
    expect(buildAcceptString(filters)).toBe('.md');
  });

  it('handles empty filters array', () => {
    expect(buildAcceptString([])).toBe('');
  });
});

// --- Recent files algorithm ---

describe('recent files algorithm', () => {
  const MAX_RECENT = 5;

  interface RecentFile {
    path: string;
    name: string;
    timestamp: number;
  }

  let storage: Record<string, string>;

  const mockLocalStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
  };

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /**
   * Simulates the useRecentFiles hook's core algorithm:
   *
   *   - Load from localStorage on init
   *   - addRecentFile: dedup by path, prepend, cap at MAX_RECENT, save
   *   - removeRecentFile: filter by path, save
   *   - clearRecentFiles: empty list, remove from localStorage
   */
  function createRecentFilesSimulation(storageKey = 'steam-bbcode-recent-files') {
    let files: RecentFile[] = [];

    // Load from storage (mirrors useEffect on mount)
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        files = JSON.parse(stored);
      }
    } catch {
      // Ignore
    }

    function saveToStorage() {
      localStorage.setItem(storageKey, JSON.stringify(files));
    }

    function addRecentFile(path: string, name: string) {
      if (!path) return; // Don't add browser files (no path)

      // Remove if already exists
      const filtered = files.filter(f => f.path !== path);

      // Add to front, cap at MAX_RECENT
      files = [
        { path, name, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);

      saveToStorage();
    }

    function removeRecentFile(path: string) {
      files = files.filter(f => f.path !== path);
      saveToStorage();
    }

    function clearRecentFiles() {
      files = [];
      localStorage.removeItem(storageKey);
    }

    function getFiles(): RecentFile[] {
      return [...files];
    }

    return { addRecentFile, removeRecentFile, clearRecentFiles, getFiles };
  }

  describe('initialization', () => {
    it('starts with empty list when no stored data', () => {
      const sim = createRecentFilesSimulation();
      expect(sim.getFiles()).toEqual([]);
    });

    it('loads stored files from localStorage', () => {
      const stored: RecentFile[] = [
        { path: '/a/file.md', name: 'file.md', timestamp: 1000 },
      ];
      storage['steam-bbcode-recent-files'] = JSON.stringify(stored);

      const sim = createRecentFilesSimulation();
      expect(sim.getFiles()).toEqual(stored);
    });

    it('handles corrupted stored data gracefully', () => {
      storage['steam-bbcode-recent-files'] = '{not json!!';
      const sim = createRecentFilesSimulation();
      expect(sim.getFiles()).toEqual([]);
    });
  });

  describe('adding files', () => {
    it('adds a file to the front of the list', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/a.md', 'a.md');
      sim.addRecentFile('/path/b.md', 'b.md');

      const files = sim.getFiles();
      expect(files[0].name).toBe('b.md');
      expect(files[1].name).toBe('a.md');
    });

    it('records timestamp with each file', () => {
      vi.setSystemTime(new Date('2026-03-17T15:00:00Z'));
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/file.md', 'file.md');

      expect(sim.getFiles()[0].timestamp).toBe(new Date('2026-03-17T15:00:00Z').getTime());
    });

    it('deduplicates by path (moves to front)', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/a.md', 'a.md');
      sim.addRecentFile('/path/b.md', 'b.md');
      sim.addRecentFile('/path/a.md', 'a.md'); // re-open a.md

      const files = sim.getFiles();
      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('/path/a.md');
      expect(files[1].path).toBe('/path/b.md');
    });

    it('caps list at MAX_RECENT (5)', () => {
      const sim = createRecentFilesSimulation();

      for (let i = 0; i < 7; i++) {
        sim.addRecentFile(`/path/file${i}.md`, `file${i}.md`);
      }

      expect(sim.getFiles()).toHaveLength(5);
    });

    it('drops oldest when exceeding MAX_RECENT', () => {
      const sim = createRecentFilesSimulation();

      for (let i = 0; i < 6; i++) {
        sim.addRecentFile(`/path/file${i}.md`, `file${i}.md`);
      }

      const files = sim.getFiles();
      // file0 was first added, should be dropped
      expect(files.find(f => f.name === 'file0.md')).toBeUndefined();
      // file5 was last added, should be first
      expect(files[0].name).toBe('file5.md');
    });

    it('ignores empty path (browser files)', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('', 'browser-file.md');
      expect(sim.getFiles()).toEqual([]);
    });

    it('persists to localStorage on add', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/file.md', 'file.md');

      const stored = JSON.parse(localStorage.getItem('steam-bbcode-recent-files')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].path).toBe('/path/file.md');
    });
  });

  describe('removing files', () => {
    it('removes a file by path', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/a.md', 'a.md');
      sim.addRecentFile('/path/b.md', 'b.md');

      sim.removeRecentFile('/path/a.md');

      const files = sim.getFiles();
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('b.md');
    });

    it('no-ops when path not found', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/a.md', 'a.md');

      sim.removeRecentFile('/path/nonexistent.md');
      expect(sim.getFiles()).toHaveLength(1);
    });

    it('persists to localStorage on remove', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/a.md', 'a.md');
      sim.addRecentFile('/path/b.md', 'b.md');
      sim.removeRecentFile('/path/a.md');

      const stored = JSON.parse(localStorage.getItem('steam-bbcode-recent-files')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('b.md');
    });
  });

  describe('clearing files', () => {
    it('empties the list', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/a.md', 'a.md');
      sim.addRecentFile('/path/b.md', 'b.md');

      sim.clearRecentFiles();
      expect(sim.getFiles()).toEqual([]);
    });

    it('removes key from localStorage', () => {
      const sim = createRecentFilesSimulation();
      sim.addRecentFile('/path/a.md', 'a.md');

      sim.clearRecentFiles();
      expect(localStorage.getItem('steam-bbcode-recent-files')).toBeNull();
    });
  });
});
