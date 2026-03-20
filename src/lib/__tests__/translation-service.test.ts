import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDoNotTranslateTerms } from '../glossary';

// Mock workspace-stores so api-key-store can resolve the current studio
// and dnt-store can resolve getDntStore
vi.mock('../workspace-stores', () => ({
  getCurrentSelection: vi.fn(() => ({ studioSlug: 'test-studio', titleSlug: 'test-title' })),
  getDntStore: vi.fn(() => ({
    getAll: () => [],
    add: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(),
    isTitleDefault: () => false,
    getTier: () => 'user',
    isDefault: () => false,
    setUserTerms: vi.fn(),
  })),
}));

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

// Mock the Anthropic SDK
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, body: { message: string }) {
      super(body.message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  class MockAnthropic {
    messages = { create: mockCreate };
    constructor() {}
    static APIError = APIError;
  }

  return { default: MockAnthropic };
});

// Import after mocks are set up
import { buildSystemPrompt, translateBBCode, hashString } from '../translation-service';
import { _resetMigrationFlag } from '../api-key-store';

describe('buildSystemPrompt', () => {
  it('includes the target language name', () => {
    const prompt = buildSystemPrompt('pt-BR');
    expect(prompt).toContain('Brazilian Portuguese');
    expect(prompt).toContain('pt-BR');
  });

  it('includes all default Do Not Translate terms when no custom terms provided', () => {
    const prompt = buildSystemPrompt('es-LATAM');
    for (const term of getDoNotTranslateTerms()) {
      expect(prompt).toContain(term);
    }
  });

  it('uses custom terms when provided', () => {
    const prompt = buildSystemPrompt('es-LATAM', ['CustomGame', 'BossName']);
    expect(prompt).toContain('CustomGame');
    expect(prompt).toContain('BossName');
    // Should NOT contain default terms that weren't passed
    expect(prompt).not.toContain('Tangus');
  });

  it('includes instructions to preserve BBCode tags', () => {
    const prompt = buildSystemPrompt('pt-BR');
    expect(prompt).toContain('BBCode tags');
    expect(prompt).toContain('[h1]');
  });

  it('includes instructions about @mentions', () => {
    const prompt = buildSystemPrompt('pt-BR');
    expect(prompt).toContain('@mentions');
  });

  it('falls back to the lang code if not in LANGUAGE_DISPLAY_NAMES', () => {
    const prompt = buildSystemPrompt('fr-FR');
    expect(prompt).toContain('fr-FR');
  });

  it('includes Do Not Translate pattern descriptions', () => {
    const prompt = buildSystemPrompt('pt-BR');
    expect(prompt).toContain('Pattern:');
    expect(prompt).toContain('@\\w+');
  });
});

describe('translateBBCode', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockCreate.mockReset();
    _resetMigrationFlag();
  });

  it('returns missing_api_key error when no key is set', async () => {
    const result = await translateBBCode('[h1]Hello[/h1]', 'pt-BR');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('missing_api_key');
    }
  });

  it('calls the API and returns translated content on success', async () => {
    localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-test-key');
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '[h1]Ola[/h1]' }],
    });

    const result = await translateBBCode('[h1]Hello[/h1]', 'pt-BR');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bbcode).toBe('[h1]Ola[/h1]');
    }
  });

  it('passes the correct model to the API', async () => {
    localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-test-key');
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'translated' }],
    });

    await translateBBCode('test', 'pt-BR');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
      })
    );
  });

  it('sends BBCode as user message', async () => {
    localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-test-key');
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'translated' }],
    });

    await translateBBCode('[b]Hello World[/b]', 'es-LATAM');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: '[b]Hello World[/b]' }],
      })
    );
  });

  it('includes system prompt with target language', async () => {
    localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-test-key');
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'translated' }],
    });

    await translateBBCode('test', 'pt-BR');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Brazilian Portuguese'),
      })
    );
  });

  it('returns api_error when response has no text block', async () => {
    localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-test-key');
    mockCreate.mockResolvedValueOnce({
      content: [],
    });

    const result = await translateBBCode('test', 'pt-BR');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('api_error');
    }
  });

  it('handles API errors gracefully', async () => {
    localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-test-key');

    // Import the mock class to create an APIError
    const mod = await import('@anthropic-ai/sdk');
    const Anthropic = mod.default as any;
    mockCreate.mockRejectedValueOnce(
      new Anthropic.APIError(401, { message: 'Invalid API key' })
    );

    const result = await translateBBCode('test', 'pt-BR');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('api_error');
      expect(result.error).toContain('401');
    }
  });

  it('handles generic errors gracefully', async () => {
    localStorageMock.setItem('steambb-api-key-test-studio', 'sk-ant-test-key');
    mockCreate.mockRejectedValueOnce(new Error('Something went wrong'));

    const result = await translateBBCode('test', 'pt-BR');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('unknown');
      expect(result.error).toContain('Something went wrong');
    }
  });
});

describe('hashString', () => {
  it('returns a consistent hash for the same string', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('returns different hashes for different strings', () => {
    expect(hashString('hello')).not.toBe(hashString('world'));
  });

  it('returns 0 for empty string', () => {
    expect(hashString('')).toBe(0);
  });

  it('returns a number', () => {
    expect(typeof hashString('test')).toBe('number');
  });
});
