import { beforeEach, describe, expect, it } from 'vitest';
import { keys, writeValue } from './localLists';
import { buildDataExport } from './dataExport';

describe('buildDataExport', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes the profile and every registered list name', () => {
    const payload = buildDataExport({ fullName: 'Demo User' });
    expect(payload.profile).toEqual({ fullName: 'Demo User' });
    for (const name of Object.keys(keys)) {
      expect(payload.lists).toHaveProperty(name);
    }
  });

  it('exports stored values parsed back to objects', () => {
    writeValue(keys.savedSearches, [{ id: 's1', name: 'Fintech' }]);
    const payload = buildDataExport(null, new Date('2025-01-02T00:00:00Z'));
    expect(payload.exportedAt).toBe('2025-01-02T00:00:00.000Z');
    expect(payload.lists.savedSearches).toEqual([{ id: 's1', name: 'Fintech' }]);
    expect(payload.lists.requests).toBeNull();
  });
});
