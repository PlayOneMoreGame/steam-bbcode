/** Parse a cookie value from document.cookie by name. Returns null if not found. */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=');
    if (key.trim() === name) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

/** Get the studio slug from the steambb-studio cookie (set by CloudFront). */
export function getStudioFromCookie(): string | null {
  return getCookie('steambb-studio');
}
