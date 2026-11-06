import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentNotes, noteGroup, triageNotifications, useNotificationFeed, waitsOnReader } from './notificationFeed';
import { logActivity, readNotificationPrefs, resetAllLists, scopedKey, setDataScope, writeNotificationPrefs } from './localLists';
import { markNotificationsRead } from './social';

let cloudItems: { id: string; type: string; title: string; titleEl: string; body: string; bodyEl: string; read: boolean; createdAt: number }[] = [];

vi.mock('./social', () => ({
  useNotifications: () => ({ items: cloudItems, loaded: true }),
  readCloudNotifications: () => cloudItems,
  markNotificationsRead: vi.fn(() => Promise.resolve()),
  deleteNotification: vi.fn(() => Promise.resolve()),
  clearNotifications: vi.fn(() => Promise.resolve()),
  unreadNotificationCount: () => cloudItems.filter((item) => !item.read).length,
}));

beforeEach(() => {
  cloudItems = [];
  localStorage.clear();
  setDataScope('');
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  resetAllLists();
});

describe('notification feed', () => {
  it('merges the demo seed, activity and cloud items into one list', () => {
    logActivity({ kind: 'profile', title: 'Saved a profile', titleEl: 'Αποθηκεύτηκε προφίλ', href: '/discovery' });
    const { result } = renderHook(() => useNotificationFeed());
    const origins = result.current.items.map((note) => note.origin).sort();
    expect(origins).toContain('seed');
    expect(origins).toContain('activity');
    // the seed unread entries plus the fresh activity entry drive the badge
    expect(result.current.unread).toBe(result.current.items.filter((note) => !note.read).length);
    // two unread seed notes + the activity entry + the demo pipeline's overdue investor alert
    expect(result.current.unread).toBe(4);
  });

  it('turns overdue investor next steps into live alerts that can be read', () => {
    const { result } = renderHook(() => useNotificationFeed());
    const alert = result.current.items.find((note) => note.origin === 'derived');
    expect(alert?.title).toBe('Overdue follow-up: Andreessen Horowitz');
    expect(alert?.actionUrl).toBe('/fundraising?tab=crm');
    act(() => result.current.markRead(alert!.id));
    expect(result.current.items.find((note) => note.id === alert!.id)?.read).toBe(true);
  });

  it('marking a seed note read removes it from unread', () => {
    const { result } = renderHook(() => useNotificationFeed());
    const unreadSeed = result.current.items.find((note) => note.origin === 'seed' && !note.read);
    expect(unreadSeed).toBeTruthy();
    act(() => result.current.markRead(unreadSeed!.id));
    expect(result.current.unread).toBe(2);
    expect(result.current.items.find((note) => note.id === unreadSeed!.id)?.read).toBe(true);
  });

  it('markAllRead leaves the badge at zero', () => {
    const { result } = renderHook(() => useNotificationFeed());
    act(() => result.current.markAllRead());
    expect(result.current.unread).toBe(0);
  });

  it('remove hides both seed and cloud entries', () => {
    cloudItems = [{
      id: 'cloud-1', type: 'connection', title: 'Request', titleEl: 'Αίτημα',
      body: 'hi', bodyEl: 'γεια', read: false, createdAt: Date.now(),
    }];
    const { result } = renderHook(() => useNotificationFeed());
    const ids = result.current.items.map((note) => note.id);
    act(() => result.current.remove('demo-1'));
    act(() => result.current.remove('cloud-1'));
    const remaining = result.current.items.map((note) => note.id);
    expect(remaining).not.toContain('demo-1');
    expect(remaining).not.toContain('cloud-1');
    expect(remaining.length).toBe(ids.length - 2);
  });

  it('migrates the legacy hidden list into the synced key', () => {
    localStorage.setItem(scopedKey('cb_hidden_notifications'), JSON.stringify(['demo-2']));
    const { result } = renderHook(() => useNotificationFeed());
    expect(result.current.items.map((note) => note.id)).not.toContain('demo-2');
    expect(localStorage.getItem(scopedKey('cb_hidden_notifications'))).toBeNull();
    expect(localStorage.getItem(scopedKey('cfb.hiddenNotifications'))).toContain('demo-2');
  });

  it('Need Card alerts list only cards asking for a skill on the profile, and stop when switched off', () => {
    const { result } = renderHook(() => useNotificationFeed());
    expect(result.current.items.some((note) => note.id.startsWith('need-fit-'))).toBe(false);
    act(() => { writeNotificationPrefs({ ...readNotificationPrefs(), needs: true }); });
    const fits = result.current.items.filter((note) => note.id.startsWith('need-fit-'));
    // The sample founder knows React and TypeScript: AegisPay (React, TypeScript) and NeuroScan (TypeScript) fit; CanvasOS (sales) does not.
    expect(fits.map((note) => note.id).sort()).toEqual(['need-fit-need-1', 'need-fit-need-3']);
    expect(fits[0]?.actionUrl).toBe('/matches?panel=needs');
    expect(fits.every((note) => note.description.includes('Sample card'))).toBe(true);
    act(() => { writeNotificationPrefs({ ...readNotificationPrefs(), needs: false }); });
    expect(result.current.items.some((note) => note.id.startsWith('need-fit-'))).toBe(false);
  });

  it('a real account gets no sample Need Card alerts', () => {
    localStorage.setItem('demo_mode', 'false');
    setDataScope('real-user');
    writeNotificationPrefs({ ...readNotificationPrefs(), needs: true });
    const { result } = renderHook(() => useNotificationFeed());
    expect(result.current.items.some((note) => note.id.startsWith('need-fit-'))).toBe(false);
  });

  it('clearAll empties the list and the seed does not come back', () => {
    const { result } = renderHook(() => useNotificationFeed());
    act(() => result.current.clearAll());
    expect(result.current.items.length).toBe(0);
    expect(result.current.unread).toBe(0);
  });
});

