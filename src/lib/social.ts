/**
 * The social layer of a real account, in Firestore: connection requests,
 * notifications, blocks, reports, skill endorsements, profile views and
 * presence. Every function is a no-op (or returns empty) without a signed-in
 * account, so demo pages keep their sample behaviour.
 */
import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from './logger';
import { toMillis } from './peopleSource';
import { readNotificationPrefs, writeValue } from './localLists';

const log = createLogger('social');

// ── Who is acting ─────────────────────────────────────────────────────────

export type Identity = { uid: string; name: string; headline: string; avatar: string; role: string };

let me: Identity | null = null;

/** App keeps this in step with the signed-in profile, so writes carry a name and photo. */
export function setSocialIdentity(next: Identity | null) {
  me = next;
}

export function socialIdentity(): Identity | null {
  return me;
}

function requireMe(): Identity {
  if (!me) throw new Error('signed-out');
  return me;
}

/** Firestore rejects data URLs above ~1 MB; keep only a small photo on shared records. */
function smallAvatar(url: string | undefined): string {
  if (!url) return '';
  return url.length > 120_000 ? '' : url;
}

// ── Tiny store helper ─────────────────────────────────────────────────────

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function useStore<T>(store: ReturnType<typeof createStore<T>>): T {
  const [value, setValue] = useState<T>(store.get());
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(() => setValue(store.get()));
  }, [store]);
  return value;
}

// ── Notifications ─────────────────────────────────────────────────────────

export type NotificationType =
  | 'connection'
  | 'accepted'
  | 'message'
  | 'endorsement'
  | 'mentorship'
  | 'community'
  | 'event'
  | 'system';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  titleEl: string;
  body: string;
  bodyEl: string;
  href: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  read: boolean;
  createdAt: number;
};

const notificationStore = createStore<{ items: AppNotification[]; loaded: boolean }>({ items: [], loaded: false });
let notificationsUnsub: (() => void) | null = null;
let notificationsUid: string | null = null;

const PREF_FOR_TYPE: Partial<Record<NotificationType, keyof ReturnType<typeof readNotificationPrefs>>> = {
  connection: 'matches',
  accepted: 'matches',
  message: 'messages',
  endorsement: 'mentions',
  mentorship: 'mentors',
  community: 'community',
  event: 'events',
};

function showBrowserNotification(item: AppNotification, lang: 'en' | 'el') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted' || !document.hidden) return;
  const pref = PREF_FOR_TYPE[item.type];
  if (pref && !readNotificationPrefs()[pref]) return;
  try {
    const note = new Notification(lang === 'el' ? item.titleEl || item.title : item.title, {
      body: lang === 'el' ? item.bodyEl || item.body : item.body,
      icon: '/icon.svg',
      tag: item.id,
    });
    note.onclick = () => {
      window.focus();
      if (item.href) window.location.assign(item.href);
      note.close();
    };
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

export function startNotifications(uid: string, langOf: () => 'en' | 'el') {
  if (notificationsUid === uid) return;
  stopNotifications();
  notificationsUid = uid;
  let first = true;
  notificationsUnsub = onSnapshot(
    query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(150)),
    (snap) => {
      const items = snap.docs.map((entry) => {
        const data = entry.data() as Record<string, unknown>;
        return {
          id: entry.id,
          type: (String(data.type || 'system') as NotificationType),
          title: String(data.title || ''),
          titleEl: String(data.titleEl || data.title || ''),
          body: String(data.body || ''),
          bodyEl: String(data.bodyEl || data.body || ''),
          href: String(data.href || ''),
          fromId: String(data.fromId || ''),
          fromName: String(data.fromName || ''),
          fromAvatar: String(data.fromAvatar || ''),
          read: data.read === true,
          createdAt: toMillis(data.createdAt) ?? Date.now(),
        } satisfies AppNotification;
      });
      if (!first) {
        snap.docChanges()
          .filter((change) => change.type === 'added' && !snap.metadata.hasPendingWrites)
          .forEach((change) => {
            const item = items.find((entry) => entry.id === change.doc.id);
            if (item && !item.read) showBrowserNotification(item, langOf());
          });
      }
      first = false;
      notificationStore.set({ items, loaded: true });
    },
    (error) => {
      log.warn('notifications listener failed', { error: String(error) });
      notificationStore.set({ items: [], loaded: true });
    },
  );
}

