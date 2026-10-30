import { useEffect } from 'react';

/**
 * Page controls: a mounted page registers the commands it offers — opening a
 * filter drawer, starting a focus session, creating a record — so the
 * assistant can surface them as chips ("On this page") and run the same
 * handler the page's own buttons call. Nothing here writes data by itself;
 * every control is just a labelled pointer to an existing page handler.
 */
export interface PageControl {
  id: string;
  en: string;
  el: string;
  run: () => void;
}

let current: PageControl[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const cb of listeners) cb();
}

export function readPageControls(): PageControl[] {
  return current;
}

export function onPageControlsChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setPageControls(list: PageControl[] | null): void {
  if (list === null && current.length === 0) return;
  current = list ?? [];
  emit();
}

/**
 * Registers the controls of the calling page while it is mounted. `deps`
 * works like a useMemo dependency list — the page re-publishes its controls
 * only when those values change, so passing fresh closures every render is
 * safe. Call it unconditionally, before any early return.
 */
export function usePageControls(factory: () => PageControl[], deps: React.DependencyList): void {
  useEffect(() => {
    setPageControls(factory());
    return () => setPageControls(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
