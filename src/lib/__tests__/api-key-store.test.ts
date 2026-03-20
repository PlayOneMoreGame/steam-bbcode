import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApiKey, setApiKey, clearApiKey, _resetMigrationFlag } from '../api-key-store';
import { getCurrentSelection } from '../workspace-stores';

// Mock workspace-stores to control the current studio slug
vi.mock('../workspace-stores', () => ({
  getCurrentSelection: vi.fn(() => ({ studioSlug: 'test-studio', titleSlug: 'test-title' })),
}));

const mockedGetCurrentSelection = vi.mocked(getCurrentSelection);

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    _store: store,
    _getStore: () => store,
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('api-key-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    _resetMigrationFlag();
    mockedGetCurrentSelection.mockReturnValue({ studioSlug: 'test-studio', titleSlug: 'test-title' });
  });

  it('returns null when no key is stored', () => {
    expect(getApiKey()).toBeNull();
  });

  it('stores and retrieves an API key', () => {
    setApiKey('sk-ant-test-key-123');
    expect(getApiKey()).toBe('sk-ant-test-key-123');
  });

  it('overwrites an existing key', () => {
    setApiKey('sk-ant-old-key');
    setApiKey('sk-ant-new-key');
    expect(getApiKey()).toBe('sk-ant-new-key');
  });

  it('clears the stored key', () => {
    setApiKey('sk-ant-test-key');
    clearApiKey();
    expect(getApiKey()).toBeNull();
  });

  it('uses a scoped localStorage key based on studio slug', () => {
    setApiKey('sk-ant-test');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('steambb-api-key-test-studio', 'sk-ant-test');
  });

  it('returns null when localStorage throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('localStorage disabled');
    });
    expect(getApiKey()).toBeNull();
  });

  describe('studio scoping', () => {
    it('isolates API keys between studios', () => {
      // Set key for studio A
      mockedGetCurrentSelection.mockReturnValue({ studioSlug: 'studio-a', titleSlug: 'title' });
      _resetMigrationFlag();
      setApiKey('sk-ant-studio-a');

      // Switch to studio B
      mockedGetCurrentSelection.mockReturnValue({ studioSlug: 'studio-b', titleSlug: 'title' });
      _resetMigrationFlag();
      expect(getApiKey()).toBeNull();

      // Set key for studio B
      setApiKey('sk-ant-studio-b');
      expect(getApiKey()).toBe('sk-ant-studio-b');

      // Switch back to studio A — key is still there
      mockedGetCurrentSelection.mockReturnValue({ studioSlug: 'studio-a', titleSlug: 'title' });
      _resetMigrationFlag();
      expect(getApiKey()).toBe('sk-ant-studio-a');
    });

    it('same studio with different titles shares the same API key', () => {
      mockedGetCurrentSelection.mockReturnValue({ studioSlug: 'shared-studio', titleSlug: 'game-1' });
      _resetMigrationFlag();
      setApiKey('sk-ant-shared');

      mockedGetCurrentSelection.mockReturnValue({ studioSlug: 'shared-studio', titleSlug: 'game-2' });
      _resetMigrationFlag();
      expect(getApiKey()).toBe('sk-ant-shared');
    });
  });

  describe('migration from legacy global key', () => {
    it('migrates legacy key to scoped key on first access', () => {
      // Simulate legacy key existing before migration
      localStorageMock.setItem('steambb-anthropic-api-key', 'sk-ant-legacy');
      vi.clearAllMocks(); // clear the setItem mock call history

      const key = getApiKey();
      expect(key).toBe('sk-ant-legacy');
      // Legacy key should be removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('steambb-anthropic-api-key');
      // Scoped key should be set
      expect(localStorageMock.setItem).toHaveBeenCalledWith('steambb-api-key-test-studio', 'sk-ant-legacy');
    });

    it('does not overwrite existing scoped key during migration', () => {
      localStorageMock.setItem('steambb-anthropic-api-key', 'sk-ant-legacy');
      localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-already-scoped');
      vi.clearAllMocks();

      const key = getApiKey();
      expect(key).toBe('sk-ant-already-scoped');
      // Legacy key should still be removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('steambb-anthropic-api-key');
    });

    it('migration runs only once per page load', () => {
      localStorageMock.setItem('steambb-anthropic-api-key', 'sk-ant-legacy');
      vi.clearAllMocks();

      getApiKey(); // triggers migration
      getApiKey(); // should not re-migrate

      // removeItem called exactly once for the legacy key
      const removeCalls = localStorageMock.removeItem.mock.calls.filter(
        (c: string[]) => c[0] === 'steambb-anthropic-api-key'
      );
      expect(removeCalls).toHaveLength(1);
    });

    it('does nothing when no legacy key exists', () => {
      vi.clearAllMocks();

      getApiKey();

      // No removeItem calls for the legacy key
      const removeCalls = localStorageMock.removeItem.mock.calls.filter(
        (c: string[]) => c[0] === 'steambb-anthropic-api-key'
      );
      expect(removeCalls).toHaveLength(0);
    });
  });
});
