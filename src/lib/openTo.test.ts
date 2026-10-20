import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyOpenTo } from './openTo';
import { readOpenTo, scopedKey } from './localLists';
import { persistPrivacy } from './account';

vi.mock('./account', () => ({
  persistPrivacy: vi.fn(() => Promise.resolve()),
}));

const SWITCH_KEY = 'cfb.accountSwitches';

beforeEach(() => {
  localStorage.clear();
  vi.mocked(persistPrivacy).mockClear();
});

describe('applyOpenTo', () => {
  it('writes the list, the switch snapshot and one privacy call', () => {
    applyOpenTo(['cofounder'], { uid: 'u1', demo: false, privacy: { showEmail: true } });
    expect(readOpenTo()).toEqual(['cofounder']);
    const stored = JSON.parse(localStorage.getItem(scopedKey(SWITCH_KEY)) ?? '{}') as Record<string, unknown>;
    expect(stored.openToCofounder).toBe(true);
    expect(stored.openToInvestors).toBe(false);
    expect(persistPrivacy).toHaveBeenCalledTimes(1);
    expect(persistPrivacy).toHaveBeenCalledWith('u1', { openTo: ['cofounder'], mentorAvailability: false, showEmail: true });
  });

  it('does not call the remote in demo mode', () => {
    applyOpenTo(['investor'], { uid: null, demo: true });
    expect(persistPrivacy).not.toHaveBeenCalled();
    expect(readOpenTo()).toEqual(['investor']);
  });
});
