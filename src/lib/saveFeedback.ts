import { useSyncExternalStore } from 'react';

export type SavePhase = 'idle' | 'local' | 'syncing' | 'synced' | 'offline' | 'error' | 'temporary';
type Entry = {
 raw: string | null;
 durable: boolean;
 acknowledged?: string | null;
 pending?: string | null;
 failed?: string | null;
};
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
function subscribe(listener: () => void) {
 listeners.add(listener);
 window.addEventListener('online', listener);
 window.addEventListener('offline', listener);
 window.addEventListener('cfb:data', listener);
 return () => {
  listeners.delete(listener);
  window.removeEventListener('online', listener);
  window.removeEventListener('offline', listener);
  window.removeEventListener('cfb:data', listener);
 };
}

export function recordLocalSave(key: string, raw: string | null, durable: boolean) {
 entries.set(key, { ...entries.get(key), raw, durable });
 notify();
}

export function recordSyncPending(key: string, raw: string | null) {
 const entry = entries.get(key);
 if (entry) entries.set(key, { ...entry, pending: raw, failed: undefined });
 notify();
}

export function recordSyncResult(key: string, raw: string | null, success: boolean) {
 const entry = entries.get(key);
 if (!entry) return;
 entries.set(key, success
  ? { ...entry, acknowledged: raw, failed: entry.failed === raw ? undefined : entry.failed, pending: entry.pending === raw ? undefined : entry.pending }
  : { ...entry, failed: raw, pending: entry.pending === raw ? undefined : entry.pending });
 notify();
}

export function getSavePhase(key: string): SavePhase {
 const entry = entries.get(key);
 if (!entry) return 'idle';
 if (entry.acknowledged !== undefined && entry.acknowledged === entry.raw) return 'synced';
 if (!entry.durable) return 'temporary';
 if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
 if (entry.failed !== undefined && entry.failed === entry.raw) return 'error';
 if (entry.pending !== undefined && entry.pending === entry.raw) return 'syncing';
 return 'local';
}

export function useSavePhase(key: string): SavePhase {
 return useSyncExternalStore(subscribe, () => getSavePhase(key), () => 'idle');
}

export function useMemoryOnlyChanges(scope: () => string): boolean {
 return useSyncExternalStore(subscribe, () => {
  const owner = scope();
  return [...entries.keys()].some(key =>
   (owner ? key.endsWith(`@${owner}`) : !key.includes('@') || key.endsWith('@demo-user'))
   && getSavePhase(key) === 'temporary');
 }, () => false);
}

export function pauseAccountSaves(owner: string) {
 entries.forEach((entry, key) => {
  if (key.endsWith(`@${owner}`)) entries.set(key, { ...entry, pending: undefined });
 });
 notify();
}
