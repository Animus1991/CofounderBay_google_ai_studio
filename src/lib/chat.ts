/**
 * One-to-one conversations between members, in Firestore.
 *
 *   conversations/{dm_<uidA>_<uidB>}            participants, last message, per-member state
 *   conversations/{id}/messages/{messageId}     the messages
 *
 * Per-member state lives in maps on the conversation (`unread.<uid>`,
 * `lastReadAt.<uid>`, `typingAt.<uid>`) and arrays (`pinnedBy`, `archivedBy`,
 * `mutedBy`, `blockedBy`), so one listener gives the whole inbox.
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from './logger';
import { toMillis } from './peopleSource';
import { conversationIdWith, notify, socialIdentity } from './social';

const log = createLogger('chat');

export type ChatAttachment = { name: string; type: string; size: number; url: string };

export type ChatReply = { messageId: string; senderName: string; body: string };

export type ChatMessageKind = 'text' | 'call' | 'system';

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: number;
  pending?: boolean;
  failed?: boolean;
  attachments?: ChatAttachment[];
  replyTo?: ChatReply;
  reactions?: Record<string, string[]>;
  edited?: boolean;
  deleted?: boolean;
  isAI?: boolean;
  kind?: ChatMessageKind;
  callUrl?: string;
};

export type ValidationMode = 'casual' | 'one_party' | 'two_party';

export type ConversationValidation = {
  mode: ValidationMode;
  requestedBy?: string;
  acceptedBy?: string;
  hash?: string;
  at?: number;
};

export type RemoteConversation = {
  id: string;
  participants: string[];
  info: Record<string, { name: string; avatar: string; headline: string; role: string }>;
  lastMessage: { body: string; senderId: string; at: number } | null;
  unread: Record<string, number>;
  lastReadAt: Record<string, number>;
  typingAt: Record<string, number>;
  deletedAt: Record<string, number>;
  notifiedAt: Record<string, number>;
  pinnedBy: string[];
  archivedBy: string[];
  mutedBy: string[];
  blockedBy: string[];
  validation: ConversationValidation;
  createdAt: number;
  updatedAt: number;
};

/** Reactions are stored under plain keys; the UI maps them to emoji. */
export const REACTIONS: { key: string; emoji: string }[] = [
  { key: 'like', emoji: '👍' },
  { key: 'love', emoji: '❤️' },
  { key: 'laugh', emoji: '😂' },
  { key: 'wow', emoji: '😮' },
  { key: 'party', emoji: '🎉' },
  { key: 'fire', emoji: '🔥' },
  { key: 'clap', emoji: '👏' },
  { key: 'think', emoji: '🤔' },
  { key: 'eyes', emoji: '👀' },
  { key: 'rocket', emoji: '🚀' },
];

function numberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const ms = typeof raw === 'number' ? raw : toMillis(raw);
    if (ms != null) out[key] = ms;
  }
  return out;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function parseConversation(id: string, data: Record<string, unknown>): RemoteConversation {
  const info = (data.participantInfo && typeof data.participantInfo === 'object' ? data.participantInfo : {}) as Record<string, Record<string, unknown>>;
  const last = data.lastMessage as Record<string, unknown> | undefined;
  const validation = (data.validation && typeof data.validation === 'object' ? data.validation : {}) as Record<string, unknown>;
  return {
    id,
    participants: stringArray(data.participants),
    info: Object.fromEntries(
      Object.entries(info).map(([uid, value]) => [
        uid,
        { name: String(value?.name || ''), avatar: String(value?.avatar || ''), headline: String(value?.headline || ''), role: String(value?.role || '') },
      ]),
    ),
    lastMessage: last ? { body: String(last.body || ''), senderId: String(last.senderId || ''), at: toMillis(last.at) ?? 0 } : null,
    unread: numberMap(data.unread),
    lastReadAt: numberMap(data.lastReadAt),
    typingAt: numberMap(data.typingAt),
    deletedAt: numberMap(data.deletedAt),
    notifiedAt: numberMap(data.notifiedAt),
    pinnedBy: stringArray(data.pinnedBy),
    archivedBy: stringArray(data.archivedBy),
    mutedBy: stringArray(data.mutedBy),
    blockedBy: stringArray(data.blockedBy),
    validation: {
      mode: (['casual', 'one_party', 'two_party'].includes(String(validation.mode)) ? String(validation.mode) : 'casual') as ValidationMode,
      requestedBy: validation.requestedBy ? String(validation.requestedBy) : undefined,
      acceptedBy: validation.acceptedBy ? String(validation.acceptedBy) : undefined,
      hash: validation.hash ? String(validation.hash) : undefined,
      at: toMillis(validation.at) ?? undefined,
    },
    createdAt: toMillis(data.createdAt) ?? 0,
    updatedAt: toMillis(data.updatedAt) ?? 0,
  };
}

