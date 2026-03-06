import { describe, it, expect } from 'vitest';
import { getLineNumber, getColumnInLine, youtubeImageRegex, imageRegex } from '../utils';

describe('getLineNumber', () => {
  it('returns 1 for position 0', () => {
    expect(getLineNumber('hello', 0)).toBe(1);
  });

  it('returns 1 for position on first line', () => {
    expect(getLineNumber('hello world', 5)).toBe(1);
  });

  it('returns 2 for position on second line', () => {
    expect(getLineNumber('hello\nworld', 6)).toBe(2);
  });

  it('returns correct line for multi-line text', () => {
    const text = 'line1\nline2\nline3\nline4';
    expect(getLineNumber(text, 12)).toBe(3); // 'l' in line3
  });

  it('returns line number at newline character itself', () => {
    expect(getLineNumber('hello\nworld', 5)).toBe(1); // the \n is end of line 1
  });
});

describe('getColumnInLine', () => {
  it('returns 1 for start of first line', () => {
    expect(getColumnInLine('hello', 0)).toBe(1);
  });

  it('returns correct column on first line', () => {
    expect(getColumnInLine('hello', 3)).toBe(4); // 1-indexed
  });

  it('returns 1 for start of second line', () => {
    expect(getColumnInLine('hello\nworld', 6)).toBe(1);
  });

  it('returns correct column on second line', () => {
    expect(getColumnInLine('hello\nworld', 9)).toBe(4); // 'l' in world
  });
});

describe('youtubeImageRegex', () => {
  it('matches YouTube watch URL in image syntax', () => {
    const text = '![video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)';
    const match = youtubeImageRegex().exec(text);
    expect(match).not.toBeNull();
    expect(match![3]).toBe('dQw4w9WgXcQ');
  });

  it('matches youtu.be short URL in image syntax', () => {
    const text = '![video](https://youtu.be/abc123)';
    const match = youtubeImageRegex().exec(text);
    expect(match).not.toBeNull();
    expect(match![3]).toBe('abc123');
  });

  it('does not match regular image URLs', () => {
    const text = '![alt](https://example.com/image.png)';
    const match = youtubeImageRegex().exec(text);
    expect(match).toBeNull();
  });

  it('returns a fresh regex each call (no stale /g state)', () => {
    const text = '![a](https://youtu.be/id1) ![b](https://youtu.be/id2)';
    const re1 = youtubeImageRegex();
    re1.exec(text); // advance state
    const re2 = youtubeImageRegex();
    const match = re2.exec(text);
    expect(match).not.toBeNull();
    expect(match![3]).toBe('id1'); // fresh regex starts from 0
  });
});

describe('imageRegex', () => {
  it('matches regular image URLs', () => {
    const text = '![alt](https://example.com/image.png)';
    const match = imageRegex().exec(text);
    expect(match).not.toBeNull();
    expect(match![2]).toBe('https://example.com/image.png');
  });

  it('does not match YouTube URLs', () => {
    const text = '![video](https://www.youtube.com/watch?v=abc123)';
    const match = imageRegex().exec(text);
    expect(match).toBeNull();
  });

  it('does not match youtu.be URLs', () => {
    const text = '![video](https://youtu.be/abc123)';
    const match = imageRegex().exec(text);
    expect(match).toBeNull();
  });

  it('returns a fresh regex each call', () => {
    const text = '![a](https://example.com/1.png) ![b](https://example.com/2.png)';
    const re1 = imageRegex();
    re1.exec(text);
    const re2 = imageRegex();
    const match = re2.exec(text);
    expect(match).not.toBeNull();
    expect(match![2]).toBe('https://example.com/1.png');
  });
});