describe('triage', () => {
  it('waits on the reader for a message, an overdue follow-up and a request from a member', () => {
    expect(waitsOnReader({ type: 'message', origin: 'seed' })).toBe(true);
    expect(waitsOnReader({ type: 'investor', origin: 'derived' })).toBe(true);
    expect(waitsOnReader({ type: 'match', origin: 'cloud' })).toBe(true);
    expect(waitsOnReader({ type: 'mentorship', origin: 'cloud' })).toBe(true);
    // A suggestion, a matching sample Need Card, an endorsement and the account's own log need nothing.
    expect(waitsOnReader({ type: 'match', origin: 'seed' })).toBe(false);
    expect(waitsOnReader({ type: 'match', origin: 'derived' })).toBe(false);
    expect(waitsOnReader({ type: 'endorsement', origin: 'cloud' })).toBe(false);
    expect(waitsOnReader({ type: 'system', origin: 'activity' })).toBe(false);
  });

  it('marks read only what needs nothing, and restore un-reads exactly those it can', () => {
    cloudItems = [
      { id: 'cloud-request', type: 'connection', title: 'Connection request', titleEl: 'Αίτημα σύνδεσης', body: '', bodyEl: '', read: false, createdAt: Date.now() },
      { id: 'cloud-endorsement', type: 'endorsement', title: 'New endorsement', titleEl: 'Νέα σύσταση', body: '', bodyEl: '', read: false, createdAt: Date.now() },
    ];
    logActivity({ kind: 'profile', title: 'Saved a profile', titleEl: 'Αποθηκεύτηκε προφίλ', href: '/discovery' });
    const result = triageNotifications();
    // Kept: the message seed, the overdue investor alert, the connection request. Cleared: the match
    // suggestion seed, the account's own activity, the endorsement.
    expect(result.kept).toBe(3);
    expect(result.cleared).toBe(3);
    expect(result.cloudCleared).toBe(1);
    expect(markNotificationsRead).toHaveBeenCalledWith(['cloud-endorsement']);
    const after = currentNotes();
    expect(after.find((note) => note.id === 'demo-1')?.read).toBe(true);
    expect(after.find((note) => note.id === 'demo-2')?.read).toBe(false);
    expect(after.find((note) => note.origin === 'derived')?.read).toBe(false);
    expect(after.find((note) => note.origin === 'activity')?.read).toBe(true);
    result.restore();
    const restored = currentNotes();
    expect(restored.find((note) => note.id === 'demo-1')?.read).toBe(false);
    expect(restored.find((note) => note.origin === 'activity')?.read).toBe(false);
  });

  it('agrees with the badge: currentNotes is the list the page shows', () => {
    const { result } = renderHook(() => useNotificationFeed());
    expect(currentNotes().map((note) => note.id)).toEqual(result.current.items.map((note) => note.id));
  });
});

describe('note groups', () => {
  it('puts what members sent under "From members", whatever store it came from', () => {
    expect(noteGroup({ type: 'message', origin: 'seed' })).toBe('people');
    expect(noteGroup({ type: 'match', origin: 'seed' })).toBe('people');
    expect(noteGroup({ type: 'event', origin: 'cloud' })).toBe('people');
    expect(noteGroup({ type: 'milestone', origin: 'seed' })).toBe('activity');
    expect(noteGroup({ type: 'investor', origin: 'derived' })).toBe('activity');
    expect(noteGroup({ type: 'milestone', origin: 'activity' })).toBe('activity');
    expect(noteGroup({ type: 'system', origin: 'seed' })).toBe('platform');
    // Own steps logged with a generic icon are still the account's activity.
    expect(noteGroup({ type: 'system', origin: 'activity' })).toBe('activity');
    expect(noteGroup({ type: 'message', origin: 'activity' })).toBe('activity');
  });
});