export function parseMessage(conversationId: string, id: string, data: Record<string, unknown>, pending = false): ChatMessage {
  const reactions = (data.reactions && typeof data.reactions === 'object' ? data.reactions : {}) as Record<string, unknown>;
  const reply = data.replyTo as Record<string, unknown> | undefined;
  return {
    id,
    conversationId,
    senderId: String(data.senderId || ''),
    senderName: String(data.senderName || ''),
    body: String(data.body || ''),
    createdAt: toMillis(data.createdAt) ?? Date.now(),
    pending,
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as Record<string, unknown>[]).map((item) => ({
          name: String(item.name || 'file'),
          type: String(item.type || ''),
          size: Number(item.size || 0),
          url: String(item.url || ''),
        }))
      : undefined,
    replyTo: reply ? { messageId: String(reply.messageId || ''), senderName: String(reply.senderName || ''), body: String(reply.body || '') } : undefined,
    reactions: Object.fromEntries(Object.entries(reactions).map(([key, value]) => [key, stringArray(value)])),
    edited: data.edited === true,
    deleted: data.deleted === true,
    kind: (String(data.kind || 'text') as ChatMessageKind),
    callUrl: data.callUrl ? String(data.callUrl) : undefined,
  };
}

export function listenConversations(uid: string, onChange: (list: RemoteConversation[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'conversations'), where('participants', 'array-contains', uid)),
    (snap) => onChange(snap.docs.map((entry) => parseConversation(entry.id, entry.data() as Record<string, unknown>))),
    onError,
  );
}

export function listenMessages(conversationId: string, count: number, onChange: (list: ChatMessage[], full: boolean) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'desc'), limit(count)),
    { includeMetadataChanges: true },
    (snap) => {
      const list = snap.docs
        .map((entry) => parseMessage(conversationId, entry.id, entry.data({ serverTimestamps: 'estimate' }) as Record<string, unknown>, entry.metadata.hasPendingWrites))
        .reverse();
      onChange(list, snap.docs.length >= count);
    },
    onError,
  );
}

export type ParticipantCard = { id: string; name: string; avatar: string; headline: string; role: string };

function card(person: ParticipantCard) {
  return {
    name: person.name.slice(0, 100),
    avatar: person.avatar && person.avatar.length < 120_000 ? person.avatar : '',
    headline: person.headline.slice(0, 200),
    role: person.role.slice(0, 40),
  };
}

/** Creates the conversation document (or refreshes the names on it). Never touches messages or counters. */
export async function ensureConversation(me: ParticipantCard, other: ParticipantCard): Promise<string> {
  const id = conversationIdWith(me.id, other.id);
  const participants = [me.id, other.id].sort();
  await setDoc(
    doc(db, 'conversations', id),
    {
      id,
      participants,
      participantInfo: { [me.id]: card(me), [other.id]: card(other) },
      status: 'Active',
    },
    { merge: true },
  );
  return id;
}

