/**
 * Manages the Anthropic API key in localStorage.
 * The key is stored locally and never sent to any server other than Anthropic's API.
 */

const STORAGE_KEY = 'steambb-anthropic-api-key';

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
