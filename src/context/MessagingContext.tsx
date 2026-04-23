import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readStatus: boolean;
  isAI?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  status: string;
  createdAt: string;
  otherParticipant: {
    id: string;
    fullName: string;
    roles: string[];
    isAI?: boolean;
    profile?: {
      profilePhoto: string;
      headline: string;
    };
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
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

const initialState: MessagingState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
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

export function MessagingProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  // Keep ref in sync with state to avoid stale closures in socket listeners
  useEffect(() => {
    activeConversationIdRef.current = state.activeConversationId;
  }, [state.activeConversationId]);

  useEffect(() => {
    if (!userId) return;

    // Initialize socket
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to messaging socket');
    });

    socket.on('receive_message', (message: Message) => {
      // If message belongs to active conversation, add it
      if (activeConversationIdRef.current === message.conversationId) {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
        // Mark as read immediately if active
        fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: message.conversationId, userId }),
        });
      } else {
        // Otherwise increment unread count in conversation list
        const conv = state.conversations.find(c => c.id === message.conversationId);
        if (conv) {
          dispatch({ 
            type: 'UPDATE_UNREAD_COUNT', 
            payload: { conversationId: message.conversationId, count: conv.unreadCount + 1 } 
          });
        }
      }
    });

    // Initial fetch of conversations
    const fetchConversations = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const res = await fetch(`/api/conversations/${userId}`);
        const data = await res.json();
        dispatch({ type: 'SET_CONVERSATIONS', payload: data });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversations' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    fetchConversations();

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Join room when active conversation changes
  useEffect(() => {
    if (state.activeConversationId && socketRef.current) {
      socketRef.current.emit('join_room', state.activeConversationId);
      
      // Fetch messages for active conversation
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/messages/${state.activeConversationId}`);
          const data = await res.json();
          dispatch({ type: 'SET_MESSAGES', payload: data });
          
          // Mark as read
          fetch('/api/messages/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: state.activeConversationId, userId }),
          });
          
          // Reset unread count locally
          dispatch({ 
            type: 'UPDATE_UNREAD_COUNT', 
            payload: { conversationId: state.activeConversationId!, count: 0 } 
          });
        } catch (err) {
          console.error('Failed to fetch messages', err);
        }
      };

      fetchMessages();
    }
  }, [state.activeConversationId, userId]);

  const sendMessage = (body: string, file?: any, customSenderId?: string) => {
    if (!state.activeConversationId || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      conversationId: state.activeConversationId,
      senderId: customSenderId || userId,
      body,
      file,
    });
  };

  const markAsRead = (conversationId: string) => {
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, userId }),
    });
    dispatch({ type: 'UPDATE_UNREAD_COUNT', payload: { conversationId, count: 0 } });
  };

  const createConversation = async (participants: string[]) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      const conversation = await response.json();
      
      // Refresh conversations
      const convsResponse = await fetch(`/api/conversations/${userId}`);
      if (convsResponse.ok) {
        const conversations = await convsResponse.json();
        dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      }
      
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  return (
    <MessagingContext.Provider value={{ state, dispatch, sendMessage, markAsRead, createConversation }}>
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
