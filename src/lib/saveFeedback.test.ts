import { describe, expect, it } from 'vitest';
import { getSavePhase, recordLocalSave, recordSyncPending, recordSyncResult } from './saveFeedback';

describe('honest per-list save feedback', () => {
 it('distinguishes local storage from confirmed account persistence', () => {
  recordLocalSave('feedback-local', 'one', true);
  expect(getSavePhase('feedback-local')).toBe('local');
  recordSyncPending('feedback-local', 'one');
  expect(getSavePhase('feedback-local')).toBe('syncing');
  recordSyncResult('feedback-local', 'one', true);
  expect(getSavePhase('feedback-local')).toBe('synced');
 });
 it('does not let another list success hide a failure', () => {
  recordLocalSave('feedback-failed', 'one', true);
  recordLocalSave('feedback-other', 'two', true);
  recordSyncResult('feedback-failed', 'one', false);
  recordSyncResult('feedback-other', 'two', true);
  expect(getSavePhase('feedback-failed')).toBe('error');
 });
 it('does not confirm newer text when an older request succeeds', () => {
  recordLocalSave('feedback-race', 'one', true);
  recordSyncPending('feedback-race', 'one');
  recordLocalSave('feedback-race', 'two', true);
  recordSyncPending('feedback-race', 'two');
  recordSyncResult('feedback-race', 'one', true);
  expect(getSavePhase('feedback-race')).toBe('syncing');
  recordSyncResult('feedback-race', 'two', true);
  expect(getSavePhase('feedback-race')).toBe('synced');
 });
 it('never describes memory-only data as saved on this device', () => {
  recordLocalSave('feedback-memory', 'one', false);
  expect(getSavePhase('feedback-memory')).toBe('temporary');
  recordSyncResult('feedback-memory', 'one', true);
  expect(getSavePhase('feedback-memory')).toBe('synced');
 });
 it('clears a failed attempt on retry and requires a real acknowledgement', () => {
  recordLocalSave('feedback-retry', 'one', true);
  recordSyncResult('feedback-retry', 'one', false);
  recordSyncPending('feedback-retry', 'one');
  expect(getSavePhase('feedback-retry')).toBe('syncing');
  recordSyncResult('feedback-retry', 'one', true);
  expect(getSavePhase('feedback-retry')).toBe('synced');
 });
});
