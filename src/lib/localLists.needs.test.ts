import { beforeEach, describe, expect, it } from 'vitest';
import { editNeed, readNeeds, resetAllLists, upsertNeed } from './localLists';

describe('need card versions', () => {
  beforeEach(() => {
    resetAllLists();
  });

  it('records a version when a field changes', () => {
    upsertNeed({
      id: 'need-1',
      exists: 'A founding team',
      outcome: 'A partner',
      missing: 'sales',
      status: 'open',
      at: '2026-10-01T10:00:00.000Z',
    });
    const updated = editNeed('need-1', { outcome: 'A full-time sales co-founder' });
    expect(updated?.version).toBe(2);
    expect(updated?.history?.[0]?.changed).toEqual(['outcome']);
    expect(readNeeds()[0]?.outcome).toBe('A full-time sales co-founder');
  });
});
