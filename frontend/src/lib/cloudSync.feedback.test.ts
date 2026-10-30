import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keys, readRawValue, scopedKey, setDataScope, writeValue } from './localLists';
import { getSavePhase } from './saveFeedback';
import { retryListSync, startCloudSync, stopCloudSync } from './cloudSync';

type SnapshotEntry = { id: string; data: () => Record<string, unknown>; metadata: { hasPendingWrites: boolean } };
type Snapshot = { docs: SnapshotEntry[]; docChanges: () => { type: string; doc: SnapshotEntry }[]; metadata: { fromCache: boolean; hasPendingWrites: boolean } };
const firebase = vi.hoisted(() => ({
 setDoc: vi.fn(),
 snapshot: undefined as undefined | ((snapshot: Snapshot) => void),
}));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
 collection: vi.fn(() => ({})), doc: vi.fn(() => ({})),
 serverTimestamp: vi.fn(() => ({})), deleteDoc: vi.fn(async () => {}),
 setDoc: (...args: unknown[]) => firebase.setDoc(...args),
 onSnapshot: vi.fn((_ref: unknown, next: (snapshot: Snapshot) => void) => { firebase.snapshot = next; return () => {}; }),
}));

beforeEach(() => {
 vi.useFakeTimers();
 localStorage.clear();
 setDataScope('cloud-feedback-fixture');
 firebase.setDoc.mockReset().mockResolvedValue(undefined);
 startCloudSync('cloud-feedback-fixture');
});
afterEach(() => { stopCloudSync(); setDataScope(null); vi.useRealTimers(); });

describe('cloud acknowledgement feedback', () => {
 it('confirms a list only after its own write succeeds', async () => {
  writeValue(keys.canvas, { title: 'Latest' });
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('syncing');
  await vi.advanceTimersByTimeAsync(750);
  expect(firebase.setDoc).toHaveBeenCalledOnce();
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('synced');
 });
 it('keeps the failed list and retries its latest value explicitly', async () => {
  firebase.setDoc.mockRejectedValueOnce(new Error('offline'));
  writeValue(keys.canvas, { title: 'Still local' });
  await vi.advanceTimersByTimeAsync(750);
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('error');
  expect(JSON.parse(readRawValue(keys.canvas)!).title).toBe('Still local');
  await retryListSync(keys.canvas);
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('synced');
 });
 it('never drops entries to fit oversized UTF-8 content in a cloud document', async () => {
  const value = ['α'.repeat(500_000), 'Keep this entry too'];
  writeValue(keys.assets, value);
  await vi.advanceTimersByTimeAsync(750);
  expect(firebase.setDoc).not.toHaveBeenCalled();
  expect(JSON.parse(readRawValue(keys.assets)!)).toEqual(value);
  expect(getSavePhase(scopedKey(keys.assets))).toBe('error');
 });
 it('does not confirm account B using a delayed response for account A', async () => {
  let resolve!: () => void;
  firebase.setDoc.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
  writeValue(keys.canvas, { title: 'A' });
  await vi.advanceTimersByTimeAsync(750);
  setDataScope('cloud-feedback-other');
  startCloudSync('cloud-feedback-other');
  writeValue(keys.canvas, { title: 'B' });
  resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('syncing');
  await vi.advanceTimersByTimeAsync(750);
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('synced');
 });
 it('distinguishes a cached snapshot from a server-confirmed snapshot', () => {
  const entry = {
   id: keys.canvas,
   data: () => ({ key: keys.canvas, value: '{"title":"Remote"}', updatedAtMs: 1, clientId: 'other' }),
   metadata: { hasPendingWrites: false },
  };
  const snapshot = (fromCache: boolean) => ({
   docs: [entry], docChanges: () => [{ type: 'modified', doc: entry }],
   metadata: { fromCache, hasPendingWrites: false },
  });
  firebase.snapshot!(snapshot(true));
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('local');
  firebase.snapshot!(snapshot(false));
  expect(getSavePhase(scopedKey(keys.canvas))).toBe('synced');
 });
});
