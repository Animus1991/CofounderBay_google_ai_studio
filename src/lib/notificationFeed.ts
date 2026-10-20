import { useMemo } from 'react';
import { useNotifications, type NotificationType } from './social';
import { useStored } from './useStored';
import {
  clearActivity,
  isDemoData,
  keys,
  markActivityRead,
  markActivityUnread,
  readActivity,
  readValue,
  scopedKey,
  writeValue,
  type ActivityKind,
} from './localLists';
import {
  clearNotifications as clearCloudNotifications,
  deleteNotification as deleteCloudNotification,
  markNotificationsRead as markCloudNotificationsRead,
  unreadNotificationCount,
} from './social';

export type FeedNoteType =
  | 'message'
  | 'match'
  | 'milestone'
  | 'system'
  | 'community'
  | 'endorsement'
  | 'event'
  | 'accepted'
  | 'mentorship';

export type FeedNote = {
  id: string;
  type: FeedNoteType;
  title: string;
  titleEl?: string;
  description: string;
  descriptionEl?: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  fromName?: string;
  fromAvatar?: string;
  /** 'cloud' came from another member; 'local' is this account's own activity log or the demo seed. */
  source: 'cloud' | 'local';
  /** Which backing store owns the entry. */
  origin: 'cloud' | 'activity' | 'seed';
};

const LEGACY_HIDDEN = 'cb_hidden_notifications';

function kindToType(kind: ActivityKind): FeedNoteType {
  if (kind === 'message') return 'message';
  if (kind === 'request' || kind === 'profile') return 'match';
  if (kind === 'milestone') return 'milestone';
  if (kind === 'community' || kind === 'event') return 'community';
  return 'system';
}

