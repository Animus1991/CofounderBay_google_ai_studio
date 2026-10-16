import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
 Search, Plus, MoreVertical, Send, Paperclip, Smile, Phone, Video, Info,
 ChevronLeft, Check, CheckCheck, MessageSquare, Clock, X, FileText, Mic,
 Sparkles, Pin, Reply, Forward, Trash2, Archive, BellOff, Users,
 Calendar, CheckSquare, Play, Download, Filter, Zap, Settings,
 BarChart3, Lightbulb, Target, MessageCircle, Bookmark, Copy,
 BrainCircuit, UserPlus, User as UserIcon, Flag, Ban, Shield, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useMessaging, Conversation, Message } from "../context/MessagingContext";
import { AIService, MOCK_AGENTS } from "../services/aiService";
import { User } from "../types";
import { useAuth } from "../App";
import { avatarFor } from "../data/cast";
import { keys, readRequests, removeRequest } from "../lib/localLists";
import { bothText } from "../lib/labels";
import { useLanguage } from "../lib/language";
import { useStored } from "../lib/useStored";

// =============================================================================
// TYPES
// =============================================================================
interface CommunicationHubProps { user: User | null; }
type MessageFilter = "all" | "unread" | "ai";
type ViewMode = "chat" | "ai-center";
type AIView = "chat" | "agents" | "insights" | "history";

interface AIInsight {
 id: string;
 type: "action" | "suggestion" | "insight" | "task";
 title: string;
 description: string;
 priority: "high" | "medium" | "low";
}

interface ConnectionRequest {
 id: string;
 from: { id: string; fullName: string; headline?: string; avatar?: string; role?: string };
 message?: string;
 createdAt: string;
}

type ValidationMode = 'casual' | 'one_party' | 'two_party';

interface ConversationValidationState {
 mode: ValidationMode;
 initiatedBy: string | null;
 initiatedAt: string | null;
 acceptedBy: string | null;
 acceptedAt: string | null;
 lastValidatedAt: string | null;
 validationHash: string | null;
 transcriptAvailable: boolean;
}

const MODE_CONFIG: Record<ValidationMode, { label: string; description: string; icon: React.ElementType; color: string; bgColor: string }> = {
 casual: { label: 'Casual Chat', description: 'Standard private messaging, no validation', icon: MessageCircle, color: 'text-stone-500', bgColor: 'bg-stone-100' },
 one_party: { label: 'One-Party Validation', description: 'You can save/validate your side of the conversation', icon: Shield, color: 'text-amber-500', bgColor: 'bg-amber-50' },
 two_party: { label: 'Two-Party Validation', description: 'Both parties agree to validated transcript', icon: ShieldCheck, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
};

// =============================================================================
// MOCK DATA
// =============================================================================
const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "🎉", "🔥", "👏", "🤔", "👀", "🚀"];
const EMOJI_GRID = ['😀','😂','😍','🥰','😎','🤔','😅','🙈','👍','👎','❤️','🔥','🎉','✅','💡','🚀','💪','🙏','👏','😢','😡','🤝','💰','⭐','🌟','📈','💻','🎯'];

const MOCK_CONNECTION_REQUESTS: ConnectionRequest[] = [
 { id: "cr1", from: { id: "jordan-taylor", fullName: "Jordan Taylor", headline: "Growth marketer, ex-Stripe", avatar: avatarFor("jordan-taylor"), role: "Co-Founder Candidate" }, message: "Hi! I saw your pitch deck project. I'd love to discuss a potential collaboration on growth strategy.", createdAt: new Date(Date.now() - 3600000).toISOString() },
 { id: "cr2", from: { id: "elena-rossi", fullName: "Elena Rossi", headline: "Venture partner, FinTech and SaaS", avatar: avatarFor("elena-rossi"), role: "Mentor" }, message: "I mentor startups in the FinTech space — happy to connect!", createdAt: new Date(Date.now() - 86400000).toISOString() },
 { id: "cr3", from: { id: "daniel-weiss", fullName: "Daniel Weiss", headline: "Angel investor, 30+ pre-seed deals", avatar: avatarFor("daniel-weiss"), role: "Investor" }, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const SHARED_MEDIA_MOCK = [1, 2, 3, 4, 5, 6];
const SHARED_FILES_MOCK = [
 { name: "Pitch Deck v3.pdf", size: "2.4 MB", icon: FileText, date: "Apr 28" },
 { name: "Financial Model.xlsx", size: "856 KB", icon: BarChart3, date: "Apr 25" },
 { name: "Product Demo.mp4", size: "48.1 MB", icon: Play, date: "Apr 22" },
];

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================
const Avatar = ({ src, alt, size = "md", status, isAI = false }: {
 src?: string; alt: string; size?: "xs" | "sm" | "md" | "lg" | "xl";
 status?: "online" | "offline" | "busy" | "away"; isAI?: boolean;
}) => {
 const s: Record<string, string> = {
  xs: "w-6 h-6 rounded-lg", sm: "w-8 h-8 rounded-xl", md: "w-10 h-10 rounded-2xl",
  lg: "w-14 h-14 rounded-xl", xl: "w-20 h-20 rounded-xl"
 };
 const initials = alt.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
 const [failed, setFailed] = useState(false);
 const showImage = Boolean(src) && !failed;
 return (
  <div className={cn("relative shrink-0", s[size])}>
   {showImage ? (
    <img src={src} alt={alt} className="w-full h-full object-cover rounded-[inherit]" onError={() => setFailed(true)} />
   ) : (
    <div className="w-full h-full rounded-[inherit] bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-semibold text-stone-600">{initials}</div>
   )}
   {status && (
    <div className={cn(
     "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
     status === "online" ? "bg-emerald-500" : status === "busy" ? "bg-red-500" : status === "away" ? "bg-amber-500" : "bg-stone-300"
    )} />
   )}
   {isAI && (
    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-stone-800 rounded-full border-2 border-white flex items-center justify-center">
     <Sparkles className="w-2 h-2 text-white" />
    </div>
   )}
  </div>
 );
};

const IconButton = ({ icon: Icon, onClick, active = false, variant = "ghost", size = "md", badge, tooltip, disabled = false }: {
 icon: React.ElementType; onClick?: () => void; active?: boolean;
 variant?: "ghost" | "filled" | "outline"; size?: "sm" | "md" | "lg"; badge?: number | string; tooltip?: string;
 disabled?: boolean;
}) => {
 const sc: Record<string, string> = { sm: "w-11 h-11", md: "w-11 h-11", lg: "w-11 h-11" };
 const ic: Record<string, string> = { sm: "w-4 h-4", md: "w-4 h-4", lg: "w-5 h-5" };
 return (
  <span title={tooltip} className="inline-flex">
  <button type="button" aria-label={tooltip} disabled={disabled} onClick={onClick} className={cn(
   "relative rounded-xl flex items-center justify-center transition-all", sc[size],
   disabled && "opacity-50 cursor-not-allowed",
   variant === "ghost" && ["text-stone-500 hover:text-stone-900 hover:bg-stone-100", active && "text-stone-900 bg-stone-100"],
   variant === "filled" && ["bg-stone-900 text-white hover:bg-stone-800", active && "bg-stone-700"],
   variant === "outline" && ["border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900", active && "border-stone-900 text-stone-900 bg-stone-50"]
  )}>
   <Icon className={ic[size]} />
   {badge !== undefined && (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-stone-900 text-white text-[10px] font-medium rounded-full flex items-center justify-center tabular-nums">{badge}</span>
   )}
  </button>
  </span>
 );
};

const TypingDots = () => (
 <div className="flex items-center gap-1 px-4 py-2.5 bg-white border border-stone-200 rounded-2xl rounded-bl-lg w-fit">
  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.15s]" />
  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.3s]" />
 </div>
);