export function stopNotifications() {
  notificationsUnsub?.();
  notificationsUnsub = null;
  notificationsUid = null;
  notificationStore.set({ items: [], loaded: false });
}

export function useNotifications() {
  return useStore(notificationStore);
}

export function unreadNotificationCount(): number {
  return notificationStore.get().items.filter((item) => !item.read).length;
}

/** Writes a notification into another member's inbox. Failures never block the action that caused it. */
export async function notify(
  toUid: string,
  payload: { type: NotificationType; title: string; titleEl: string; body?: string; bodyEl?: string; href?: string },
) {
  const actor = me;
  if (!actor || !toUid || toUid === actor.uid) return;
  try {
    await addDoc(collection(db, 'users', toUid, 'notifications'), {
      type: payload.type,
      title: payload.title.slice(0, 200),
      titleEl: payload.titleEl.slice(0, 200),
      body: (payload.body || '').slice(0, 600),
      bodyEl: (payload.bodyEl || payload.body || '').slice(0, 600),
      href: (payload.href || '').slice(0, 300),
      fromId: actor.uid,
      fromName: actor.name.slice(0, 100),
      fromAvatar: smallAvatar(actor.avatar),
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    log.warn('could not notify', { toUid, error: String(error) });
  }
}

export async function markNotificationsRead(ids: string[] | 'all') {
  const uid = notificationsUid;
  if (!uid) return;
  const targets = notificationStore.get().items.filter((item) => !item.read && (ids === 'all' || ids.includes(item.id)));
  if (!targets.length) return;
  const batch = writeBatch(db);
  targets.slice(0, 450).forEach((item) => batch.update(doc(db, 'users', uid, 'notifications', item.id), { read: true }));
  await batch.commit().catch((error) => log.warn('mark read failed', { error: String(error) }));
}

export async function deleteNotification(id: string) {
  const uid = notificationsUid;
  if (!uid) return;
  await deleteDoc(doc(db, 'users', uid, 'notifications', id)).catch((error) => log.warn('delete failed', { error: String(error) }));
}

export async function clearNotifications() {
  const uid = notificationsUid;
  if (!uid) return;
  const batch = writeBatch(db);
  notificationStore.get().items.slice(0, 450).forEach((item) => batch.delete(doc(db, 'users', uid, 'notifications', item.id)));
  await batch.commit().catch((error) => log.warn('clear failed', { error: String(error) }));
}

// ── Connection requests ───────────────────────────────────────────────────

export type ConnectionType = 'Co-Founder' | 'Mentor' | 'Investor' | 'Collaborator' | 'Advisor';
export type ConnectionStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';

export type ConnectionRecord = {
  id: string;
  senderId: string;
  receiverId: string;
  participants: string[];
  senderName: string;
  senderHeadline: string;
  senderAvatar: string;
  receiverName: string;
  receiverHeadline: string;
  receiverAvatar: string;
  requestType: ConnectionType;
  note: string;
  status: ConnectionStatus;
  createdAt: number;
  updatedAt: number;
  respondedAt: number | null;
};

export type ConnectionState = 'none' | 'outgoing' | 'incoming' | 'connected' | 'declined';

const connectionStore = createStore<{ items: ConnectionRecord[]; loaded: boolean }>({ items: [], loaded: false });
let connectionsUnsub: (() => void) | null = null;
let connectionsUid: string | null = null;
let ownConnectionIds: string[] = [];

/** App passes the connection ids stored on the signed-in profile. */
export function setOwnConnectionIds(ids: string[]) {
  ownConnectionIds = ids;
}

function parseConnection(id: string, data: Record<string, unknown>): ConnectionRecord {
  const senderId = String(data.senderId || '');
  const receiverId = String(data.receiverId || '');
  return {
    id,
    senderId,
    receiverId,
    participants: Array.isArray(data.participants) ? (data.participants as string[]) : [senderId, receiverId],
    senderName: String(data.senderName || ''),
    senderHeadline: String(data.senderHeadline || ''),
    senderAvatar: String(data.senderAvatar || ''),
    receiverName: String(data.receiverName || ''),
    receiverHeadline: String(data.receiverHeadline || ''),
    receiverAvatar: String(data.receiverAvatar || ''),
    requestType: (String(data.requestType || 'Co-Founder') as ConnectionType),
    note: String(data.note || ''),
    status: (String(data.status || 'Pending') as ConnectionStatus),
    createdAt: toMillis(data.createdAt) ?? Date.now(),
    updatedAt: toMillis(data.updatedAt) ?? Date.now(),
    respondedAt: toMillis(data.respondedAt),
  };
}

async function reconcileProfileConnections(uid: string, items: ConnectionRecord[]) {
  const accepted = items.filter((item) => item.status === 'Accepted').map((item) => (item.senderId === uid ? item.receiverId : item.senderId));
  const missing = accepted.filter((id) => !ownConnectionIds.includes(id));
  const stale = ownConnectionIds.filter((id) => !accepted.includes(id));
  if (!missing.length && !stale.length) return;
  try {
    if (missing.length) await updateDoc(doc(db, 'profiles', uid), { connectionIds: arrayUnion(...missing) });
    if (stale.length) await updateDoc(doc(db, 'profiles', uid), { connectionIds: arrayRemove(...stale) });
    ownConnectionIds = accepted;
  } catch {
    /* profile not created yet; the next snapshot tries again */
  }
}

export function startConnections(uid: string) {
  if (connectionsUid === uid) return;
  stopConnections();
  connectionsUid = uid;
  connectionsUnsub = onSnapshot(
    query(collection(db, 'connectionRequests'), where('participants', 'array-contains', uid)),
    (snap) => {
      const items = snap.docs.map((entry) => parseConnection(entry.id, entry.data() as Record<string, unknown>));
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      connectionStore.set({ items, loaded: true });
      void reconcileProfileConnections(uid, items);
    },
    (error) => {
      log.warn('connections listener failed', { error: String(error) });
      connectionStore.set({ items: [], loaded: true });
    },
  );
}

export function stopConnections() {
  connectionsUnsub?.();
  connectionsUnsub = null;
  connectionsUid = null;
  connectionStore.set({ items: [], loaded: false });
}

export function useConnections() {
  const { items, loaded } = useStore(connectionStore);
  const uid = connectionsUid;
  const incoming = items.filter((item) => item.status === 'Pending' && item.receiverId === uid);
  const outgoing = items.filter((item) => item.status === 'Pending' && item.senderId === uid);
  const accepted = items.filter((item) => item.status === 'Accepted');
  return { items, loaded, incoming, outgoing, accepted, uid };
}

export function connectionRecords(): ConnectionRecord[] {
  return connectionStore.get().items;
}

export function otherSide(record: ConnectionRecord, uid: string | null | undefined) {
  const mine = record.senderId === uid;
  return {
    id: mine ? record.receiverId : record.senderId,
    name: mine ? record.receiverName : record.senderName,
    headline: mine ? record.receiverHeadline : record.senderHeadline,
    avatar: mine ? record.receiverAvatar : record.senderAvatar,
  };
}

export function connectionStateWith(personId: string): { state: ConnectionState; record?: ConnectionRecord } {
  const uid = connectionsUid;
  if (!uid) return { state: 'none' };
  const record = connectionStore.get().items.find((item) => item.participants.includes(personId) && item.participants.includes(uid));
  if (!record) return { state: 'none' };
  if (record.status === 'Accepted') return { state: 'connected', record };
  if (record.status === 'Pending') return { state: record.senderId === uid ? 'outgoing' : 'incoming', record };
  if (record.status === 'Rejected') return { state: record.senderId === uid ? 'declined' : 'none', record };
  return { state: 'none', record };
}

export function connectedIds(): string[] {
  const uid = connectionsUid;
  return connectionStore.get().items
    .filter((item) => item.status === 'Accepted')
    .map((item) => (item.senderId === uid ? item.receiverId : item.senderId));
}

export type PersonRef = { id: string; fullName: string; headline?: string; avatarUrl?: string };

export async function sendConnectionRequest(person: PersonRef, type: ConnectionType = 'Co-Founder', note = '') {
  const actor = requireMe();
  if (person.id === actor.uid) throw new Error('self');
  const existing = connectionStore.get().items;
  const reverse = existing.find((item) => item.id === `${person.id}_${actor.uid}`);
  if (reverse && reverse.status === 'Pending') {
    await respondToConnection(reverse, true);
    return 'accepted' as const;
  }
  const id = `${actor.uid}_${person.id}`;
  const prior = existing.find((item) => item.id === id);
  if (prior && (prior.status === 'Pending' || prior.status === 'Accepted')) return 'exists' as const;
  if (prior && prior.status === 'Rejected') throw new Error('declined');
  await setDoc(doc(db, 'connectionRequests', id), {
    id,
    senderId: actor.uid,
    receiverId: person.id,
    participants: [actor.uid, person.id],
    senderName: actor.name.slice(0, 100),
    senderHeadline: actor.headline.slice(0, 200),
    senderAvatar: smallAvatar(actor.avatar),
    receiverName: person.fullName.slice(0, 100),
    receiverHeadline: (person.headline || '').slice(0, 200),
    receiverAvatar: smallAvatar(person.avatarUrl),
    requestType: type,
    note: note.trim().slice(0, 500),
    status: 'Pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const mentorship = type === 'Mentor';
  await notify(person.id, {
    type: mentorship ? 'mentorship' : 'connection',
    title: mentorship ? `${actor.name} asked you for mentorship` : `${actor.name} wants to connect`,
    titleEl: mentorship ? `Αίτημα καθοδήγησης από ${actor.name}` : `Αίτημα σύνδεσης από ${actor.name}`,
    body: note.trim().slice(0, 280),
    href: '/network?tab=requests',
  });
  return 'sent' as const;
}

export async function respondToConnection(record: ConnectionRecord, accept: boolean) {
  const actor = requireMe();
  await updateDoc(doc(db, 'connectionRequests', record.id), {
    status: accept ? 'Accepted' : 'Rejected',
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (!accept) return;
  const other = otherSide(record, actor.uid);
  await updateDoc(doc(db, 'profiles', actor.uid), { connectionIds: arrayUnion(other.id) }).catch(() => undefined);
  await notify(other.id, {
    type: 'accepted',
    title: `${actor.name} accepted your request`,
    titleEl: `Το αίτημά σου έγινε δεκτό από ${actor.name}`,
    body: 'You can message each other now.',
    bodyEl: 'Μπορείς πλέον να στείλεις μήνυμα.',
    href: `/messages?user=${encodeURIComponent(actor.uid)}`,
  });
}

export async function withdrawConnection(record: ConnectionRecord) {
  await updateDoc(doc(db, 'connectionRequests', record.id), { status: 'Withdrawn', updatedAt: serverTimestamp() });
}

export async function removeConnection(record: ConnectionRecord) {
  const actor = requireMe();
  const other = otherSide(record, actor.uid);
  await deleteDoc(doc(db, 'connectionRequests', record.id));
  await updateDoc(doc(db, 'profiles', actor.uid), { connectionIds: arrayRemove(other.id) }).catch(() => undefined);
}

// ── Blocks ────────────────────────────────────────────────────────────────

export type BlockRecord = { id: string; name: string; at: number };

const blockStore = createStore<BlockRecord[]>([]);
let blocksUnsub: (() => void) | null = null;
let blocksUid: string | null = null;

export function startBlocks(uid: string) {
  if (blocksUid === uid) return;
  stopBlocks();
  blocksUid = uid;
  blocksUnsub = onSnapshot(
    collection(db, 'users', uid, 'blocks'),
    (snap) => {
      const items = snap.docs.map((entry) => {
        const data = entry.data() as Record<string, unknown>;
        return { id: entry.id, name: String(data.name || ''), at: toMillis(data.at) ?? Date.now() };
      });
      blockStore.set(items);
      writeValue('cfb.blockedPeople', items.map((item) => item.id));
    },
    (error) => log.warn('blocks listener failed', { error: String(error) }),
  );
}

export function stopBlocks() {
  blocksUnsub?.();
  blocksUnsub = null;
  blocksUid = null;
  blockStore.set([]);
}

export function useBlocks() {
  return useStore(blockStore);
}

export function conversationIdWith(a: string, b: string): string {
  const [first, second] = [a, b].sort();
  return `dm_${first}_${second}`;
}

export async function blockPerson(person: { id: string; fullName: string }) {
  const actor = requireMe();
  await setDoc(doc(db, 'users', actor.uid, 'blocks', person.id), { name: person.fullName.slice(0, 100), at: serverTimestamp() });
  await updateDoc(doc(db, 'conversations', conversationIdWith(actor.uid, person.id)), { blockedBy: arrayUnion(actor.uid) }).catch(() => undefined);
}

export async function unblockPerson(personId: string) {
  const actor = requireMe();
  await deleteDoc(doc(db, 'users', actor.uid, 'blocks', personId));
  await updateDoc(doc(db, 'conversations', conversationIdWith(actor.uid, personId)), { blockedBy: arrayRemove(actor.uid) }).catch(() => undefined);
}

// ── Reports (moderation) ──────────────────────────────────────────────────

export type ReportTarget = 'user' | 'message' | 'community' | 'post' | 'comment' | 'event' | 'job' | 'service';

export async function reportContent(input: {
  targetType: ReportTarget;
  targetId: string;
  targetName: string;
  targetOwnerId?: string;
  reason: string;
  details?: string;
  excerpt?: string;
  href?: string;
}) {
  const actor = requireMe();
  await addDoc(collection(db, 'reports'), {
    reporterId: actor.uid,
    reporterName: actor.name.slice(0, 100),
    targetType: input.targetType,
    targetId: input.targetId.slice(0, 200),
    targetName: input.targetName.slice(0, 200),
    targetOwnerId: (input.targetOwnerId || '').slice(0, 200),
    reason: input.reason.slice(0, 60),
    details: (input.details || '').slice(0, 1000),
    excerpt: (input.excerpt || '').slice(0, 500),
    href: (input.href || '').slice(0, 300),
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

// ── Skill endorsements ────────────────────────────────────────────────────

export type EndorsementRecord = {
  id: string;
  endorserId: string;
  endorserName: string;
  endorserAvatar: string;
  recipientId: string;
  recipientName: string;
  skillId: string;
  comment: string;
  createdAt: number;
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9α-ωάέήίόύώ]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'skill';
}

function parseEndorsement(id: string, data: Record<string, unknown>): EndorsementRecord {
  return {
    id,
    endorserId: String(data.endorserId || data.authorId || ''),
    endorserName: String(data.endorserName || ''),
    endorserAvatar: String(data.endorserAvatar || ''),
    recipientId: String(data.recipientId || data.endorseeId || ''),
    recipientName: String(data.recipientName || ''),
    skillId: String(data.skillId || ''),
    comment: String(data.comment || ''),
    createdAt: toMillis(data.createdAt) ?? 0,
  };
}

export async function endorsementsFor(recipientId: string): Promise<EndorsementRecord[]> {
  try {
    const snap = await getDocs(query(collection(db, 'endorsements'), where('recipientId', '==', recipientId), limit(200)));
    return snap.docs.map((entry) => parseEndorsement(entry.id, entry.data() as Record<string, unknown>)).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    log.warn('could not load endorsements', { error: String(error) });
    return [];
  }
}

export async function endorsementsBy(endorserId: string): Promise<EndorsementRecord[]> {
  try {
    const snap = await getDocs(query(collection(db, 'endorsements'), where('endorserId', '==', endorserId), limit(200)));
    return snap.docs.map((entry) => parseEndorsement(entry.id, entry.data() as Record<string, unknown>)).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function endorseSkill(recipient: { id: string; fullName: string }, skill: string, comment: string): Promise<EndorsementRecord> {
  const actor = requireMe();
  if (recipient.id === actor.uid) throw new Error('self');
  const id = `${recipient.id}_${actor.uid}_${slug(skill)}`;
  const record = {
    id,
    authorId: actor.uid,
    endorserId: actor.uid,
    endorserName: actor.name.slice(0, 100),
    endorserAvatar: smallAvatar(actor.avatar),
    recipientId: recipient.id,
    recipientName: recipient.fullName.slice(0, 100),
    skillId: skill.slice(0, 60),
    comment: comment.trim().slice(0, 500),
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'endorsements', id), record);
  await notify(recipient.id, {
    type: 'endorsement',
    title: `${actor.name} confirmed your skill: ${skill}`,
    titleEl: `Επιβεβαίωση δεξιότητας από ${actor.name}: ${skill}`,
    body: comment.trim().slice(0, 280),
    href: '/profile',
  });
  return parseEndorsement(id, { ...record, createdAt: Date.now() });
}

export async function withdrawEndorsement(id: string) {
  await deleteDoc(doc(db, 'endorsements', id));
}

// ── Profile views ─────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Counts one view per viewer per day. The owner can read who looked; nobody else can. */
export async function recordProfileView(ownerId: string) {
  const actor = me;
  if (!actor || !ownerId || ownerId === actor.uid) return;
  const day = today();
  const memo = `cfb.viewed.${ownerId}.${day}`;
  try {
    if (sessionStorage.getItem(memo)) return;
    sessionStorage.setItem(memo, '1');
  } catch {
    /* still record */
  }
  await setDoc(
    doc(db, 'profiles', ownerId, 'views', `${actor.uid}_${day}`),
    { viewerId: actor.uid, viewerName: actor.name.slice(0, 100), viewerHeadline: actor.headline.slice(0, 200), viewerAvatar: smallAvatar(actor.avatar), day, at: serverTimestamp() },
    { merge: true },
  ).catch((error) => log.warn('view not recorded', { error: String(error) }));
}

export type ProfileView = { viewerId: string; viewerName: string; viewerHeadline: string; viewerAvatar: string; day: string; at: number };

export async function profileViews(ownerId: string, days = 90): Promise<ProfileView[]> {
  try {
    const since = Timestamp.fromMillis(Date.now() - days * 86_400_000);
    const snap = await getDocs(query(collection(db, 'profiles', ownerId, 'views'), where('at', '>=', since), limit(1000)));
    return snap.docs.map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      return {
        viewerId: String(data.viewerId || ''),
        viewerName: String(data.viewerName || ''),
        viewerHeadline: String(data.viewerHeadline || ''),
        viewerAvatar: String(data.viewerAvatar || ''),
        day: String(data.day || ''),
        at: toMillis(data.at) ?? 0,
      };
    });
  } catch (error) {
    log.warn('could not load views', { error: String(error) });
    return [];
  }
}

// ── Presence ──────────────────────────────────────────────────────────────

let presenceTimer: ReturnType<typeof setInterval> | null = null;
let presenceUid: string | null = null;
let presenceVisibility: (() => void) | null = null;

export function startPresence(uid: string, share: boolean) {
  stopPresence();
  if (!share) return;
  presenceUid = uid;
  const beat = () => {
    if (!presenceUid || document.hidden) return;
    void updateDoc(doc(db, 'profiles', presenceUid), { lastActiveAt: serverTimestamp() }).catch(() => undefined);
  };
  beat();
  presenceTimer = setInterval(beat, 2 * 60_000);
  presenceVisibility = () => {
    if (!document.hidden) beat();
  };
  document.addEventListener('visibilitychange', presenceVisibility);
}

export function stopPresence() {
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
  if (presenceVisibility) document.removeEventListener('visibilitychange', presenceVisibility);
  presenceVisibility = null;
  presenceUid = null;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

export function startSocial(uid: string, langOf: () => 'en' | 'el') {
  startConnections(uid);
  startNotifications(uid, langOf);
  startBlocks(uid);
}

export function stopSocial() {
  stopConnections();
  stopNotifications();
  stopBlocks();
  stopPresence();
}
