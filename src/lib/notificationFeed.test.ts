import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationFeed } from './notificationFeed';
import { logActivity, resetAllLists, scopedKey, setDataScope } from './localLists';

let cloudItems: { id: string; type: string; title: string; titleEl: string; body: string; bodyEl: string; read: boolean; createdAt: number }[] = [];

vi.mock('./social', () => ({
  useNotifications: () => ({ items: cloudItems, loaded: true }),
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
    expect(result.current.unread).toBe(3);
  });

  it('marking a seed note read removes it from unread', () => {
    const { result } = renderHook(() => useNotificationFeed());
    const unreadSeed = result.current.items.find((note) => note.origin === 'seed' && !note.read);
    expect(unreadSeed).toBeTruthy();
    act(() => result.current.markRead(unreadSeed!.id));
    expect(result.current.unread).toBe(1);
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

  it('clearAll empties the list and the seed does not come back', () => {
    const { result } = renderHook(() => useNotificationFeed());
    act(() => result.current.clearAll());
    expect(result.current.items.length).toBe(0);
    expect(result.current.unread).toBe(0);
  });
});
