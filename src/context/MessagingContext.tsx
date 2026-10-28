/**
 * One inbox for the whole app.
 *
 *  - Real accounts: conversations with members live in Firestore (lib/chat.ts).
 *  - Everyone: conversations with the AI specialists are kept on the account
 *    (`cfb.aiChats`, synced to the cloud for real accounts).
 *  - The sample account keeps its in-memory sample threads.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AIService, MOCK_AGENTS } from '../services/aiService';
import { assistantContextBlock, runAssistant, type AssistantProfile } from '../services/assistantOps';
import { avatarFor, findCast } from '../data/cast';
import { keys, readValue, writeValue } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { avatarOf, findPerson, onPeopleChange, type Person } from '../lib/peopleSource';
import { fetchPerson } from '../lib/directory';
import { connectionStateWith, conversationIdWith } from '../lib/social';
import {
  deleteConversationForMe,
  deleteRemoteMessage,
  editRemoteMessage,
  listenConversations,
  listenMessages,
  markConversationRead,
  reactToMessage,
  sendRemoteMessage,
  setConversationFlag,
  setConversationValidation,
  signalTyping,
  type ChatAttachment,
  type ChatMessage,
  type ChatMessageKind,
  type ChatReply,
  type ConversationValidation,
  type RemoteConversation,
} from '../lib/chat';
import { createLogger } from '../lib/logger';
import { getLang } from '../lib/language';

export type { ChatAttachment, ChatMessage, ChatReply, ConversationValidation } from '../lib/chat';

const log = createLogger('messaging');

export type ChatParticipant = {
  id: string;
  fullName: string;
  avatar: string;
  headline: string;
  role: string;
  isAI: boolean;
  lastActiveAt: number | null;
  sample: boolean;
};

export type ChatConversation = {
  id: string;
  kind: 'dm' | 'ai' | 'demo';
  otherId: string;
  other: ChatParticipant;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderId: string;
  unread: number;
  pinned: boolean;
  archived: boolean;
  muted: boolean;
  blockedByMe: boolean;
  blockedByOther: boolean;
  otherTypingAt: number;
  otherLastReadAt: number;
  validation: ConversationValidation;
  /** False for a conversation you opened but have not written in yet. */
  exists: boolean;
  lastNotifiedAt: number;
  createdAt: number;
};

export type CanMessage = { ok: true } | { ok: false; reason: 'self' | 'blocked' | 'blockedByMe' | 'closed' | 'connections-only' };

export type SendOptions = { attachments?: ChatAttachment[]; replyTo?: ChatReply; kind?: ChatMessageKind; callUrl?: string };

type MessagingValue = {
  ready: boolean;
  userId: string;
  conversations: ChatConversation[];
  totalUnread: number;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  active: ChatConversation | null;
  messages: ChatMessage[];
  hasOlder: boolean;
  loadOlder: () => void;
  aiTyping: boolean;
  openConversationWith: (personId: string) => Promise<string | null>;
  send: (text: string, options?: SendOptions) => Promise<void>;
  sendTo: (conversationId: string, text: string, options?: SendOptions) => Promise<void>;
  react: (messageId: string, reaction: string) => void;
  editMessage: (messageId: string, body: string) => void;
  removeMessage: (messageId: string) => void;
  markRead: (conversationId: string) => void;
  typing: () => void;
  setFlag: (conversationId: string, flag: 'pinned' | 'archived' | 'muted', on: boolean) => void;
  deleteForMe: (conversationId: string) => void;
  setValidation: (conversationId: string, validation: ConversationValidation) => void;
  canMessage: (conversation: ChatConversation | null) => CanMessage;
};

const MessagingContext = createContext<MessagingValue | null>(null);

// ── AI specialists (stored on the account) ────────────────────────────────

type AiConversation = { id: string; agentId: string; createdAt: number; pinned?: boolean; archived?: boolean; muted?: boolean; lastReadAt?: number };
type AiStore = { conversations: AiConversation[]; messages: ChatMessage[] };

const emptyAi = (): AiStore => ({ conversations: [], messages: [] });

function readAi(): AiStore {
  const stored = readValue<AiStore>(keys.aiChats, emptyAi());
  return {
    conversations: Array.isArray(stored.conversations) ? stored.conversations : [],
    messages: Array.isArray(stored.messages) ? stored.messages.slice(-400) : [],
  };
}

