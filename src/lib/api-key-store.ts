/**
 * Manages the Anthropic API key in localStorage.
 * The key is stored locally and never sent to any server other than Anthropic's API.
 */

const STORAGE_KEY = 'steambb-anthropic-api-key';

/** Retrieve the stored Anthropic API key, or null if not set. */
export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Store the Anthropic API key in localStorage. */
export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

/** Remove the stored Anthropic API key from localStorage. */
export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
