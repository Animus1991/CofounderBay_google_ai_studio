/**
 * Messages: private conversations with members, the AI specialists, and the
 * introductions (connection requests) that wait for an answer.
 *
 * Everything here reads and writes through `useMessaging()` and the social
 * layer, so the same state is visible to the sidebar badge, the assistant and
 * every other page. Nothing on this page is sample-only for a real account.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
 Search, Plus, MoreVertical, Send, Paperclip, Smile, Phone, Video, Info,
 ChevronLeft, Check, CheckCheck, MessageSquare, Clock, X, FileText, Mic,
 Pin, Reply, Forward, Trash2, Archive, BellOff, Bell, Users,
 Download, Lightbulb, MessageCircle, Copy, Pencil, ExternalLink, AlertCircle,
 BrainCircuit, UserPlus, User as UserIcon, Flag, Ban, Shield, ShieldCheck, Settings, Loader2, Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useMessaging, type ChatConversation, type ChatMessage, type ChatAttachment } from "../context/MessagingContext";
import { MOCK_AGENTS } from "../services/aiService";
import { User } from "../types";
import { useAuth } from "../App";
import { avatarFor, findCast } from "../data/cast";
import { keys, logActivity, readRequests, removeRequest } from "../lib/localLists";
import { labelOf } from "../lib/labels";
import { useLanguage, useT } from "../lib/language";
import { formatDate, formatDateTime, formatTime } from "../lib/dates";
import RelTime from "../components/ui/RelTime";
import Modal from "../components/ui/Modal";
import { ClearFiltersButton } from "../components/ui/EmptyHint";
import { usePageControls } from "../lib/pageControls";
import { useStored } from "../lib/useStored";
import { useToast } from "../context/ToastContext";
import { usePeople } from "../lib/directory";
import { avatarOf, findPerson, isOnline, type Person } from "../lib/peopleSource";
import { REACTIONS, newCallLink, transcriptHash, type ValidationMode } from "../lib/chat";
import { formatBytes, MAX_UPLOAD_BYTES, uploadFile, UploadError } from "../lib/files";
import { downloadJson, downloadText } from "../lib/download";
import { safeMediaUrl, safeWebUrl } from "../lib/webUrl";
import {
 blockPerson,
 connectionRecords,
 otherSide,
 reportContent,
 respondToConnection,
 unblockPerson,
 useBlocks,
 useConnections,
 withdrawConnection,
 type ConnectionRecord,
} from "../lib/social";

// =============================================================================
// TYPES
// =============================================================================
interface CommunicationHubProps { user: User | null; }
type MessageFilter = "all" | "unread" | "ai" | "archived";
type ViewMode = "chat" | "ai-center";
type AIView = "agents" | "insights" | "history";

interface IntroCard {
 id: string;
 from: { id: string; fullName: string; headline?: string; avatar?: string; role?: string };
 message?: string;
 createdAt: string;
 record?: ConnectionRecord;
}

const EMOJI_GRID = ['😀','😂','😍','🥰','😎','🤔','😅','🙈','👍','👎','❤️','🔥','🎉','✅','💡','🚀','💪','🙏','👏','😢','😡','🤝','💰','⭐','🌟','📈','💻','🎯'];
const TYPING_WINDOW = 6_000;

/** Sample introductions shown only while the demo account is open. */
function sampleIntros(): IntroCard[] {
 const make = (id: string, message: string | undefined, hoursAgo: number): IntroCard | null => {
  const person = findCast(id);
  if (!person) return null;
  return {
   id: `sample-${id}`,
   from: { id, fullName: person.fullName, headline: person.headline, avatar: avatarFor(id), role: person.role },
   message,
   createdAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
  };
 };
 return [
  make("jordan-taylor", "Hi! I saw your pitch deck project. I'd love to discuss a potential collaboration on growth strategy.", 1),
  make("elena-rossi", "I mentor startups in the FinTech space — happy to connect!", 24),
  make("daniel-weiss", undefined, 48),
 ].filter((item): item is IntroCard => item !== null);
}

function reactionEmoji(key: string): string {
 return REACTIONS.find((item) => item.key === key)?.emoji ?? key;
}

function isImage(attachment: ChatAttachment): boolean {
 return attachment.type.startsWith("image/");
}

function isAudio(attachment: ChatAttachment): boolean {
 return attachment.type.startsWith("audio/");
}

function readAsDataUrl(file: Blob): Promise<string> {
 return new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error ?? new Error("read-failed"));
  reader.readAsDataURL(file);
 });
}

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================
const Avatar = ({ src, alt, size = "md", status, isAI = false, icon }: {
 src?: string; alt: string; size?: "xs" | "sm" | "md" | "lg" | "xl";
 status?: "online" | "offline"; isAI?: boolean; icon?: string;
}) => {
 const s: Record<string, string> = {
  xs: "w-6 h-6 rounded-lg text-xs", sm: "w-8 h-8 rounded-xl text-xs", md: "w-10 h-10 rounded-2xl text-xs",
  lg: "w-14 h-14 rounded-xl text-sm", xl: "w-20 h-20 rounded-xl text-base"
 };
 const initials = alt.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
 const [failed, setFailed] = useState(false);
 const showImage = Boolean(src) && !failed;
 return (
  <div className={cn("relative shrink-0", s[size])}>
   {showImage ? (
    <img src={src} alt={alt} className="w-full h-full object-cover rounded-[inherit]" onError={() => setFailed(true)} referrerPolicy="no-referrer" />
   ) : isAI ? (
    <div className="w-full h-full rounded-[inherit] bg-stone-900 text-white flex items-center justify-center text-base" aria-hidden="true">{icon || initials}</div>
   ) : (
    <div className="w-full h-full rounded-[inherit] bg-stone-100 border border-stone-200 flex items-center justify-center font-semibold text-stone-600">{initials}</div>
   )}
   {status && !isAI && (
    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white", status === "online" ? "bg-emerald-500" : "bg-stone-300")} />
   )}
  </div>
 );
};

const IconButton = ({ icon: Icon, onClick, active = false, variant = "ghost", badge, tooltip, disabled = false, danger = false }: {
 icon: React.ElementType; onClick?: () => void; active?: boolean;
 variant?: "ghost" | "filled" | "outline"; badge?: number | string; tooltip: string;
 disabled?: boolean; danger?: boolean;
}) => (
 <button type="button" aria-label={tooltip} title={tooltip} disabled={disabled} onClick={onClick} className={cn(
  "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
  disabled && "opacity-50 cursor-not-allowed",
  variant === "ghost" && ["text-stone-500 hover:text-stone-900 hover:bg-stone-100", active && "text-stone-900 bg-stone-100", danger && "hover:text-red-600 hover:bg-red-50"],
  variant === "filled" && ["bg-stone-900 text-white hover:bg-stone-800", active && "bg-stone-700"],
  variant === "outline" && ["border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900", active && "border-stone-900 text-stone-900 bg-stone-50"]
 )}>
  <Icon className="w-4 h-4" />
  {badge !== undefined && (
   <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-stone-900 text-white text-xs font-medium rounded-full flex items-center justify-center tabular-nums">{badge}</span>
  )}
 </button>
);

const TypingDots = () => (
 <div className="flex items-center gap-1 px-4 py-2.5 bg-white border border-stone-200 rounded-2xl rounded-bl-lg w-fit">
  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.15s]" />
  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.3s]" />
 </div>
);

const DateSeparator = ({ at }: { at: number }) => {
 const t = useT();
 const d = new Date(at);
 const today = new Date();
 const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
 const label = d.toDateString() === today.toDateString() ? t("Today", "Σήμερα")
  : d.toDateString() === yesterday.toDateString() ? t("Yesterday", "Χθες")
  : formatDate(d);
 return (
  <div className="flex items-center gap-3 py-4">
   <div className="flex-1 h-px bg-stone-200" />
   <span className="text-xs font-semibold text-stone-400 tracking-wider">{label}</span>
   <div className="flex-1 h-px bg-stone-200" />
  </div>
 );
};

