import React, { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { avatarFor, findCast } from '../data/cast';
import { MOCK_AGENTS } from '../services/aiService';
import { readInbox, writeInbox } from '../lib/localLists';
import { useT } from '../lib/language';

export interface Reaction {
 emoji: string;
 userIds: string[];
}

export interface Thread {
 id: string;
 messageId: string;
 replies: Message[];
 replyCount: number;
}

export interface Message {
 id: string;
 conversationId: string;
 senderId: string;
 senderName?: string;
 body: string;
 createdAt: string;
 readStatus: boolean;
 isAI?: boolean;
 reactions?: Reaction[];
 threadCount?: number;
 replyTo?: {
  messageId: string;
  senderName: string;
  body: string;
 };
 attachments?: {
  name: string;
  type: string;
  size: number;
  url?: string;
 }[];
}

export interface Conversation {
 id: string;
 participants: string[];
 status: string;
 createdAt: string;
 otherParticipant: {
  id: string;
  fullName: string;
  roles?: string[];
  isAI?: boolean;
  isOnline?: boolean;
  profile?: {
   profilePhoto?: string;
   headline?: string;
  };
 };
 lastMessage: string;
 lastMessageTime: string;
 unreadCount: number;
 isGroup?: boolean;
 groupName?: string;
 groupAvatar?: string;
}

interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
}

type MessagingAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: { conversationId: string; count: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

function conversationFromCast(
  convId: string,
  id: string,
  lastMessage: string,
  lastMessageTime: string,
  unreadCount: number,
  extras: { isOnline?: boolean; isAI?: boolean; roles?: string[] } = {},
  ownerId = 'demo-user',
): Conversation {
  const person = findCast(id);
  const agent = MOCK_AGENTS.find((item) => item.id === id);
  return {
    id: convId,
    participants: [ownerId, id],
    status: 'Active',
    createdAt: new Date().toISOString(),
    otherParticipant: {
      id,
      fullName: person?.fullName || agent?.name || id,
      roles: extras.roles || (person ? [person.role] : agent ? [agent.role] : []),
      isAI: extras.isAI ?? !!agent,
      isOnline: extras.isOnline ?? false,
      profile: {
        profilePhoto: person ? avatarFor(id) : agent?.avatar,
        headline: person?.headline || agent?.description,
      },
    },
    lastMessage,
    lastMessageTime,
    unreadCount,
  };
}

const MOCK_CONVERSATIONS: Conversation[] = [
 conversationFromCast('conv-1', 'alex-rivera', 'Hey, are we still on for the pitch practice tomorrow?', '2m ago', 2, { isOnline: true, roles: ['Founder'] }),
 conversationFromCast('conv-2', 'sarah-chen', 'The mockups look great! Just a few tweaks needed.', '1h ago', 0, { roles: ['Founder'] }),
 conversationFromCast('conv-3', 'a1', 'I\'ve analyzed your pitch deck. Here are my recommendations...', '5m ago', 1, { isAI: true, isOnline: true }),
 conversationFromCast('conv-4', 'a2', 'Your valuation model needs some adjustments.', '1d ago', 0, { isAI: true, isOnline: true }),
 conversationFromCast('conv-5', 'jordan-taylor', 'Let me share the growth playbook I mentioned.', '3h ago', 1, { isOnline: true }),
 conversationFromCast('conv-6', 'elena-rossi', 'Great progress! Let\'s schedule our next mentoring session.', '5h ago', 0),
 conversationFromCast('conv-7', 'daniel-weiss', 'Interesting deck. Can we set up a 30-min call next week?', '1d ago', 0),
 conversationFromCast('conv-8', 'priya-sharma', 'The integration tests are passing now.', '2d ago', 0, { isOnline: true }),
];

const MOCK_MESSAGES: Message[] = [
 {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'alex-rivera',
  senderName: 'Alex Rivera',
  body: 'Hey, are we still on for the pitch practice tomorrow?',
  createdAt: new Date(Date.now() - 120000).toISOString(),
  readStatus: false
 },
 {
  id: 'msg-2',
  conversationId: 'conv-1',
  senderId: 'alex-rivera',
  senderName: 'Alex Rivera',
  body: 'I\'ve prepared some notes on the competitor analysis section.',
  createdAt: new Date(Date.now() - 60000).toISOString(),
  readStatus: false,
  reactions: [{ emoji: '👍', userIds: ['u1'] }]
 },
 {
  id: 'msg-3',
  conversationId: 'conv-2',
  senderId: 'sarah-chen',
  senderName: 'Sarah Chen',
  body: 'The mockups look great! Just a few tweaks needed on the onboarding flow.',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  readStatus: true
 },
 {
  id: 'msg-4',
  conversationId: 'conv-3',
  senderId: 'a1',
  senderName: 'Venture Architect',
  body: 'I\'ve analyzed your pitch deck. Here are my recommendations:\n\n1. Strengthen the problem statement\n2. Add more traction metrics\n3. Clarify your go-to-market strategy',
  createdAt: new Date(Date.now() - 300000).toISOString(),
  readStatus: false,
  isAI: true
 },
 {
  id: 'msg-5',
  conversationId: 'conv-4',
  senderId: 'a2',
  senderName: 'Fundraising Coach',
  body: 'Your valuation model needs some adjustments. The multiples seem high for your current traction.',
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  readStatus: true,
  isAI: true
 },
 // conv-1: more depth
 {
  id: 'msg-6',
  conversationId: 'conv-1',
  senderId: 'u1',
  senderName: 'You',
  body: 'Yes absolutely! I\'ve been working on the financial model section. Can you review it before we present?',
  createdAt: new Date(Date.now() - 90000).toISOString(),
  readStatus: true
 },
 {
  id: 'msg-7',
  conversationId: 'conv-1',
  senderId: 'alex-rivera',
  senderName: 'Alex Rivera',
  body: 'Sure thing. Send it over and I\'ll take a look tonight. Also, I think we should add a competitive landscape slide.',
  createdAt: new Date(Date.now() - 60000).toISOString(),
  readStatus: false
 },
 // conv-5: Jordan
 {
  id: 'msg-8',
  conversationId: 'conv-5',
  senderId: 'u5',
  senderName: 'Jordan Taylor',
  body: 'Hey! I loved your product demo at the last community event.',
  createdAt: new Date(Date.now() - 10800000).toISOString(),
  readStatus: true
 },
 {
  id: 'msg-9',
  conversationId: 'conv-5',
  senderId: 'u1',
  senderName: 'You',
  body: 'Thanks Jordan! We\'ve been iterating on the onboarding flow. Would love your growth perspective on it.',
  createdAt: new Date(Date.now() - 9000000).toISOString(),
  readStatus: true
 },
 {
  id: 'msg-10',
  conversationId: 'conv-5',
  senderId: 'u5',
  senderName: 'Jordan Taylor',
  body: 'Let me share the growth playbook I mentioned 📊',
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  readStatus: false,
  attachments: [{ name: 'Growth_Playbook_2024.pdf', type: 'application/pdf', size: 3200000 }]
 },
 // conv-7: Marcus (Investor)
 {
  id: 'msg-11',
  conversationId: 'conv-7',
  senderId: 'u1',
  senderName: 'You',
  body: 'Hi Marcus, thanks for connecting! Here\'s our latest pitch deck as discussed.',
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  readStatus: true,
  attachments: [{ name: 'PitchDeck_v3.pdf', type: 'application/pdf', size: 5400000 }]
 },
 {
  id: 'msg-12',
  conversationId: 'conv-7',
  senderId: 'u7',
  senderName: 'Marcus Lee',
  body: 'Interesting deck. Can we set up a 30-min call next week? I\'d like to discuss your unit economics in more detail.',
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  readStatus: true,
  reactions: [{ emoji: '🙏', userIds: ['u1'] }]
 }
];

const initialState: MessagingState = {
  conversations: MOCK_CONVERSATIONS,
  activeConversationId: null,
  messages: MOCK_MESSAGES,
  loading: false,
  error: null,
};

function messagingReducer(state: MessagingState, action: MessagingAction): MessagingState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      // Avoid duplicates
      if (state.messages.find(m => m.id === action.payload.id)) return state;
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_UNREAD_COUNT':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.payload.conversationId ? { ...c, unreadCount: action.payload.count } : c
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const MessagingContext = createContext<{
  state: MessagingState;
  dispatch: React.Dispatch<MessagingAction>;
  sendMessage: (body: string, file?: any, customSenderId?: string) => void;
  markAsRead: (conversationId: string) => void;
  createConversation: (participants: string[]) => Promise<any>;
} | null>(null);

function emptyMessaging(): MessagingState {
  return { conversations: [], activeConversationId: null, messages: [], loading: false, error: null };
}

export function MessagingProvider({ children, userId, isDemo = false }: { children: React.ReactNode; userId: string; isDemo?: boolean }) {
  const t = useT();
  const [state, dispatch] = useReducer(messagingReducer, isDemo ? initialState : emptyMessaging());
  const socketRef = useRef<Socket | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const [inboxReady, setInboxReady] = useState(isDemo);
  const relDemo = (value: string) => {
    if (value === '2m ago') return t('2m ago', 'πριν από 2 λ.');
    if (value === '1h ago') return t('1h ago', 'πριν από 1 ώ.');
    if (value === '5m ago') return t('5m ago', 'πριν από 5 λ.');
    if (value === '1d ago') return t('1d ago', 'πριν από 1 ημ.');
    if (value === '3h ago') return t('3h ago', 'πριν από 3 ώ.');
    if (value === '5h ago') return t('5h ago', 'πριν από 5 ώ.');
    if (value === '2d ago') return t('2d ago', 'πριν από 2 ημ.');
    if (value === 'now') return t('now', 'τώρα');
    return value;
  };
  const viewState: MessagingState = {
    ...state,
    conversations: state.conversations.map((conversation) => ({
      ...conversation,
      lastMessageTime: relDemo(conversation.lastMessageTime),
    })),
    messages: state.messages.map((message) => ({
      ...message,
      senderName: message.senderName === 'You' ? t('You', 'Εσείς') : message.senderName,
      replyTo: message.replyTo
        ? { ...message.replyTo, senderName: message.replyTo.senderName === 'You' ? t('You', 'Εσείς') : message.replyTo.senderName }
        : message.replyTo,
    })),
  };

  // Keep ref in sync with state to avoid stale closures in socket listeners
  useEffect(() => {
    activeConversationIdRef.current = state.activeConversationId;
  }, [state.activeConversationId]);

  useEffect(() => {
    if (isDemo) {
      setInboxReady(true);
      return;
    }
    const stored = readInbox();
    dispatch({ type: 'SET_CONVERSATIONS', payload: Array.isArray(stored.conversations) ? stored.conversations as Conversation[] : [] });
    dispatch({ type: 'SET_MESSAGES', payload: Array.isArray(stored.messages) ? stored.messages as Message[] : [] });
    setInboxReady(true);
  }, [userId, isDemo]);

  useEffect(() => {
    if (isDemo || !userId || !inboxReady) return;
    writeInbox({ conversations: state.conversations, messages: state.messages });
  }, [isDemo, userId, inboxReady, state.conversations, state.messages]);

  useEffect(() => {
    if (!userId) return;

    // Try to initialize socket — gracefully handle missing backend
    let socket: Socket | null = null;
    try {
      socket = io(window.location.origin, { timeout: 3000, reconnectionAttempts: 2 });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to messaging socket');
      });

      socket.on('connect_error', () => {
        // Backend not available — keep using mock data, no error
        console.info('Messaging socket unavailable — using local data');
      });

      socket.on('receive_message', (message: Message) => {
        if (activeConversationIdRef.current === message.conversationId) {
          dispatch({ type: 'ADD_MESSAGE', payload: message });
          fetch('/api/messages/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: message.conversationId, userId }),
          }).catch(() => {});
        } else {
          const conv = state.conversations.find(c => c.id === message.conversationId);
          if (conv) {
            dispatch({ 
              type: 'UPDATE_UNREAD_COUNT', 
              payload: { conversationId: message.conversationId, count: conv.unreadCount + 1 } 
            });
          }
        }
      });
    } catch {
      console.info('Socket init failed — using local data');
    }

    // Try to fetch real conversations; if API unavailable, keep mock data
    const fetchConversations = async () => {
      try {
        const res = await fetch(`/api/conversations/${userId}`);
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          dispatch({ type: 'SET_CONVERSATIONS', payload: data });
        }
      } catch {
        // API not available — demo keeps sample threads, a signed-in account keeps its inbox
      }
    };

    fetchConversations();

    return () => {
      socket?.disconnect();
    };
  }, [userId]);

  // Join room when active conversation changes
  useEffect(() => {
    if (!state.activeConversationId) return;

    // Try to join socket room
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_room', state.activeConversationId);
    }
      
    // Fetch messages for active conversation — keep mock data on failure
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages/${state.activeConversationId}`);
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          dispatch({ type: 'SET_MESSAGES', payload: data });
        }
        
        fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: state.activeConversationId, userId }),
        }).catch(() => {});
      } catch {
        // API not available — keep mock messages
      }
    };

    fetchMessages();

    // Reset unread count locally
    dispatch({ 
      type: 'UPDATE_UNREAD_COUNT', 
      payload: { conversationId: state.activeConversationId!, count: 0 } 
    });
  }, [state.activeConversationId, userId]);

  const sendMessage = (body: string, file?: any, customSenderId?: string) => {
    if (!state.activeConversationId) return;

    const newMessage: Message = {
      id: `msg-local-${Date.now()}`,
      conversationId: state.activeConversationId,
      senderId: customSenderId || userId,
      senderName: customSenderId ? state.conversations.find(c => c.otherParticipant.id === customSenderId)?.otherParticipant.fullName : 'You',
      body,
      createdAt: new Date().toISOString(),
      readStatus: false,
      isAI: !!customSenderId && state.conversations.find(c => c.otherParticipant.id === customSenderId)?.otherParticipant.isAI,
      attachments: file ? [{ name: file.name, type: 'file', size: 0, url: file.data }] : undefined,
    };

    // Add message locally
    dispatch({ type: 'ADD_MESSAGE', payload: newMessage });

    // Try to send via socket if available
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        conversationId: state.activeConversationId,
        senderId: customSenderId || userId,
        body,
        file,
      });
    }
  };

  const markAsRead = (conversationId: string) => {
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, userId }),
    }).catch(() => {});
    dispatch({ type: 'UPDATE_UNREAD_COUNT', payload: { conversationId, count: 0 } });
  };

  const createConversation = async (participants: string[]) => {
    // Try API first
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });
      if (!response.ok) throw new Error('API unavailable');
      const conversation = await response.json();
      
      const convsResponse = await fetch(`/api/conversations/${userId}`);
      if (convsResponse.ok) {
        const conversations = await convsResponse.json();
        dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      }
      
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
      return conversation;
    } catch {
      // API not available — create conversation locally
      const otherId = participants.find((id) => id !== userId) || participants[participants.length - 1];
      const existingConv = state.conversations.find((c) =>
        c.otherParticipant.id === otherId || participants.includes(c.otherParticipant.id)
      );
      if (existingConv) {
        dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: existingConv.id });
        return existingConv;
      }
      if (!otherId) return null;
      const created = conversationFromCast(`conv-${otherId}`, otherId, '', 'now', 0, { isOnline: true }, userId || 'demo-user');
      dispatch({ type: 'SET_CONVERSATIONS', payload: [...state.conversations, created] });
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: created.id });
      return created;
    }
  };

  return (
    <MessagingContext.Provider value={{ state: viewState, dispatch, sendMessage, markAsRead, createConversation }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}