function agentParticipant(agentId: string): ChatParticipant {
  const agent = MOCK_AGENTS.find((item) => item.id === agentId);
  return {
    id: agentId,
    fullName: agent?.name || 'AI',
    avatar: '',
    headline: agent?.description || '',
    role: 'AI Assistant',
    isAI: true,
    lastActiveAt: null,
    sample: false,
  };
}

// ── Sample threads for the demo ───────────────────────────────────────────

const HOUR = 3_600_000;

function sampleParticipant(id: string): ChatParticipant {
  const person = findCast(id);
  return {
    id,
    fullName: person?.fullName || id,
    avatar: person ? avatarFor(person.id, 100) : '',
    headline: person?.headline || '',
    role: person?.role || '',
    isAI: false,
    lastActiveAt: null,
    sample: true,
  };
}

function sampleThreads(userId: string): { conversations: ChatConversation[]; messages: ChatMessage[] } {
  const now = Date.now();
  const threads: { id: string; with: string; unread: number; lines: [string, string, number][] }[] = [
    { id: 'demo-alex', with: 'alex-rivera', unread: 2, lines: [
      ['alex-rivera', 'Hey, are we still on for the pitch practice tomorrow?', 0.05],
      ['me', 'Yes! I have been working on the financial model section. Can you review it before we present?', 0.04],
      ['alex-rivera', 'Sure. Send it over and I will look tonight. I think we should add a competitive landscape slide.', 0.02],
    ] },
    { id: 'demo-sarah', with: 'sarah-chen', unread: 0, lines: [
      ['sarah-chen', 'The mockups look great! Just a few tweaks needed on the onboarding flow.', 1],
    ] },
    { id: 'demo-jordan', with: 'jordan-taylor', unread: 1, lines: [
      ['jordan-taylor', 'I loved your product demo at the last community event.', 3.2],
      ['me', 'Thanks Jordan! We have been iterating on onboarding. Would love your growth perspective.', 2.6],
      ['jordan-taylor', 'Let me share the growth playbook I mentioned.', 2],
    ] },
    { id: 'demo-elena', with: 'elena-rossi', unread: 0, lines: [
      ['elena-rossi', 'Great progress! Let us schedule our next mentoring session.', 5],
    ] },
    { id: 'demo-daniel', with: 'daniel-weiss', unread: 0, lines: [
      ['me', 'Thanks for connecting! Here is our latest deck as discussed.', 48],
      ['daniel-weiss', 'Interesting deck. Can we set up a 30-minute call next week to go through unit economics?', 24],
    ] },
  ];
  const conversations: ChatConversation[] = [];
  const messages: ChatMessage[] = [];
  for (const thread of threads) {
    const other = sampleParticipant(thread.with);
    thread.lines.forEach(([from, body, hoursAgo], index) => {
      messages.push({
        id: `${thread.id}-${index}`,
        conversationId: thread.id,
        senderId: from === 'me' ? userId : thread.with,
        senderName: from === 'me' ? 'You' : other.fullName,
        body,
        createdAt: now - hoursAgo * HOUR,
      });
    });
    const last = thread.lines[thread.lines.length - 1]!;
    conversations.push({
      id: thread.id,
      kind: 'demo',
      otherId: thread.with,
      other,
      lastMessage: last[1],
      lastMessageAt: now - last[2] * HOUR,
      lastSenderId: last[0] === 'me' ? userId : thread.with,
      unread: thread.unread,
      pinned: thread.id === 'demo-alex',
      archived: false,
      muted: false,
      blockedByMe: false,
      blockedByOther: false,
      otherTypingAt: 0,
      otherLastReadAt: now,
      validation: { mode: 'casual' },
      exists: true,
      lastNotifiedAt: 0,
      createdAt: now - 72 * HOUR,
    });
  }
  return { conversations, messages };
}

// ── Provider ──────────────────────────────────────────────────────────────

type Me = {
  id: string;
  fullName: string;
  avatar: string;
  headline: string;
  role: string;
  /** Same viewer the studio assistant scores, so a specialist can answer without Gemini. */
  assistant?: AssistantProfile | null;
};