/** A member or specialist to start (or forward) a conversation with. */
function PeoplePicker({ open, onClose, title, description, people, onPick, includeAgents, conversations }: {
 open: boolean; onClose: () => void; title: string; description: string; people: Person[];
 onPick: (id: string) => void; includeAgents?: boolean; conversations?: ChatConversation[];
}) {
 const t = useT();
 const { mode } = useLanguage();
 const [query, setQuery] = useState("");
 useEffect(() => { if (!open) setQuery(""); }, [open]);
 const q = query.trim().toLowerCase();
 const recent = (conversations ?? []).filter((item) => item.kind !== "ai" && (!q || item.other.fullName.toLowerCase().includes(q))).slice(0, 6);
 const recentIds = new Set(recent.map((item) => item.otherId));
 const members = people.filter((person) => !recentIds.has(person.id) && (!q || `${person.fullName} ${person.headline} ${person.role}`.toLowerCase().includes(q))).slice(0, 40);
 const agents = includeAgents ? MOCK_AGENTS.filter((agent) => !q || `${agent.name} ${agent.nameEl || ""} ${agent.role}`.toLowerCase().includes(q)) : [];
 return (
  <Modal open={open} onClose={onClose} title={title} description={description} size="md">
   <div className="space-y-3">
    <div className="relative">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
     <input type="text" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by name, role or headline…", "Αναζήτηση με όνομα, ρόλο ή τίτλο…")}
      className="w-full min-h-11 pl-10 pr-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900" />
    </div>
    <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1">
     {recent.length > 0 && (
      <p className="px-2 pt-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t("Recent", "Πρόσφατα")}</p>
     )}
     {recent.map((item) => (
      <button key={item.id} type="button" onClick={() => onPick(item.otherId)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 text-left">
       <Avatar src={item.other.avatar} alt={item.other.fullName} size="sm" />
       <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 truncate">{item.other.fullName}</p>
        <p className="text-xs text-stone-500 truncate">{item.other.headline || labelOf(item.other.role)}</p>
       </div>
      </button>
     ))}
     {members.length > 0 && (
      <p className="px-2 pt-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t("Members", "Μέλη")}</p>
     )}
     {members.map((person) => (
      <button key={person.id} type="button" onClick={() => onPick(person.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 text-left">
       <Avatar src={avatarOf(person)} alt={person.fullName} size="sm" status={isOnline(person) ? "online" : undefined} />
       <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 truncate">{person.fullName}</p>
        <p className="text-xs text-stone-500 truncate">{person.headline || labelOf(person.role)}</p>
       </div>
       <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">{labelOf(person.role)}</span>
      </button>
     ))}
     {agents.length > 0 && (
      <p className="px-2 pt-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t("AI specialists", "Ειδικοί AI")}</p>
     )}
     {agents.map((agent) => (
      <button key={agent.id} type="button" onClick={() => onPick(agent.id)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 text-left">
       <Avatar alt={agent.name} size="sm" isAI icon={agent.icon} />
       <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 truncate">{mode === "el" ? agent.nameEl || agent.name : agent.name}</p>
        <p className="text-xs text-stone-500 truncate">{mode === "el" ? agent.roleEl || agent.role : agent.role}</p>
       </div>
      </button>
     ))}
     {recent.length === 0 && members.length === 0 && agents.length === 0 && (
      <p className="p-4 text-sm text-stone-500 text-center">{t("No one matches this search.", "Κανένα αποτέλεσμα για αυτή την αναζήτηση.")}</p>
     )}
    </div>
   </div>
  </Modal>
 );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function CommunicationHub({ user: routeUser }: CommunicationHubProps) {
 const t = useT();
 const { mode: lang } = useLanguage();
 const navigate = useNavigate();
 const [params, setParams] = useSearchParams();
 const toast = useToast();
 const { user: authUser, profile, isDemoMode } = useAuth();
 const user = { ...(routeUser ?? {}), id: authUser?.uid || profile?.id || 'demo-user', fullName: profile?.fullName || routeUser?.fullName || authUser?.displayName || 'You' } as User;
 const real = !isDemoMode && Boolean(authUser?.uid);

 const messaging = useMessaging();
 const { conversations, active, activeId, setActiveId, messages, totalUnread, ready, aiTyping, hasOlder, loadOlder } = messaging;
 const { people } = usePeople(user.id);
 const connections = useConnections();
 const blocks = useBlocks();
 const studioRequests = useStored(readRequests, [keys.requests]);

 // ── UI state ──────────────────────────────────────────────────────────────
 const [activeView, setActiveView] = useState<ViewMode>("chat");
 const [aiView, setAiView] = useState<AIView>("agents");
 const [sidebarTab, setSidebarTab] = useState<"chats" | "intros">("chats");
 const [inputText, setInputText] = useState("");
 const [searchQuery, setSearchQuery] = useState("");
 const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
 usePageControls(() => [
  { id: 'new-message', en: 'New message', el: 'Νέο μήνυμα', run: () => setPicker({ open: true, mode: 'new' }) },
  { id: 'filter-all', en: 'Show all conversations', el: 'Όλες οι συνομιλίες', run: () => { setMessageFilter('all'); setSearchQuery(''); } },
  { id: 'filter-unread', en: 'Show unread', el: 'Αδιάβαστα', run: () => setMessageFilter('unread') },
  { id: 'filter-archived', en: 'Show archived', el: 'Αρχείο', run: () => setMessageFilter('archived') },
 ], []);
 const [reactionFor, setReactionFor] = useState<string | null>(null);
 const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
 const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
 const [recording, setRecording] = useState<{ since: number } | null>(null);
 const [recordingTime, setRecordingTime] = useState(0);
 const [showRightSidebar, setShowRightSidebar] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches);
 const [showSearchPanel, setShowSearchPanel] = useState(false);
 const [chatSearchQuery, setChatSearchQuery] = useState("");
 const [pendingFiles, setPendingFiles] = useState<{ file: File; preview?: string }[]>([]);
 const [uploading, setUploading] = useState(false);
 const [sending, setSending] = useState(false);
 const [dismissedIntroIds, setDismissedIntroIds] = useState<string[]>([]);
 const [reportBlockModal, setReportBlockModal] = useState<{ open: boolean; mode: 'report' | 'block' }>({ open: false, mode: 'report' });
 const [reportReason, setReportReason] = useState("");
 const [reportDetails, setReportDetails] = useState("");
 const [showEmojiDropdown, setShowEmojiDropdown] = useState(false);
 const [showValidationDialog, setShowValidationDialog] = useState(false);
 const [hashCopied, setHashCopied] = useState(false);
 const [openMenu, setOpenMenu] = useState<string | null>(null);
 const [picker, setPicker] = useState<{ open: boolean; mode: 'new' | 'forward'; message?: ChatMessage }>({ open: false, mode: 'new' });
 const [now, setNow] = useState(() => Date.now());
 const fileInputRef = useRef<HTMLInputElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const recorderRef = useRef<MediaRecorder | null>(null);
 const chunksRef = useRef<Blob[]>([]);
 const lastReadRef = useRef<string>("");

 // ── Derived ───────────────────────────────────────────────────────────────
 const isAIChat = active?.kind === "ai";
 const activeAgent = isAIChat ? MOCK_AGENTS.find((agent) => agent.id === active?.otherId) : undefined;
 const otherPerson = active && active.kind !== "ai" ? findPerson(active.otherId) : undefined;
 const otherOnline = Boolean(active && !isAIChat && isOnline({ lastActiveAt: otherPerson?.lastActiveAt ?? active.other.lastActiveAt }, now));
 const otherTyping = Boolean(active && active.otherTypingAt && now - active.otherTypingAt < TYPING_WINDOW);
 const permission = messaging.canMessage(active);
 const isBlockedByMe = Boolean(active && (active.blockedByMe || blocks.some((item) => item.id === active.otherId)));

 const intros = useMemo<IntroCard[]>(() => {
  if (real) {
   return connections.incoming.map((record) => ({
    id: record.id,
    from: { id: record.senderId, fullName: record.senderName, headline: record.senderHeadline, avatar: record.senderAvatar, role: record.requestType },
    message: record.note || undefined,
    createdAt: new Date(record.createdAt).toISOString(),
    record,
   }));
  }
  const sample = isDemoMode ? sampleIntros() : [];
  return sample.filter((item) => !dismissedIntroIds.includes(item.id));
 }, [real, connections.incoming, isDemoMode, dismissedIntroIds]);

 const sentRequests = useMemo(() => {
  if (real) return connections.outgoing.map((record) => ({ id: record.id, person: otherSide(record, user.id), note: record.note, at: record.createdAt, record }));
  return studioRequests.map((item) => ({ id: item.id, person: { id: item.id, name: item.fullName, headline: item.note, avatar: avatarFor(item.id) }, note: item.message || "", at: Date.parse(item.sentAt || "") || Date.now(), record: undefined }));
 }, [real, connections.outgoing, studioRequests, user.id]);

 const filteredConversations = useMemo(() => {
  const q = searchQuery.trim().toLowerCase();
  return conversations.filter((item) => {
   if (q && !item.other.fullName.toLowerCase().includes(q) && !item.lastMessage.toLowerCase().includes(q)) return false;
   if (messageFilter === "archived") return item.archived;
   if (item.archived) return false;
   if (messageFilter === "unread") return item.unread > 0;
   if (messageFilter === "ai") return item.kind === "ai";
   return true;
  });
 }, [conversations, searchQuery, messageFilter]);
 const pinnedConversations = filteredConversations.filter((item) => item.pinned);
 const unpinnedConversations = filteredConversations.filter((item) => !item.pinned);
 const archivedCount = conversations.filter((item) => item.archived).length;

 const sharedAttachments = useMemo(() => messages.flatMap((message) => (message.attachments ?? []).map((attachment) => ({ attachment, message }))), [messages]);
 const sharedMedia = sharedAttachments.filter(({ attachment }) => isImage(attachment));
 const sharedFiles = sharedAttachments.filter(({ attachment }) => !isImage(attachment));

 const searchHits = chatSearchQuery.trim() ? messages.filter((message) => message.body.toLowerCase().includes(chatSearchQuery.trim().toLowerCase())).length : 0;

 // ── Effects ───────────────────────────────────────────────────────────────
 useEffect(() => {
  const timer = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(timer);
 }, []);

 // `?user=<id>` or `?agent=<id>` opens that conversation (from profile, network, assistant links).
 useEffect(() => {
  const target = params.get("user") || params.get("agent");
  if (!target || !ready) return;
  void messaging.openConversationWith(target).then((id) => {
   if (!id) toast.info(t("Could not open that conversation", "Δεν ήταν δυνατό να ανοίξει η συνομιλία"), t("This member may have left or is not visible to you.", "Το μέλος ίσως αποχώρησε ή δεν είναι ορατό σε εσένα."));
   const next = new URLSearchParams(params);
   next.delete("user");
   next.delete("agent");
   setParams(next, { replace: true });
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [params, ready]);

 // Opening a conversation (or receiving while it is open) marks it read.
 useEffect(() => {
  if (!active) return;
  const key = `${active.id}:${active.unread}:${messages.length}`;
  if (active.unread > 0 && lastReadRef.current !== key) {
   lastReadRef.current = key;
   messaging.markRead(active.id);
  }
 }, [active, messages.length, messaging]);

 useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, activeId, aiTyping]);

 useEffect(() => {
  if (!recording) { setRecordingTime(0); return undefined; }
  const timer = setInterval(() => setRecordingTime(Math.floor((Date.now() - recording.since) / 1000)), 500);
  return () => clearInterval(timer);
 }, [recording]);

 useEffect(() => {
  setReplyingTo(null);
  setEditing(null);
  setReactionFor(null);
  setShowSearchPanel(false);
  setChatSearchQuery("");
  setOpenMenu(null);
 }, [activeId]);

 useEffect(() => {
  if (!openMenu && !reactionFor && !showEmojiDropdown) return undefined;
  const close = () => { setOpenMenu(null); setReactionFor(null); setShowEmojiDropdown(false); };
  window.addEventListener("click", close);
  return () => window.removeEventListener("click", close);
 }, [openMenu, reactionFor, showEmojiDropdown]);

 // ── Handlers ──────────────────────────────────────────────────────────────
 const openConversation = useCallback((id: string) => {
  setActiveId(id);
  setActiveView("chat");
 }, [setActiveId]);

 const startWith = async (personId: string) => {
  setPicker({ open: false, mode: 'new' });
  const id = await messaging.openConversationWith(personId);
  if (!id) {
   toast.error(t("Could not start the conversation", "Δεν ήταν δυνατή η έναρξη συνομιλίας"), t("This member is not available right now.", "Το μέλος δεν είναι διαθέσιμο αυτή τη στιγμή."));
   return;
  }
  setActiveView("chat");
  setSidebarTab("chats");
  setTimeout(() => textareaRef.current?.focus(), 50);
 };

 const uploadPending = async (): Promise<ChatAttachment[]> => {
  if (pendingFiles.length === 0) return [];
  setUploading(true);
  try {
   const out: ChatAttachment[] = [];
   for (const { file } of pendingFiles) {
    if (real) {
     const uploaded = await uploadFile(file, { folder: "chat", uid: user.id });
     out.push({ name: uploaded.name, type: uploaded.type, size: uploaded.size, url: uploaded.url });
    } else {
     out.push({ name: file.name, type: file.type || "application/octet-stream", size: file.size, url: file.size <= 2_000_000 ? await readAsDataUrl(file) : "" });
    }
   }
   return out;
  } finally {
   setUploading(false);
  }
 };

 const handleSendMessage = useCallback(async (textOverride?: string) => {
  const text = (textOverride ?? inputText).trim();
  if ((!text && pendingFiles.length === 0) || !active) return;
  if (!permission.ok) return;
  setSending(true);
  try {
   let attachments: ChatAttachment[] = [];
   try {
    attachments = await uploadPending();
   } catch (error) {
    const code = error instanceof UploadError ? error.code : "failed";
    toast.error(
     t("Attachment not sent", "Το συνημμένο δεν στάλθηκε"),
     code === "too-large" ? t(`Files must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`, `Τα αρχεία πρέπει να είναι κάτω από ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`)
      : t("File storage is not available right now. Try a smaller file or try again later.", "Η αποθήκευση αρχείων δεν είναι διαθέσιμη τώρα. Δοκίμασε μικρότερο αρχείο ή ξανά αργότερα."),
    );
    return;
   }
   const reply = replyingTo ? { messageId: replyingTo.id, senderName: replyingTo.senderName, body: replyingTo.body.slice(0, 200) } : undefined;
   await messaging.send(text, { attachments: attachments.length ? attachments : undefined, replyTo: reply });
   setInputText("");
   pendingFiles.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
   setPendingFiles([]);
   setReplyingTo(null);
   if (textareaRef.current) textareaRef.current.style.height = "auto";
   if (active.kind === "dm" && !active.exists) logActivity({ kind: "message", title: `Messaged ${active.other.fullName}`, titleEl: `Μήνυμα προς ${active.other.fullName}`, href: `/messages?user=${active.otherId}` });
  } catch (error) {
   const blocked = error instanceof Error && error.message === "blocked";
   toast.error(
    blocked ? t("This conversation is blocked", "Η συνομιλία είναι αποκλεισμένη") : t("Message not sent", "Το μήνυμα δεν στάλθηκε"),
    blocked ? t("Unblock the member to write again.", "Άρσε τον αποκλεισμό για να γράψεις ξανά.") : t("Check your connection and try again.", "Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά."),
   );
  } finally {
   setSending(false);
  }
 }, [inputText, pendingFiles, active, permission.ok, replyingTo, messaging, toast, t, real, user.id]); // eslint-disable-line react-hooks/exhaustive-deps

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  e.target.value = "";
  const accepted = files.filter((file) => {
   if (file.size > MAX_UPLOAD_BYTES) {
    toast.warning(t("File too large", "Πολύ μεγάλο αρχείο"), t(`${file.name} is over ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`, `Το ${file.name} ξεπερνά τα ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`));
    return false;
   }
   return true;
  });
  setPendingFiles((prev) => [...prev, ...accepted.map((file) => ({ file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined }))].slice(0, 5));
 };

 const startRecording = async () => {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
   toast.info(t("Voice messages are not supported here", "Τα φωνητικά μηνύματα δεν υποστηρίζονται εδώ"), t("Your browser cannot record audio. You can attach an audio file instead.", "Ο περιηγητής δεν μπορεί να ηχογραφήσει. Μπορείς να επισυνάψεις αρχείο ήχου."));
   return;
  }
  try {
   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
   const recorder = new MediaRecorder(stream);
   chunksRef.current = [];
   recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
   recorder.onstop = () => stream.getTracks().forEach((track) => track.stop());
   recorder.start();
   recorderRef.current = recorder;
   setRecording({ since: Date.now() });
  } catch {
   toast.error(t("Microphone not available", "Το μικρόφωνο δεν είναι διαθέσιμο"), t("Allow microphone access in your browser to record a voice message.", "Επίτρεψε την πρόσβαση στο μικρόφωνο για να ηχογραφήσεις."));
  }
 };

 const stopRecording = (send: boolean) => {
  const recorder = recorderRef.current;
  if (!recorder) { setRecording(null); return; }
  recorder.onstop = () => {
   recorder.stream.getTracks().forEach((track) => track.stop());
   if (send && chunksRef.current.length) {
    const type = recorder.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`, { type });
    setPendingFiles((prev) => [...prev, { file }].slice(0, 5));
   }
   chunksRef.current = [];
  };
  recorder.stop();
  recorderRef.current = null;
  setRecording(null);
 };

 const startCall = (kind: "video" | "audio") => {
  if (!active || isAIChat) return;
  const url = newCallLink(kind);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  void messaging.send(kind === "video" ? t("Video call", "Βιντεοκλήση") : t("Voice call", "Φωνητική κλήση"), { kind: "call", callUrl: url });
  if (!opened) toast.info(t("Call link sent", "Ο σύνδεσμος κλήσης στάλθηκε"), t("Open it from the conversation when you are ready.", "Άνοιξέ τον από τη συνομιλία όποτε θέλεις."));
 };

 const handleAcceptIntro = async (intro: IntroCard) => {
  if (intro.record) {
   try {
    await respondToConnection(intro.record, true);
    toast.success(t("Connected", "Η σύνδεση ολοκληρώθηκε"), t(`You and ${intro.from.fullName} can message each other now.`, `Μπορείς πλέον να ανταλλάσσεις μηνύματα με ${intro.from.fullName}.`));
    logActivity({ kind: "request", title: `Connected with ${intro.from.fullName}`, titleEl: `Σύνδεση με ${intro.from.fullName}`, href: `/profile/${intro.from.id}` });
   } catch {
    toast.error(t("Could not accept", "Η αποδοχή απέτυχε"), t("Please try again.", "Δοκίμασε ξανά."));
   }
   return;
  }
  setDismissedIntroIds((prev) => [...prev, intro.id]);
  void messaging.openConversationWith(intro.from.id).then((id) => { if (id) openConversation(id); });
 };

 const handleDeclineIntro = async (intro: IntroCard) => {
  if (intro.record) {
   try {
    await respondToConnection(intro.record, false);
   } catch {
    toast.error(t("Could not decline", "Η απόρριψη απέτυχε"), t("Please try again.", "Δοκίμασε ξανά."));
   }
   return;
  }
  setDismissedIntroIds((prev) => [...prev, intro.id]);
 };

 const handleWithdraw = async (item: (typeof sentRequests)[number]) => {
  if (item.record) {
   try { await withdrawConnection(item.record); } catch { toast.error(t("Could not withdraw", "Η ανάκληση απέτυχε")); }
   return;
  }
  removeRequest(item.id);
 };

 const setValidationMode = async (mode: ValidationMode) => {
  if (!active) return;
  if (mode === "casual") {
   messaging.setValidation(active.id, { mode });
  } else if (mode === "one_party") {
   const hash = await transcriptHash(messages.map((m) => `${m.createdAt}|${m.senderId}|${m.body}`));
   messaging.setValidation(active.id, { mode, requestedBy: user.id, hash, at: Date.now() });
  } else {
   messaging.setValidation(active.id, { mode, requestedBy: user.id, at: Date.now() });
  }
  setShowValidationDialog(false);
 };

 const acceptTwoParty = async () => {
  if (!active) return;
  const hash = await transcriptHash(messages.map((m) => `${m.createdAt}|${m.senderId}|${m.body}`));
  messaging.setValidation(active.id, { ...active.validation, acceptedBy: user.id, hash, at: Date.now() });
  toast.success(t("Transcript validated", "Το αντίγραφο επικυρώθηκε"), t("Both sides now share the same verifiable hash.", "Και οι δύο πλευρές έχουν πλέον τον ίδιο επαληθεύσιμο κωδικό (hash)."));
 };

 const refreshHash = async () => {
  if (!active) return;
  const hash = await transcriptHash(messages.map((m) => `${m.createdAt}|${m.senderId}|${m.body}`));
  messaging.setValidation(active.id, { ...active.validation, hash, at: Date.now() });
 };

 const handleExportTranscript = (format: 'json' | 'txt') => {
  if (!active) return;
  const transcript = messages.map((m) => ({ sender: m.senderName, body: m.body, at: new Date(m.createdAt).toISOString(), attachments: (m.attachments ?? []).map((a) => a.name) }));
  const stamp = new Date().toISOString().split('T')[0];
  if (format === 'json') {
   downloadJson(`transcript-${active.id.slice(0, 12)}-${stamp}.json`, {
    conversationId: active.id,
    participants: [user.fullName, active.other.fullName],
    exportedAt: new Date().toISOString(),
    validation: active.validation,
    messages: transcript,
   });
  } else {
   const lines = transcript.map((m) => `[${formatDateTime(m.at)}] ${m.sender}: ${m.body}${m.attachments.length ? ` (${m.attachments.join(', ')})` : ''}`);
   downloadText(`transcript-${active.id.slice(0, 12)}-${stamp}.txt`, `${t("Conversation transcript", "Αντίγραφο συνομιλίας")}\n${t("Exported", "Εξαγωγή")}: ${formatDateTime(Date.now())}\nSHA-256: ${active.validation.hash || '—'}\n${'='.repeat(50)}\n\n${lines.join('\n')}`);
  }
 };

 const copyValidationHash = async () => {
  if (!active?.validation.hash) return;
  await navigator.clipboard.writeText(active.validation.hash).catch(() => undefined);
  setHashCopied(true);
  setTimeout(() => setHashCopied(false), 2000);
 };

 const submitReportOrBlock = async () => {
  if (!active) return;
  const target = active.other;
  try {
   if (reportBlockModal.mode === "report") {
    if (!reportReason) { toast.warning(t("Choose a reason", "Επίλεξε αιτία")); return; }
    if (real) {
     await reportContent({ targetType: "user", targetId: active.otherId, targetName: target.fullName, targetOwnerId: active.otherId, reason: reportReason, details: reportDetails, excerpt: messages.slice(-5).map((m) => `${m.senderName}: ${m.body}`).join("\n").slice(0, 500), href: `/profile/${active.otherId}` });
    }
    toast.success(t("Report sent", "Η αναφορά στάλθηκε"), t("Our team reviews every report. Thank you.", "Η ομάδα μας εξετάζει κάθε αναφορά. Ευχαριστούμε."));
   } else if (isBlockedByMe) {
    if (real) await unblockPerson(active.otherId);
    toast.success(t("Member unblocked", "Ο αποκλεισμός αφαιρέθηκε"), t(`${target.fullName} can message you again.`, `${target.fullName} μπορεί ξανά να σου στείλει μήνυμα.`));
   } else {
    if (real) await blockPerson({ id: active.otherId, fullName: target.fullName });
    toast.success(t("Member blocked", "Το μέλος αποκλείστηκε"), t("You can undo this from Settings › Privacy.", "Μπορείς να το αναιρέσεις από Ρυθμίσεις › Απόρρητο."));
   }
   setReportBlockModal({ open: false, mode: reportBlockModal.mode });
   setReportReason("");
   setReportDetails("");
  } catch {
   toast.error(t("Something went wrong", "Κάτι πήγε στραβά"), t("Please try again.", "Δοκίμασε ξανά."));
  }
 };

 const forwardTo = async (targetId: string) => {
  const message = picker.message;
  setPicker({ open: false, mode: 'new' });
  if (!message) return;
  const id = await messaging.openConversationWith(targetId);
  if (!id) return;
  await messaging.sendTo(id, message.body, { attachments: message.attachments });
  toast.success(t("Forwarded", "Προωθήθηκε"));
  openConversation(id);
 };

 const autoResizeTextarea = () => {
  const el = textareaRef.current;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
 };

 const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
 const agentName = (agent: typeof MOCK_AGENTS[number]) => (lang === "el" ? agent.nameEl || agent.name : agent.name);
 const agentRole = (agent: typeof MOCK_AGENTS[number]) => (lang === "el" ? agent.roleEl || agent.role : agent.role);
 const agentDescription = (agent: typeof MOCK_AGENTS[number]) => (lang === "el" ? agent.descriptionEl || agent.description : agent.description);
 const agentPrompts = (agent: typeof MOCK_AGENTS[number] | undefined) => (agent ? (lang === "el" ? agent.suggestedPromptsEl || agent.suggestedPrompts : agent.suggestedPrompts) ?? [] : []);
 const agentCapabilities = (agent: typeof MOCK_AGENTS[number]) => (lang === "el" ? agent.capabilitiesEl || agent.capabilities : agent.capabilities);

 const modeText = (mode: ValidationMode) => {
  if (mode === "casual") return { label: t("Standard chat", "Απλή συνομιλία"), description: t("Private messaging without a verified transcript.", "Ιδιωτική συνομιλία χωρίς επικυρωμένο αντίγραφο.") };
  if (mode === "one_party") return { label: t("Verified by you", "Επικύρωση από εσένα"), description: t("You keep a transcript with a SHA-256 fingerprint; the other side is informed.", "Κρατάς αντίγραφο με αποτύπωμα SHA-256· η άλλη πλευρά ενημερώνεται.") };
  return { label: t("Verified by both", "Επικύρωση και από τους δύο"), description: t("Both sides accept the same verifiable transcript.", "Και οι δύο πλευρές αποδέχονται το ίδιο επαληθεύσιμο αντίγραφο.") };
 };
 const MODE_STYLE: Record<ValidationMode, { icon: React.ElementType; color: string; bgColor: string; border: string }> = {
  casual: { icon: MessageCircle, color: 'text-stone-500', bgColor: 'bg-stone-100', border: 'border-stone-200' },
  one_party: { icon: Shield, color: 'text-amber-600', bgColor: 'bg-amber-50', border: 'border-amber-200' },
  two_party: { icon: ShieldCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50', border: 'border-emerald-200' },
 };
 const validation = active?.validation ?? { mode: 'casual' as ValidationMode };
 const twoPartyWaitingOnMe = validation.mode === "two_party" && validation.requestedBy && validation.requestedBy !== user.id && !validation.acceptedBy;
 const twoPartyWaitingOnOther = validation.mode === "two_party" && validation.requestedBy === user.id && !validation.acceptedBy;
 const transcriptAvailable = validation.mode === "one_party" || (validation.mode === "two_party" && Boolean(validation.acceptedBy));

 // =============================================================================
 // RENDER: CONVERSATION CARD
 // =============================================================================
 const convMenu = (conv: ChatConversation, className: string) => (
  <div className={className} onClick={(e) => e.stopPropagation()}>
   <button type="button" onClick={() => { messaging.setFlag(conv.id, "pinned", !conv.pinned); setOpenMenu(null); }} className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-stone-700 hover:bg-stone-50">
    <Pin className="w-4 h-4" /> {conv.pinned ? t("Unpin", "Ξεκαρφίτσωμα") : t("Pin", "Καρφίτσωμα")}
   </button>
   <button type="button" onClick={() => { messaging.setFlag(conv.id, "muted", !conv.muted); setOpenMenu(null); }} className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-stone-700 hover:bg-stone-50">
    {conv.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />} {conv.muted ? t("Unmute", "Κατάργηση σίγασης") : t("Mute", "Σίγαση")}
   </button>
   <button type="button" onClick={() => { messaging.setFlag(conv.id, "archived", !conv.archived); setOpenMenu(null); }} className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-stone-700 hover:bg-stone-50">
    <Archive className="w-4 h-4" /> {conv.archived ? t("Unarchive", "Επαναφορά από αρχείο") : t("Archive", "Αρχειοθέτηση")}
   </button>
   <button type="button" onClick={() => { messaging.deleteForMe(conv.id); setOpenMenu(null); toast.info(t("Conversation removed", "Η συνομιλία αφαιρέθηκε"), t("It disappears from your list; the other member keeps their copy.", "Φεύγει από τη λίστα σου· το άλλο μέλος κρατά το δικό του αντίγραφο.")); }} className="w-full flex items-center gap-2 min-h-11 px-3 text-sm text-red-600 hover:bg-red-50">
    <Trash2 className="w-4 h-4" /> {t("Delete for me", "Διαγραφή για εμένα")}
   </button>
  </div>
 );

 const renderConvCard = (conv: ChatConversation) => {
  const online = conv.kind !== "ai" && isOnline({ lastActiveAt: findPerson(conv.otherId)?.lastActiveAt ?? conv.other.lastActiveAt }, now);
  const preview = conv.lastMessage || (conv.kind === "ai" ? t("Ask anything", "Ρώτα ό,τι θέλεις") : t("No messages yet", "Δεν υπάρχουν μηνύματα ακόμη"));
  const mine = conv.lastSenderId === user.id && conv.lastMessage;
  const agent = conv.kind === "ai" ? MOCK_AGENTS.find((a) => a.id === conv.otherId) : undefined;
  return (
   <div
    key={conv.id}
    role="button"
    tabIndex={0}
    aria-current={activeId === conv.id ? "true" : undefined}
    onClick={() => openConversation(conv.id)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openConversation(conv.id); } }}
    className={cn(
     "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group/conv relative cursor-pointer",
     activeId === conv.id ? "bg-white shadow-lg shadow-stone-200/50 border border-stone-200" : "hover:bg-white/80 border border-transparent"
    )}
   >
    {conv.pinned && <Pin className="absolute top-2 right-2 w-3 h-3 text-stone-400 rotate-45" aria-hidden="true" />}
    <Avatar src={conv.other.avatar} alt={conv.other.fullName} size="md" status={conv.kind === "ai" ? undefined : online ? "online" : "offline"} isAI={conv.kind === "ai"} icon={agent?.icon} />
    <div className="flex-1 min-w-0">
     <div className="flex items-center gap-2 mb-0.5">
      <h3 className={cn("text-sm font-semibold truncate min-w-0 flex-1", conv.unread > 0 ? "text-stone-900" : "text-stone-700")}>
       {agent ? agentName(agent) : conv.other.fullName}
      </h3>
      {conv.muted && <BellOff className="w-3 h-3 text-stone-400 shrink-0" aria-label={t("Muted", "Σε σίγαση")} />}
      {conv.lastMessage && <span className="text-xs text-stone-400 shrink-0"><RelTime iso={new Date(conv.lastMessageAt).toISOString()} /></span>}
     </div>
     <div className="flex items-center gap-1.5">
      {conv.kind === "ai" ? <span className="shrink-0 px-1.5 py-0.5 bg-stone-900 text-white text-xs rounded-full font-medium">AI</span>
       : conv.other.role ? <span className="shrink-0 max-w-[55%] truncate px-1.5 py-0.5 bg-stone-100 text-stone-500 text-xs rounded-full font-medium leading-tight">{labelOf(conv.other.role)}</span> : null}
      <p className={cn("text-xs truncate min-w-0 flex-1", conv.unread > 0 ? "text-stone-700 font-medium" : "text-stone-500")}>
       {mine ? <span className="text-stone-400">{t("You: ", "Εσύ: ")}</span> : null}{preview}
      </p>
      {conv.unread > 0 && (
       <span className="shrink-0 min-w-[20px] h-5 px-1 bg-stone-900 text-white text-xs font-bold rounded-full flex items-center justify-center">{conv.unread > 99 ? '99+' : conv.unread}</span>
      )}
     </div>
    </div>
    <button
     type="button"
     aria-label={t("Conversation actions", "Ενέργειες συνομιλίας")}
     onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === conv.id ? null : conv.id); }}
     className="shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl sm:opacity-0 sm:group-hover/conv:opacity-100 sm:focus:opacity-100"
    >
     <MoreVertical className="w-4 h-4" />
    </button>
    {openMenu === conv.id && convMenu(conv, "absolute right-2 top-12 z-30 w-52 bg-white border border-stone-200 rounded-xl shadow-lg py-1")}
   </div>
  );
 };

 // =============================================================================
 // RENDER: LEFT SIDEBAR
 // =============================================================================
 const renderLeftSidebar = () => (
  <aside className={cn("w-full md:w-72 lg:w-80 xl:w-[22rem] border-r border-stone-200/80 bg-white flex flex-col shrink-0", (activeId || activeView === "ai-center") && "hidden md:flex")}>
   <div className="p-4 space-y-3">
    <div className="flex items-center justify-between">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-stone-200 rounded-2xl flex items-center justify-center shrink-0">
       <MessageSquare className="w-5 h-5 text-stone-900" />
      </div>
      <div>
       <h1 className="text-base font-bold text-stone-900 tracking-tight">{t("Messages", "Μηνύματα")}</h1>
       <p className="text-xs text-stone-400 font-medium tracking-wider">{t("Private conversations", "Ιδιωτικές συνομιλίες")}</p>
      </div>
     </div>
     <IconButton icon={Plus} variant="filled" tooltip={t("New message", "Νέο μήνυμα")} onClick={() => setPicker({ open: true, mode: 'new' })} />
    </div>

    <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl" role="tablist">
     <button role="tab" aria-selected={sidebarTab === "chats"} onClick={() => setSidebarTab("chats")}
      className={cn("flex-1 min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all", sidebarTab === "chats" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
      <MessageSquare className="w-3.5 h-3.5" />
      {t("Chats", "Συνομιλίες")}
      {totalUnread > 0 && <span className="ml-1 px-1.5 py-0.5 bg-stone-900 text-white text-xs font-medium rounded-full tabular-nums">{totalUnread}</span>}
     </button>
     <button role="tab" aria-selected={sidebarTab === "intros"} onClick={() => setSidebarTab("intros")}
      className={cn("flex-1 min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all", sidebarTab === "intros" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
      <UserPlus className="w-3.5 h-3.5" />
      {t("Requests", "Αιτήματα")}
      {intros.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-stone-800 text-white text-xs font-bold rounded-full">{intros.length}</span>}
     </button>
    </div>

    {sidebarTab === "chats" && (
     <>
      <div className="relative">
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
       <input type="search" placeholder={t("Search conversations…", "Αναζήτηση συνομιλιών…")} aria-label={t("Search conversations", "Αναζήτηση συνομιλιών")}
        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full min-h-11 pl-10 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 transition-colors" />
      </div>
      <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg">
       {(["all", "unread", "ai", "archived"] as MessageFilter[]).map((filter) => (
        <button key={filter} onClick={() => setMessageFilter(filter)} aria-pressed={messageFilter === filter}
         className={cn("flex-1 min-h-10 px-1 py-2 text-xs font-medium rounded-md transition-all", messageFilter === filter ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
         {filter === "ai" ? "AI" : filter === "unread" ? t("Unread", "Αδιάβαστες") : filter === "archived" ? `${t("Archived", "Αρχείο")}${archivedCount ? ` · ${archivedCount}` : ""}` : t("All", "Όλες")}
        </button>
       ))}
      </div>
     </>
    )}
   </div>

   <div className="flex-1 overflow-y-auto bg-stone-50/30">
    {sidebarTab === "chats" ? (
     !ready ? (
      <div className="px-3 space-y-2 pt-1">
       {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}
      </div>
     ) : filteredConversations.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
       <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-stone-300" />
       </div>
       <p className="text-sm text-stone-600 font-semibold">
        {messageFilter === "archived" ? t("Nothing archived", "Τίποτα στο αρχείο") : messageFilter === "unread" ? t("No unread conversations", "Καμία αδιάβαστη συνομιλία") : searchQuery ? t("No conversation matches", "Καμία συνομιλία δεν ταιριάζει") : t("No conversations yet", "Δεν υπάρχουν συνομιλίες ακόμη")}
       </p>
       <p className="text-xs text-stone-400 mt-1.5 max-w-[220px] leading-relaxed">
        {messageFilter === "all" && !searchQuery ? t("Write to a member from Matches or Network, or ask an AI specialist.", "Γράψε σε ένα μέλος από τις Αντιστοιχίσεις ή το Δίκτυο, ή ρώτα έναν ειδικό AI.") : t("Try another filter or search term.", "Δοκίμασε άλλο φίλτρο ή όρο αναζήτησης.")}
       </p>
       <div className="mt-4 flex flex-col items-center gap-2">
        <button type="button" onClick={() => setPicker({ open: true, mode: 'new' })}
         className="flex items-center gap-2 min-h-11 px-4 bg-stone-900 text-white text-xs font-medium rounded-xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/15">
         <Plus className="w-3.5 h-3.5" /> {t("New message", "Νέο μήνυμα")}
        </button>
        {(messageFilter !== "all" || searchQuery) && (
         <ClearFiltersButton onClick={() => { setMessageFilter("all"); setSearchQuery(""); }} />
        )}
        <button type="button" className="text-xs font-medium text-stone-900 hover:underline min-h-11" onClick={() => navigate("/matches")}>
         {t("Find people to talk to", "Βρες άτομα για συζήτηση")}
        </button>
       </div>
      </div>
     ) : (
      <div className="px-3 pb-4 space-y-0.5">
       {pinnedConversations.length > 0 && (
        <>
         <div className="flex items-center gap-2 px-2 py-2">
          <Pin className="w-3 h-3 text-stone-400 rotate-45" />
          <span className="text-xs font-semibold text-stone-400 tracking-wider uppercase">{t("Pinned", "Καρφιτσωμένες")}</span>
         </div>
         {pinnedConversations.map((c) => renderConvCard(c))}
         <div className="h-px bg-stone-200 mx-2 my-2" />
        </>
       )}
       {unpinnedConversations.length > 0 && (
        <>
         {pinnedConversations.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-2">
           <Clock className="w-3 h-3 text-stone-400" />
           <span className="text-xs font-semibold text-stone-400 tracking-wider uppercase">{t("Recent", "Πρόσφατες")}</span>
          </div>
         )}
         {unpinnedConversations.map((c) => renderConvCard(c))}
        </>
       )}
      </div>
     )
    ) : (
     <div className="px-3 pb-4 space-y-3">
      {!real && !isDemoMode ? null : intros.length === 0 ? (
       <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
         <UserPlus className="w-8 h-8 text-stone-300" />
        </div>
        <p className="text-sm text-stone-500 font-medium">{t("No pending requests", "Κανένα εκκρεμές αίτημα")}</p>
        <p className="text-xs text-stone-400 mt-1 max-w-[220px]">{t("When a member asks to connect, you will accept or decline it here.", "Όταν ένα μέλος ζητήσει σύνδεση, θα την αποδεχτείς ή θα την απορρίψεις εδώ.")}</p>
       </div>
      ) : (
       intros.map((req) => (
        <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
         className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 hover:shadow-md transition-shadow">
         <div className="flex items-start gap-3">
          <button type="button" className="block" onClick={() => navigate(`/profile/${req.from.id}`)} aria-label={t("View profile", "Προβολή προφίλ")}>
           <Avatar src={req.from.avatar} alt={req.from.fullName} size="md" />
          </button>
          <div className="flex-1 min-w-0">
           <h4 className="text-sm font-semibold text-stone-900">{req.from.fullName}</h4>
           <p className="text-xs text-stone-500 truncate">{req.from.headline}</p>
           {req.from.role && <span className="inline-block mt-1 px-2 py-0.5 bg-stone-100 text-stone-700 text-xs font-medium rounded-full">{labelOf(req.from.role)}</span>}
          </div>
          <span className="text-xs text-stone-400 shrink-0"><RelTime iso={req.createdAt} /></span>
         </div>
         {req.message && <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg leading-relaxed italic">“{req.message}”</p>}
         <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(`/profile/${req.from.id}`)} className="min-h-11 px-3 bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-lg hover:border-stone-900 transition-all">
           {t("Profile", "Προφίλ")}
          </button>
          <button type="button" onClick={() => void handleAcceptIntro(req)} className="flex-1 min-h-11 flex items-center justify-center gap-1.5 px-3 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-all">
           <Check className="w-3.5 h-3.5" /> {t("Accept", "Αποδοχή")}
          </button>
          <button type="button" onClick={() => void handleDeclineIntro(req)} className="flex-1 min-h-11 flex items-center justify-center gap-1.5 px-3 bg-stone-100 text-stone-600 text-xs font-medium rounded-lg hover:bg-stone-200 transition-all">
           <X className="w-3.5 h-3.5" /> {t("Decline", "Απόρριψη")}
          </button>
         </div>
        </motion.div>
       ))
      )}
      {sentRequests.length > 0 && (
       <div className="pt-2">
        <p className="px-1 pb-2 text-xs font-semibold text-stone-400 tracking-wider uppercase">{t("Sent by you", "Σταλμένα από εσένα")}</p>
        <div className="space-y-2">
         {sentRequests.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl">
           <Avatar src={item.person.avatar} alt={item.person.name} size="sm" />
           <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-900 truncate">{item.person.name}</p>
            <p className="text-xs text-stone-400">{t("Waiting for a reply", "Αναμονή απάντησης")} · <RelTime iso={new Date(item.at).toISOString()} /></p>
           </div>
           <button type="button" onClick={() => void handleWithdraw(item)} className="min-h-11 px-2 text-xs font-medium text-stone-500 hover:text-red-600">{t("Withdraw", "Ανάκληση")}</button>
          </div>
         ))}
        </div>
       </div>
      )}
     </div>
    )}
   </div>

   <div className="p-3 border-t border-stone-100">
    <div className="flex items-center justify-between">
     <button type="button" onClick={() => { setActiveView(activeView === "ai-center" ? "chat" : "ai-center"); setActiveId(null); }} aria-pressed={activeView === "ai-center"}
      className={cn("flex items-center gap-2 min-h-11 px-3 rounded-xl transition-all", activeView === "ai-center" ? "bg-stone-200 text-stone-900" : "hover:bg-stone-100 text-stone-500")}>
      <BrainCircuit className="w-4 h-4" />
      <span className="text-xs font-semibold">{t("AI specialists", "Ειδικοί AI")}</span>
     </button>
     <IconButton icon={Settings} tooltip={t("Notification settings", "Ρυθμίσεις ειδοποιήσεων")} onClick={() => navigate("/settings?tab=notifications")} />
    </div>
   </div>
  </aside>
 );

 // =============================================================================
 // RENDER: MESSAGE BUBBLE
 // =============================================================================
 const renderAttachment = (att: ChatAttachment, isMe: boolean, key: number) => {
  const url = safeMediaUrl(att.url);
  if (isImage(att) && url) {
   return (
    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-stone-200/60 max-w-[260px]">
     <img src={url} alt={att.name} className="w-full h-auto max-h-64 object-cover" loading="lazy" />
    </a>
   );
  }
  if (isAudio(att) && url) {
   return (
    <div key={key} className={cn("flex items-center gap-2 p-2 rounded-lg", isMe ? "bg-stone-800" : "bg-stone-100")}>
     <Mic className={cn("w-4 h-4 shrink-0", isMe ? "text-stone-300" : "text-stone-500")} />
     <audio controls src={url} className="h-8 max-w-[220px]" preload="metadata" />
    </div>
   );
  }
  return (
   <a key={key} href={url || undefined} target="_blank" rel="noopener noreferrer" download={att.name}
    className={cn("flex items-center gap-2 p-2 rounded-lg transition-colors", isMe ? "bg-stone-800 hover:bg-stone-700" : "bg-stone-100 hover:bg-stone-200", !url && "pointer-events-none opacity-70")}>
    <FileText className={cn("w-4 h-4 shrink-0", isMe ? "text-stone-400" : "text-stone-500")} />
    <span className={cn("text-xs truncate", isMe ? "text-stone-200" : "text-stone-700")}>{att.name}</span>
    <span className={cn("text-xs shrink-0", isMe ? "text-stone-400" : "text-stone-400")}>{formatBytes(att.size)}</span>
    <Download className={cn("w-3 h-3 ml-auto shrink-0", isMe ? "text-stone-400" : "text-stone-500")} />
   </a>
  );
 };

 const renderMessageBubble = (msg: ChatMessage, idx: number) => {
  const isMe = msg.senderId === user.id;
  const prev = messages[idx - 1];
  const showAvatar = idx === 0 || prev?.senderId !== msg.senderId;
  const showDateSep = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(prev?.createdAt ?? 0).toDateString();
  const reactions = Object.entries(msg.reactions ?? {}).filter(([, ids]) => ids.length > 0);
  const highlighted = Boolean(chatSearchQuery.trim()) && msg.body.toLowerCase().includes(chatSearchQuery.trim().toLowerCase());
  const read = isMe && active ? (active.kind !== "dm" || (active.otherLastReadAt >= msg.createdAt)) : false;
  const isCall = msg.kind === "call" && msg.callUrl;
  const isSystem = msg.kind === "system";
  const canEdit = isMe && !msg.deleted && !isCall && !isSystem && active?.kind !== "ai";

  if (isSystem) {
   return (
    <div key={msg.id}>
     {showDateSep && <DateSeparator at={msg.createdAt} />}
     <p className="text-center text-xs text-stone-400 py-2 px-6">{msg.body}</p>
    </div>
   );
  }

  return (
   <div key={msg.id} id={`msg-${msg.id}`}>
    {showDateSep && <DateSeparator at={msg.createdAt} />}
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex items-end gap-2 group/message", isMe ? "flex-row-reverse" : "flex-row")}>
     {!isMe && (
      <div className="w-8 h-8 shrink-0">
       {showAvatar ? <Avatar src={active?.other.avatar} alt={msg.senderName || t("Member", "Μέλος")} size="sm" isAI={msg.isAI} icon={activeAgent?.icon} /> : null}
      </div>
     )}
     <div className={cn("max-w-[80%] sm:max-w-[65%] space-y-1 flex flex-col", isMe ? "items-end" : "items-start")}>
      <div className={cn(
       "relative px-4 py-2.5 rounded-2xl text-sm shadow-sm",
       isMe ? "bg-stone-900 text-white rounded-br-lg" : msg.isAI ? "bg-stone-50 text-stone-900 border border-stone-200 rounded-bl-lg" : "bg-white text-stone-800 border border-stone-200 rounded-bl-lg",
       highlighted && "ring-2 ring-amber-300",
       msg.failed && "opacity-70 ring-1 ring-red-300",
      )}>
       {msg.isAI && activeAgent && (
        <div className="mb-1.5 pb-1.5 border-b border-stone-200/50">
         <span className="text-xs font-semibold text-stone-600 tracking-wider">{agentName(activeAgent)}</span>
        </div>
       )}
       {msg.replyTo && (
        <button type="button" onClick={() => document.getElementById(`msg-${msg.replyTo?.messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
         className={cn("mb-2 p-2 rounded-lg text-xs border-l-2 text-left w-full", isMe ? "bg-stone-800 border-stone-600" : "bg-stone-50 border-stone-300")}>
         <p className={cn("font-medium", isMe ? "text-stone-300" : "text-stone-600")}>{msg.replyTo.senderName}</p>
         <p className={cn("truncate", isMe ? "text-stone-400" : "text-stone-500")}>{msg.replyTo.body}</p>
        </button>
       )}
       {isCall ? (
        <div className="flex items-center gap-3">
         <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isMe ? "bg-stone-800" : "bg-stone-100")}>
          {msg.body.toLowerCase().includes("video") || msg.body.includes("Βιντεο") ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
         </div>
         <div className="min-w-0">
          <p className="font-medium">{msg.body}</p>
          {safeWebUrl(msg.callUrl) ? (
           <a href={safeWebUrl(msg.callUrl)!} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1 text-xs underline", isMe ? "text-stone-300" : "text-stone-600")}>
            {t("Join call", "Συμμετοχή στην κλήση")} <ExternalLink className="w-3 h-3" />
           </a>
          ) : null}
         </div>
        </div>
       ) : editing?.id === msg.id ? (
        <div className="space-y-2 min-w-[200px]">
         <textarea autoFocus value={editing.body} onChange={(e) => setEditing({ id: msg.id, body: e.target.value })} rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); messaging.editMessage(msg.id, editing.body); setEditing(null); } if (e.key === "Escape") setEditing(null); }}
          className="w-full text-sm text-stone-900 bg-white rounded-lg p-2 border border-stone-300 focus:outline-none" />
         <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setEditing(null)} className="text-xs text-stone-300 hover:text-white">{t("Cancel", "Ακύρωση")}</button>
          <button type="button" onClick={() => { messaging.editMessage(msg.id, editing.body); setEditing(null); }} className="text-xs font-semibold text-white">{t("Save edit", "Αποθήκευση αλλαγής")}</button>
         </div>
        </div>
       ) : (
        <p className={cn("leading-relaxed whitespace-pre-wrap break-words", msg.deleted && "italic opacity-60")}>{msg.deleted ? t("Message deleted", "Το μήνυμα διαγράφηκε") : msg.body}</p>
       )}
       {!msg.deleted && msg.attachments && msg.attachments.length > 0 && (
        <div className="mt-2 space-y-1.5">{msg.attachments.map((att, i) => renderAttachment(att, isMe, i))}</div>
       )}

       {!msg.deleted && !isCall && (
        <div className={cn("flex flex-wrap gap-0.5 mt-2 md:absolute md:-top-1 md:mt-0 md:opacity-0 md:group-hover/message:opacity-100 md:focus-within:opacity-100 transition-opacity z-10", isMe ? "justify-end md:right-full md:mr-1" : "md:left-full md:ml-1")}>
         <div className="flex items-center gap-0.5 p-1 bg-white rounded-lg shadow-lg border border-stone-200">
          <button type="button" aria-label={t("Reply", "Απάντηση")} title={t("Reply", "Απάντηση")} onClick={() => { setReplyingTo(msg); textareaRef.current?.focus(); }} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"><Reply className="w-3.5 h-3.5" /></button>
          <button type="button" aria-label={t("React", "Προσθήκη αντίδρασης")} title={t("React", "Προσθήκη αντίδρασης")} onClick={(e) => { e.stopPropagation(); setReactionFor(reactionFor === msg.id ? null : msg.id); }} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"><Smile className="w-3.5 h-3.5" /></button>
          <button type="button" aria-label={t("Copy", "Αντιγραφή")} title={t("Copy", "Αντιγραφή")} onClick={() => { void navigator.clipboard.writeText(msg.body).then(() => toast.info(t("Copied", "Αντιγράφηκε"))).catch(() => toast.error(t("Failed to copy", "Αποτυχία αντιγραφής"))); }} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"><Copy className="w-3.5 h-3.5" /></button>
          <button type="button" aria-label={t("Forward", "Προώθηση")} title={t("Forward", "Προώθηση")} onClick={() => setPicker({ open: true, mode: 'forward', message: msg })} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"><Forward className="w-3.5 h-3.5" /></button>
          {canEdit && (
           <>
            <button type="button" aria-label={t("Edit", "Επεξεργασία")} title={t("Edit", "Επεξεργασία")} onClick={() => setEditing({ id: msg.id, body: msg.body })} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" aria-label={t("Delete", "Διαγραφή")} title={t("Delete", "Διαγραφή")} onClick={() => messaging.removeMessage(msg.id)} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
           </>
          )}
         </div>
        </div>
       )}

       {reactionFor === msg.id && (
        <div className={cn("absolute -bottom-11 z-20 flex items-center gap-0.5 p-1.5 bg-white rounded-xl shadow-xl border border-stone-200", isMe ? "right-0" : "left-0")} onClick={(e) => e.stopPropagation()}>
         {REACTIONS.map(({ key, emoji }) => (
          <button key={key} type="button" aria-label={key} onClick={() => { messaging.react(msg.id, key); setReactionFor(null); }}
           className={cn("w-8 h-8 flex items-center justify-center text-base hover:bg-stone-100 rounded-lg transition-colors", (msg.reactions?.[key] ?? []).includes(user.id) && "bg-stone-100")}>{emoji}</button>
         ))}
        </div>
       )}
      </div>

      <div className={cn("flex items-center gap-2 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
       <span className="text-xs text-stone-400">{formatTime(msg.createdAt)}</span>
       {msg.edited && !msg.deleted && <span className="text-xs text-stone-400">· {t("edited", "επεξεργασμένο")}</span>}
       {isMe && (
        <span className="text-stone-400" aria-label={msg.failed ? t("Not sent", "Δεν στάλθηκε") : msg.pending ? t("Sending", "Αποστολή") : read ? t("Read", "Διαβάστηκε") : t("Sent", "Στάλθηκε")}>
         {msg.failed ? <AlertCircle className="w-3 h-3 text-red-500" /> : msg.pending ? <Clock className="w-3 h-3" /> : read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />}
        </span>
       )}
      </div>

      {reactions.length > 0 && (
       <div className={cn("flex items-center gap-1 flex-wrap", isMe ? "justify-end" : "justify-start")}>
        {reactions.map(([key, ids]) => (
         <button key={key} type="button" onClick={() => messaging.react(msg.id, key)} aria-pressed={ids.includes(user.id)}
          className={cn("px-1.5 py-0.5 rounded-full text-xs border transition-all", ids.includes(user.id) ? "bg-stone-200 text-stone-900 border-stone-400 font-semibold" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300")}>
          {reactionEmoji(key)} {ids.length > 1 && ids.length}
         </button>
        ))}
       </div>
      )}
     </div>
    </motion.div>
   </div>
  );
 };

 // =============================================================================
 // RENDER: MAIN CHAT
 // =============================================================================
 const renderEmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50 relative overflow-hidden">
   <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 max-w-lg w-full">
    <div className="w-20 h-20 mx-auto mb-8 bg-stone-900 rounded-xl flex items-center justify-center">
     <MessageSquare className="w-9 h-9 text-white" />
    </div>
    <h2 className="text-base font-semibold text-stone-900 mb-2 tracking-tight">{t("Your conversations", "Οι συνομιλίες σου")}</h2>
    <p className="text-sm text-stone-500 max-w-sm mx-auto mb-8 leading-relaxed">
     {t('Messages, files, calls and AI specialists.', 'Μηνύματα, αρχεία, κλήσεις και ειδικοί AI.')}
    </p>
    <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
     {[
      { label: t("Conversations", "Συνομιλίες"), value: conversations.filter((c) => !c.archived).length, icon: MessageSquare, color: "bg-stone-200 text-stone-900" },
      { label: t("Unread", "Αδιάβαστα"), value: totalUnread, icon: MessageCircle, color: totalUnread > 0 ? "bg-stone-200 text-stone-900" : "bg-stone-100 text-stone-600" },
      { label: t("Requests", "Αιτήματα"), value: intros.length, icon: UserPlus, color: intros.length > 0 ? "bg-stone-200 text-stone-900" : "bg-stone-100 text-stone-600" },
     ].map(({ label, value, icon: Icon, color }) => (
      <div key={label} className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-stone-200 rounded-xl shadow-sm">
       <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}><Icon className="w-3.5 h-3.5" /></div>
       <div className="text-left">
        <p className="text-base font-bold text-stone-900 leading-none tabular-nums">{value}</p>
        <p className="text-xs text-stone-400 font-medium tracking-wider">{label}</p>
       </div>
      </div>
     ))}
    </div>
    <div className="flex flex-col items-center gap-2.5 w-full mx-auto">
     <button type="button" onClick={() => setPicker({ open: true, mode: 'new' })}
      className="w-full flex items-center justify-center gap-2.5 min-h-12 px-5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all shadow-sm">
      <Plus className="w-4 h-4" /> {t("New message", "Νέο μήνυμα")}
     </button>
     <button type="button" onClick={() => { setActiveView("ai-center"); setAiView("agents"); }}
      className="w-full flex items-center justify-center gap-2.5 min-h-12 px-5 bg-white text-stone-700 border border-stone-200 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-all">
      {t("Ask an AI specialist", "Ρώτα έναν ειδικό AI")}
     </button>
     <div className="flex items-center gap-2.5 w-full">
      <button type="button" onClick={() => navigate("/matches")} className="flex-1 flex items-center justify-center gap-2 min-h-11 px-4 bg-white text-stone-600 border border-stone-200 rounded-xl text-xs font-medium hover:bg-stone-50 hover:border-stone-300 transition-all">
       <Users className="w-3.5 h-3.5" /> {t("Find people", "Εύρεση ατόμων")}
      </button>
      <button type="button" onClick={() => navigate("/network")} className="flex-1 flex items-center justify-center gap-2 min-h-11 px-4 bg-white text-stone-600 border border-stone-200 rounded-xl text-xs font-medium hover:bg-stone-50 hover:border-stone-300 transition-all">
       <UserIcon className="w-3.5 h-3.5" /> {t("My network", "Το δίκτυό μου")}
      </button>
     </div>
    </div>
    {conversations.length > 0 && (
     <div className="mt-8 pt-6 border-t border-stone-200/60">
      <p className="text-xs font-semibold text-stone-400 tracking-wide uppercase mb-3">{t("Recent conversations", "Πρόσφατες συνομιλίες")}</p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
       {conversations.filter((c) => !c.archived).slice(0, 6).map((conv) => (
        <button key={conv.id} type="button" onClick={() => openConversation(conv.id)} className="relative block" title={conv.other.fullName} aria-label={conv.other.fullName}>
         <Avatar src={conv.other.avatar} alt={conv.other.fullName} size="md" isAI={conv.kind === "ai"} icon={MOCK_AGENTS.find((a) => a.id === conv.otherId)?.icon} />
         {conv.unread > 0 && <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-stone-900 text-white text-xs font-medium rounded-full flex items-center justify-center tabular-nums">{conv.unread}</div>}
        </button>
       ))}
      </div>
     </div>
    )}
   </motion.div>
  </div>
 );

 const renderMainChat = () => {
  if (!active) return renderEmptyState();
  const prompts = agentPrompts(activeAgent);
  const canWrite = permission.ok && !isBlockedByMe;
  return (
   <div className="flex-1 flex flex-col min-w-0">
    <header className="border-b border-stone-100 bg-white shrink-0">
     <div className="min-h-16 flex items-center gap-2 px-3 sm:px-5 py-2">
      <button type="button" aria-label={t("Back to conversations", "Πίσω στις συνομιλίες")} onClick={() => setActiveId(null)} className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center text-stone-600 hover:bg-stone-100 rounded-xl shrink-0">
       <ChevronLeft className="w-5 h-5" />
      </button>
      <button type="button" onClick={() => !isAIChat && navigate(`/profile/${active.otherId}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left" disabled={isAIChat}>
       <Avatar src={active.other.avatar} alt={active.other.fullName} size="md" status={isAIChat ? undefined : otherOnline ? "online" : "offline"} isAI={isAIChat} icon={activeAgent?.icon} />
       <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
         <h2 className="font-bold text-stone-900 text-sm tracking-tight truncate">{activeAgent ? agentName(activeAgent) : active.other.fullName}</h2>
         {!isAIChat && active.other.role && <span className="hidden sm:inline px-2 py-0.5 bg-stone-100 text-stone-500 text-xs rounded-full font-semibold tracking-wider shrink-0">{labelOf(active.other.role)}</span>}
        </div>
        <p className="text-xs text-stone-500 truncate">
         {otherTyping ? <span className="text-emerald-600 font-medium animate-pulse">{t("typing…", "πληκτρολογεί…")}</span>
          : isAIChat ? (activeAgent ? agentRole(activeAgent) : t("AI specialist", "Ειδικός AI"))
          : otherOnline ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> {t("Online now", "Σε σύνδεση τώρα")}</span>
          : otherPerson?.lastActiveAt ? <>{t("Last seen", "Τελευταία φορά")} <RelTime iso={new Date(otherPerson.lastActiveAt).toISOString()} /></>
          : active.other.headline || t("Member", "Μέλος")}
        </p>
       </div>
      </button>
      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
       <IconButton icon={MoreVertical} tooltip={t("More options", "Περισσότερες επιλογές")} active={openMenu === "chat-more"} onClick={() => setOpenMenu(openMenu === "chat-more" ? null : "chat-more")} />
       {openMenu === "chat-more" && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-stone-200 rounded-xl shadow-lg z-30 py-1">
         {!isAIChat && (
          <button type="button" onClick={() => { setOpenMenu(null); navigate(`/profile/${active.otherId}`); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-stone-600 hover:bg-stone-50">
           <UserIcon className="w-4 h-4" /> {t("View profile", "Προβολή προφίλ")}
          </button>
         )}
         {!isAIChat && (
          <button type="button" onClick={() => { setShowValidationDialog(true); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-stone-600 hover:bg-stone-50">
           <Shield className="w-4 h-4" /> {t("Transcript verification", "Επικύρωση αντιγράφου")}
          </button>
         )}
         <button type="button" onClick={() => { messaging.setFlag(active.id, "muted", !active.muted); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-stone-600 hover:bg-stone-50">
          {active.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />} {active.muted ? t("Unmute", "Κατάργηση σίγασης") : t("Mute notifications", "Σίγαση ειδοποιήσεων")}
         </button>
         <button type="button" onClick={() => { messaging.setFlag(active.id, "archived", !active.archived); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-stone-600 hover:bg-stone-50">
          <Archive className="w-4 h-4" /> {active.archived ? t("Unarchive", "Επαναφορά από αρχείο") : t("Archive", "Αρχειοθέτηση")}
         </button>
         <button type="button" onClick={() => { handleExportTranscript('txt'); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-stone-600 hover:bg-stone-50">
          <Download className="w-4 h-4" /> {t("Export transcript", "Εξαγωγή αντιγράφου")}
         </button>
         {!isAIChat && (
          <>
           <div className="h-px bg-stone-100 mx-2 my-1" />
           <button type="button" onClick={() => { setReportBlockModal({ open: true, mode: 'report' }); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-amber-600 hover:bg-amber-50">
            <Flag className="w-4 h-4" /> {t("Report", "Αναφορά")}
           </button>
           <button type="button" onClick={() => { setReportBlockModal({ open: true, mode: 'block' }); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-red-600 hover:bg-red-50">
            <Ban className="w-4 h-4" /> {isBlockedByMe ? t("Unblock", "Άρση αποκλεισμού") : t("Block", "Αποκλεισμός")}
           </button>
          </>
         )}
         <div className="h-px bg-stone-100 mx-2 my-1" />
         <button type="button" onClick={() => { messaging.deleteForMe(active.id); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-sm text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> {t("Delete for me", "Διαγραφή για εμένα")}
         </button>
        </div>
       )}
      </div>
     </div>
     <div className="flex items-center gap-1 px-3 sm:px-5 pb-3 overflow-x-auto no-scrollbar">
      {!isAIChat && (
       <button type="button" onClick={() => setShowValidationDialog(true)} className={cn("flex items-center gap-1 mr-1 min-h-9 px-2 rounded-lg transition-colors shrink-0", MODE_STYLE[validation.mode].bgColor)} title={modeText(validation.mode).description}>
        {(() => { const VIcon = MODE_STYLE[validation.mode].icon; return <VIcon className={cn("w-3 h-3", MODE_STYLE[validation.mode].color)} />; })()}
        <span className={cn("text-xs font-medium", MODE_STYLE[validation.mode].color)}>{modeText(validation.mode).label}</span>
       </button>
      )}
      {!isAIChat && (
       <>
        <IconButton icon={Phone} tooltip={t("Start a voice call (opens a private room)", "Έναρξη φωνητικής κλήσης (ανοίγει ιδιωτικό δωμάτιο)")} onClick={() => startCall("audio")} disabled={!canWrite} />
        <IconButton icon={Video} tooltip={t("Start a video call (opens a private room)", "Έναρξη βιντεοκλήσης (ανοίγει ιδιωτικό δωμάτιο)")} onClick={() => startCall("video")} disabled={!canWrite} />
       </>
      )}
      <IconButton icon={Search} tooltip={t("Search in this conversation", "Αναζήτηση σε αυτή τη συνομιλία")} active={showSearchPanel} onClick={() => { setShowSearchPanel(!showSearchPanel); setChatSearchQuery(""); }} />
      <div className="w-px h-6 bg-stone-200 mx-1" />
      <IconButton icon={Pin} tooltip={active.pinned ? t("Unpin", "Ξεκαρφίτσωμα") : t("Pin", "Καρφίτσωμα")} active={active.pinned} onClick={() => messaging.setFlag(active.id, "pinned", !active.pinned)} />
      <IconButton icon={Info} tooltip={t("Details", "Λεπτομέρειες")} active={showRightSidebar} onClick={() => setShowRightSidebar(!showRightSidebar)} />
     </div>
    </header>

    <AnimatePresence>
     {showSearchPanel && (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-stone-200 bg-white overflow-hidden shrink-0">
       <div className="p-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input type="search" placeholder={t("Search in this conversation…", "Αναζήτηση σε αυτή τη συνομιλία…")} value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} autoFocus
         className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-stone-400 min-h-11" />
        <span className="text-xs text-stone-400 tabular-nums">{chatSearchQuery ? t(`${searchHits} found`, `${searchHits} βρέθηκαν`) : ""}</span>
        <button type="button" aria-label={t("Close search", "Κλείσιμο αναζήτησης")} onClick={() => { setShowSearchPanel(false); setChatSearchQuery(""); }} className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-400 hover:text-stone-900 rounded"><X className="w-4 h-4" /></button>
       </div>
      </motion.div>
     )}
    </AnimatePresence>

    {twoPartyWaitingOnMe && (
     <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 text-xs text-emerald-800">
      <ShieldCheck className="w-4 h-4 shrink-0" />
      <span className="flex-1">{t(`${active.other.fullName} asks both of you to verify this transcript.`, `${active.other.fullName} ζητά να επικυρώσετε και οι δύο αυτό το αντίγραφο.`)}</span>
      <button type="button" onClick={() => void acceptTwoParty()} className="min-h-9 px-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700">{t("Accept", "Αποδοχή")}</button>
      <button type="button" onClick={() => messaging.setValidation(active.id, { mode: "casual" })} className="min-h-9 px-2 text-emerald-700 hover:underline">{t("Decline", "Απόρριψη")}</button>
     </div>
    )}

    <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gradient-to-b from-stone-50/50 to-white">
     {hasOlder && (
      <div className="flex justify-center py-2">
       <button type="button" onClick={loadOlder} className="min-h-10 px-3 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors">{t("Load older messages", "Φόρτωση παλαιότερων μηνυμάτων")}</button>
      </div>
     )}
     {messages.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-center">
       <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-stone-300" />
       </div>
       <p className="text-sm text-stone-600 font-medium">
        {isAIChat && activeAgent ? agentDescription(activeAgent) : t(`Say hello to ${active.other.fullName.split(" ")[0]}.`, `Πες ένα γεια στον/στην ${active.other.fullName.split(" ")[0]}.`)}
       </p>
       {!isAIChat && active.other.headline && <p className="text-xs text-stone-400 mt-1 max-w-sm">{active.other.headline}</p>}
       {isAIChat && prompts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
         {prompts.slice(0, 3).map((prompt, i) => (
          <button key={i} type="button" onClick={() => void handleSendMessage(prompt)} className="min-h-10 px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs rounded-full hover:border-stone-900 transition-colors">{prompt}</button>
         ))}
        </div>
       )}
      </div>
     ) : (
      <>
       {messages.map((msg, idx) => renderMessageBubble(msg, idx))}
       {(aiTyping && isAIChat) && (
        <div className="flex items-center gap-3">
         <Avatar alt={active.other.fullName} size="sm" isAI icon={activeAgent?.icon} />
         <TypingDots />
        </div>
       )}
       {otherTyping && !isAIChat && (
        <div className="flex items-center gap-3">
         <Avatar src={active.other.avatar} alt={active.other.fullName} size="sm" />
         <TypingDots />
        </div>
       )}
      </>
     )}
     <div ref={messagesEndRef} />
    </div>

    <div className="px-3 py-3 bg-white border-t border-stone-100 space-y-2 shrink-0 sm:px-5">
     {!canWrite ? (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-600">
       <Ban className="w-4 h-4 shrink-0 text-stone-400" />
       <span className="flex-1">
        {isBlockedByMe ? t("You blocked this member. Unblock them to write again.", "Έχεις αποκλείσει αυτό το μέλος. Άρσε τον αποκλεισμό για να γράψεις ξανά.")
         : permission.ok !== false ? "" : permission.reason === "blocked" ? t("This member is not accepting messages from you.", "Αυτό το μέλος δεν δέχεται μηνύματα από εσένα.")
         : permission.reason === "connections-only" ? t("This member accepts messages from connections only. Send a connection request first.", "Αυτό το μέλος δέχεται μηνύματα μόνο από συνδέσεις. Στείλε πρώτα αίτημα σύνδεσης.")
         : permission.reason === "self" ? t("This is your own account.", "Αυτός είναι ο δικός σου λογαριασμός.")
         : t("This member has turned off new messages.", "Αυτό το μέλος έχει απενεργοποιήσει τα νέα μηνύματα.")}
       </span>
       {isBlockedByMe ? (
        <button type="button" onClick={() => setReportBlockModal({ open: true, mode: 'block' })} className="min-h-9 px-3 rounded-lg bg-stone-900 text-white text-xs font-medium">{t("Unblock", "Άρση αποκλεισμού")}</button>
       ) : permission.ok === false && permission.reason === "connections-only" ? (
        <button type="button" onClick={() => navigate(`/profile/${active.otherId}`)} className="min-h-9 px-3 rounded-lg bg-stone-900 text-white text-xs font-medium">{t("Open profile", "Άνοιγμα προφίλ")}</button>
       ) : null}
      </div>
     ) : (
      <>
       {replyingTo && (
        <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border-l-2 border-stone-400">
         <div className="flex items-center gap-2 min-w-0">
          <Reply className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <div className="min-w-0">
           <span className="text-xs font-medium text-stone-700">{replyingTo.senderName}</span>
           <p className="text-xs text-stone-500 truncate">{replyingTo.body}</p>
          </div>
         </div>
         <button type="button" aria-label={t("Cancel reply", "Ακύρωση απάντησης")} onClick={() => setReplyingTo(null)} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-400 hover:text-stone-900 shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
       )}
       {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
         {pendingFiles.map(({ file, preview }, i) => (
          <div key={i} className="flex items-center gap-2 pl-1.5 pr-1 py-1 bg-stone-100 rounded-lg">
           {preview ? <img src={preview} alt="" className="w-7 h-7 rounded object-cover" /> : file.type.startsWith("audio/") ? <Mic className="w-3.5 h-3.5 text-stone-500" /> : <FileText className="w-3.5 h-3.5 text-stone-500" />}
           <span className="text-xs text-stone-600 truncate max-w-[140px]">{file.name}</span>
           <span className="text-xs text-stone-400">{formatBytes(file.size)}</span>
           <button type="button" aria-label={t("Remove attachment", "Αφαίρεση συνημμένου")} onClick={() => { if (preview) URL.revokeObjectURL(preview); setPendingFiles((prev) => prev.filter((_, idx) => idx !== i)); }} className="min-h-7 min-w-7 inline-flex items-center justify-center text-stone-400 hover:text-red-500"><X className="w-3 h-3" /></button>
          </div>
         ))}
        </div>
       )}
       {isAIChat && !inputText && messages.length > 0 && prompts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
         {prompts.map((prompt, i) => (
          <button key={i} type="button" onClick={() => void handleSendMessage(prompt)} className="min-h-9 px-2.5 py-1 bg-stone-50 text-stone-700 text-xs rounded-full hover:bg-stone-100 transition-colors border border-stone-200">{prompt}</button>
         ))}
        </div>
       )}
       {recording ? (
        <div className="flex items-center gap-3 p-2 bg-red-50 rounded-xl border border-red-200">
         <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
         <span className="text-sm font-mono text-red-700 font-medium tabular-nums">{formatRecTime(recordingTime)}</span>
         <span className="flex-1 text-xs text-red-700">{t("Recording… stop to attach the voice message.", "Ηχογράφηση… σταμάτησε για να επισυναφθεί το φωνητικό μήνυμα.")}</span>
         <button type="button" onClick={() => stopRecording(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-white rounded-lg" title={t("Cancel", "Ακύρωση")} aria-label={t("Cancel recording", "Ακύρωση ηχογράφησης")}><X className="w-4 h-4" /></button>
         <button type="button" onClick={() => stopRecording(true)} className="min-h-11 min-w-11 inline-flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600" title={t("Stop", "Διακοπή")} aria-label={t("Stop recording", "Διακοπή ηχογράφησης")}><Square className="w-4 h-4" /></button>
        </div>
       ) : (
        <div className="flex items-end gap-2">
         <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,audio/*" />
         <IconButton icon={Paperclip} tooltip={t("Attach files", "Επισύναψη αρχείων")} onClick={() => fileInputRef.current?.click()} disabled={pendingFiles.length >= 5} />
         {!isAIChat && <IconButton icon={Mic} tooltip={t("Record a voice message", "Ηχογράφηση φωνητικού μηνύματος")} onClick={() => void startRecording()} />}
         <div className="flex-1 relative">
          <textarea ref={textareaRef} value={inputText}
           onChange={(e) => { setInputText(e.target.value); autoResizeTextarea(); if (e.target.value.trim()) messaging.typing(); }}
           onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSendMessage(); } }}
           placeholder={isAIChat ? t("Ask anything… (Shift+Enter for a new line)", "Ρώτα ό,τι θέλεις… (Shift+Enter για νέα γραμμή)") : t("Write a message… (Shift+Enter for a new line)", "Γράψε μήνυμα… (Shift+Enter για νέα γραμμή)")}
           aria-label={t("Message", "Μήνυμα")}
           rows={1}
           className="w-full px-4 py-2.5 pr-11 bg-stone-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 transition-all resize-none min-h-[44px] max-h-[120px]" />
          <div className="absolute right-1 bottom-1" onClick={(e) => e.stopPropagation()}>
           <button type="button" aria-label={t("Insert emoji", "Εισαγωγή emoji")} onClick={() => setShowEmojiDropdown(!showEmojiDropdown)} className="min-h-9 min-w-9 inline-flex items-center justify-center text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-200 transition-colors">
            <Smile className="w-4 h-4" />
           </button>
           {showEmojiDropdown && (
            <div className="absolute bottom-12 right-0 p-2 bg-white rounded-xl shadow-lg border border-stone-200 z-30 w-[min(18rem,calc(100vw-2rem))]">
             <div className="grid grid-cols-7 gap-0.5">
              {EMOJI_GRID.map((e) => (
               <button key={e} type="button" onClick={() => { setInputText((prev) => prev + e); setShowEmojiDropdown(false); textareaRef.current?.focus(); }} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-stone-100 text-base transition-colors">{e}</button>
              ))}
             </div>
            </div>
           )}
          </div>
         </div>
         <button type="button" onClick={() => void handleSendMessage()} disabled={(!inputText.trim() && pendingFiles.length === 0) || sending || uploading}
          aria-label={t("Send", "Αποστολή")} title={t("Send", "Αποστολή")}
          className="w-11 h-11 bg-stone-900 text-white rounded-xl flex items-center justify-center hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 self-end">
          {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
         </button>
        </div>
       )}
      </>
     )}
    </div>
   </div>
  );
 };

 // =============================================================================
 // RENDER: RIGHT SIDEBAR
 // =============================================================================
 const renderRightSidebar = () => {
  if (!showRightSidebar || !active) return null;
  const style = MODE_STYLE[validation.mode];
  const VIcon = style.icon;
  return (
   <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="flex flex-col bg-white overflow-hidden max-xl:fixed max-xl:inset-0 max-xl:z-[80] xl:w-80 xl:shrink-0 xl:border-l xl:border-stone-200">
    <div className="flex items-center justify-between p-3 border-b border-stone-100">
     <h4 className="text-xs font-semibold text-stone-500 tracking-wider uppercase">{t("Details", "Λεπτομέρειες")}</h4>
     <button type="button" aria-label={t("Close details", "Κλείσιμο λεπτομερειών")} onClick={() => setShowRightSidebar(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"><X className="w-4 h-4" /></button>
    </div>
    <div className="flex-1 overflow-y-auto">
     <div className="p-5 text-center border-b border-stone-100">
      <div className="relative inline-block mb-3">
       <Avatar src={active.other.avatar} alt={active.other.fullName} size="xl" isAI={isAIChat} icon={activeAgent?.icon} />
       {otherOnline && <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />}
      </div>
      <h3 className="font-semibold text-stone-900 text-sm mb-0.5">{activeAgent ? agentName(activeAgent) : active.other.fullName}</h3>
      <p className="text-xs text-stone-500 mb-3">{activeAgent ? agentRole(activeAgent) : active.other.headline || labelOf(active.other.role) || t("Member", "Μέλος")}</p>
      {isAIChat && activeAgent ? (
       <div className="space-y-3 text-left mt-3">
        <div className="flex flex-wrap justify-center gap-1.5">{agentCapabilities(activeAgent).map((cap) => <span key={cap} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full">{cap}</span>)}</div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
         <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          {t("1-Click Studio Actions", "1-Click Ενέργειες Studio")}
         </p>
         <div className="grid grid-cols-1 gap-1.5">
          {[
           { label: t("Check Lean Canvas", "Έλεγχος Lean Canvas"), cmd: "/canvas" },
           { label: t("Check Startup Builder", "Πρόοδος Startup Builder"), cmd: "/builder" },
           { label: t("Readiness Score Diagnostic", "Δείκτης Ετοιμότητας"), cmd: "/readiness" },
           { label: t("Rank Top Co-Founder Matches", "Κατάταξη Κορυφαίων Matches"), cmd: "/match" },
           { label: t("Open 6-Axis Match Modal", "Άνοιγμα 6-Axis Match Modal"), cmd: "/6axis" },
           { label: t("Open Deal Room & Pitch Deck", "Άνοιγμα Deal Room & Pitch"), cmd: "/dealroom" },
           { label: t("Inspect Fundraising Round", "Επισκόπηση Γύρου Χρηματοδότησης"), cmd: "/round" },
          ].map((item) => (
           <button
            key={item.cmd}
            type="button"
            onClick={() => void messaging.send(item.cmd)}
            className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-900 hover:text-white rounded-lg border border-stone-200 transition-colors"
           >
            <span>{item.label}</span>
            <span className="font-mono text-[10px] opacity-60">{item.cmd}</span>
           </button>
          ))}
         </div>
        </div>
       </div>
      ) : (
       <button type="button" onClick={() => navigate(`/profile/${active.otherId}`)} className="inline-flex items-center gap-1.5 min-h-11 px-3 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-all">
        <UserIcon className="w-3 h-3" /> {t("View profile", "Προβολή προφίλ")}
       </button>
      )}
     </div>

     <div className="p-3 border-b border-stone-100">
      <h4 className="text-xs font-semibold text-stone-500 tracking-wider uppercase mb-2">{t("Shared photos", "Κοινοποιημένες φωτογραφίες")}</h4>
      {sharedMedia.length === 0 ? <p className="text-xs text-stone-400">{t("No photos yet. Attach an image in the message box to share one.", "Καμία φωτογραφία ακόμη. Επισύναψε εικόνα στο πλαίσιο μηνύματος για να τη μοιραστείς.")}</p> : (
       <div className="grid grid-cols-3 gap-1.5">
        {sharedMedia.slice(-9).reverse().map(({ attachment, message }) => {
         const mediaUrl = safeMediaUrl(attachment.url);
         if (!mediaUrl) return null;
         return (
          <a key={`${message.id}-${attachment.name}`} href={mediaUrl} target="_blank" rel="noopener noreferrer" className="aspect-square bg-stone-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
           <img src={mediaUrl} alt={attachment.name} className="w-full h-full object-cover" loading="lazy" />
          </a>
         );
        })}
       </div>
      )}
     </div>

     <div className="p-3 border-b border-stone-100">
      <h4 className="text-xs font-semibold text-stone-500 tracking-wider uppercase mb-2">{t("Shared files", "Κοινοποιημένα αρχεία")}</h4>
      {sharedFiles.length === 0 ? <p className="text-xs text-stone-400">{t("No files yet. Attach a document in the message box to share one.", "Κανένα αρχείο ακόμη. Επισύναψε έγγραφο στο πλαίσιο μηνύματος για να το μοιραστείς.")}</p> : (
       <div className="space-y-1.5">
        {sharedFiles.slice(-8).reverse().map(({ attachment, message }) => (
         <a key={`${message.id}-${attachment.name}`} href={safeMediaUrl(attachment.url) || undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 group">
          <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center group-hover:bg-stone-200 transition-colors shrink-0">
           {isAudio(attachment) ? <Mic className="w-3.5 h-3.5 text-stone-500" /> : <FileText className="w-3.5 h-3.5 text-stone-500" />}
          </div>
          <div className="flex-1 min-w-0">
           <p className="text-xs font-medium text-stone-900 truncate">{attachment.name}</p>
           <p className="text-xs text-stone-500">{formatBytes(attachment.size)} · {formatDate(message.createdAt)}</p>
          </div>
          <Download className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100 shrink-0" />
         </a>
        ))}
       </div>
      )}
     </div>

     {!isAIChat && (
      <div className="p-3 border-b border-stone-100">
       <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-stone-500 tracking-wider uppercase">{t("Transcript verification", "Επικύρωση αντιγράφου")}</h4>
        <button type="button" onClick={() => setShowValidationDialog(true)} className="min-h-9 text-xs text-stone-400 hover:text-stone-900 transition-colors">{t("Change", "Αλλαγή")}</button>
       </div>
       <div className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border mb-2", style.bgColor, style.border)}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", style.bgColor)}><VIcon className={cn("w-3.5 h-3.5", style.color)} /></div>
        <div className="min-w-0 flex-1">
         <p className="text-xs font-medium text-stone-900">{modeText(validation.mode).label}</p>
         <p className="text-xs text-stone-500">{twoPartyWaitingOnOther ? t(`Waiting for ${active.other.fullName.split(" ")[0]} to accept.`, `Αναμονή αποδοχής από ${active.other.fullName.split(" ")[0]}.`) : modeText(validation.mode).description}</p>
        </div>
       </div>
       {validation.hash && (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 mb-2">
         <span className="text-xs text-stone-500 font-mono truncate flex-1" title={validation.hash}>sha256:{validation.hash}</span>
         <button type="button" onClick={() => void copyValidationHash()} aria-label={t("Copy hash", "Αντιγραφή αποτυπώματος")} className="min-h-8 min-w-8 inline-flex items-center justify-center text-stone-400 hover:text-stone-900 rounded shrink-0">
          {hashCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
         </button>
        </div>
       )}
       {transcriptAvailable && (
        <div className="flex items-center gap-1.5">
         <button type="button" onClick={() => handleExportTranscript('txt')} className="flex-1 flex items-center justify-center gap-1.5 min-h-9 px-2 text-xs font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-all"><FileText className="w-3 h-3" /> {t("Export .txt", "Εξαγωγή .txt")}</button>
         <button type="button" onClick={() => handleExportTranscript('json')} className="flex-1 flex items-center justify-center gap-1.5 min-h-9 px-2 text-xs font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-all"><Download className="w-3 h-3" /> {t("Export .json", "Εξαγωγή .json")}</button>
         <button type="button" onClick={() => void refreshHash()} title={t("Recompute the fingerprint over the current messages", "Υπολόγισε ξανά το αποτύπωμα για τα τρέχοντα μηνύματα")} className="min-h-9 px-2 text-xs font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200">{t("Refresh", "Ανανέωση")}</button>
        </div>
       )}
      </div>
     )}

     <div className="p-3">
      <h4 className="text-xs font-semibold text-stone-500 tracking-wider uppercase mb-2">{t("Conversation", "Συνομιλία")}</h4>
      <div className="space-y-0.5">
       <button type="button" onClick={() => messaging.setFlag(active.id, "muted", !active.muted)} className={cn("w-full flex items-center gap-2.5 min-h-11 px-3 text-xs rounded-xl transition-all", active.muted ? "text-stone-800 bg-stone-100" : "text-stone-600 hover:bg-stone-50")}>
        {active.muted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />} {active.muted ? t("Unmute notifications", "Κατάργηση σίγασης") : t("Mute notifications", "Σίγαση ειδοποιήσεων")}
       </button>
       <button type="button" onClick={() => messaging.setFlag(active.id, "pinned", !active.pinned)} className={cn("w-full flex items-center gap-2.5 min-h-11 px-3 text-xs rounded-xl transition-all", active.pinned ? "text-stone-800 bg-stone-100" : "text-stone-600 hover:bg-stone-50")}>
        <Pin className="w-3.5 h-3.5" /> {active.pinned ? t("Unpin conversation", "Ξεκαρφίτσωμα συνομιλίας") : t("Pin conversation", "Καρφίτσωμα συνομιλίας")}
       </button>
       <button type="button" onClick={() => messaging.setFlag(active.id, "archived", !active.archived)} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-xs text-stone-600 hover:bg-stone-50 rounded-xl transition-all">
        <Archive className="w-3.5 h-3.5" /> {active.archived ? t("Unarchive", "Επαναφορά από αρχείο") : t("Archive conversation", "Αρχειοθέτηση συνομιλίας")}
       </button>
       {!isAIChat && (
        <>
         <button type="button" onClick={() => setReportBlockModal({ open: true, mode: 'report' })} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-xs text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
          <Flag className="w-3.5 h-3.5" /> {t("Report member", "Αναφορά μέλους")}
         </button>
         <button type="button" onClick={() => setReportBlockModal({ open: true, mode: 'block' })} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-all">
          <Ban className="w-3.5 h-3.5" /> {isBlockedByMe ? t("Unblock member", "Άρση αποκλεισμού μέλους") : t("Block member", "Αποκλεισμός μέλους")}
         </button>
        </>
       )}
       <button type="button" onClick={() => messaging.deleteForMe(active.id)} className="w-full flex items-center gap-2.5 min-h-11 px-3 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-all">
        <Trash2 className="w-3.5 h-3.5" /> {t("Delete conversation for me", "Διαγραφή συνομιλίας για εμένα")}
       </button>
      </div>
     </div>
    </div>
   </motion.aside>
  );
 };

 // =============================================================================
 // RENDER: AI SPECIALISTS
 // =============================================================================
 const aiConversations = conversations.filter((c) => c.kind === "ai");
 const aiInsights = useMemo(() => {
  const latest = new Map<string, ChatConversation>();
  for (const conversation of aiConversations) {
   if (conversation.lastMessage && conversation.lastSenderId === conversation.otherId) latest.set(conversation.otherId, conversation);
  }
  return [...latest.values()].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
 }, [aiConversations]);

 const renderAICenter = () => (
  <div className="flex-1 flex flex-col bg-gradient-to-br from-stone-50 via-white to-white overflow-hidden">
   <header className="flex flex-col gap-3 px-4 sm:px-6 py-3 border-b border-stone-100 bg-white/80 shrink-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
     <button type="button" aria-label={t("Back to conversations", "Πίσω στις συνομιλίες")} onClick={() => setActiveView("chat")} className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center text-stone-600 hover:bg-stone-100 rounded-xl shrink-0"><ChevronLeft className="w-5 h-5" /></button>
     <div className="w-10 h-10 bg-stone-900 rounded-2xl flex items-center justify-center"><BrainCircuit className="w-5 h-5 text-white" /></div>
     <div>
      <h1 className="font-bold text-stone-900 tracking-tight">{t("AI specialists", "Ειδικοί AI")}</h1>
      <p className="text-xs text-stone-400 font-medium tracking-wider">{t("Each one keeps its own conversation with you", "Ο καθένας κρατά τη δική του συνομιλία μαζί σου")}</p>
     </div>
    </div>
    <div className="flex p-1 bg-stone-100 rounded-xl" role="tablist">
     {([
      { id: "agents", label: t("Specialists", "Ειδικοί"), icon: Users },
      { id: "insights", label: t("Latest answers", "Τελευταίες απαντήσεις"), icon: Lightbulb },
      { id: "history", label: t("History", "Ιστορικό"), icon: Clock },
     ] as { id: AIView; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
      <button key={id} role="tab" aria-selected={aiView === id} onClick={() => setAiView(id)} className={cn("flex items-center gap-1.5 min-h-10 px-3 rounded-lg text-xs font-medium transition-all", aiView === id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
       <Icon className="w-3.5 h-3.5" /> {label}
      </button>
     ))}
    </div>
   </header>

   <div className="flex-1 overflow-y-auto p-4 sm:p-6">
    {aiView === "agents" && (
     <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-6">
       <h2 className="text-base font-semibold text-stone-900 mb-1.5 tracking-tight">{t("Pick a specialist", "Διάλεξε ειδικό")}</h2>
       <p className="text-sm text-stone-500">{t("Focused help for team formation, pitching, strategy, market research and more.", "Στοχευμένη βοήθεια για σύνθεση ομάδας, pitch, στρατηγική, έρευνα αγοράς και άλλα.")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {MOCK_AGENTS.map((agent) => (
        <motion.button key={agent.id} type="button" whileHover={{ scale: 1.01 }} onClick={() => void startWith(agent.id)}
         className="p-5 bg-white border border-stone-200 rounded-2xl transition-all hover:border-stone-900 text-left">
         <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white text-2xl flex items-center justify-center shrink-0" aria-hidden="true">{agent.icon || agentName(agent).slice(0, 1)}</div>
          <div className="flex-1 min-w-0">
           <h3 className="font-semibold text-stone-900 mb-1">{agentName(agent)}</h3>
           <p className="text-xs text-stone-600 font-semibold mb-1.5">{agentRole(agent)}</p>
           <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{agentDescription(agent)}</p>
           <div className="mt-3 flex flex-wrap gap-1.5">
            {agentCapabilities(agent).map((cap) => <span key={cap} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-full">{cap}</span>)}
           </div>
          </div>
         </div>
        </motion.button>
       ))}
      </div>
     </div>
    )}

    {aiView === "insights" && (
     <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-base font-semibold text-stone-900 mb-1 tracking-tight">{t("Latest answers", "Τελευταίες απαντήσεις")}</h2>
      <p className="text-sm text-stone-500 mb-4">{t("The most recent reply from each specialist you have talked to.", "Η πιο πρόσφατη απάντηση από κάθε ειδικό με τον οποίο έχεις μιλήσει.")}</p>
      {aiInsights.length === 0 ? (
       <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <p className="text-sm text-stone-500">{t("Ask a specialist and their answers will be collected here.", "Ρώτα έναν ειδικό και οι απαντήσεις του θα συγκεντρώνονται εδώ.")}</p>
        <button type="button" onClick={() => setAiView("agents")} className="mt-4 min-h-11 px-4 bg-stone-900 text-white rounded-xl text-sm font-medium">{t("Pick a specialist", "Διάλεξε ειδικό")}</button>
       </div>
      ) : aiInsights.map((conversation) => {
       const agent = MOCK_AGENTS.find((item) => item.id === conversation.otherId);
       return (
        <button key={conversation.id} type="button" onClick={() => openConversation(conversation.id)} className="w-full p-4 bg-white border border-stone-200 rounded-xl text-left hover:border-stone-900 transition-colors">
         <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0 text-base" aria-hidden="true">{agent?.icon || (agent ? agentName(agent).slice(0, 1) : conversation.other.fullName.slice(0, 1))}</div>
          <div className="flex-1 min-w-0">
           <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-stone-900 text-sm">{agent ? agentName(agent) : conversation.other.fullName}</h3>
            <span className="text-xs text-stone-400 shrink-0"><RelTime iso={new Date(conversation.lastMessageAt).toISOString()} /></span>
           </div>
           <p className="text-xs text-stone-600 mt-1 leading-relaxed line-clamp-4 whitespace-pre-wrap">{conversation.lastMessage}</p>
          </div>
         </div>
        </button>
       );
      })}
     </div>
    )}

    {aiView === "history" && (
     <div className="max-w-2xl mx-auto">
      <h2 className="text-base font-semibold text-stone-900 mb-4 tracking-tight">{t("Specialist conversations", "Συνομιλίες με ειδικούς")}</h2>
      {aiConversations.length === 0 ? (
       <p className="text-sm text-stone-500 text-center py-12">{t('No specialist conversations yet.', 'Καμία συνομιλία με ειδικούς ακόμη.')}</p>
      ) : (
       <div className="space-y-2">
        {aiConversations.map((conv) => {
         const agent = MOCK_AGENTS.find((item) => item.id === conv.otherId);
         return (
          <div key={conv.id} className="flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition-all">
           <button type="button" onClick={() => openConversation(conv.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <Avatar alt={conv.other.fullName} size="md" isAI icon={agent?.icon} />
            <div className="flex-1 min-w-0">
             <h3 className="font-semibold text-stone-900 text-sm">{agent ? agentName(agent) : conv.other.fullName}</h3>
             <p className="text-xs text-stone-500 truncate">{conv.lastMessage || t("No messages yet", "Δεν υπάρχουν μηνύματα ακόμη")}</p>
            </div>
            {conv.lastMessage && <span className="text-xs text-stone-400 shrink-0"><RelTime iso={new Date(conv.lastMessageAt).toISOString()} /></span>}
           </button>
           <IconButton icon={Trash2} tooltip={t("Delete this conversation", "Διαγραφή αυτής της συνομιλίας")} danger onClick={() => messaging.deleteForMe(conv.id)} />
          </div>
         );
        })}
       </div>
      )}
     </div>
    )}
   </div>
  </div>
 );

 // =============================================================================
 // MAIN RENDER
 // =============================================================================
 return (
  <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
   {renderLeftSidebar()}
   <main className={cn("flex-1 flex flex-col min-w-0", !activeId && activeView === "chat" && "hidden md:flex")}>
    <div className="flex-1 flex min-h-0">
     {activeView === "chat" && renderMainChat()}
     {activeView === "ai-center" && renderAICenter()}
     <AnimatePresence>{activeView === "chat" && renderRightSidebar()}</AnimatePresence>
    </div>
   </main>

   <PeoplePicker
    open={picker.open}
    onClose={() => setPicker({ open: false, mode: 'new' })}
    title={picker.mode === 'forward' ? t("Forward to…", "Προώθηση σε…") : t("New message", "Νέο μήνυμα")}
    description={picker.mode === 'forward' ? t("Choose who receives a copy of this message.", "Διάλεξε ποιος θα λάβει αντίγραφο αυτού του μηνύματος.") : t("Choose a member or an AI specialist.", "Διάλεξε ένα μέλος ή έναν ειδικό AI.")}
    people={people.filter((person) => (real ? connectionRecords().some((record) => record.status === "Accepted" && record.participants.includes(person.id)) || person.messagesFrom !== "none" : true))}
    conversations={conversations}
    includeAgents={picker.mode === 'new'}
    onPick={(id) => (picker.mode === 'forward' ? void forwardTo(id) : void startWith(id))}
   />

   <Modal open={showValidationDialog} onClose={() => setShowValidationDialog(false)} title={t("Transcript verification", "Επικύρωση αντιγράφου")} description={t("Decide whether this conversation keeps a verifiable record.", "Αποφάσισε αν αυτή η συνομιλία θα κρατά επαληθεύσιμο αρχείο.")}>
    <div className="space-y-2 mb-4">
     {(["casual", "one_party", "two_party"] as ValidationMode[]).map((mode) => {
      const style = MODE_STYLE[mode];
      const MIcon = style.icon;
      const isActive = validation.mode === mode;
      return (
       <button key={mode} type="button" onClick={() => void setValidationMode(mode)} aria-pressed={isActive}
        className={cn("w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all", isActive ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50")}>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5", style.bgColor)}><MIcon className={cn("w-5 h-5", style.color)} /></div>
        <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-stone-900">{modeText(mode).label}</p>
          {isActive && <span className="px-1.5 py-0.5 bg-stone-200 text-stone-600 text-xs rounded-full font-medium">{t("Current", "Τρέχουσα")}</span>}
         </div>
         <p className="text-xs text-stone-500 mt-0.5">{modeText(mode).description}</p>
         {mode === 'two_party' && active && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Flag className="w-3 h-3" /> {t(`${active.other.fullName} must accept.`, `Απαιτείται αποδοχή από ${active.other.fullName}.`)}</p>
         )}
        </div>
       </button>
      );
     })}
    </div>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 mb-4">
     <div className="flex items-start gap-2">
      <Info className="w-4 h-4 shrink-0 text-stone-400 mt-0.5" />
      <p className="text-xs text-stone-500 leading-relaxed">
       {t("The fingerprint is a SHA-256 hash of the messages at the time of verification. Export the transcript and anyone can recompute the same hash to confirm nothing changed.", "Το αποτύπωμα είναι ένας κωδικός SHA-256 των μηνυμάτων τη στιγμή της επικύρωσης. Εξάγοντας το αντίγραφο, οποιοσδήποτε μπορεί να υπολογίσει ξανά τον ίδιο κωδικό και να επιβεβαιώσει ότι τίποτα δεν άλλαξε.")}
      </p>
     </div>
    </div>
    <button type="button" onClick={() => setShowValidationDialog(false)} className="w-full min-h-11 px-4 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition-all">{t("Close", "Κλείσιμο")}</button>
   </Modal>

   <Modal
    open={reportBlockModal.open && Boolean(active)}
    onClose={() => setReportBlockModal({ ...reportBlockModal, open: false })}
    title={reportBlockModal.mode === 'report' ? t("Report member", "Αναφορά μέλους") : isBlockedByMe ? t("Unblock member", "Άρση αποκλεισμού") : t("Block member", "Αποκλεισμός μέλους")}
    description={active?.other.fullName}
   >
    <p className="text-sm text-stone-600 mb-4">
     {reportBlockModal.mode === 'report'
      ? t("Tell us what happened. Our team reviews every report and takes action where needed.", "Πες μας τι συνέβη. Η ομάδα μας εξετάζει κάθε αναφορά και παρεμβαίνει όπου χρειάζεται.")
      : isBlockedByMe ? t("They will be able to message you and see your profile again.", "Θα μπορεί ξανά να σου στέλνει μηνύματα και να βλέπει το προφίλ σου.")
      : t("They will no longer be able to message you. You can undo this at any time from Settings › Privacy.", "Δεν θα μπορεί πλέον να σου στέλνει μηνύματα. Μπορείς να το αναιρέσεις ανά πάσα στιγμή από Ρυθμίσεις › Απόρρητο.")}
    </p>
    {reportBlockModal.mode === 'report' && (
     <div className="mb-4 space-y-2">
      <label className="text-xs font-semibold text-stone-600" htmlFor="report-reason">{t("Reason", "Αιτία")}</label>
      <select id="report-reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full min-h-11 px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 bg-white">
       <option value="">{t("Select a reason…", "Επίλεξε αιτία…")}</option>
       <option value="spam">{t("Spam or scam", "Ανεπιθύμητα μηνύματα ή απάτη")}</option>
       <option value="harassment">{t("Harassment", "Παρενόχληση")}</option>
       <option value="inappropriate">{t("Inappropriate content", "Ακατάλληλο περιεχόμενο")}</option>
       <option value="impersonation">{t("Impersonation", "Πλαστοπροσωπία")}</option>
       <option value="other">{t("Other", "Άλλο")}</option>
      </select>
      <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder={t("Additional details (optional)…", "Επιπλέον λεπτομέρειες (προαιρετικά)…")} rows={3} aria-label={t("Additional details", "Επιπλέον λεπτομέρειες")}
       className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 resize-none" />
     </div>
    )}
    <div className="flex items-center gap-2">
     <button type="button" onClick={() => setReportBlockModal({ ...reportBlockModal, open: false })} className="flex-1 min-h-11 px-4 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition-all">{t("Cancel", "Ακύρωση")}</button>
     <button type="button" onClick={() => void submitReportOrBlock()}
      className={cn("flex-1 min-h-11 px-4 text-white text-sm font-medium rounded-xl transition-all", reportBlockModal.mode === 'report' ? "bg-amber-600 hover:bg-amber-700" : isBlockedByMe ? "bg-stone-900 hover:bg-stone-800" : "bg-red-600 hover:bg-red-700")}>
      {reportBlockModal.mode === 'report' ? t("Send report", "Αποστολή αναφοράς") : isBlockedByMe ? t("Unblock", "Άρση αποκλεισμού") : t("Block", "Αποκλεισμός")}
     </button>
    </div>
   </Modal>
  </div>
 );
}
