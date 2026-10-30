import { lazy, type ComponentType } from 'react';

/**
 * Route-level code splitting that survives a deploy.
 *
 * Every page used to be imported statically — the whole studio in one 1.5 MB
 * script — because lazy routes had failed with "Failed to fetch dynamically
 * imported module": after a deploy (or a Vite dependency re-optimisation in
 * dev) the open tab still asks for chunk hashes that no longer exist. The
 * standard remedy is to reload once when a chunk cannot be fetched, so the tab
 * picks up the new manifest; a second failure in the same session is a real
 * error and reaches the route's error boundary.
 */
const RELOAD_FLAG = 'cfb.chunkReload';

type Loader<T> = () => Promise<{ default: T }>;

const loaders = new Map<string, Loader<ComponentType<unknown>>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.lazy's own constraint
export function lazyPage<T extends ComponentType<any>>(name: string, load: Loader<T>) {
  loaders.set(name, load as unknown as Loader<ComponentType<unknown>>);
  return lazy(async () => {
    try {
      const module = await load();
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage unavailable */ }
      return module;
    } catch (error) {
      let reloaded = false;
      try { reloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* storage unavailable */ }
      if (!reloaded && typeof window !== 'undefined') {
        try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* storage unavailable */ }
        window.location.reload();
        return new Promise<never>(() => undefined);
      }
      throw error;
    }
  });
}

/** Warms the given pages' chunks when the browser is idle, so the first visit does not wait. */
export function prefetchPages(names: string[]) {
  const run = () => {
    for (const name of names) {
      const load = loaders.get(name);
      if (load) void load().catch(() => undefined);
    }
  };
  if (typeof window === 'undefined') return;
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}
