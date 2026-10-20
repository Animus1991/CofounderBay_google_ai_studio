import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keys, onDataChange, resetAllLists, writeValue } from './localLists';
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