/** On-device answer when Gemini is not configured. Same operator as the studio panel. */
export function localSpecialistReply(text: string, profile: AssistantProfile | null, lang: 'en' | 'el' = getLang()): string {
  const result = runAssistant(text, profile);
  const primary = (lang === 'el' ? result.el : result.en).trim();
  const secondary = (lang === 'el' ? result.en : result.el).trim();
  return primary || secondary;
}

const PAGE = 40;

export function MessagingProvider({ children, userId, isDemo = false, me }: { children: React.ReactNode; userId: string; isDemo?: boolean; me?: Me }) {
  const real = Boolean(userId) && !isDemo && userId !== 'demo-user';
  const self: Me = me ?? { id: userId, fullName: 'You', avatar: '', headline: '', role: '' };

  const [remote, setRemote] = useState<RemoteConversation[]>([]);
  const [remoteReady, setRemoteReady] = useState(!real);
  const [drafts, setDrafts] = useState<Record<string, ChatParticipant>>({});
  const [demo, setDemo] = useState(() => (isDemo ? sampleThreads(userId || 'demo-user') : { conversations: [], messages: [] }));
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [remoteMessages, setRemoteMessages] = useState<ChatMessage[]>([]);
  const [count, setCount] = useState(PAGE);
  const [hasOlder, setHasOlder] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [localValidation, setLocalValidation] = useState<Record<string, ConversationValidation>>({});
  const [, setPeopleTick] = useState(0);
  const ai = useStored(readAi, [keys.aiChats]);
  const selfRef = useRef(self);
  selfRef.current = self;

  useEffect(() => onPeopleChange(() => setPeopleTick((value) => value + 1)), []);

  useEffect(() => {
    setDemo(isDemo ? sampleThreads(userId || 'demo-user') : { conversations: [], messages: [] });
    setActiveIdState(null);
    setDrafts({});
  }, [isDemo, userId]);

  // Inbox listener (real accounts).
  useEffect(() => {
    if (!real) {
      setRemote([]);
      setRemoteReady(true);
      return undefined;
    }
    setRemoteReady(false);
    return listenConversations(
      userId,
      (list) => {
        setRemote(list);
        setRemoteReady(true);
      },
      (error) => {
        log.warn('inbox listener failed', { error: String(error) });
        setRemoteReady(true);
      },
    );
  }, [real, userId]);

  // Messages of the open conversation (real accounts).
  useEffect(() => {
    if (!real || !activeId || !activeId.startsWith('dm_')) {
      setRemoteMessages([]);
      setHasOlder(false);
      return undefined;
    }
    const known = remote.some((item) => item.id === activeId);
    if (!known) {
      setRemoteMessages([]);
      setHasOlder(false);
      return undefined;
    }
    return listenMessages(
      activeId,
      count,
      (list, full) => {
        setRemoteMessages(list);
        setHasOlder(full);
      },
      (error) => log.warn('messages listener failed', { error: String(error) }),
    );
    // `remote.length` re-subscribes once a brand-new conversation document appears.
  }, [real, activeId, count, remote.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const participantFor = useCallback((id: string, info?: RemoteConversation['info'][string]): ChatParticipant => {
    const person: Person | undefined = findPerson(id);
    return {
      id,
      fullName: person?.fullName || info?.name || 'Member',
      avatar: (person ? avatarOf(person) : '') || info?.avatar || '',
      headline: person?.headline || info?.headline || '',
      role: person?.role || info?.role || '',
      isAI: false,
      lastActiveAt: person?.lastActiveAt ?? null,
      sample: Boolean(person?.sample),
    };
  }, []);

  const conversations = useMemo<ChatConversation[]>(() => {
    const list: ChatConversation[] = [];
    if (real) {
      for (const item of remote) {
        const otherId = item.participants.find((id) => id !== userId) || '';
        if (!otherId) continue;
        const deletedAt = item.deletedAt[userId] || 0;
        const lastAt = item.lastMessage?.at || item.updatedAt || item.createdAt;
        if (deletedAt && lastAt <= deletedAt && !drafts[otherId] && activeId !== item.id) continue;
        list.push({
          id: item.id,
          kind: 'dm',
          otherId,
          other: participantFor(otherId, item.info[otherId]),
          lastMessage: deletedAt && lastAt <= deletedAt ? '' : item.lastMessage?.body || '',
          lastMessageAt: lastAt,
          lastSenderId: item.lastMessage?.senderId || '',
          unread: item.unread[userId] || 0,
          pinned: item.pinnedBy.includes(userId),
          archived: item.archivedBy.includes(userId),
          muted: item.mutedBy.includes(userId),
          blockedByMe: item.blockedBy.includes(userId),
          blockedByOther: item.blockedBy.includes(otherId),
          otherTypingAt: item.typingAt[otherId] || 0,
          otherLastReadAt: item.lastReadAt[otherId] || 0,
          validation: item.validation,
          exists: true,
          lastNotifiedAt: item.notifiedAt[otherId] || 0,
          createdAt: item.createdAt,
        });
      }
      for (const [otherId, participant] of Object.entries(drafts)) {
        const id = conversationIdWith(userId, otherId);
        if (list.some((item) => item.id === id)) continue;
        list.push({
          id,
          kind: 'dm',
          otherId,
          other: participant,
          lastMessage: '',
          lastMessageAt: Date.now(),
          lastSenderId: '',
          unread: 0,
          pinned: false,
          archived: false,
          muted: false,
          blockedByMe: false,
          blockedByOther: false,
          otherTypingAt: 0,
          otherLastReadAt: 0,
          validation: { mode: 'casual' },
          exists: false,
          lastNotifiedAt: 0,
          createdAt: Date.now(),
        });
      }
    } else {
      list.push(...demo.conversations.map((item) => ({ ...item, validation: localValidation[item.id] ?? item.validation })));
    }
    for (const conversation of ai.conversations) {
      const messages = ai.messages.filter((message) => message.conversationId === conversation.id);
      const last = messages[messages.length - 1];
      const unread = messages.filter((message) => message.senderId === conversation.agentId && message.createdAt > (conversation.lastReadAt || 0)).length;
      list.push({
        id: conversation.id,
        kind: 'ai',
        otherId: conversation.agentId,
        other: agentParticipant(conversation.agentId),
        lastMessage: last?.body || '',
        lastMessageAt: last?.createdAt || conversation.createdAt,
        lastSenderId: last?.senderId || '',
        unread,
        pinned: Boolean(conversation.pinned),
        archived: Boolean(conversation.archived),
        muted: Boolean(conversation.muted),
        blockedByMe: false,
        blockedByOther: false,
        otherTypingAt: 0,
        otherLastReadAt: Date.now(),
        validation: localValidation[conversation.id] ?? { mode: 'casual' },
        exists: true,
        lastNotifiedAt: 0,
        createdAt: conversation.createdAt,
      });
    }
    return list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastMessageAt - a.lastMessageAt);
  }, [real, remote, drafts, demo, ai, userId, activeId, localValidation, participantFor]);

  const active = conversations.find((item) => item.id === activeId) ?? null;

  const messages = useMemo<ChatMessage[]>(() => {
    if (!activeId) return [];
    if (activeId.startsWith('ai_')) return ai.messages.filter((message) => message.conversationId === activeId);
    if (!real) return demo.messages.filter((message) => message.conversationId === activeId);
    const deletedAt = remote.find((item) => item.id === activeId)?.deletedAt[userId] || 0;
    return remoteMessages.filter((message) => message.createdAt > deletedAt);
  }, [activeId, ai.messages, real, demo.messages, remote, remoteMessages, userId]);

  const totalUnread = conversations.reduce((sum, item) => sum + (item.muted ? 0 : item.unread), 0);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    setCount(PAGE);
  }, []);

  const writeAi = (update: (store: AiStore) => AiStore) => {
    writeValue(keys.aiChats, update(readAi()));
  };

  const markRead = useCallback((conversationId: string) => {
    if (conversationId.startsWith('ai_')) {
      writeAi((store) => ({
        ...store,
        conversations: store.conversations.map((item) => (item.id === conversationId ? { ...item, lastReadAt: Date.now() } : item)),
      }));
      return;
    }
    if (!real) {
      setDemo((prev) => ({ ...prev, conversations: prev.conversations.map((item) => (item.id === conversationId ? { ...item, unread: 0 } : item)) }));
      return;
    }
    const item = remote.find((entry) => entry.id === conversationId);
    if (item && (item.unread[userId] || 0) > 0) void markConversationRead(conversationId, userId);
  }, [real, remote, userId]);

  const openConversationWith = useCallback(async (personId: string): Promise<string | null> => {
    if (!personId) return null;
    if (MOCK_AGENTS.some((agent) => agent.id === personId)) {
      const id = `ai_${personId}`;
      const store = readAi();
      if (!store.conversations.some((item) => item.id === id)) {
        writeValue(keys.aiChats, { ...store, conversations: [...store.conversations, { id, agentId: personId, createdAt: Date.now() }] });
      }
      setActiveId(id);
      return id;
    }
    if (!real) {
      const existing = demo.conversations.find((item) => item.otherId === personId);
      if (existing) {
        setActiveId(existing.id);
        return existing.id;
      }
      const person = findCast(personId);
      if (!person) return null;
      const id = `demo-${person.id}`;
      const other = sampleParticipant(person.id);
      setDemo((prev) => ({
        ...prev,
        conversations: [
          ...prev.conversations,
          {
            id, kind: 'demo', otherId: person.id, other, lastMessage: '', lastMessageAt: Date.now(), lastSenderId: '', unread: 0,
            pinned: false, archived: false, muted: false, blockedByMe: false, blockedByOther: false, otherTypingAt: 0,
            otherLastReadAt: Date.now(), validation: { mode: 'casual' }, exists: true, lastNotifiedAt: 0, createdAt: Date.now(),
          },
        ],
      }));
      setActiveId(id);
      return id;
    }
    if (personId === userId) return null;
    const id = conversationIdWith(userId, personId);
    if (!remote.some((item) => item.id === id)) {
      const person = await fetchPerson(personId);
      if (!person) return null;
      setDrafts((prev) => ({ ...prev, [personId]: participantFor(personId) }));
    } else {
      const item = remote.find((entry) => entry.id === id);
      if (item?.deletedAt[userId]) setDrafts((prev) => ({ ...prev, [personId]: participantFor(personId, item.info[personId]) }));
    }
    setActiveId(id);
    return id;
  }, [real, demo.conversations, remote, userId, participantFor, setActiveId]);

  const askAgent = useCallback(async (conversationId: string, agentId: string, text: string) => {
    const agent = MOCK_AGENTS.find((item) => item.id === agentId);
    setAiTyping(true);
    const assistantProfile = selfRef.current.assistant ?? null;
    const isDirectCommand = text.trim().startsWith('/') || /^(?:set|update|change|write|fill|open|show|ορισε|όρισε|αλλαξε|άλλαξε|γραψε|γράψε|συμπληρωσε|συμπλήρωσε|ανοιξε|άνοιξε)\b/i.test(text.trim());
    const studioOp = isDirectCommand ? runAssistant(text, assistantProfile, { propose: false }) : null;
    try {
      const history = readAi().messages
        .filter((message) => message.conversationId === conversationId)
        .slice(-8)
        .map((message) => `${message.isAI ? 'Assistant' : 'Founder'}: ${message.body}`)
        .join('\n');
      const liveContext = assistantContextBlock(assistantProfile);
      const opNote = studioOp ? `\nExecuted studio tool "${studioOp.tool}": ${getLang() === 'el' ? studioOp.el : studioOp.en}` : '';
      const response = await AIService.chat(
        text,
        `${agent?.role || 'Advisor'}. ${agent?.description || ''}\nLive Workspace State:\n${liveContext}${opNote}\nRecent conversation:\n${history}`,
      );
      const fallbackBody = studioOp ? (getLang() === 'el' ? studioOp.el : studioOp.en) : localSpecialistReply(text, assistantProfile);
      writeAi((store) => ({
        ...store,
        messages: [
          ...store.messages,
          { id: `ai-${Date.now()}`, conversationId, senderId: agentId, senderName: agent?.name || 'AI', body: response.text?.trim() || fallbackBody || '…', createdAt: Date.now(), isAI: true },
        ].slice(-400),
      }));
    } catch {
      // Gemini is optional. Answer from the same workspace data as the studio
      // panel instead of leaving a dead "try again" bubble in the thread.
      const body = studioOp
        ? (getLang() === 'el' ? studioOp.el : studioOp.en)
        : localSpecialistReply(text, assistantProfile);
      writeAi((store) => ({
        ...store,
        messages: [
          ...store.messages,
          { id: `ai-${Date.now()}`, conversationId, senderId: agentId, senderName: agent?.name || 'AI', body: body || '…', createdAt: Date.now(), isAI: true },
        ].slice(-400),
      }));
    } finally {
      setAiTyping(false);
    }
  }, []);

  const sendTo = useCallback(async (conversationId: string, text: string, options: SendOptions = {}) => {
    const body = text.trim();
    if (!body && !options.attachments?.length && !options.callUrl) return;
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    const me = selfRef.current;
    const local: ChatMessage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      senderId: userId,
      senderName: me.fullName,
      body: body || options.attachments?.[0]?.name || '',
      createdAt: Date.now(),
      attachments: options.attachments,
      replyTo: options.replyTo,
      kind: options.kind,
      callUrl: options.callUrl,
    };
    if (conversation.kind === 'ai') {
      writeAi((store) => ({ ...store, messages: [...store.messages, local].slice(-400) }));
      await askAgent(conversationId, conversation.otherId, body);
      return;
    }
    if (conversation.kind === 'demo') {
      setDemo((prev) => ({
        messages: [...prev.messages, local],
        conversations: prev.conversations.map((item) => (item.id === conversationId ? { ...item, lastMessage: local.body, lastMessageAt: local.createdAt, lastSenderId: userId } : item)),
      }));
      return;
    }
    if (conversation.blockedByMe || conversation.blockedByOther) throw new Error('blocked');
    await sendRemoteMessage({
      conversationId,
      me: { id: userId, name: me.fullName, avatar: me.avatar, headline: me.headline, role: me.role },
      other: { id: conversation.otherId, name: conversation.other.fullName, avatar: conversation.other.avatar, headline: conversation.other.headline, role: conversation.other.role },
      body,
      attachments: options.attachments,
      replyTo: options.replyTo,
      kind: options.kind,
      callUrl: options.callUrl,
      conversationExists: remote.some((item) => item.id === conversationId),
      lastNotifiedAt: conversation.lastNotifiedAt,
    });
    setDrafts((prev) => {
      if (!prev[conversation.otherId]) return prev;
      const next = { ...prev };
      delete next[conversation.otherId];
      return next;
    });
  }, [conversations, userId, remote, askAgent]);

  const send = useCallback(async (text: string, options?: SendOptions) => {
    if (!activeId) return;
    await sendTo(activeId, text, options);
  }, [activeId, sendTo]);

  const updateLocalMessage = (messageId: string, update: (message: ChatMessage) => ChatMessage) => {
    if (activeId?.startsWith('ai_')) {
      writeAi((store) => ({ ...store, messages: store.messages.map((message) => (message.id === messageId ? update(message) : message)) }));
      return;
    }
    setDemo((prev) => ({ ...prev, messages: prev.messages.map((message) => (message.id === messageId ? update(message) : message)) }));
  };

  const react = useCallback((messageId: string, reaction: string) => {
    const message = messages.find((item) => item.id === messageId);
    if (!message || !activeId) return;
    const current = message.reactions?.[reaction] ?? [];
    const on = !current.includes(userId);
    if (real && activeId.startsWith('dm_')) {
      void reactToMessage(activeId, messageId, userId, reaction, on).catch((error) => log.warn('reaction failed', { error: String(error) }));
      return;
    }
    updateLocalMessage(messageId, (item) => ({
      ...item,
      reactions: { ...(item.reactions ?? {}), [reaction]: on ? [...current, userId] : current.filter((id) => id !== userId) },
    }));
  }, [messages, activeId, userId, real]); // eslint-disable-line react-hooks/exhaustive-deps

  const editMessage = useCallback((messageId: string, body: string) => {
    if (!activeId || !body.trim()) return;
    if (real && activeId.startsWith('dm_')) {
      void editRemoteMessage(activeId, messageId, body);
      return;
    }
    updateLocalMessage(messageId, (item) => ({ ...item, body: body.trim(), edited: true }));
  }, [activeId, real]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeMessage = useCallback((messageId: string) => {
    if (!activeId) return;
    if (real && activeId.startsWith('dm_')) {
      void deleteRemoteMessage(activeId, messageId);
      return;
    }
    updateLocalMessage(messageId, (item) => ({ ...item, body: '—', deleted: true, attachments: [] }));
  }, [activeId, real]); // eslint-disable-line react-hooks/exhaustive-deps

  const typing = useCallback(() => {
    if (real && activeId?.startsWith('dm_') && remote.some((item) => item.id === activeId)) void signalTyping(activeId, userId);
  }, [real, activeId, remote, userId]);

  const setFlag = useCallback((conversationId: string, flag: 'pinned' | 'archived' | 'muted', on: boolean) => {
    if (conversationId.startsWith('ai_')) {
      writeAi((store) => ({ ...store, conversations: store.conversations.map((item) => (item.id === conversationId ? { ...item, [flag]: on } : item)) }));
      return;
    }
    if (!real) {
      setDemo((prev) => ({ ...prev, conversations: prev.conversations.map((item) => (item.id === conversationId ? { ...item, [flag]: on } : item)) }));
      return;
    }
    if (!remote.some((item) => item.id === conversationId)) return;
    const field = flag === 'pinned' ? 'pinnedBy' : flag === 'archived' ? 'archivedBy' : 'mutedBy';
    void setConversationFlag(conversationId, userId, field, on).catch((error) => log.warn('flag failed', { error: String(error) }));
  }, [real, remote, userId]);

  const deleteForMe = useCallback((conversationId: string) => {
    if (activeId === conversationId) setActiveId(null);
    if (conversationId.startsWith('ai_')) {
      writeAi((store) => ({
        conversations: store.conversations.filter((item) => item.id !== conversationId),
        messages: store.messages.filter((message) => message.conversationId !== conversationId),
      }));
      return;
    }
    if (!real) {
      setDemo((prev) => ({
        conversations: prev.conversations.filter((item) => item.id !== conversationId),
        messages: prev.messages.filter((message) => message.conversationId !== conversationId),
      }));
      return;
    }
    const conversation = conversations.find((item) => item.id === conversationId);
    if (conversation) {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[conversation.otherId];
        return next;
      });
    }
    if (remote.some((item) => item.id === conversationId)) void deleteConversationForMe(conversationId, userId);
  }, [activeId, real, remote, userId, conversations, setActiveId]);

  const setValidation = useCallback((conversationId: string, validation: ConversationValidation) => {
    if (real && conversationId.startsWith('dm_') && remote.some((item) => item.id === conversationId)) {
      void setConversationValidation(conversationId, validation);
      return;
    }
    setLocalValidation((prev) => ({ ...prev, [conversationId]: validation }));
  }, [real, remote]);

  const canMessage = useCallback((conversation: ChatConversation | null): CanMessage => {
    if (!conversation) return { ok: false, reason: 'closed' };
    if (conversation.kind !== 'dm') return { ok: true };
    if (conversation.otherId === userId) return { ok: false, reason: 'self' };
    if (conversation.blockedByOther) return { ok: false, reason: 'blocked' };
    if (conversation.blockedByMe) return { ok: false, reason: 'blockedByMe' };
    if (conversation.exists && conversation.lastMessage) return { ok: true };
    const person = findPerson(conversation.otherId);
    const rule = person?.messagesFrom || 'anyone';
    const connected = connectionStateWith(conversation.otherId).state === 'connected';
    if (rule === 'none' && !connected) return { ok: false, reason: 'closed' };
    if (rule === 'connections' && !connected) return { ok: false, reason: 'connections-only' };
    return { ok: true };
  }, [userId]);

  const loadOlder = useCallback(() => setCount((value) => value + PAGE), []);

  const value: MessagingValue = {
    ready: remoteReady,
    userId,
    conversations,
    totalUnread,
    activeId,
    setActiveId,
    active,
    messages,
    hasOlder: real ? hasOlder : false,
    loadOlder,
    aiTyping,
    openConversationWith,
    send,
    sendTo,
    react,
    editMessage,
    removeMessage,
    markRead,
    typing,
    setFlag,
    deleteForMe,
    setValidation,
    canMessage,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) throw new Error('useMessaging must be used within a MessagingProvider');
  return context;
}

/** Same as useMessaging, but returns null outside the provider (public pages). */
export function useOptionalMessaging() {
  return useContext(MessagingContext);
}
