import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keys, onDataChange, readAssistantFeedback, resetAllLists, writeAssistantFeedback, writeValue } from './localLists';
import { NOT_SYNCED } from './cloudSync';

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/firestore')>();
  return { ...original };
});

describe('key registry', () => {
  it('fitCheck resolves to the physical key the store writes', () => {
    expect(keys.fitCheck).toBe('cfb.fitCheck');
  });

  it('excludes chat, inbox and account-owned keys from list sync', () => {
    for (const key of [keys.chat, keys.inbox, keys.accountForm, keys.accountSwitches, keys.paymentCards]) {
      expect(NOT_SYNCED.has(key)).toBe(true);
    }
  });
});

describe('notification feed keys', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAllLists();
  });

  it('demoNotes and hiddenNotes writes announce themselves', () => {
    const seen: string[] = [];
    const off = onDataChange((key) => seen.push(key));
    writeValue(keys.demoNotes, []);
    writeValue(keys.hiddenNotes, ['note-1']);
    off();
    expect(seen).toContain(keys.demoNotes);
    expect(seen).toContain(keys.hiddenNotes);
  });
});

describe('assistant feedback', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAllLists();
  });

  it('stores { turnId, value, at } per turn and announces the write', () => {
    const seen: string[] = [];
    const off = onDataChange((key) => seen.push(key));
    writeAssistantFeedback('a-1', 'up');
    writeAssistantFeedback('a-2', 'down');
    writeAssistantFeedback('a-1', 'down');
    off();
    expect(seen).toContain(keys.assistantFeedback);
    const stored = readAssistantFeedback();
    expect(stored).toHaveLength(2);
    expect(stored.find((item) => item.turnId === 'a-1')).toMatchObject({ value: 'down' });
    expect(stored.every((item) => item.turnId && item.value && item.at)).toBe(true);
  });
});
