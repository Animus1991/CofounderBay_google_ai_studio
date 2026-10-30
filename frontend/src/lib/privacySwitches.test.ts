import { beforeEach, describe, expect, it } from 'vitest';
import { keys, readOpenTo, readValue, resetAllLists, writeOpenTo, writeValue } from './localLists';
import { applySwitches, defaultSwitches, readSwitches, seedSwitchesFromProfile, type Switches } from './privacySwitches';

const ctx = { uid: null, demo: true };

describe('privacySwitches', () => {
  beforeEach(() => {
    resetAllLists();
    try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  });

  it('reads defaults when nothing is stored and merges stored over defaults', () => {
    expect(readSwitches()).toEqual(defaultSwitches());
    writeValue<Switches>(keys.accountSwitches, { ...defaultSwitches(), showEmail: true });
    expect(readSwitches().showEmail).toBe(true);
    expect(readSwitches().publicProfile).toBe(true);
  });

  it('applySwitches persists a messagesFrom change and leaves existing open-to kinds alone', () => {
    writeValue<Switches>(keys.accountSwitches, {
      ...defaultSwitches(),
      openToCofounder: true,
      openToInvestors: false,
      openToAdvisors: false,
      mentorAvailability: false,
    });
    writeOpenTo(['cofounder', 'speaking']);
    const next = applySwitches({ messagesFrom: 'connections' }, ctx);
    expect(next.messagesFrom).toBe('connections');
    expect(readValue<Switches>(keys.accountSwitches, defaultSwitches()).messagesFrom).toBe('connections');
    expect(new Set(readOpenTo())).toEqual(new Set(['cofounder', 'speaking']));
  });

  it('applySwitches({ mentorAvailability: true }) adds mentoring to readOpenTo', () => {
    applySwitches({ mentorAvailability: true }, ctx);
    expect(readOpenTo()).toContain('mentoring');
    expect(readValue<Switches>(keys.accountSwitches, defaultSwitches()).mentorAvailability).toBe(true);
  });

  it('seedSwitchesFromProfile maps the remote privacy slice', () => {
    const merged = seedSwitchesFromProfile(
      { profileVisibility: 'Public', openTo: ['investor'], showEmail: true },
      defaultSwitches(),
    );
    expect(merged.publicProfile).toBe(true);
    expect(merged.openToInvestors).toBe(true);
    expect(merged.openToCofounder).toBe(false);
    expect(merged.openToAdvisors).toBe(false);
    expect(merged.showEmail).toBe(true);
  });

  it('seedSwitchesFromProfile returns stored values untouched without a profile', () => {
    const stored = { ...defaultSwitches(), quietHours: true };
    expect(seedSwitchesFromProfile(null, stored)).toEqual(stored);
  });
});