function cloudToType(type: NotificationType): FeedNoteType {
  if (type === 'connection') return 'match';
  if (type === 'accepted') return 'accepted';
  if (type === 'message') return 'message';
  if (type === 'endorsement') return 'endorsement';
  if (type === 'mentorship') return 'mentorship';
  if (type === 'community') return 'community';
  if (type === 'event') return 'event';
  return 'system';
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

function demoSeedNotes(): FeedNote[] {
  return [
    {
      id: 'demo-1',
      type: 'match',
      title: 'New match suggestion',
      titleEl: 'Νέα πρόταση αντιστοίχισης',
      description: 'Sarah Chen is a 94% match for your Fintech project. View her profile to connect.',
      descriptionEl: 'Η Sarah Chen ταιριάζει 94% με το FinTech έργο σου. Άνοιξε το προφίλ της για να συνδεθείτε.',
      time: hoursAgo(2),
      read: false,
      actionUrl: '/profile/sarah-chen',
      source: 'local',
      origin: 'seed',
    },
    {
      id: 'demo-2',
      type: 'message',
      title: 'New message from Marcus',
      titleEl: 'Νέο μήνυμα από τον Marcus',
      description: "Hey! I'd love to discuss the product roadmap we talked about yesterday.",
      descriptionEl: 'Γεια! Θα ήθελα να συζητήσουμε το product roadmap που λέγαμε χθες.',
      time: hoursAgo(5),
      read: false,
      actionUrl: '/messages',
      source: 'local',
      origin: 'seed',
    },
    {
      id: 'demo-3',
      type: 'milestone',
      title: 'Milestone achieved',
      titleEl: 'Ορόσημο ολοκληρώθηκε',
      description: "You've completed your 'First 5 Match Requests' milestone.",
      descriptionEl: 'Ολοκλήρωσες το ορόσημο «Πρώτα 5 αιτήματα σύνδεσης».',
      time: hoursAgo(24),
      read: true,
      source: 'local',
      origin: 'seed',
    },
    {
      id: 'demo-4',
      type: 'system',
      title: 'Platform update',
      titleEl: 'Ενημέρωση πλατφόρμας',
      description: "We've added new AI-powered matching dimensions to help you find better partners.",
      descriptionEl: 'Προσθέσαμε νέες διαστάσεις αντιστοίχισης με AI για να βρίσκεις καλύτερους συνεργάτες.',
      time: hoursAgo(48),
      read: true,
      source: 'local',
      origin: 'seed',
    },
  ];
}

function readSeed(): FeedNote[] {
  if (!isDemoData()) return [];
  const stored = readValue<FeedNote[] | null>(keys.demoNotes, null);
  if (Array.isArray(stored)) return stored;
  return demoSeedNotes();
}

function writeSeed(notes: FeedNote[]) {
  if (!isDemoData()) return;
  writeValue(keys.demoNotes, notes);
}

export function readHiddenNotes(): string[] {
  const stored = readValue<string[] | null>(keys.hiddenNotes, null) ?? [];
  let legacy: string[] = [];
  try {
    const raw = localStorage.getItem(scopedKey(LEGACY_HIDDEN));
    if (raw) legacy = JSON.parse(raw) as string[];
  } catch {
    legacy = [];
  }
  if (!legacy.length) return stored;
  try {
    localStorage.removeItem(scopedKey(LEGACY_HIDDEN));
  } catch {
    /* storage blocked — merge still applies via the new key */
  }
  const merged = [...new Set([...stored, ...legacy])];
  return writeValue(keys.hiddenNotes, merged);
}

function writeHiddenNotes(ids: string[]) {
  writeValue(keys.hiddenNotes, ids);
}

/**
 * Marks every notification read — activity, the demo seed and the cloud feed —
 * through the same writers the page and the assistant share. Returns a
 * `restore()` that un-reads exactly what was unread before; cloud entries
 * cannot be un-read, so `cloudTouched` reports whether any were open.
 */
export function markAllNotificationsRead(): { restore: () => void; cloudTouched: boolean } {
  const activityUnread = readActivity().filter((item) => !item.read).map((item) => item.id);
  const seed = readSeed();
  const seedUnread = new Set(seed.filter((note) => !note.read).map((note) => note.id));
  const cloudTouched = unreadNotificationCount() > 0;
  markActivityRead('all');
  void markCloudNotificationsRead('all');
  if (seedUnread.size) writeSeed(seed.map((note) => ({ ...note, read: true })));
  return {
    cloudTouched,
    restore: () => {
      if (activityUnread.length) markActivityUnread(activityUnread);
      if (seedUnread.size) {
        writeSeed(readSeed().map((note) => (seedUnread.has(note.id) ? { ...note, read: false } : note)));
      }
    },
  };
}

/** Unread cloud notifications — once marked read they cannot be un-read. */
export function cloudNotificationsUnread(): number {
  return unreadNotificationCount();
}

function activityNotes(): FeedNote[] {
  return readActivity().map((item) => ({
    id: item.id,
    type: kindToType(item.kind),
    title: item.title,
    titleEl: item.titleEl,
    description: '',
    time: item.at,
    read: item.read,
    actionUrl: item.href,
    source: 'local',
    origin: 'activity',
  }));
}

export function useNotificationFeed(): {
  items: FeedNote[];
  unread: number;
  loaded: boolean;
  markAllRead: () => void;
  markRead: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
} {
  const activity = useStored(activityNotes, [keys.activity]);
  const seed = useStored(readSeed, [keys.demoNotes]);
  const hidden = useStored(readHiddenNotes, [keys.hiddenNotes]);
  const cloud = useNotifications();

  const cloudNotes: FeedNote[] = useMemo(() => cloud.items.map((item) => ({
    id: item.id,
    type: cloudToType(item.type),
    title: item.title,
    titleEl: item.titleEl,
    description: item.body,
    descriptionEl: item.bodyEl,
    time: new Date(item.createdAt).toISOString(),
    read: item.read,
    actionUrl: item.href || undefined,
    fromName: item.fromName,
    fromAvatar: item.fromAvatar,
    source: 'cloud',
    origin: 'cloud',
  })), [cloud.items]);

  const items = useMemo(
    () => [...cloudNotes, ...activity, ...seed]
      .filter((item) => !hidden.includes(item.id))
      .sort((a, b) => Date.parse(b.time) - Date.parse(a.time)),
    [cloudNotes, activity, seed, hidden],
  );
  const unread = items.filter((item) => !item.read).length;

  const markAllRead = () => {
    markAllNotificationsRead();
  };

  const markRead = (id: string) => {
    const target = items.find((note) => note.id === id) ?? seed.find((note) => note.id === id);
    if (!target || target.read) return;
    if (target.origin === 'cloud') void markCloudNotificationsRead([id]);
    else if (target.origin === 'activity') markActivityRead([id]);
    else writeSeed(seed.map((note) => (note.id === id ? { ...note, read: true } : note)));
  };

  const remove = (id: string) => {
    if (!hidden.includes(id)) writeHiddenNotes([...hidden, id]);
    const target = items.find((note) => note.id === id);
    if (target?.origin === 'cloud') void deleteCloudNotification(id);
  };

  const clearAll = () => {
    clearActivity();
    void clearCloudNotifications();
    writeSeed([]);
    writeHiddenNotes([]);
  };

  return { items, unread, loaded: cloud.loaded, markAllRead, markRead, remove, clearAll };
}
