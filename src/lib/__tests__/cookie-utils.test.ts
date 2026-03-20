/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getCookie, getStudioFromCookie } from '../cookie-utils';

describe('cookie-utils', () => {
  beforeEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  });

  describe('getCookie', () => {
    it('returns null when no cookies exist', () => {
      expect(getCookie('steambb-studio')).toBeNull();
    });

    it('returns null when cookie name is not found', () => {
      document.cookie = 'other-cookie=value';
      expect(getCookie('steambb-studio')).toBeNull();
    });

    it('returns the cookie value when found', () => {
      document.cookie = 'steambb-studio=one-more-game';
      expect(getCookie('steambb-studio')).toBe('one-more-game');
    });

    it('handles multiple cookies', () => {
      document.cookie = 'foo=bar';
      document.cookie = 'steambb-studio=best-mega-gameco';
      document.cookie = 'baz=qux';
      expect(getCookie('steambb-studio')).toBe('best-mega-gameco');
    });

    it('handles cookies with = in the value', () => {
      document.cookie = 'token=abc=def=ghi';
      document.cookie = 'steambb-studio=test';
      expect(getCookie('token')).toBe('abc=def=ghi');
      expect(getCookie('steambb-studio')).toBe('test');
    });
  });

  describe('getStudioFromCookie', () => {
    it('returns null when no cookie is set', () => {
      expect(getStudioFromCookie()).toBeNull();
    });

    it('returns the studio slug from the cookie', () => {
      document.cookie = 'steambb-studio=best-mega-gameco';
      expect(getStudioFromCookie()).toBe('best-mega-gameco');
    });
  });
});
