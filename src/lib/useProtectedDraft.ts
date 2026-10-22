import { useEffect, useRef, useState } from 'react';
import { recordLocalSave } from './saveFeedback';

type Draft<T> = { key: string; value: T; baseline: T; durable: boolean; restored: boolean };
const memoryDrafts = new Map<string, Draft<unknown>>();
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function compatible(value: unknown, sample: unknown): boolean {
 if (sample === null) return value === null || typeof value === 'object';
 if (Array.isArray(sample)) return Array.isArray(value);
 if (typeof sample === 'object') {
  return !!value && typeof value === 'object' && !Array.isArray(value)
   && Object.entries(sample).every(([key, field]) => compatible((value as Record<string, unknown>)[key], field));
 }
 return typeof value === typeof sample;
}

function read<T>(key: string, initial: T): Draft<T> {
 const inMemory = memoryDrafts.get(key);
 if (inMemory) return { ...inMemory, restored: true } as Draft<T>;
 try {
  const raw = localStorage.getItem(key);
  const saved = raw ? JSON.parse(raw) : null;
  if (saved?.version === 1 && compatible(saved.value, initial) && compatible(saved.baseline, initial)) {
   return { key, value: saved.value as T, baseline: saved.baseline as T, durable: true, restored: !equal(saved.value, saved.baseline) };
  }
 } catch { /* Keep editing usable when storage is unavailable. */ }
 return { key, value: initial, baseline: initial, durable: true, restored: false };
}

export function useBeforeUnload(when: boolean) {
 useEffect(() => {
  if (!when) return;
  const prevent = (event: BeforeUnloadEvent) => {
   event.preventDefault();
   event.returnValue = '';
  };
  window.addEventListener('beforeunload', prevent);
  return () => window.removeEventListener('beforeunload', prevent);
 }, [when]);
}

/** Unsubmitted data stays on this device, separate from live lists and cloud sync. */
export function useProtectedDraft<T>(name: string, owner: string, initial: T) {
 const key = `cfb.draft.${name}@${owner}`;
 const [state, setState] = useState<Draft<T>>(() => read(key, initial));
 const current = useRef(state);
 const active = state.key === key ? state : read(key, initial);
 current.current = active;
 useEffect(() => {
  if (current.current.key === key && state.key !== key) setState(current.current);
 }, [key, state.key]);
 const dirty = !equal(active.value, active.baseline);
 useBeforeUnload(dirty);

 const persist = (next: Draft<T>) => {
  const changed = !equal(next.value, next.baseline);
  try {
   if (!changed) localStorage.removeItem(key);
   else localStorage.setItem(key, JSON.stringify({ version: 1, value: next.value, baseline: next.baseline }));
   next.durable = true;
   memoryDrafts.delete(key);
  } catch { next.durable = false; }
  if (!next.durable && changed) memoryDrafts.set(key, next);
  if (!changed) memoryDrafts.delete(key);
  recordLocalSave(key, changed ? JSON.stringify(next.value) : null, !changed || next.durable);
  current.current = next;
  setState(next);
 };
 return {
  value: active.value,
  baseline: active.baseline,
  dirty,
  durable: active.durable,
  restored: active.restored,
  setValue: (value: T | ((previous: T) => T)) => {
   const previous = current.current;
   const nextValue = typeof value === 'function' ? (value as (previous: T) => T)(previous.value) : value;
   persist({ ...previous, value: nextValue });
  },
  reset: (value: T = current.current.baseline) => persist({ key, value, baseline: value, durable: true, restored: false }),
 };
}