export async function sendRemoteMessage(input: {
  conversationId: string;
  me: ParticipantCard;
  other: ParticipantCard;
  body: string;
  attachments?: ChatAttachment[];
  replyTo?: ChatReply;
  kind?: ChatMessageKind;
  callUrl?: string;
  conversationExists: boolean;
  lastNotifiedAt?: number;
}) {
  const { conversationId, me, other } = input;
  if (!input.conversationExists) await ensureConversation(me, other);
  const ref = doc(collection(db, 'conversations', conversationId, 'messages'));
  const body = input.body.trim().slice(0, 5000) || (input.attachments?.[0]?.name ?? '…');
  const payload: Record<string, unknown> = {
    id: ref.id,
    conversationId,
    senderId: me.id,
    senderName: me.name.slice(0, 100),
    body,
    createdAt: serverTimestamp(),
    readStatus: false,
    kind: input.kind || 'text',
  };
  if (input.attachments?.length) payload.attachments = input.attachments.slice(0, 5);
  if (input.replyTo) payload.replyTo = { messageId: input.replyTo.messageId, senderName: input.replyTo.senderName.slice(0, 100), body: input.replyTo.body.slice(0, 200) };
  if (input.callUrl) payload.callUrl = input.callUrl;
  await setDoc(ref, payload);
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: { body: body.slice(0, 200), senderId: me.id, at: serverTimestamp() },
    updatedAt: serverTimestamp(),
    [`unread.${other.id}`]: increment(1),
    [`lastReadAt.${me.id}`]: serverTimestamp(),
    [`unread.${me.id}`]: 0,
    archivedBy: arrayRemove(other.id),
  }).catch((error) => log.warn('conversation update failed', { error: String(error) }));

  // One notification per quiet stretch, so a burst of messages is one alert.
  const quietFor = Date.now() - (input.lastNotifiedAt || 0);
  if (quietFor > 10 * 60_000 && socialIdentity()) {
    void notify(other.id, {
      type: 'message',
      title: `New message from ${me.name}`,
      titleEl: `Νέο μήνυμα από ${me.name}`,
      body: body.slice(0, 140),
      href: `/messages?user=${encodeURIComponent(me.id)}`,
    });
    void updateDoc(doc(db, 'conversations', conversationId), { [`notifiedAt.${other.id}`]: serverTimestamp() }).catch(() => undefined);
  }
  return ref.id;
}

export async function markConversationRead(conversationId: string, uid: string) {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`unread.${uid}`]: 0,
    [`lastReadAt.${uid}`]: serverTimestamp(),
  }).catch(() => undefined);
}

const typingSent = new Map<string, number>();

export async function signalTyping(conversationId: string, uid: string) {
  const last = typingSent.get(conversationId) || 0;
  if (Date.now() - last < 4000) return;
  typingSent.set(conversationId, Date.now());
  await updateDoc(doc(db, 'conversations', conversationId), { [`typingAt.${uid}`]: serverTimestamp() }).catch(() => undefined);
}

export async function setConversationFlag(conversationId: string, uid: string, field: 'pinnedBy' | 'archivedBy' | 'mutedBy', on: boolean) {
  await updateDoc(doc(db, 'conversations', conversationId), { [field]: on ? arrayUnion(uid) : arrayRemove(uid) });
}

export async function deleteConversationForMe(conversationId: string, uid: string) {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`deletedAt.${uid}`]: serverTimestamp(),
    [`unread.${uid}`]: 0,
    pinnedBy: arrayRemove(uid),
  });
}

export async function reactToMessage(conversationId: string, messageId: string, uid: string, reaction: string, on: boolean) {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    [`reactions.${reaction}`]: on ? arrayUnion(uid) : arrayRemove(uid),
  });
}

export async function editRemoteMessage(conversationId: string, messageId: string, body: string) {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    body: body.trim().slice(0, 5000) || '…',
    edited: true,
    editedAt: serverTimestamp(),
  });
}

export async function deleteRemoteMessage(conversationId: string, messageId: string) {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    body: '—',
    deleted: true,
    attachments: [],
    editedAt: serverTimestamp(),
  });
}

export async function setConversationValidation(conversationId: string, validation: ConversationValidation) {
  const payload: Record<string, unknown> = { mode: validation.mode, at: serverTimestamp() };
  if (validation.requestedBy) payload.requestedBy = validation.requestedBy;
  if (validation.acceptedBy) payload.acceptedBy = validation.acceptedBy;
  if (validation.hash) payload.hash = validation.hash;
  await updateDoc(doc(db, 'conversations', conversationId), { validation: payload });
}

/** A private video room link (Jitsi Meet, free, no account needed). */
export function newCallLink(kind: 'video' | 'audio'): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const room = `CoFounderBay-${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14)}`;
  return kind === 'audio' ? `https://meet.jit.si/${room}#config.startWithVideoMuted=true` : `https://meet.jit.si/${room}`;
}

/** SHA-256 of a transcript, hex encoded. */
export async function transcriptHash(lines: string[]): Promise<string> {
  const data = new TextEncoder().encode(lines.join('\n'));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