const DateSeparator = ({ date }: { date: string }) => {
 const d = new Date(date);
 const today = new Date();
 const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
 const label = d.toDateString() === today.toDateString() ? "Today"
  : d.toDateString() === yesterday.toDateString() ? "Yesterday"
  : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
 return (
  <div className="flex items-center gap-3 py-4">
   <div className="flex-1 h-px bg-stone-200" />
   <span className="text-[10px] font-semibold text-stone-400 tracking-wider">{label}</span>
   <div className="flex-1 h-px bg-stone-200" />
  </div>
 );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function CommunicationHub({ user: routeUser }: CommunicationHubProps) {
 useLanguage();
 const { user: authUser, profile } = useAuth();
 const user = {
  ...(routeUser ?? {}),
  id: authUser?.uid || profile?.id || 'demo-user',
 } as User;
 // ── State ────────────────────────────────────────────────────────────────
 const { state: msgState, sendMessage, markAsRead, createConversation } = useMessaging();
 const [activeView, setActiveView] = useState<ViewMode>("chat");
 const [aiView, setAiView] = useState<AIView>("chat");
 const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
 const [sidebarTab, setSidebarTab] = useState<"chats" | "intros">("chats");
 const [inputText, setInputText] = useState("");
 const [searchQuery, setSearchQuery] = useState("");
 const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
 const [showEmojiPicker, setShowEmojiPicker] = useState<string | false>(false);
 const [replyingTo, setReplyingTo] = useState<Message | null>(null);
 const [isRecording, setIsRecording] = useState(false);
 const [recordingTime, setRecordingTime] = useState(0);
 const [showRightSidebar, setShowRightSidebar] = useState(() =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches
 );
 const [showSearchPanel, setShowSearchPanel] = useState(false);
 const [chatSearchQuery, setChatSearchQuery] = useState("");
 const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; size: number; data?: string }[]>([]);
 const [aiIsTyping, setAiIsTyping] = useState(false);
 const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
 const studioRequests = useStored(readRequests, [keys.requests]);
 const [dismissedIntroIds, setDismissedIntroIds] = useState<string[]>([]);
 const connectionRequests = useMemo<ConnectionRequest[]>(() => {
  const extras = studioRequests
   .filter((item) => !MOCK_CONNECTION_REQUESTS.some((mock) => mock.from.id === item.id || mock.id === item.id))
   .map((item) => ({
    id: item.id,
    from: { id: item.id, fullName: item.fullName, headline: item.note || item.role, avatar: avatarFor(item.id), role: item.role },
    message: item.message,
    createdAt: item.sentAt || new Date().toISOString(),
   }));
  return [...MOCK_CONNECTION_REQUESTS, ...extras].filter((item) => !dismissedIntroIds.includes(item.id));
 }, [studioRequests, dismissedIntroIds]);
 const [pinnedConvIds, setPinnedConvIds] = useState<Set<string>>(new Set(["conv-1"]));
 const [isRecipientTyping, setIsRecipientTyping] = useState(false);
 const [reportBlockModal, setReportBlockModal] = useState<{ open: boolean; mode: 'report' | 'block' }>({ open: false, mode: 'report' });
 const [showEmojiDropdown, setShowEmojiDropdown] = useState(false);
 const [validationState, setValidationState] = useState<ConversationValidationState>({
  mode: 'casual', initiatedBy: null, initiatedAt: null, acceptedBy: null,
  acceptedAt: null, lastValidatedAt: null, validationHash: null, transcriptAvailable: false,
 });
 const [showValidationDialog, setShowValidationDialog] = useState(false);
 const [hashCopied, setHashCopied] = useState(false);
 const [openMenu, setOpenMenu] = useState<string | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const isTypingRef = useRef(false);

 // ── Derived ──────────────────────────────────────────────────────────────
 const activeConv = useMemo(() =>
  msgState.conversations.find(c => c.id === selectedConversation) || null,
 [msgState.conversations, selectedConversation]);
 const isAIChat = activeConv?.otherParticipant.isAI || false;
 const totalUnread = useMemo(() => msgState.conversations.reduce((a, c) => a + c.unreadCount, 0), [msgState.conversations]);

 const filteredConversations = useMemo(() => {
  let convs = msgState.conversations;
  if (searchQuery) {
   convs = convs.filter(c =>
    c.otherParticipant.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
   );
  }
  switch (messageFilter) {
   case "unread": return convs.filter(c => c.unreadCount > 0);
   case "ai": return convs.filter(c => c.otherParticipant.isAI);
   default: return convs;
  }
 }, [msgState.conversations, searchQuery, messageFilter]);

 const pinnedConversations = useMemo(() => filteredConversations.filter(c => pinnedConvIds.has(c.id)), [filteredConversations, pinnedConvIds]);
 const unpinnedConversations = useMemo(() => filteredConversations.filter(c => !pinnedConvIds.has(c.id)), [filteredConversations, pinnedConvIds]);

 const chatMessages = useMemo(() =>
  msgState.messages.filter(m => m.conversationId === selectedConversation),
 [msgState.messages, selectedConversation]);

 // ── Effects ──────────────────────────────────────────────────────────────
 // Auto-select first conversation on mount so the page never looks empty
 useEffect(() => {
  if (!selectedConversation && msgState.conversations.length > 0) {
   const firstConv = msgState.conversations[0];
   if (!firstConv) return;
   setSelectedConversation(firstConv.id);
   markAsRead(firstConv.id);
  }
 }, [msgState.conversations]); // eslint-disable-line react-hooks/exhaustive-deps

 useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
 useEffect(() => {
  if (isRecording) {
   recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
  } else { if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current); }
  return () => { if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current); };
 }, [isRecording]);

 // ── Handlers ─────────────────────────────────────────────────────────────
 const handleSendMessage = useCallback(async (textOverride?: string) => {
  const text = textOverride || inputText;
  if ((!text.trim() && attachedFiles.length === 0) || !selectedConversation) return;
  const finalText = replyingTo
   ? `${text}\n\n[Replying to ${replyingTo.senderName}: "${replyingTo.body.substring(0, 50)}..."]`
   : text;
  const firstFile = attachedFiles[0];
  if (isAIChat && activeConv) {
   const agent = MOCK_AGENTS.find(a => a.id === activeConv.otherParticipant.id);
   if (!agent) return;
   sendMessage(finalText, firstFile ? { name: firstFile.name, data: firstFile.data } : undefined);
   setInputText(""); setAttachedFiles([]); setReplyingTo(null); setAiIsTyping(true);
   try {
    const response = await AIService.chat(finalText, agent.role, 'llama3.2', firstFile?.data);
    sendMessage(response.text, undefined, agent.id);
    setAiInsights(prev => [{ id: `insight-${Date.now()}`, type: "suggestion" as const, title: "Follow-up Opportunity", description: "Consider scheduling a follow-up meeting to discuss these points in detail.", priority: "medium" as const }, ...prev].slice(0, 5));
   } catch (error) {
    console.error('AI Chat Error:', error);
    sendMessage("I'm having trouble connecting. Please try again.", undefined, agent.id);
   } finally { setAiIsTyping(false); }
  } else {
   sendMessage(finalText, firstFile ? { name: firstFile.name, data: firstFile.data } : undefined);
   setInputText(""); setAttachedFiles([]); setReplyingTo(null);
  }
 }, [inputText, attachedFiles, selectedConversation, replyingTo, isAIChat, activeConv, sendMessage]);

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  Array.from(e.target.files || []).forEach(file => {
   const reader = new FileReader();
   reader.onloadend = () => setAttachedFiles(prev => [...prev, { name: file.name, type: file.type, size: file.size, data: reader.result as string }]);
   reader.readAsDataURL(file);
  });
 };

 const handleAcceptIntro = (id: string) => {
  setDismissedIntroIds((prev) => prev.includes(id) ? prev : [...prev, id]);
 };
 const handleDeclineIntro = (id: string) => {
  setDismissedIntroIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  if (studioRequests.some((item) => item.id === id)) removeRequest(id);
 };
 const togglePin = (convId: string) => {
  setPinnedConvIds(prev => { const n = new Set(prev); if (n.has(convId)) n.delete(convId); else n.add(convId); return n; });
 };
 const handleArchiveConv = (convId: string) => {
  if (selectedConversation === convId) setSelectedConversation(null);
  // In production: call API to archive — for now just deselect
 };
 const handleDeleteConv = (convId: string) => {
  if (selectedConversation === convId) setSelectedConversation(null);
  // In production: call API to delete — for now just deselect
 };
 const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

 const handleValidationModeChange = (mode: ValidationMode) => {
  if (mode === 'two_party') {
   setValidationState(prev => ({
    ...prev, mode, initiatedBy: user.id, initiatedAt: new Date().toISOString(),
    acceptedBy: null, acceptedAt: null, transcriptAvailable: false, validationHash: null,
   }));
  } else {
   setValidationState(prev => ({
    ...prev, mode, initiatedBy: mode === 'one_party' ? user.id : null,
    initiatedAt: mode === 'one_party' ? new Date().toISOString() : null,
    acceptedBy: null, acceptedAt: null,
    transcriptAvailable: mode === 'one_party',
    validationHash: mode === 'one_party' ? `sha256:${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}` : null,
   }));
  }
  setShowValidationDialog(false);
 };

 const handleExportTranscript = (format: 'json' | 'txt') => {
  if (!activeConv) return;
  const transcript = chatMessages.map(m => ({
   sender: m.senderName, body: m.body, timestamp: m.createdAt,
  }));
  let blob: Blob;
  if (format === 'json') {
   blob = new Blob([JSON.stringify({ conversationId: activeConv.id, participants: [user.fullName, activeConv.otherParticipant.fullName], exportedAt: new Date().toISOString(), validationHash: validationState.validationHash, messages: transcript }, null, 2)], { type: 'application/json' });
  } else {
   const lines = transcript.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.body}`);
   blob = new Blob([`Conversation Transcript\nExported: ${new Date().toISOString()}\nHash: ${validationState.validationHash || 'N/A'}\n${'='.repeat(50)}\n\n${lines.join('\n')}`], { type: 'text/plain' });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcript-${activeConv.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
 };

 const copyValidationHash = () => {
  if (validationState.validationHash) {
   navigator.clipboard.writeText(validationState.validationHash);
   setHashCopied(true);
   setTimeout(() => setHashCopied(false), 2000);
  }
 };

 // Typing indicator handler (debounced)
 const handleTypingChange = useCallback((value: string) => {
  setInputText(value);
  if (value.trim()) {
   if (!isTypingRef.current) {
    isTypingRef.current = true;
    // In production: socketRef.current?.emit('typing:start', { conversationId: selectedConversation });
   }
   if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
   typingTimerRef.current = setTimeout(() => {
    isTypingRef.current = false;
    // In production: socketRef.current?.emit('typing:stop', { conversationId: selectedConversation });
   }, 2000);
  } else if (isTypingRef.current) {
   isTypingRef.current = false;
   if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }
 }, [selectedConversation]);

 // Auto-resize textarea
 const autoResizeTextarea = useCallback(() => {
  const el = textareaRef.current;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
 }, []);

 // =============================================================================
 // RENDER HELPERS
 // =============================================================================
 const renderConvCard = (conv: Conversation, isPinned = false) => (
  <div
   key={conv.id}
   role="button"
   tabIndex={0}
   onClick={() => { setSelectedConversation(conv.id); markAsRead(conv.id); }}
   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedConversation(conv.id); markAsRead(conv.id); } }}
   className={cn(
    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group/conv relative cursor-pointer",
    selectedConversation === conv.id
     ? "bg-white shadow-lg shadow-stone-200/50 border border-stone-200"
     : "hover:bg-white/80 border border-transparent"
   )}
  >
   {isPinned && <Pin className="absolute top-2 right-2 w-3 h-3 text-stone-400 rotate-45" />}
   <Avatar src={conv.otherParticipant.profile?.profilePhoto} alt={conv.otherParticipant.fullName}
    size="md" status={conv.otherParticipant.isOnline ? "online" : "offline"} isAI={conv.otherParticipant.isAI} />
   <div className="flex-1 min-w-0">
    <div className="flex items-center justify-between mb-0.5">
     <div className="flex items-center gap-1.5 min-w-0">
      <h3 className={cn("text-sm font-semibold truncate", conv.unreadCount > 0 ? "text-stone-900" : "text-stone-700")}>
       {conv.otherParticipant.fullName}
      </h3>
      {conv.otherParticipant.isAI && <span className="shrink-0 px-1.5 py-0.5 bg-stone-100 text-stone-700 text-[10px] rounded-full font-medium">AI</span>}
      {!conv.otherParticipant.isAI && conv.otherParticipant.roles?.[0] && (
       <span className="shrink-0 px-1.5 py-0.5 bg-stone-100 text-stone-500 text-[9px] rounded-full font-medium leading-tight">
        {conv.otherParticipant.roles[0]}
       </span>
      )}
     </div>
     <span className="text-[11px] text-stone-400 shrink-0 ml-2">{conv.lastMessageTime}</span>
    </div>
    <div className="flex items-center justify-between">
     <p className={cn("text-xs truncate pr-2", conv.unreadCount > 0 ? "text-stone-700 font-medium" : "text-stone-500")}>
      {conv.lastMessage || "Start a conversation..."}
     </p>
     {conv.unreadCount > 0 && (
      <span className="shrink-0 min-w-[20px] h-5 px-1 bg-stone-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
       {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
      </span>
     )}
    </div>
   </div>
   {/* Conversation actions. One labeled menu on a phone; the same actions on hover at larger sizes. */}
   <button
    type="button"
    aria-label="Conversation actions"
    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === conv.id ? null : conv.id); }}
    className="sm:hidden shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-xl"
   >
    <MoreVertical className="w-4 h-4" />
   </button>
   {openMenu === conv.id && (
    <div className="sm:hidden absolute right-2 bottom-14 z-30 w-44 bg-white border border-stone-200 rounded-xl shadow-sm py-1" onClick={(e) => e.stopPropagation()}>
     <button type="button" onClick={() => { togglePin(conv.id); setOpenMenu(null); }} className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-stone-700 hover:bg-stone-50">
      <Pin className="w-4 h-4" /> {isPinned ? "Unpin" : "Pin"}
     </button>
     <button type="button" onClick={() => { handleArchiveConv(conv.id); setOpenMenu(null); }} className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-stone-700 hover:bg-stone-50">
      <Archive className="w-4 h-4" /> Archive
     </button>
     <button type="button" className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-stone-700 hover:bg-stone-50">
      <BellOff className="w-4 h-4" /> Mute
     </button>
     <button type="button" onClick={() => { handleDeleteConv(conv.id); setOpenMenu(null); }} className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-red-600 hover:bg-red-50">
      <Trash2 className="w-4 h-4" /> Delete
     </button>
    </div>
   )}
   <div className="hidden sm:flex absolute right-2 bottom-2 opacity-0 group-hover/conv:opacity-100 transition-opacity items-center gap-0.5">
    <button onClick={(e) => { e.stopPropagation(); togglePin(conv.id); }} title={isPinned ? "Unpin" : "Pin"}
     className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded">
     <Pin className="w-3 h-3" />
    </button>
    <button onClick={(e) => { e.stopPropagation(); handleArchiveConv(conv.id); }} title="Archive"
     className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded">
     <Archive className="w-3 h-3" />
    </button>
    <div className="relative group/ctx" onClick={(e) => e.stopPropagation()}>
     <button title="More" className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded">
      <MoreVertical className="w-3 h-3" />
     </button>
     <div className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-stone-200 rounded-xl shadow-xl opacity-0 pointer-events-none group-hover/ctx:opacity-100 group-hover/ctx:pointer-events-auto transition-all z-30">
      <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 rounded-t-xl">
       <BellOff className="w-3 h-3" /> Mute
      </button>
      <button onClick={() => handleDeleteConv(conv.id)}
       className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-b-xl">
       <Trash2 className="w-3 h-3" /> Delete
      </button>
     </div>
    </div>
   </div>
  </div>
 );

 const composerTip = bothText("Open a chat first. The composer is the box under that chat.", "Ανοίξτε πρώτα μια συνομιλία. Η σύνταξη είναι το πλαίσιο κάτω από τη συνομιλία.");
 const focusComposer = () => {
  if (!selectedConversation) return;
  textareaRef.current?.focus();
 };

 // =============================================================================
 // RENDER: LEFT SIDEBAR
 // =============================================================================
 const renderLeftSidebar = () => (
  <aside className={cn(
   "w-full md:w-80 lg:w-[22rem] border-r border-stone-200/80 bg-white flex flex-col shrink-0",
   selectedConversation && "hidden md:flex"
  )}>
   {/* Header */}
   <div className="p-4 space-y-3">
    <div className="flex items-center justify-between">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg shadow-stone-900/15">
       <MessageSquare className="w-5 h-5 text-white" />
      </div>
      <div>
       <h1 className="text-base font-bold text-stone-900 tracking-tight">Messages</h1>
       <p className="text-[10px] text-stone-400 font-medium tracking-wider">Connect & Collaborate</p>
      </div>
     </div>
     <div className="flex items-center gap-1">
      <IconButton icon={Users} size="sm" disabled tooltip={bothText("This page has no group composer. Start with one person.", "Αυτή η σελίδα δεν έχει σύνταξη ομάδας. Ξεκινήστε με ένα άτομο.")} />
      <IconButton icon={Plus} size="sm" variant="filled" disabled={!selectedConversation}
       tooltip={selectedConversation ? bothText("New message", "Νέο μήνυμα") : composerTip}
       onClick={focusComposer} />
     </div>
    </div>

    {/* Sidebar Tabs: Chats / Intros */}
    <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
     <button onClick={() => setSidebarTab("chats")}
      className={cn("flex-1 min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all",
       sidebarTab === "chats" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
      <MessageSquare className="w-3.5 h-3.5" />
      Chats
      {totalUnread > 0 && <span className="ml-1 px-1.5 py-0.5 bg-stone-900 text-white text-[10px] font-medium rounded-full tabular-nums">{totalUnread}</span>}
     </button>
     <button onClick={() => setSidebarTab("intros")}
      className={cn("flex-1 min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all",
       sidebarTab === "intros" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
      <UserPlus className="w-3.5 h-3.5" />
      Intros
      {connectionRequests.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-stone-800 text-white text-[10px] font-bold rounded-full">{connectionRequests.length}</span>}
     </button>
    </div>

    {/* Search (Chats tab only) */}
    {sidebarTab === "chats" && (
     <>
      <div className="relative">
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
       <input type="text" placeholder="Search messages, people..."
        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full min-h-11 pl-10 pr-10 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 transition-colors" />
       <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors">
         <Filter className="w-3.5 h-3.5" />
        </button>
       </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg">
       {(["all", "unread", "ai"] as MessageFilter[]).map((filter) => (
        <button key={filter} onClick={() => setMessageFilter(filter)}
         className={cn("flex-1 min-h-11 px-2 py-2 text-sm font-medium rounded-md transition-all capitalize",
          messageFilter === filter ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
         {filter === "ai" ? "AI Agents" : filter}
        </button>
       ))}
      </div>
     </>
    )}
   </div>

   {/* Content Area */}
   <div className="flex-1 overflow-y-auto bg-stone-50/30">
    {sidebarTab === "chats" ? (
     /* ── Chats Tab ── */
     filteredConversations.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
       <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-stone-300" />
       </div>
       <p className="text-sm text-stone-600 font-semibold">No conversations yet</p>
       <p className="text-xs text-stone-400 mt-1.5 max-w-[200px] leading-relaxed">Start a new chat or connect with founders in your network</p>
       <div className="mt-4 flex flex-col items-center gap-2">
        <span title={selectedConversation ? undefined : composerTip} className="inline-flex">
         <button type="button" disabled={!selectedConversation} onClick={focusComposer}
          className={cn("flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/15", !selectedConversation && "opacity-50 cursor-not-allowed")}>
          <Plus className="w-3.5 h-3.5" /> {bothText("New message", "Νέο μήνυμα")}
         </button>
        </span>
        <button type="button" className="text-xs font-medium text-stone-900 hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'who is my best match' } }))}>
         Ask assistant who to message
        </button>
       </div>
      </div>
     ) : (
      <div className="px-3 pb-4 space-y-0.5">
       {/* Pinned Section */}
       {pinnedConversations.length > 0 && (
        <>
         <div className="flex items-center gap-2 px-2 py-2">
          <Pin className="w-3 h-3 text-stone-400 rotate-45" />
          <span className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">Pinned</span>
         </div>
         {pinnedConversations.map(c => renderConvCard(c, true))}
         <div className="h-px bg-stone-200 mx-2 my-2" />
        </>
       )}
       {/* Recent Section */}
       {unpinnedConversations.length > 0 && (
        <>
         {pinnedConversations.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-2">
           <Clock className="w-3 h-3 text-stone-400" />
           <span className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase">Recent</span>
          </div>
         )}
         {unpinnedConversations.map(c => renderConvCard(c, false))}
        </>
       )}
      </div>
     )
    ) : (
     /* ── Intros Tab (Connection Requests) ── */
     <div className="px-3 pb-4 space-y-3">
      {connectionRequests.length === 0 ? (
       <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
         <UserPlus className="w-8 h-8 text-stone-300" />
        </div>
        <p className="text-sm text-stone-500 font-medium">No pending intros</p>
        <p className="text-xs text-stone-400 mt-1">You're all caught up!</p>
        <button type="button" className="mt-3 text-xs font-medium text-stone-900 hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'who is my best match' } }))}>
         Ask assistant who to invite
        </button>
       </div>
      ) : (
       connectionRequests.map(req => (
        <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, x: -100 }}
         className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 hover:shadow-md transition-shadow">
         <div className="flex items-start gap-3">
          <Avatar src={req.from.avatar} alt={req.from.fullName} size="md" />
          <div className="flex-1 min-w-0">
           <h4 className="text-sm font-semibold text-stone-900">{req.from.fullName}</h4>
           <p className="text-xs text-stone-500 truncate">{req.from.headline}</p>
           {req.from.role && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-medium rounded-full">{req.from.role}</span>
           )}
          </div>
          <span className="text-[10px] text-stone-400 shrink-0">
           {new Date(req.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
         </div>
         {req.message && (
          <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg leading-relaxed italic">"{req.message}"</p>
         )}
         <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about ${req.from.fullName}`, context: req.from.fullName } }))}
           className="px-3 py-2 bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-lg hover:border-stone-900 transition-all">
           Ask
          </button>
          <button onClick={() => handleAcceptIntro(req.id)}
           className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-all">
           <Check className="w-3.5 h-3.5" /> Accept
          </button>
          <button onClick={() => handleDeclineIntro(req.id)}
           className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-600 text-xs font-medium rounded-lg hover:bg-stone-200 transition-all">
           <X className="w-3.5 h-3.5" /> Decline
          </button>
         </div>
        </motion.div>
       ))
      )}
     </div>
    )}
   </div>

   {/* Bottom Actions */}
   <div className="p-3 border-t border-stone-100">
    <div className="flex items-center justify-between">
     <button type="button" title="Opens the same studio assistant as the corner control — stays on Messages." onClick={() => window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', { detail: { agentId: 'a1', prompt: 'Draft a reply in this thread' } }))}
      className={cn("flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
       "hover:bg-stone-100 text-stone-500")}>
      <BrainCircuit className="w-4 h-4" />
      <span className="text-xs font-semibold">AI Center</span>
     </button>
     <button className="flex items-center gap-2 p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all">
      <Settings className="w-4 h-4" />
     </button>
    </div>
   </div>
  </aside>
 );

 // =============================================================================
 // RENDER: MAIN CHAT AREA
 // =============================================================================

 const renderMessageBubble = (msg: Message, idx: number) => {
  const isMe = msg.senderId === user.id;
  const showAvatar = idx === 0 || chatMessages[idx - 1]?.senderId !== msg.senderId;
  const reactions = msg.reactions || [];
  const hasThread = (msg.threadCount || 0) > 0;

  // Date separator logic
  const showDateSep = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(chatMessages[idx - 1]?.createdAt ?? 0).toDateString();

  return (
   <div key={msg.id}>
    {showDateSep && <DateSeparator date={msg.createdAt} />}
    <motion.div
     initial={{ opacity: 0, y: 10 }}
     animate={{ opacity: 1, y: 0 }}
     className={cn("flex items-end gap-2 group/message", isMe ? "flex-row-reverse" : "flex-row")}
    >
     {/* Avatar */}
     {!isMe && (
      <div className="w-8 h-8 shrink-0">
       {showAvatar ? (
        <Avatar src={activeConv?.otherParticipant.profile?.profilePhoto} alt={msg.senderName || "User"} size="sm" />
       ) : <div className="w-full h-full" />}
      </div>
     )}

     {/* Message Content */}
     <div className={cn("max-w-[75%] sm:max-w-[65%] space-y-1", isMe ? "items-end" : "items-start")}>
      {/* Bubble */}
      <div className={cn(
       "relative px-4 py-2.5 rounded-2xl text-sm shadow-sm",
       isMe ? "bg-stone-900 text-white rounded-br-lg"
        : msg.isAI ? "bg-stone-50 text-stone-900 border border-stone-200 rounded-bl-lg"
        : "bg-white text-stone-800 border border-stone-200 rounded-bl-lg"
      )}>
       {/* AI Badge */}
       {msg.isAI && (
        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-stone-200/50">
         <Sparkles className="w-3 h-3 text-stone-500" />
         <span className="text-[10px] font-semibold text-stone-600 tracking-wider">{activeConv?.otherParticipant.fullName}</span>
        </div>
       )}

       {/* Reply Reference */}
       {msg.replyTo && (
        <div className={cn("mb-2 p-2 rounded-lg text-xs border-l-2",
         isMe ? "bg-stone-800 border-stone-600" : "bg-stone-50 border-stone-300")}>
         <p className={cn("font-medium", isMe ? "text-stone-300" : "text-stone-600")}>{msg.replyTo.senderName}</p>
         <p className={cn("truncate", isMe ? "text-stone-400" : "text-stone-500")}>{msg.replyTo.body}</p>
        </div>
       )}

       {/* Message Body */}
       <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>

       {/* Attachments */}
       {msg.attachments && msg.attachments.length > 0 && (
        <div className="mt-2 space-y-1.5">
         {msg.attachments.map((att, i) => (
          <div key={i} className={cn("flex items-center gap-2 p-2 rounded-lg", isMe ? "bg-stone-800" : "bg-stone-100")}>
           <FileText className={cn("w-4 h-4", isMe ? "text-stone-400" : "text-stone-500")} />
           <span className={cn("text-xs", isMe ? "text-stone-300" : "text-stone-600")}>{att.name}</span>
           <Download className={cn("w-3 h-3 ml-auto cursor-pointer", isMe ? "text-stone-400" : "text-stone-500")} />
          </div>
         ))}
        </div>
       )}

       {/* Hover Actions (expanded) */}
       <div className={cn("flex flex-wrap gap-0.5 mt-2 md:absolute md:-top-1 md:mt-0 md:opacity-0 md:group-hover/message:opacity-100 transition-opacity z-10",
        isMe ? "justify-end md:right-full md:mr-1" : "md:left-full md:ml-1")}>
        <div className="flex items-center gap-0.5 p-1 bg-white rounded-lg shadow-lg border border-stone-200">
         <button type="button" aria-label="Reply" onClick={() => setReplyingTo(msg)} className="min-h-11 min-w-11 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md" title="Reply">
          <Reply className="w-3.5 h-3.5" />
         </button>
         <button type="button" aria-label="React" onClick={() => setShowEmojiPicker(msg.id)} className="min-h-11 min-w-11 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md" title="React">
          <Smile className="w-3.5 h-3.5" />
         </button>
         <button type="button" aria-label="Copy" className="min-h-11 min-w-11 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md" title="Copy"
          onClick={() => navigator.clipboard.writeText(msg.body)}>
          <Copy className="w-3.5 h-3.5" />
         </button>
         <button type="button" aria-label="Forward" className="min-h-11 min-w-11 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md" title="Forward">
          <Forward className="w-3.5 h-3.5" />
         </button>
         <button type="button" aria-label="Bookmark" className="min-h-11 min-w-11 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md" title="Bookmark">
          <Bookmark className="w-3.5 h-3.5" />
         </button>
        </div>
       </div>

       {/* Emoji Picker Popup */}
       {showEmojiPicker === msg.id && (
        <div className={cn("absolute -bottom-10 z-20 flex items-center gap-1 p-1.5 bg-white rounded-xl shadow-xl border border-stone-200",
         isMe ? "right-0" : "left-0")}>
         {EMOJI_REACTIONS.slice(0, 6).map(emoji => (
          <button key={emoji} onClick={() => setShowEmojiPicker(false)}
           className="w-7 h-7 flex items-center justify-center text-base hover:bg-stone-100 rounded-lg transition-colors">{emoji}</button>
         ))}
        </div>
       )}
      </div>

      {/* Meta Row */}
      <div className={cn("flex items-center gap-2 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
       <span className="text-[10px] text-stone-400">
        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
       </span>
       {isMe && (
        <span className="text-stone-400">
         {msg.readStatus ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />}
        </span>
       )}
       {hasThread && (
        <button className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-900">
         <MessageCircle className="w-3 h-3" />
         {msg.threadCount} replies
        </button>
       )}
      </div>

      {/* Reactions */}
      {reactions.length > 0 && (
       <div className={cn("flex items-center gap-1 flex-wrap", isMe ? "justify-end" : "justify-start")}>
        {reactions.map((reaction, i) => (
         <button key={i} className={cn("px-1.5 py-0.5 rounded-full text-xs border transition-all",
          reaction.userIds.includes(user.id) ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300")}>
          {reaction.emoji} {reaction.userIds.length > 1 && reaction.userIds.length}
         </button>
        ))}
       </div>
      )}
     </div>
    </motion.div>
   </div>
  );
 };

 const renderMainChat = () => {
  if (!activeConv) {
   return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50 relative overflow-hidden">

     <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 max-w-lg w-full">

      {/* Logo icon */}
      <div className="relative w-20 h-20 mx-auto mb-8">
       <div className="w-full h-full bg-stone-900 rounded-xl flex items-center justify-center">
        <MessageSquare className="w-9 h-9 text-white" />
       </div>
      </div>

      <h2 className="text-2xl font-bold text-stone-900 mb-2 tracking-tight">Your Communication Hub</h2>
      <p className="text-sm text-stone-500 max-w-sm mx-auto mb-8 leading-relaxed">
       Connect with co-founders, mentors, and AI agents. Schedule meetings, share files, and collaborate seamlessly.
      </p>

      {/* Quick stats row */}
      <div className="flex items-center justify-center gap-3 mb-8">
       {[
        { label: "Conversations", value: msgState.conversations.length, icon: MessageSquare, color: "bg-stone-900 text-white" },
        { label: "Unread", value: totalUnread, icon: MessageCircle, color: totalUnread > 0 ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600" },
        { label: "AI Agents", value: MOCK_AGENTS.length, icon: BrainCircuit, color: "bg-stone-100 text-stone-600" },
       ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-stone-200 rounded-xl shadow-sm">
         <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-3.5 h-3.5" />
         </div>
         <div className="text-left">
          <p className="text-base font-bold text-stone-900 leading-none">{value}</p>
          <p className="text-[10px] text-stone-400 font-medium tracking-wider">{label}</p>
         </div>
        </div>
       ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-2.5 w-full mx-auto">
       <span title={selectedConversation ? undefined : composerTip} className="w-full">
        <button type="button" disabled={!selectedConversation} onClick={focusComposer}
         className={cn("w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all shadow-sm  ", !selectedConversation && "opacity-50 cursor-not-allowed")}>
         <Plus className="w-4 h-4" /> {bothText("New message", "Νέο μήνυμα")}
        </button>
       </span>
       <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', { detail: { agentId: 'a1' } }))}
        className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-white text-stone-700 border border-stone-200 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-all">
        <Sparkles className="w-4 h-4" /> Talk to AI Agent
       </button>
       <div className="flex items-center gap-2.5 w-full">
        <a href="/discovery"
         className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-stone-600 border border-stone-200 rounded-xl text-xs font-medium hover:bg-stone-50 hover:border-stone-300 transition-all">
         <Users className="w-3.5 h-3.5" /> Find People
        </a>
        <a href="/network"
         className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-stone-600 border border-stone-200 rounded-xl text-xs font-medium hover:bg-stone-50 hover:border-stone-300 transition-all">
         <UserIcon className="w-3.5 h-3.5" /> Connections
        </a>
       </div>
      </div>

      {/* Recent contacts strip */}
      {msgState.conversations.length > 0 && (
       <div className="mt-8 pt-6 border-t border-stone-200/60">
        <p className="text-[10px] font-semibold text-stone-400 tracking-wide uppercase mb-3">Recent Conversations</p>
        <div className="flex items-center justify-center gap-2">
         {msgState.conversations.slice(0, 6).map(conv => (
          <button key={conv.id} onClick={() => { setSelectedConversation(conv.id); markAsRead(conv.id); }}
           className="group relative" title={conv.otherParticipant.fullName}>
           <Avatar src={conv.otherParticipant.profile?.profilePhoto || avatarFor(conv.otherParticipant.id)} alt={conv.otherParticipant.fullName} size="md" />
           {conv.otherParticipant.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
           )}
           {conv.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-stone-900 text-white text-[9px] font-medium rounded-full flex items-center justify-center tabular-nums">
             {conv.unreadCount}
            </div>
           )}
          </button>
         ))}
        </div>
       </div>
      )}
     </motion.div>
    </div>
   );
  }

  return (
   <div className="flex-1 flex flex-col min-w-0">
    {/* Header */}
    <header className="border-b border-stone-100 bg-white shrink-0">
     <div className="min-h-16 flex items-center gap-2 px-3 sm:px-5 py-2">
      <button type="button" aria-label="Back to conversations" onClick={() => setSelectedConversation(null)} className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center text-stone-600 hover:bg-stone-100 rounded-xl shrink-0">
       <ChevronLeft className="w-5 h-5" />
      </button>
      <Avatar src={activeConv.otherParticipant.profile?.profilePhoto} alt={activeConv.otherParticipant.fullName}
       size="md" status={activeConv.otherParticipant.isOnline ? "online" : "offline"} isAI={activeConv.otherParticipant.isAI} />
      <div className="min-w-0 flex-1">
       <div className="flex items-center gap-2 min-w-0">
        <h2 className="font-bold text-stone-900 text-sm tracking-tight truncate">{activeConv.otherParticipant.fullName}</h2>
        {activeConv.otherParticipant.roles?.[0] && (
         <span className="hidden sm:inline px-2 py-0.5 bg-stone-100 text-stone-500 text-[9px] rounded-full font-semibold tracking-wider shrink-0">{activeConv.otherParticipant.roles[0]}</span>
        )}
       </div>
       <p className="text-xs text-stone-500 truncate">
        {isRecipientTyping ? (
         <span className="text-emerald-600 font-medium animate-pulse">typing...</span>
        ) : activeConv.otherParticipant.isAI ? "AI Assistant \u2022 Always online"
         : activeConv.otherParticipant.isOnline ? (
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" /> Online now</span>
         ) : "Last seen recently"}
       </p>
      </div>
      <div className="relative shrink-0">
       <IconButton icon={MoreVertical} size="sm" tooltip="More options" onClick={() => setOpenMenu(openMenu === "chat-more" ? null : "chat-more")} />
       <div className={cn("absolute right-0 top-full mt-1 w-48 bg-white border border-stone-200 rounded-xl shadow-sm z-30", openMenu === "chat-more" ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button type="button" onClick={() => setOpenMenu(null)} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-stone-600 hover:bg-stone-50 rounded-t-xl">
         <UserIcon className="w-4 h-4" /> View Profile
        </button>
        <button type="button" onClick={() => { setShowValidationDialog(true); setOpenMenu(null); }}
         className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-stone-600 hover:bg-stone-50">
         <Shield className="w-4 h-4" /> Conversation Mode
        </button>
        <div className="h-px bg-stone-100 mx-2" />
        <button type="button" onClick={() => { setReportBlockModal({ open: true, mode: 'report' }); setOpenMenu(null); }}
         className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-amber-600 hover:bg-amber-50">
         <Flag className="w-4 h-4" /> Report
        </button>
        <button type="button" onClick={() => { setReportBlockModal({ open: true, mode: 'block' }); setOpenMenu(null); }}
         className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl">
         <Ban className="w-4 h-4" /> Block
        </button>
       </div>
      </div>
     </div>
     <div className="md:hidden flex items-center gap-2 overflow-x-auto px-3 pb-3">
      <button type="button" title="Does not start a live call. Opens the studio assistant to draft the first line." className="shrink-0 min-h-11 px-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'How do I start a voice call?' } }))}>Call</button>
      <button type="button" title="Does not start a live call. Opens the studio assistant to draft the first line." className="shrink-0 min-h-11 px-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'How do I start a video call?' } }))}>Video</button>
      <button type="button" onClick={() => { setShowSearchPanel(!showSearchPanel); setChatSearchQuery(""); }} className="shrink-0 min-h-11 px-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700">Search</button>
      <button type="button" onClick={() => togglePin(activeConv.id)} className="shrink-0 min-h-11 px-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700">{pinnedConvIds.has(activeConv.id) ? "Unpin" : "Pin"}</button>
      <button type="button" onClick={() => setShowRightSidebar(!showRightSidebar)} className="shrink-0 min-h-11 px-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700">Details</button>
     </div>
     <div className="hidden md:flex items-center gap-1 px-5 pb-3">
      {/* Validation badge — dynamic */}
      <button onClick={() => setShowValidationDialog(true)}
       className={cn("hidden sm:flex items-center gap-1 mr-1 px-2 py-1 rounded-lg transition-colors",
        MODE_CONFIG[validationState.mode].bgColor)}>
       {(() => { const VIcon = MODE_CONFIG[validationState.mode].icon; return <VIcon className={cn("w-3 h-3", MODE_CONFIG[validationState.mode].color)} />; })()}
       <span className={cn("text-[10px] font-medium", MODE_CONFIG[validationState.mode].color)}>{MODE_CONFIG[validationState.mode].label}</span>
      </button>
      <IconButton icon={Phone} size="sm" tooltip="Does not start a live call — drafts the first line in the studio assistant" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'How do I start a voice call?' } }))} />
      <IconButton icon={Video} size="sm" tooltip="Does not start a live call — drafts the first line in the studio assistant" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'How do I start a video call?' } }))} />
      <IconButton icon={Search} size="sm" tooltip="Search in chat" active={showSearchPanel}
       onClick={() => { setShowSearchPanel(!showSearchPanel); setChatSearchQuery(""); }} />
      <div className="w-px h-6 bg-stone-200 mx-1" />
      <IconButton icon={Pin} size="sm" tooltip={pinnedConvIds.has(activeConv.id) ? "Unpin" : "Pin"}
       active={pinnedConvIds.has(activeConv.id)} onClick={() => togglePin(activeConv.id)} />
      <IconButton icon={Info} size="sm" tooltip="Details" active={showRightSidebar}
       onClick={() => setShowRightSidebar(!showRightSidebar)} />
     </div>
    </header>

    {/* In-Chat Search Panel */}
    <AnimatePresence>
     {showSearchPanel && (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
       exit={{ height: 0, opacity: 0 }} className="border-b border-stone-200 bg-white overflow-hidden shrink-0">
       <div className="p-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input type="text" placeholder="Search in this conversation..." value={chatSearchQuery}
         onChange={(e) => setChatSearchQuery(e.target.value)} autoFocus
         className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-stone-400" />
        <span className="text-[10px] text-stone-400">
         {chatSearchQuery ? `${chatMessages.filter(m => m.body.toLowerCase().includes(chatSearchQuery.toLowerCase())).length} found` : ""}
        </span>
         <button type="button" aria-label="Close search" onClick={() => { setShowSearchPanel(false); setChatSearchQuery(""); }}
         className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-400 hover:text-stone-900 rounded">
         <X className="w-4 h-4" />
        </button>
       </div>
      </motion.div>
     )}
    </AnimatePresence>

    {/* Messages Area */}
    <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gradient-to-b from-stone-50/50 to-white">
     {/* Load older messages */}
     {chatMessages.length > 10 && (
      <div className="flex justify-center py-2">
       <button className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors">
        Load older messages
       </button>
      </div>
     )}
     {chatMessages.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-center">
       <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        {activeConv.otherParticipant.isAI ? <Sparkles className="w-8 h-8 text-stone-400" /> : <MessageCircle className="w-8 h-8 text-stone-300" />}
       </div>
       <p className="text-sm text-stone-500 font-medium">
        {activeConv.otherParticipant.isAI ? `Start chatting with ${activeConv.otherParticipant.fullName}` : "No messages yet. Say hello!"}
       </p>
       {activeConv.otherParticipant.isAI && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-sm">
         {MOCK_AGENTS.find(a => a.id === activeConv.otherParticipant.id)?.suggestedPrompts?.slice(0, 3).map((prompt, i) => (
          <button key={i} onClick={() => handleSendMessage(prompt)}
           className="px-3 py-1.5 bg-stone-100 text-stone-700 text-xs rounded-full hover:bg-stone-100 transition-colors">{prompt}</button>
         ))}
        </div>
       )}
      </div>
     ) : (
      <>
       {chatMessages.map((msg, idx) => renderMessageBubble(msg, idx))}
       {aiIsTyping && (
        <div className="flex items-center gap-3">
         <Avatar src={activeConv.otherParticipant.profile?.profilePhoto} alt={activeConv.otherParticipant.fullName} size="sm" isAI={true} />
         <TypingDots />
        </div>
       )}
       {isRecipientTyping && !aiIsTyping && (
        <div className="flex items-center gap-3">
         <Avatar src={activeConv.otherParticipant.profile?.profilePhoto} alt={activeConv.otherParticipant.fullName} size="sm" />
         <TypingDots />
        </div>
       )}
      </>
     )}
     <div ref={messagesEndRef} />
    </div>

    {/* Input Area */}
    <div className="px-3 py-3 bg-white border-t border-stone-100 space-y-2 shrink-0 sm:px-5">
     {/* Reply Preview */}
     {replyingTo && (
      <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border-l-2 border-stone-400">
       <div className="flex items-center gap-2 min-w-0">
        <Reply className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <div className="min-w-0">
         <span className="text-xs font-medium text-stone-700">{replyingTo.senderName}</span>
         <p className="text-xs text-stone-500 truncate">{replyingTo.body}</p>
        </div>
       </div>
       <button onClick={() => setReplyingTo(null)} className="p-1 text-stone-400 hover:text-stone-900 shrink-0">
        <X className="w-3.5 h-3.5" />
       </button>
      </div>
     )}

     {/* File Attachments Preview */}
     {attachedFiles.length > 0 && (
      <div className="flex flex-wrap gap-2">
       {attachedFiles.map((file, i) => (
        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-stone-100 rounded-lg">
         <FileText className="w-3.5 h-3.5 text-stone-500" />
         <span className="text-xs text-stone-600 truncate max-w-[120px]">{file.name}</span>
         <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
          className="p-0.5 text-stone-400 hover:text-red-500"><X className="w-3 h-3" /></button>
        </div>
       ))}
      </div>
     )}

     {/* AI Suggestions */}
     {isAIChat && !inputText && (
      <div className="flex flex-wrap gap-1.5">
       {MOCK_AGENTS.find(a => a.id === activeConv.otherParticipant.id)?.suggestedPrompts?.map((prompt, i) => (
        <button key={i} onClick={() => handleSendMessage(prompt)}
         className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs rounded-full hover:bg-stone-100 transition-colors border border-stone-200">{prompt}</button>
       ))}
      </div>
     )}

     {/* Voice Recorder */}
     {isRecording ? (
      <div className="flex items-center gap-3 p-2 bg-red-50 rounded-xl border border-red-200">
       <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
       <span className="text-sm font-mono text-red-700 font-medium">{formatRecTime(recordingTime)}</span>
       <div className="flex-1 h-1.5 bg-red-200 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: `${Math.min(100, (recordingTime / 120) * 100)}%` }} />
       </div>
       <button onClick={() => { setIsRecording(false); setRecordingTime(0); }}
        className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg" title="Cancel"><X className="w-4 h-4" /></button>
       <button onClick={() => { setIsRecording(false); setRecordingTime(0); handleSendMessage("[Voice message]"); }}
        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600" title="Send"><Send className="w-4 h-4" /></button>
      </div>
     ) : (
      /* Input Row */
      <div className="flex items-end gap-2">
       <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
       <IconButton icon={Paperclip} size="sm" tooltip="Attach files" onClick={() => fileInputRef.current?.click()} />
       <IconButton icon={Mic} size="sm" tooltip="Voice message" onClick={() => { setIsRecording(true); setRecordingTime(0); }} />

       <div className="flex-1 relative">
        <textarea ref={textareaRef} value={inputText}
         onChange={(e) => { handleTypingChange(e.target.value); autoResizeTextarea(); }}
         onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
         placeholder={isAIChat ? "Ask anything... (Shift+Enter for new line)" : "Type a message... (Shift+Enter for new line)"}
         rows={1}
         className="w-full px-4 py-2.5 pr-10 bg-stone-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 transition-all resize-none min-h-[44px] max-h-[120px]" />
        <div className="absolute right-2 bottom-2">
         <button onClick={() => setShowEmojiDropdown(!showEmojiDropdown)} className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition-colors">
          <Smile className="w-4 h-4" />
         </button>
         {/* Emoji Grid Dropdown */}
         {showEmojiDropdown && (
          <div className="absolute bottom-12 right-0 p-2 bg-white rounded-xl shadow-sm border border-stone-200 z-30 w-[min(18rem,calc(100vw-2rem))]">
           <div className="grid grid-cols-6 gap-1">
            {EMOJI_GRID.map(e => (
             <button key={e} type="button" onClick={() => { setInputText(prev => prev + e); setShowEmojiDropdown(false); textareaRef.current?.focus(); }}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-stone-100 text-base transition-colors">{e}</button>
            ))}
           </div>
          </div>
         )}
        </div>
       </div>

       <button onClick={() => handleSendMessage()} disabled={!inputText.trim() && attachedFiles.length === 0}
        className="w-11 h-11 bg-stone-900 text-white rounded-xl flex items-center justify-center hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 self-end">
        <Send className="w-4 h-4" />
       </button>
      </div>
     )}
    </div>
   </div>
  );
 };

 // =============================================================================
 // RENDER: RIGHT SIDEBAR (Chat Details)
 // =============================================================================

 const renderRightSidebar = () => {
  if (!showRightSidebar || !activeConv) return null;

  return (
   <motion.aside
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col bg-white overflow-hidden max-xl:fixed max-xl:inset-0 max-xl:z-[80] xl:w-80 xl:shrink-0 xl:border-l xl:border-stone-200"
   >
    {/* Close button */}
    <div className="flex items-center justify-between p-3 border-b border-stone-100">
     <h4 className="text-xs font-semibold text-stone-500 tracking-wider uppercase">Details</h4>
     <button type="button" aria-label="Close details" onClick={() => setShowRightSidebar(false)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"><X className="w-4 h-4" /></button>
    </div>

    <div className="flex-1 overflow-y-auto">
     {/* Profile Section */}
     <div className="p-5 text-center border-b border-stone-100">
      <div className="relative inline-block mb-3">
       <Avatar src={activeConv.otherParticipant.profile?.profilePhoto} alt={activeConv.otherParticipant.fullName}
        size="xl" isAI={activeConv.otherParticipant.isAI} />
       {activeConv.otherParticipant.isOnline && (
        <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
       )}
      </div>
      <h3 className="font-semibold text-stone-900 text-sm mb-0.5">{activeConv.otherParticipant.fullName}</h3>
      <p className="text-xs text-stone-500 mb-3">
       {activeConv.otherParticipant.roles?.join(" \u2022 ") || "Co-founder"}
      </p>
      <div className="flex items-center justify-center gap-2">
       <button className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-all">
        <UserIcon className="w-3 h-3" /> View Profile
       </button>
       <button className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all">
        <MoreVertical className="w-3.5 h-3.5" />
       </button>
      </div>
     </div>

     {/* Quick Actions */}
     <div className="p-3 border-b border-stone-100">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
       {[
        { icon: Phone, label: "Call" },
        { icon: Video, label: "Video" },
        { icon: Calendar, label: "Meet" },
        { icon: CheckSquare, label: "Task" },
       ].map(({ icon: Icon, label }) => (
        <button key={label} className="flex flex-col items-center justify-center gap-1 min-h-16 p-2 rounded-xl hover:bg-stone-50 transition-all">
         <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-stone-600" />
         </div>
         <span className="text-[10px] text-stone-500">{label}</span>
        </button>
       ))}
      </div>
     </div>

     {/* Shared Media */}
     <div className="p-3 border-b border-stone-100">
      <div className="flex items-center justify-between mb-2">
       <h4 className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase">Shared Media</h4>
       <button className="text-[10px] text-stone-400 hover:text-stone-900">See all</button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
       {SHARED_MEDIA_MOCK.map(i => (
        <div key={i} className="aspect-square bg-stone-100 rounded-lg overflow-hidden hover:opacity-80 cursor-pointer transition-opacity">
         <img src={`https://picsum.photos/seed/media-${i}/100/100`} alt="Media" className="w-full h-full object-cover" />
        </div>
       ))}
      </div>
     </div>

     {/* Shared Files */}
     <div className="p-3 border-b border-stone-100">
      <div className="flex items-center justify-between mb-2">
       <h4 className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase">Shared Files</h4>
       <button className="text-[10px] text-stone-400 hover:text-stone-900">See all</button>
      </div>
      <div className="space-y-1.5">
       {SHARED_FILES_MOCK.map(({ name, size, icon: Icon, date }) => (
        <div key={name} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 cursor-pointer group">
         <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors shrink-0">
          <Icon className="w-3.5 h-3.5 text-stone-500" />
         </div>
         <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-stone-900 truncate">{name}</p>
          <p className="text-[10px] text-stone-500">{size} \u2022 {date}</p>
         </div>
         <Download className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100 shrink-0" />
        </div>
       ))}
      </div>
     </div>

     {/* Conversation Validation — Full */}
     <div className="p-3 border-b border-stone-100">
      <div className="flex items-center justify-between mb-2">
       <h4 className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase">Conversation Mode</h4>
       <button onClick={() => setShowValidationDialog(true)}
        className="text-[10px] text-stone-400 hover:text-stone-900 transition-colors">Change</button>
      </div>

      {/* Current Mode Card */}
      {(() => { const cfg = MODE_CONFIG[validationState.mode]; const VIcon = cfg.icon; return (
       <div className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border mb-2", cfg.bgColor,
        validationState.mode === 'casual' ? "border-stone-200" : validationState.mode === 'one_party' ? "border-amber-200" : "border-emerald-200")}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bgColor)}>
         <VIcon className={cn("w-3.5 h-3.5", cfg.color)} />
        </div>
        <div className="min-w-0 flex-1">
         <p className="text-xs font-medium text-stone-900">{cfg.label}</p>
         <p className="text-[10px] text-stone-500">{cfg.description}</p>
        </div>
        <Check className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
       </div>
      ); })()}

      {/* Validation Hash Display */}
      {validationState.validationHash && (
       <div className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 mb-2">
        <span className="text-[10px] text-stone-400 font-mono truncate flex-1">{validationState.validationHash}</span>
        <button onClick={copyValidationHash} className="p-1 text-stone-400 hover:text-stone-900 rounded shrink-0">
         {hashCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
       </div>
      )}

      {/* Transcript Export */}
      {validationState.transcriptAvailable && (
       <div className="flex items-center gap-1.5">
        <button onClick={() => handleExportTranscript('txt')}
         className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-all">
         <FileText className="w-3 h-3" /> Export .txt
        </button>
        <button onClick={() => handleExportTranscript('json')}
         className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-all">
         <Download className="w-3 h-3" /> Export .json
        </button>
       </div>
      )}
     </div>

     {/* Chat Settings */}
     <div className="p-3">
      <h4 className="text-[10px] font-semibold text-stone-500 tracking-wider uppercase mb-2">Settings</h4>
      <div className="space-y-0.5">
       <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 rounded-xl transition-all">
        <BellOff className="w-3.5 h-3.5" /> Mute Notifications
       </button>
       <button onClick={() => togglePin(activeConv.id)}
        className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all",
         pinnedConvIds.has(activeConv.id) ? "text-stone-800 bg-stone-100" : "text-stone-600 hover:bg-stone-50")}>
        <Pin className="w-3.5 h-3.5" /> {pinnedConvIds.has(activeConv.id) ? "Unpin Conversation" : "Pin Conversation"}
       </button>
       <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 rounded-xl transition-all">
        <Archive className="w-3.5 h-3.5" /> Archive Chat
       </button>
       <button onClick={() => setReportBlockModal({ open: true, mode: 'report' })}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
        <Flag className="w-3.5 h-3.5" /> Report User
       </button>
       <button onClick={() => setReportBlockModal({ open: true, mode: 'block' })}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-all">
        <Ban className="w-3.5 h-3.5" /> Block User
       </button>
       <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-all">
        <Trash2 className="w-3.5 h-3.5" /> Delete Chat
       </button>
      </div>
     </div>
    </div>
   </motion.aside>
  );
 };

 // =============================================================================
 // RENDER: AI CENTER VIEW
 // =============================================================================

 const renderAICenter = () => (
  <div className="flex-1 flex flex-col bg-gradient-to-br from-stone-50 via-white to-white overflow-hidden">
   {/* AI Center Header */}
   <header className="flex flex-col gap-3 px-4 sm:px-6 py-3 border-b border-stone-100 bg-white/80 shrink-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
     <div className="w-10 h-10 bg-stone-900 rounded-2xl flex items-center justify-center ">
      <BrainCircuit className="w-5 h-5 text-white" />
     </div>
     <div>
      <h1 className="font-bold text-stone-900 tracking-tight">AI Center</h1>
      <p className="text-[10px] text-stone-400 font-medium tracking-wider">Intelligent startup assistant</p>
     </div>
    </div>
    <div className="scroll-tabs p-1 bg-stone-100 rounded-xl">
     {([
      { id: "chat", label: "Chat", icon: MessageSquare },
      { id: "agents", label: "Agents", icon: Users },
      { id: "insights", label: "Insights", icon: Lightbulb },
      { id: "history", label: "History", icon: Clock },
     ] as { id: AIView; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
      <button
       key={id}
       onClick={() => setAiView(id)}
       className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        aiView === id
         ? "bg-white text-stone-900 shadow-sm"
         : "text-stone-500 hover:text-stone-700"
       )}
      >
       <Icon className="w-3.5 h-3.5" />
       {label}
      </button>
     ))}
    </div>
   </header>

   {/* AI View Content */}
   <div className="flex-1 overflow-y-auto p-6">
    {aiView === "agents" && (
     <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
       <h2 className="text-lg font-bold text-stone-900 mb-1.5 tracking-tight">AI Agents</h2>
       <p className="text-sm text-stone-500">Specialized AI assistants for every aspect of your startup journey</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {MOCK_AGENTS.map((agent) => (
        <motion.div
         key={agent.id}
         whileHover={{ scale: 1.02 }}
         className="p-5 bg-white border border-stone-200 rounded-2xl transition-all cursor-pointer group"
         onClick={() => {
          window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', { detail: { agentId: agent.id } }));
          setActiveView("chat");
         }}
        >
         <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden shrink-0">
           <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
           <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-stone-900">{agent.name}</h3>
            <Sparkles className="w-4 h-4 text-stone-500" />
           </div>
           <p className="text-xs text-stone-600 font-semibold mb-1.5">{agent.role}</p>
           <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{agent.description}</p>
           <div className="mt-3 flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap, i) => (
             <span key={i} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-full">
              {cap}
             </span>
            ))}
           </div>
          </div>
         </div>
        </motion.div>
       ))}
      </div>
     </div>
    )}

    {aiView === "insights" && (
     <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-stone-900 mb-4 tracking-tight">AI Insights & Suggestions</h2>
      {aiInsights.length === 0 ? (
       <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <p className="text-sm text-stone-500">Start chatting with AI agents to generate insights</p>
       </div>
      ) : (
       aiInsights.map((insight) => (
        <div key={insight.id} className="p-4 bg-white border border-stone-200 rounded-xl">
         <div className="flex items-start gap-3">
          <div className={cn(
           "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
           insight.type === "action" ? "bg-amber-100 text-amber-600" :
           insight.type === "suggestion" ? "bg-stone-100 text-stone-600" :
           "bg-emerald-100 text-emerald-600"
          )}>
           {insight.type === "action" ? <Zap className="w-4 h-4" /> :
            insight.type === "suggestion" ? <Lightbulb className="w-4 h-4" /> :
            <Target className="w-4 h-4" />
           }
          </div>
          <div className="flex-1">
           <h3 className="font-semibold text-stone-900 text-sm">{insight.title}</h3>
           <p className="text-xs text-stone-500 mt-1 leading-relaxed">{insight.description}</p>
           <div className="flex items-center gap-2 mt-3">
            <span className={cn(
             "text-xs px-2 py-0.5 rounded-full",
             insight.priority === "high" ? "bg-red-100 text-red-700" :
             insight.priority === "medium" ? "bg-amber-100 text-amber-700" :
             "bg-stone-100 text-stone-600"
            )}>
             {insight.priority} priority
            </span>
           </div>
          </div>
         </div>
        </div>
       ))
      )}
     </div>
    )}

    {aiView === "chat" && (
     <div className="flex items-center justify-center h-full">
      <div className="text-center">
       <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-5 h-5 text-stone-500" />
       </div>
       <h3 className="text-lg font-bold text-stone-900 mb-2 tracking-tight">Select an AI Agent</h3>
       <p className="text-sm text-stone-500 max-w-xs mx-auto mb-6 leading-relaxed">
        The corner studio assistant is the same chat. Specialists stay in that panel so Messages is not a second composer.
       </p>
       <button 
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', { detail: { agentId: 'a1' } }))}
        className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all"
       >
        Open studio assistant
       </button>
      </div>
     </div>
    )}

    {aiView === "history" && (
     <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-stone-900 mb-4 tracking-tight">AI Chat History</h2>
      <div className="space-y-2">
       {msgState.conversations
        .filter(c => c.otherParticipant.isAI)
        .map(conv => (
         <button
          key={conv.id}
          onClick={() => {
           setSelectedConversation(conv.id);
           setActiveView("chat");
          }}
          className="w-full flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition-all text-left"
         >
          <Avatar 
           src={conv.otherParticipant.profile?.profilePhoto}
           alt={conv.otherParticipant.fullName}
           size="md"
           isAI={true}
          />
          <div className="flex-1 min-w-0">
           <h3 className="font-semibold text-stone-900 text-sm">{conv.otherParticipant.fullName}</h3>
           <p className="text-xs text-stone-500 truncate">{conv.lastMessage}</p>
          </div>
          <span className="text-xs text-stone-400">{conv.lastMessageTime}</span>
         </button>
        ))}
      </div>
     </div>
    )}
   </div>
  </div>
 );

 // =============================================================================
 // MAIN RENDER
 // =============================================================================

 return (
  <div className="h-[calc(100dvh-4rem)] lg:h-dvh flex overflow-hidden bg-white">
   {/* Left Sidebar */}
   {renderLeftSidebar()}

   {/* Main Content Area */}
   <main className="flex-1 flex flex-col min-w-0">
    <div className="flex-1 flex min-h-0">
     {activeView === "chat" && renderMainChat()}
     {activeView === "ai-center" && renderAICenter()}

     {/* Right Sidebar */}
     <AnimatePresence>
      {activeView === "chat" && renderRightSidebar()}
     </AnimatePresence>
    </div>
   </main>

   {/* Validation Mode Dialog */}
   <AnimatePresence>
    {showValidationDialog && (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setShowValidationDialog(false)}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
       className="bg-white rounded-2xl shadow-sm border border-stone-200 w-full max-w-md mx-2 sm:mx-4 overflow-hidden"
       onClick={(e) => e.stopPropagation()}>
       <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
         <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-stone-600" />
         </div>
         <div>
          <h3 className="text-lg font-semibold text-stone-900">Conversation Validation Mode</h3>
          <p className="text-sm text-stone-500">Choose how this conversation should be validated</p>
         </div>
        </div>
        <div className="space-y-2 mb-4">
         {(Object.entries(MODE_CONFIG) as [ValidationMode, typeof MODE_CONFIG[ValidationMode]][]).map(([mode, cfg]) => {
          const MIcon = cfg.icon;
          const isActive = validationState.mode === mode;
          return (
           <button key={mode} onClick={() => handleValidationModeChange(mode)}
            className={cn("w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
             isActive ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50")}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.bgColor)}>
             <MIcon className={cn("w-5 h-5", cfg.color)} />
            </div>
            <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-stone-900">{cfg.label}</p>
              {isActive && (
               <span className="px-1.5 py-0.5 bg-stone-200 text-stone-600 text-[9px] rounded-full font-medium">Current</span>
              )}
             </div>
             <p className="text-xs text-stone-500 mt-0.5">{cfg.description}</p>
             {mode === 'two_party' && activeConv && (
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
               <Flag className="w-3 h-3" /> Requires acceptance from {activeConv.otherParticipant.fullName}
              </p>
             )}
            </div>
           </button>
          );
         })}
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 mb-4">
         <div className="flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-stone-400 mt-0.5" />
          <div className="text-[11px] text-stone-500">
           <p className="font-medium text-stone-700 mb-1">About validation modes</p>
           <ul className="space-y-0.5">
            <li><strong>Casual:</strong> Standard messaging, no records saved</li>
            <li><strong>One-Party:</strong> You can save transcripts; other party is notified</li>
            <li><strong>Two-Party:</strong> Both agree to validated, verifiable transcript</li>
           </ul>
          </div>
         </div>
        </div>
        <button onClick={() => setShowValidationDialog(false)}
         className="w-full px-4 py-2.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition-all">
         Close
        </button>
       </div>
      </motion.div>
     </motion.div>
    )}
   </AnimatePresence>

   {/* Report/Block Modal */}
   <AnimatePresence>
    {reportBlockModal.open && activeConv && (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setReportBlockModal({ ...reportBlockModal, open: false })}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
       className="bg-white rounded-2xl shadow-sm border border-stone-200 w-full max-w-md mx-2 sm:mx-4 overflow-hidden"
       onClick={(e) => e.stopPropagation()}>
       <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
         <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center",
          reportBlockModal.mode === 'report' ? "bg-amber-100" : "bg-red-100")}>
          {reportBlockModal.mode === 'report'
           ? <Flag className="w-6 h-6 text-amber-600" />
           : <Ban className="w-6 h-6 text-red-600" />}
         </div>
         <div>
          <h3 className="text-lg font-semibold text-stone-900">
           {reportBlockModal.mode === 'report' ? 'Report User' : 'Block User'}
          </h3>
          <p className="text-sm text-stone-500">{activeConv.otherParticipant.fullName}</p>
         </div>
        </div>
        <p className="text-sm text-stone-600 mb-4">
         {reportBlockModal.mode === 'report'
          ? "Report this user for inappropriate behavior. Our team will review the report and take appropriate action."
          : "Blocking this user will prevent them from sending you messages. You can unblock them later from Settings."}
        </p>
        {reportBlockModal.mode === 'report' && (
         <div className="mb-4 space-y-2">
          <label className="text-xs font-semibold text-stone-600">Reason</label>
          <select className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900">
           <option value="">Select a reason...</option>
           <option value="spam">Spam or scam</option>
           <option value="harassment">Harassment</option>
           <option value="inappropriate">Inappropriate content</option>
           <option value="impersonation">Impersonation</option>
           <option value="other">Other</option>
          </select>
          <textarea placeholder="Additional details (optional)..." rows={3}
           className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 resize-none" />
         </div>
        )}
        <div className="flex items-center gap-2">
         <button onClick={() => setReportBlockModal({ ...reportBlockModal, open: false })}
          className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition-all">
          Cancel
         </button>
         <button onClick={() => setReportBlockModal({ ...reportBlockModal, open: false })}
          className={cn("flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all",
           reportBlockModal.mode === 'report' ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700")}>
          {reportBlockModal.mode === 'report' ? 'Submit Report' : 'Block User'}
         </button>
        </div>
       </div>
      </motion.div>
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 );
}
