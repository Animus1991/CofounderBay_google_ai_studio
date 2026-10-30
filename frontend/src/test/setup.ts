import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 25 exposes a native `localStorage` global that shadows jsdom's but has
// no setItem unless --localstorage-file is passed. Replace it with an
// in-memory Storage so reads/writes behave like a real browser.
if (typeof localStorage !== 'undefined' && typeof localStorage.setItem !== 'function') {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: shim, configurable: true, writable: true });
}

// Ensure the DOM is reset between tests to avoid cross-test leakage.
afterEach(() => {
  cleanup();
});
