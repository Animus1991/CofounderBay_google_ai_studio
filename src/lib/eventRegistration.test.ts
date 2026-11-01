import { beforeEach, describe, expect, it } from 'vitest';
import { setEventRegistration } from './eventRegistration';
import { eventListKeys, readIds, readSessions } from './localLists';

const ev = { id: '42', title: 'Demo Night', startsAt: Date.UTC(2026, 0, 20, 18), date: '2026-01-20', time: '18:00', location: 'Online', organizer: 'Studio' };

beforeEach(() => localStorage.clear());

describe('setEventRegistration', () => {
  it('registers: id in list + evt- session on the calendar', () => {
    setEventRegistration(ev, true);
    expect(readIds(eventListKeys.registered)).toContain('42');
    expect(readSessions().find((s) => s.id === 'evt-42')?.title).toBe('Demo Night');
  });

  it('unregisters: removes id and the evt- session', () => {
    setEventRegistration(ev, true);
    setEventRegistration(ev, false);
    expect(readIds(eventListKeys.registered)).not.toContain('42');
    expect(readSessions().find((s) => s.id === 'evt-42')).toBeUndefined();
  });

  it('is idempotent', () => {
    setEventRegistration(ev, true);
    setEventRegistration(ev, true);
    expect(readIds(eventListKeys.registered).filter((id) => id === '42')).toHaveLength(1);
    expect(readSessions().filter((s) => s.id === 'evt-42')).toHaveLength(1);
  });
});
