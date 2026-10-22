import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRawValue, readValue, scopedKey, setDataScope, writeValue } from './localLists';
import { getSavePhase } from './saveFeedback';

afterEach(() => { vi.restoreAllMocks(); setDataScope(null); });

describe('browser storage failures', () => {
 it('keeps the new value readable rather than reverting to a stale durable copy', () => {
  setDataScope('storage-failure-fixture');
  writeValue('cfb.failure-fixture', { text: 'Old value' });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
  writeValue('cfb.failure-fixture', { text: 'New value' });
  expect(readValue('cfb.failure-fixture', { text: '' }).text).toBe('New value');
  expect(JSON.parse(readRawValue('cfb.failure-fixture')!).text).toBe('New value');
  expect(getSavePhase(scopedKey('cfb.failure-fixture'))).toBe('temporary');
  vi.restoreAllMocks();
  writeValue('cfb.failure-fixture', { text: 'New value' });
  expect(getSavePhase(scopedKey('cfb.failure-fixture'))).toBe('local');
 });
 it('does not expose a memory fallback to another account', () => {
  setDataScope('storage-owner-a');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Unavailable'); });
  writeValue('cfb.owner-fixture', { text: 'Private draft' });
  setDataScope('storage-owner-b');
  expect(readValue('cfb.owner-fixture', { text: '' }).text).toBe('');
 });
});
