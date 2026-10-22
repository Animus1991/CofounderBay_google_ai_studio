import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProtectedDraft } from './useProtectedDraft';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('protected, account-scoped drafts', () => {
 it('restores unsubmitted text after unmount without submitting it', () => {
  const first = renderHook(() => useProtectedDraft('example', 'a', { title: '' }));
  act(() => first.result.current.setValue({ title: 'Not submitted' }));
  expect(first.result.current.dirty).toBe(true);
  first.unmount();
  const next = renderHook(() => useProtectedDraft('example', 'a', { title: '' }));
  expect(next.result.current.value.title).toBe('Not submitted');
  expect(next.result.current.restored).toBe(true);
 });
 it('keeps accounts separate and resumes only that account', () => {
  const hook = renderHook(({ owner }) => useProtectedDraft('example', owner, { title: '' }), { initialProps: { owner: 'a' } });
  act(() => hook.result.current.setValue({ title: 'Account A' }));
  hook.rerender({ owner: 'b' });
  expect(hook.result.current.value.title).toBe('');
  expect(hook.result.current.dirty).toBe(false);
  hook.rerender({ owner: 'a' });
  expect(hook.result.current.value.title).toBe('Account A');
 });
 it('resets the dirty state and removes the draft only on explicit reset', () => {
  const hook = renderHook(() => useProtectedDraft('example', 'a', { title: 'Saved' }));
  act(() => hook.result.current.setValue({ title: 'Changed' }));
  act(() => hook.result.current.reset());
  expect(hook.result.current.value.title).toBe('Saved');
  expect(hook.result.current.dirty).toBe(false);
  expect(localStorage.getItem('cfb.draft.example@a')).toBeNull();
 });
 it('keeps text and reports non-durable storage instead of claiming success', () => {
  const hook = renderHook(() => useProtectedDraft('example', 'a', { title: '' }));
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
  act(() => hook.result.current.setValue({ title: 'Still here' }));
  expect(hook.result.current.value.title).toBe('Still here');
  expect(hook.result.current.durable).toBe(false);
  hook.unmount();
  const resumed = renderHook(() => useProtectedDraft('example', 'a', { title: '' }));
  expect(resumed.result.current.value.title).toBe('Still here');
  act(() => resumed.result.current.reset());
 });
 it('guards browser exit only while actual changes remain', () => {
  const hook = renderHook(() => useProtectedDraft('example', 'a', { title: '' }));
  const clean = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  act(() => hook.result.current.setValue({ title: 'Changed' }));
  const dirty = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
  act(() => hook.result.current.reset());
  const saved = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(saved);
  expect(saved.defaultPrevented).toBe(false);
 });
 it('ignores malformed draft shapes', () => {
  localStorage.setItem('cfb.draft.example@a', JSON.stringify({ version: 1, value: { title: 42 }, baseline: { title: '' } }));
  const hook = renderHook(() => useProtectedDraft('example', 'a', { title: '' }));
  expect(hook.result.current.value.title).toBe('');
  expect(hook.result.current.dirty).toBe(false);
 });
});
