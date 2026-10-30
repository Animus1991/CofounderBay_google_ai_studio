/**
 * Keeps the signed-in account's lists in Firestore (`users/{uid}/lists/{key}`).
 *
 * Every page keeps reading and writing `localLists` exactly as before; this
 * module mirrors each write to the cloud a moment later and applies changes
 * made on another device. Last write wins per list. The sample (demo) account
 * is never synced.
 */
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { applyRemoteValue, dataScope, keys, readRawValue, setWriteObserver } from './localLists';
import { createLogger } from './logger';
import { pauseAccountSaves, recordSyncPending, recordSyncResult } from './saveFeedback';

const log = createLogger('cloud-sync');

/** Conversations live in their own collection; account form/switches/cards mirror the profile and billing docs instead, and profileLocal holds demo-only overrides (real profiles live on the profile doc). */
export const NOT_SYNCED = new Set<string>([keys.chat, keys.inbox, keys.accountForm, keys.accountSwitches, keys.paymentCards, keys.profileLocal]);
const SYNCED: string[] = Object.values(keys).filter((key) => !NOT_SYNCED.has(key));
const MAX_BYTES = 900_000;
const DEBOUNCE_MS = 700;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let currentUid: string | null = null;
let unsubscribe: (() => void) | null = null;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pushedAt = new Map<string, number>();
let status: SyncStatus = 'idle';
const statusListeners = new Set<(next: SyncStatus) => void>();
let inFlight = 0;
let generation = 0;

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener(next));
}

function metaKey(uid: string) {
  return `cfb.syncMeta@${uid}`;
}

function readMeta(uid: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(metaKey(uid));
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMeta(uid: string, meta: Record<string, number>) {
  try {
    localStorage.setItem(metaKey(uid), JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

/** Never silently drop list entries to make a write fit one document. */
function fit(serialized: string): string | null {
  return new TextEncoder().encode(serialized).byteLength <= MAX_BYTES ? serialized : null;
}

async function push(uid: string, key: string) {
  if (uid !== currentUid || uid !== dataScope()) return;
  const epoch = generation;
  const feedbackKey = `${key}@${uid}`;
  const ref = doc(db, 'users', uid, 'lists', key);
  const raw = readRawValue(key);
  recordSyncPending(feedbackKey, raw);
  const at = Date.now();
  pushedAt.set(key, at);
  inFlight += 1;
  setStatus('syncing');
  try {
    if (raw == null) {
      await deleteDoc(ref);
    } else {
      const value = fit(raw);
      if (value == null) {
        log.warn('list too large to sync', { key, bytes: raw.length });
        if (epoch === generation) recordSyncResult(feedbackKey, raw, false);
        return;
      }
      await setDoc(ref, { key, value, updatedAtMs: at, clientId, updatedAt: serverTimestamp() });
    }
    if (epoch !== generation) return;
    recordSyncResult(feedbackKey, raw, true);
    const meta = readMeta(uid);
    meta[key] = at;
    writeMeta(uid, meta);
  } catch (error) {
    log.warn('could not sync list', { key, error: String(error) });
    if (epoch !== generation) return;
    recordSyncResult(feedbackKey, raw, false);
    setStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
    return;
  } finally {
    if (epoch === generation) inFlight = Math.max(0, inFlight - 1);
  }
  if (epoch !== generation) return;
  if (inFlight === 0 && timers.size === 0) setStatus('synced');
}

function schedule(uid: string, key: string, delay = DEBOUNCE_MS) {
  recordSyncPending(`${key}@${uid}`, readRawValue(key));
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      if (currentUid !== uid) return;
      void push(uid, key);
    }, delay),
  );
  setStatus('syncing');
}

function observer(key: string) {
  const uid = currentUid;
  if (!uid || uid !== dataScope() || !SYNCED.includes(key)) return;
  const meta = readMeta(uid);
  meta[key] = Date.now();
  writeMeta(uid, meta);
  schedule(uid, key);
}

export function startCloudSync(uid: string) {
  if (currentUid === uid) return;
  stopCloudSync();
  currentUid = uid;
  setWriteObserver(observer);
  setStatus('syncing');
  let first = true;
  unsubscribe = onSnapshot(
    collection(db, 'users', uid, 'lists'),
    (snap) => {
      if (currentUid !== uid) return;
      const meta = readMeta(uid);
      const remoteKeys = new Set<string>();
      snap.docs.forEach((entry) => remoteKeys.add(String(entry.data().key || entry.id)));
      const changes = first ? snap.docs.map((entry) => ({ type: 'added' as const, doc: entry })) : snap.docChanges();
      for (const change of changes) {
        const data = change.doc.data() as { key?: string; value?: string; updatedAtMs?: number; clientId?: string };
        const key = String(data.key || change.doc.id);
        if (!SYNCED.includes(key)) continue;
        const remoteMs = Number(data.updatedAtMs || 0);
        const localMs = Number(meta[key] || 0);
        if (change.type === 'removed') {
          if (!timers.has(key) && localMs <= remoteMs) applyRemoteValue(key, null);
          continue;
        }
        if (data.clientId === clientId && remoteMs <= (pushedAt.get(key) || 0)) continue;
        if (timers.has(key)) continue;
        if (remoteMs < localMs && readRawValue(key) != null) {
          schedule(uid, key, 50);
          continue;
        }
        if (typeof data.value === 'string' && readRawValue(key) !== data.value) {
          applyRemoteValue(key, data.value);
        }
        if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites && !change.doc.metadata.hasPendingWrites && typeof data.value === 'string') {
          recordSyncResult(`${key}@${uid}`, data.value, true);
        }
        meta[key] = remoteMs;
      }
      if (first) {
        first = false;
        for (const key of SYNCED) {
          if (!remoteKeys.has(key) && readRawValue(key) != null) schedule(uid, key, 200);
        }
      }
      writeMeta(uid, meta);
      if (timers.size === 0 && inFlight === 0) setStatus(snap.metadata.fromCache ? 'offline' : 'synced');
    },
    (error) => {
      log.warn('list listener failed', { error: String(error) });
      setStatus('error');
    },
  );
}

/** Sends every pending change now, for example right before signing out. */
export async function flushCloudSync() {
  const uid = currentUid;
  if (!uid) return;
  const pending = [...timers.keys()];
  pending.forEach((key) => {
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
  });
  await Promise.all(pending.map((key) => push(uid, key)));
}

export function stopCloudSync() {
  if (currentUid) pauseAccountSaves(currentUid);
  generation += 1;
  inFlight = 0;
  unsubscribe?.();
  unsubscribe = null;
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
  setWriteObserver(null);
  currentUid = null;
  setStatus('idle');
}

/** Explicit retry for the list whose save feedback failed, not every account list. */
export async function retryListSync(key: string) {
  const uid = currentUid;
  if (!uid || uid !== dataScope() || !SYNCED.includes(key)) return;
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
  await push(uid, key);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function useSyncStatus(): SyncStatus {
  const [value, setValue] = useState<SyncStatus>(status);
  useEffect(() => {
    statusListeners.add(setValue);
    setValue(status);
    return () => {
      statusListeners.delete(setValue);
    };
  }, []);
  return value;
}
