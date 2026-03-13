import { describe, it, expect } from 'vitest';
import { hashString } from '../translation-service';

/**
 * Tests for the stale-detection logic used by useTranslation.
 *
 * The hook itself uses React state (useState, useRef, useEffect) and cannot be
 * tested without @testing-library/react-hooks or a jsdom environment, neither
 * of which are in the project's dependencies. Instead, we test the pure
 * function that drives the stale detection — hashString — and verify the
 * algorithm the hook implements:
 *
 *   1. On first render, sourceHashRef is 0 => translations are NOT marked stale.
 *   2. When bbcode changes and hash differs from previous non-zero hash =>
 *      completed translations ARE marked stale.
 *   3. Re-translating sets stale: false on the new translation.
 *   4. Error-state translations are not marked stale (only status === 'done').
 *
 * The stale-detection algorithm from useTranslation.ts:
 *
 *   const newHash = hashString(bbcode);
 *   if (sourceHashRef.current !== 0 && sourceHashRef.current !== newHash) {
 *     // mark all 'done' translations as stale
 *   }
 *   sourceHashRef.current = newHash;
 */

describe('useTranslation stale detection logic', () => {
  // Simulate the ref-based tracking from the hook
  function simulateStaleDetection(
    bbcodeSequence: string[],
    translationStates: Record<string, { status: string; stale: boolean }>
  ): { staleAfterEachChange: boolean[] } {
    let sourceHash = 0;
    const staleAfterEachChange: boolean[] = [];

    for (const bbcode of bbcodeSequence) {
      const newHash = hashString(bbcode);
      let markedStale = false;

      if (sourceHash !== 0 && sourceHash !== newHash) {
        // This is what the hook does: mark all 'done' translations stale
        for (const lang of Object.keys(translationStates)) {
          if (translationStates[lang].status === 'done') {
            translationStates[lang] = { ...translationStates[lang], stale: true };
            markedStale = true;
          }
        }
      }

      sourceHash = newHash;
      staleAfterEachChange.push(markedStale);
    }

    return { staleAfterEachChange };
  }

  it('does NOT mark translations stale on initial render (hash starts at 0)', () => {
    const translations = {
      'pt-BR': { status: 'done', stale: false },
    };
    const { staleAfterEachChange } = simulateStaleDetection(
      ['[h1]Hello[/h1]'],
      translations
    );

    // First bbcode value: sourceHash is 0, so no stale marking
    expect(staleAfterEachChange[0]).toBe(false);
    expect(translations['pt-BR'].stale).toBe(false);
  });

  it('marks completed translations stale when source bbcode changes', () => {
    const translations = {
      'pt-BR': { status: 'done', stale: false },
    };
    const { staleAfterEachChange } = simulateStaleDetection(
      ['[h1]Hello[/h1]', '[h1]Hello World[/h1]'],
      translations
    );

    // First render: hash was 0, no stale
    expect(staleAfterEachChange[0]).toBe(false);
    // Second render: hash changed from non-zero, stale triggered
    expect(staleAfterEachChange[1]).toBe(true);
    expect(translations['pt-BR'].stale).toBe(true);
  });

  it('does NOT mark stale when bbcode is unchanged', () => {
    const translations = {
      'pt-BR': { status: 'done', stale: false },
    };
    const { staleAfterEachChange } = simulateStaleDetection(
      ['[h1]Same[/h1]', '[h1]Same[/h1]'],
      translations
    );

    expect(staleAfterEachChange[0]).toBe(false);
    expect(staleAfterEachChange[1]).toBe(false);
    expect(translations['pt-BR'].stale).toBe(false);
  });

  it('does NOT mark error-state translations as stale', () => {
    const translations = {
      'pt-BR': { status: 'error', stale: false },
    };
    const { staleAfterEachChange } = simulateStaleDetection(
      ['[h1]V1[/h1]', '[h1]V2[/h1]'],
      translations
    );

    // Error translations are never marked stale (only 'done' ones are)
    expect(staleAfterEachChange[1]).toBe(false);
    expect(translations['pt-BR'].stale).toBe(false);
  });

  it('does NOT mark "translating" state as stale', () => {
    const translations = {
      'es-LATAM': { status: 'translating', stale: false },
    };
    const { staleAfterEachChange } = simulateStaleDetection(
      ['[b]A[/b]', '[b]B[/b]'],
      translations
    );

    expect(staleAfterEachChange[1]).toBe(false);
    expect(translations['es-LATAM'].stale).toBe(false);
  });

  it('marks multiple completed languages stale simultaneously', () => {
    const translations = {
      'pt-BR': { status: 'done', stale: false },
      'es-LATAM': { status: 'done', stale: false },
    };
    simulateStaleDetection(
      ['[h1]V1[/h1]', '[h1]V2[/h1]'],
      translations
    );

    expect(translations['pt-BR'].stale).toBe(true);
    expect(translations['es-LATAM'].stale).toBe(true);
  });

  it('re-translating clears stale flag (simulated)', () => {
    const translations = {
      'pt-BR': { status: 'done', stale: false },
    };

    // First: initial + change to make stale
    simulateStaleDetection(
      ['[h1]V1[/h1]', '[h1]V2[/h1]'],
      translations
    );
    expect(translations['pt-BR'].stale).toBe(true);

    // Simulate re-translation: hook sets stale: false, status: 'translating'
    translations['pt-BR'] = { status: 'done', stale: false };

    // Same bbcode, no further change
    simulateStaleDetection(
      ['[h1]V2[/h1]'],
      translations
    );
    expect(translations['pt-BR'].stale).toBe(false);
  });

  it('only marks stale on first change, not repeatedly for same hash', () => {
    const translations = {
      'pt-BR': { status: 'done', stale: false },
    };
    const { staleAfterEachChange } = simulateStaleDetection(
      ['[h1]A[/h1]', '[h1]B[/h1]', '[h1]B[/h1]'],
      translations
    );

    expect(staleAfterEachChange[0]).toBe(false); // initial
    expect(staleAfterEachChange[1]).toBe(true);  // changed
    expect(staleAfterEachChange[2]).toBe(false);  // same as previous
  });
});

describe('hashString edge cases for stale detection', () => {
  it('empty bbcode has hash 0 (treated like initial state)', () => {
    // If bbcode is empty and hash returns 0, the hook will not mark stale
    // even on subsequent changes from empty to empty
    expect(hashString('')).toBe(0);
  });

  it('non-empty bbcode has non-zero hash', () => {
    expect(hashString('[h1]Title[/h1]')).not.toBe(0);
  });

  it('different bbcode produces different hashes', () => {
    const h1 = hashString('[h1]Version 1[/h1]');
    const h2 = hashString('[h1]Version 2[/h1]');
    expect(h1).not.toBe(h2);
  });

  it('hash is deterministic', () => {
    const bbcode = '[b]Bold[/b]\n[i]Italic[/i]';
    expect(hashString(bbcode)).toBe(hashString(bbcode));
  });
});
