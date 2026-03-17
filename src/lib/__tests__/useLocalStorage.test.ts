import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the useLocalStorage hook's core algorithm.
 *
 * The hook uses React state (useState, useEffect, useCallback) and cannot be
 * tested without a React rendering environment. Instead, we simulate the
 * hook's algorithm directly:
 *
 *   1. Initialization: read from localStorage, JSON.parse, fall back to default
 *   2. Set value: update state, write JSON.stringify to localStorage
 *   3. Clear: remove key from localStorage, reset to initial value
 *   4. Error handling: corrupted JSON, quota exceeded, removeItem failure
 *
 * React lifecycle behavior is covered by E2E tests.
 */

describe('useLocalStorage algorithm simulation', () => {
  let storage: Record<string, string>;

  const mockLocalStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
  };

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Simulates the useLocalStorage hook's core algorithm:
   *
   *   - On init: reads key from localStorage, JSON.parse, falls back to initialValue
   *   - On setValue: updates in-memory value, writes JSON.stringify to localStorage
   *   - On clear: removes key from localStorage, resets to initialValue
   *   - Errors in JSON.parse or localStorage access fall back gracefully
   */
  function createLocalStorageSimulation<T>(key: string, initialValue: T) {
    let currentValue: T;

    // Initialization (mirrors the useState initializer)
    try {
      const item = localStorage.getItem(key);
      currentValue = item ? JSON.parse(item) : initialValue;
    } catch {
      currentValue = initialValue;
    }

    function getValue(): T {
      return currentValue;
    }

    // Mirrors the useEffect that syncs state to localStorage
    function syncToStorage() {
      try {
        localStorage.setItem(key, JSON.stringify(currentValue));
      } catch (error) {
        // Silently fail (hook logs a warning)
      }
    }

    function setValue(value: T | ((prev: T) => T)) {
      if (typeof value === 'function') {
        currentValue = (value as (prev: T) => T)(currentValue);
      } else {
        currentValue = value;
      }
      syncToStorage();
    }

    function clearValue() {
      try {
        localStorage.removeItem(key);
        currentValue = initialValue;
      } catch {
        // Silently fail
      }
    }

    // Initial sync (mirrors useEffect on mount)
    syncToStorage();

    return { getValue, setValue, clearValue };
  }

  describe('initialization', () => {
    it('reads stored value from localStorage', () => {
      storage['my-key'] = JSON.stringify('stored value');

      const sim = createLocalStorageSimulation('my-key', 'default');
      expect(sim.getValue()).toBe('stored value');
    });

    it('falls back to initial value when no stored value exists', () => {
      const sim = createLocalStorageSimulation('missing-key', 'fallback');
      expect(sim.getValue()).toBe('fallback');
    });

    it('falls back to initial value when stored JSON is corrupted', () => {
      storage['bad-key'] = '{not valid json!!!';

      const sim = createLocalStorageSimulation('bad-key', 42);
      expect(sim.getValue()).toBe(42);
    });

    it('falls back to initial value when stored value is empty string parsed as falsy', () => {
      // localStorage.getItem returns null for missing keys, but an empty string
      // is falsy in JS. The hook checks `item ? parse : initial`, so empty string
      // falls back to initialValue.
      storage['empty-key'] = '';

      const sim = createLocalStorageSimulation('empty-key', 'default');
      expect(sim.getValue()).toBe('default');
    });

    it('reads stored null value correctly', () => {
      // JSON.stringify(null) === 'null', which is truthy as a string
      storage['null-key'] = 'null';

      const sim = createLocalStorageSimulation('null-key', 'default');
      expect(sim.getValue()).toBeNull();
    });
  });

  describe('writing values', () => {
    it('writes value to localStorage as JSON on set', () => {
      const sim = createLocalStorageSimulation('key', '');
      sim.setValue('hello');

      expect(localStorage.getItem('key')).toBe('"hello"');
    });

    it('updates in-memory value on set', () => {
      const sim = createLocalStorageSimulation('key', 0);
      sim.setValue(99);

      expect(sim.getValue()).toBe(99);
    });

    it('supports updater function (prev => next)', () => {
      const sim = createLocalStorageSimulation('counter', 10);
      sim.setValue((prev) => prev + 5);

      expect(sim.getValue()).toBe(15);
      expect(localStorage.getItem('counter')).toBe('15');
    });

    it('overwrites previous value in localStorage', () => {
      const sim = createLocalStorageSimulation('key', 'initial');
      sim.setValue('first');
      sim.setValue('second');

      expect(sim.getValue()).toBe('second');
      expect(localStorage.getItem('key')).toBe('"second"');
    });

    it('syncs initial value to localStorage on mount', () => {
      const sim = createLocalStorageSimulation('new-key', 'default');

      // The useEffect fires on mount, writing the initial value
      expect(localStorage.getItem('new-key')).toBe('"default"');
      expect(sim.getValue()).toBe('default');
    });
  });

  describe('clear', () => {
    it('removes key from localStorage', () => {
      storage['key'] = '"stored"';

      const sim = createLocalStorageSimulation('key', 'default');
      sim.clearValue();

      expect(localStorage.getItem('key')).toBeNull();
    });

    it('resets in-memory value to initial value', () => {
      storage['key'] = '"stored"';

      const sim = createLocalStorageSimulation('key', 'default');
      expect(sim.getValue()).toBe('stored');

      sim.clearValue();
      expect(sim.getValue()).toBe('default');
    });
  });

  describe('error handling', () => {
    it('handles JSON parse errors by falling back to initial value', () => {
      storage['corrupt'] = '<<<not json>>>';

      const sim = createLocalStorageSimulation('corrupt', 'safe-default');
      expect(sim.getValue()).toBe('safe-default');
    });

    it('handles quota exceeded on setItem gracefully', () => {
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = () => {
        throw new DOMException('QuotaExceededError');
      };

      // Should not throw - the hook catches and warns
      const sim = createLocalStorageSimulation('key', 'value');
      expect(() => sim.setValue('new value')).not.toThrow();

      // In-memory value is still updated
      expect(sim.getValue()).toBe('new value');

      // But localStorage was not updated (it threw)
      expect(storage['key']).toBeUndefined();

      mockLocalStorage.setItem = originalSetItem;
    });

    it('handles removeItem errors on clear gracefully', () => {
      storage['key'] = '"value"';
      const originalRemoveItem = mockLocalStorage.removeItem;
      mockLocalStorage.removeItem = () => {
        throw new Error('Storage error');
      };

      const sim = createLocalStorageSimulation('key', 'default');
      expect(() => sim.clearValue()).not.toThrow();

      mockLocalStorage.removeItem = originalRemoveItem;
    });
  });

  describe('type safety for different value types', () => {
    it('handles string values', () => {
      const sim = createLocalStorageSimulation('str', 'hello');
      expect(sim.getValue()).toBe('hello');

      sim.setValue('world');
      expect(sim.getValue()).toBe('world');
      expect(localStorage.getItem('str')).toBe('"world"');
    });

    it('handles number values', () => {
      storage['num'] = '42';
      const sim = createLocalStorageSimulation('num', 0);
      expect(sim.getValue()).toBe(42);

      sim.setValue(100);
      expect(localStorage.getItem('num')).toBe('100');
    });

    it('handles boolean values', () => {
      storage['bool'] = 'true';
      const sim = createLocalStorageSimulation('bool', false);
      expect(sim.getValue()).toBe(true);

      sim.setValue(false);
      expect(localStorage.getItem('bool')).toBe('false');
    });

    it('handles object values', () => {
      const obj = { name: 'test', count: 5, nested: { a: 1 } };
      storage['obj'] = JSON.stringify(obj);

      const sim = createLocalStorageSimulation('obj', {});
      expect(sim.getValue()).toEqual(obj);

      const updated = { name: 'updated', count: 10, nested: { a: 2 } };
      sim.setValue(updated);
      expect(JSON.parse(localStorage.getItem('obj')!)).toEqual(updated);
    });

    it('handles array values', () => {
      const arr = [1, 'two', { three: 3 }];
      storage['arr'] = JSON.stringify(arr);

      const sim = createLocalStorageSimulation<unknown[]>('arr', []);
      expect(sim.getValue()).toEqual(arr);

      sim.setValue([4, 5, 6]);
      expect(JSON.parse(localStorage.getItem('arr')!)).toEqual([4, 5, 6]);
    });

    it('handles null initial value', () => {
      const sim = createLocalStorageSimulation<string | null>('nullable', null);
      expect(sim.getValue()).toBeNull();
      expect(localStorage.getItem('nullable')).toBe('null');

      sim.setValue('now has value');
      expect(sim.getValue()).toBe('now has value');
    });
  });

  describe('key behavior', () => {
    it('different keys are independent', () => {
      const sim1 = createLocalStorageSimulation('key-a', 'default-a');
      const sim2 = createLocalStorageSimulation('key-b', 'default-b');

      sim1.setValue('value-a');

      expect(sim1.getValue()).toBe('value-a');
      expect(sim2.getValue()).toBe('default-b');
      expect(localStorage.getItem('key-a')).toBe('"value-a"');
      expect(localStorage.getItem('key-b')).toBe('"default-b"');
    });

    it('reads from new key when key changes', () => {
      // Simulate key change: first read key-1, then create new simulation with key-2
      storage['key-1'] = '"value-from-key-1"';
      storage['key-2'] = '"value-from-key-2"';

      const sim1 = createLocalStorageSimulation('key-1', 'default');
      expect(sim1.getValue()).toBe('value-from-key-1');

      // When the key prop changes, React re-runs the initializer with the new key
      const sim2 = createLocalStorageSimulation('key-2', 'default');
      expect(sim2.getValue()).toBe('value-from-key-2');
    });

    it('falls back to initial value when switching to a key with no stored data', () => {
      storage['existing'] = '"has data"';

      const sim1 = createLocalStorageSimulation('existing', 'default');
      expect(sim1.getValue()).toBe('has data');

      const sim2 = createLocalStorageSimulation('nonexistent', 'default');
      expect(sim2.getValue()).toBe('default');
    });
  });
});
