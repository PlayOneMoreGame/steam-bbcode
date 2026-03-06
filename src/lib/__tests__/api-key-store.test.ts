import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApiKey, setApiKey, clearApiKey } from '../api-key-store';

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
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('api-key-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
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

  it('uses the correct localStorage key', () => {
    setApiKey('sk-ant-test');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('steambb-anthropic-api-key', 'sk-ant-test');
  });

  it('returns null when localStorage throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('localStorage disabled');
    });
    expect(getApiKey()).toBeNull();
  });
});
