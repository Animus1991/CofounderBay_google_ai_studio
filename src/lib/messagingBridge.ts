/**
 * The assistant runs outside React; Messages lives in MessagingContext (demo threads in memory,
 * Firestore listeners for real accounts). The provider publishes a live view and one send here,
 * so the assistant reads the inbox the sidebar badge counts and writes where Messages shows it.
 */
export type BridgeThread = { conversationId: string; personId: string; name: string; kind: 'dm' | 'demo' | 'ai'; unread: number; muted: boolean; lastMessage: string; lastMessageAt: number; lastFromMe: boolean };
export type BridgeMessage = { conversationId: string; name: string; body: string; createdAt: number };
export type BridgeRefusal = 'self' | 'blocked' | 'blockedByMe' | 'closed' | 'connections-only' | 'unknown';
export type BridgeSend = { ok: true; conversationId: string; messageId: string } | { ok: false; reason: BridgeRefusal };
export type MessagingBridge = {
  real: boolean;
  threads: () => BridgeThread[];
  /** Same number as the sidebar badge (muted threads excluded). */
  totalUnread: () => number;
  /** Demo: every message. Real accounts: each thread's last message plus the open thread's loaded messages. */
  searchable: () => BridgeMessage[];
  /** Synchronous pre-check with the same rules as canMessage; null = allowed (existence of a not-yet-loaded real member is checked at send). */
  canSendTo: (personId: string) => BridgeRefusal | null;
  sendToPerson: (personId: string, body: string) => Promise<BridgeSend>;
  /** Demo: removes the message exactly (and the thread if this send created it). Real: the same soft delete as the message menu. */
  unsend: (conversationId: string, messageId: string) => Promise<void>;
};
let current: MessagingBridge | null = null;
export function registerMessagingBridge(bridge: MessagingBridge | null): void { current = bridge; }
export function messagingBridge(): MessagingBridge | null { return current; }
