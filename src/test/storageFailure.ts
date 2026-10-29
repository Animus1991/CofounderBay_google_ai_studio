import { vi } from 'vitest';

/**
 * Makes every `localStorage.setItem` throw, whichever Storage implementation
 * backs the test run.
 *
 * jsdom (Node 20/22) keeps `setItem` on `Storage.prototype` and exposes the
 * store through a named-property proxy, so a spy defined on the instance never
 * sees the call. Node 25 ships its own web-storage global, which the test setup
 * replaces with a plain in-memory object (`src/test/setup.ts`); there the
 * method lives on the instance. Spying on the object that actually owns the
 * method keeps the storage-failure tests honest on every supported Node.
 */
export function failStorageWrites(error: unknown) {
  const ownsMethod = Object.prototype.hasOwnProperty.call(localStorage, 'setItem');
  const target: Storage = !ownsMethod && typeof Storage !== 'undefined' && localStorage instanceof Storage
    ? Storage.prototype
    : localStorage;
  return vi.spyOn(target, 'setItem').mockImplementation(() => {
    throw error;
  });
}
