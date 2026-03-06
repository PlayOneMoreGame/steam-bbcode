import { describe, it, expect } from 'vitest';
import { detectBlacklistTerms } from '../blacklist-detector';

describe('detectBlacklistTerms', () => {
  describe('word boundary matching', () => {
    it('matches exact word "kill"', () => {
      const matches = detectBlacklistTerms('kill the process', ['kill']);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ term: 'kill', line: 1, column: 1, length: 4 });
    });

    it('does not match "skill" when blacklisting "kill"', () => {
      const matches = detectBlacklistTerms('this is a skill check', ['kill']);
      expect(matches).toHaveLength(0);
    });

    it('does not match "killer" when blacklisting "kill"', () => {
      const matches = detectBlacklistTerms('the killer app', ['kill']);
      expect(matches).toHaveLength(0);
    });

    it('does not match "overkill" when blacklisting "kill"', () => {
      const matches = detectBlacklistTerms('that was overkill', ['kill']);
      expect(matches).toHaveLength(0);
    });

    it('matches word at end of line', () => {
      const matches = detectBlacklistTerms('time to kill', ['kill']);
      expect(matches).toHaveLength(1);
      expect(matches[0].column).toBe(9);
    });
  });

  describe('case insensitive', () => {
    it('matches "Kill" with lowercase blacklist term', () => {
      const matches = detectBlacklistTerms('Kill the process', ['kill']);
      expect(matches).toHaveLength(1);
    });

    it('matches "KILL" with lowercase blacklist term', () => {
      const matches = detectBlacklistTerms('KILL the process', ['kill']);
      expect(matches).toHaveLength(1);
    });

    it('matches lowercase text with uppercase blacklist term', () => {
      const matches = detectBlacklistTerms('kill the process', ['KILL']);
      expect(matches).toHaveLength(1);
    });
  });

  describe('multiple terms', () => {
    it('finds multiple terms on same line', () => {
      const matches = detectBlacklistTerms('kill and destroy everything', ['kill', 'destroy']);
      expect(matches).toHaveLength(2);
      expect(matches[0].term).toBe('kill');
      expect(matches[1].term).toBe('destroy');
    });

    it('finds matches across lines', () => {
      const text = 'line one has kill\nline two has destroy';
      const matches = detectBlacklistTerms(text, ['kill', 'destroy']);
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ term: 'kill', line: 1, column: 14, length: 4 });
      expect(matches[1]).toEqual({ term: 'destroy', line: 2, column: 14, length: 7 });
    });

    it('finds multiple matches of same term', () => {
      const text = 'kill first then kill again';
      const matches = detectBlacklistTerms(text, ['kill']);
      expect(matches).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty blacklist', () => {
      const matches = detectBlacklistTerms('some text here', []);
      expect(matches).toHaveLength(0);
    });

    it('returns empty array for empty text', () => {
      const matches = detectBlacklistTerms('', ['kill']);
      expect(matches).toHaveLength(0);
    });

    it('handles terms with special regex characters like "C++"', () => {
      const matches = detectBlacklistTerms('Use C++ for this', ['C++']);
      // C++ has special chars but should not throw
      expect(matches).toBeDefined();
    });

    it('handles terms with dots', () => {
      const matches = detectBlacklistTerms('check v2.0 release', ['v2.0']);
      // Should not throw
      expect(matches).toBeDefined();
    });

    it('handles terms with parentheses', () => {
      const matches = detectBlacklistTerms('call func()', ['func()']);
      // Should not throw
      expect(matches).toBeDefined();
    });

    it('ignores empty/whitespace terms', () => {
      const matches = detectBlacklistTerms('some text', ['', '  ', 'text']);
      expect(matches).toHaveLength(1);
      expect(matches[0].term).toBe('text');
    });

    it('returns matches sorted by line then column', () => {
      const text = 'bad word here\nanother bad thing\nbad again';
      const matches = detectBlacklistTerms(text, ['bad']);
      expect(matches).toHaveLength(3);
      expect(matches[0].line).toBe(1);
      expect(matches[1].line).toBe(2);
      expect(matches[2].line).toBe(3);
    });
  });
});
