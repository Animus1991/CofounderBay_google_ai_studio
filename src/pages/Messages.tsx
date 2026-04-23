import { useState, useEffect, useRef, useMemo } from "react";
import { 
 Search, 
 Plus, 
 MoreVertical, 
 Send, 
 Paperclip, 
 Smile, 
 Phone, 
 Video, 
 Info, 
 ChevronLeft, 
 Check, 
 CheckCheck, 
 MessageSquare, 
 Clock, 
 X, 
 FileText, 
 Mic, 
 Globe, 
 Briefcase, 
 ChevronDown,
 Bot,
 Cpu,
 MoreHorizontal,
 Sparkles,
 Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User } from "../types";
import { cn } from "../lib/utils";
import { useMessaging, Conversation, Message } from "../context/MessagingContext";
import { AIService, MOCK_AGENTS } from "../services/aiService";

interface MessagesProps {
 user: User;
}

export default function Messages({ user }: MessagesProps) {
 const { state: messagingState, dispatch: messagingDispatch, sendMessage: sendUserMessage, markAsRead, createConversation } = useMessaging();
 const [inputText, setInputText] = useState("");
 const [searchQuery, setSearchQuery] = useState("");
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
 const [isTyping, setIsTyping] = useState(false);
 const [attachedFile, setAttachedFile] = useState<{ name: string; data: string } | null>(null);

 const messagesEndRef = useRef<HTMLDivElement>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const selectedConversation = messagingState.conversations.find(c => c.id === messagingState.activeConversationId) || null;

 const systemMetadata = useMemo(() => ({
  encryption: "AES-256-GCM",
  latency: "12ms",
  protocol: "V-OS/SECURE",
  nodeId: "NODE_772_X"
 }), []);

 useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
 }, [messagingState.messages]);

 const handleSendMessage = async (textOverride?: string) => {
  const text = textOverride !== undefined ? textOverride : inputText;
  if ((!text.trim() && !attachedFile) || !messagingState.activeConversationId) return;
  
  const activeConv = selectedConversation;
  if (!activeConv) return;

  const isAI = activeConv.otherParticipant.id.startsWith('a');

  if (isAI) {
   const agent = MOCK_AGENTS.find(a => a.id === activeConv.otherParticipant.id);
   if (!agent) return;

   sendUserMessage(text, attachedFile);
   setInputText("");
   setAttachedFile(null);
   setIsTyping(true);

   try {
    const response = await AIService.chat(text, agent.role, 'llama3.2', attachedFile?.data);
    sendUserMessage(response.text, undefined, agent.id);
   } catch (error) {
    console.error('AI Chat Error:', error);
    const errorMsg = error instanceof Error ? error.message : "I'm sorry, I'm having trouble connecting right now.";
    sendUserMessage(errorMsg, undefined, agent.id);
   } finally {
    setIsTyping(false);
   }
  } else {
   sendUserMessage(text, attachedFile);
   setInputText("");
   setAttachedFile(null);
  }
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
   const reader = new FileReader();
   reader.onloadend = () => {
    setAttachedFile({
     name: file.name,
     data: reader.result as string
    });
   };
   reader.readAsDataURL(file);
  }
 };

 const filteredConversations = messagingState.conversations.filter(c => 
  c.otherParticipant.fullName.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
  <PageContainer className="h-[calc(100vh-120px)] flex overflow-hidden p-0 bg-[#0A0A0A] border border-white/5 rounded-[3rem] shadow-2xl relative">
   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none" />
   
   {/* Conversation List */}
   <aside className={cn(
    "w-full md:w-96 border-r border-white/5 bg-stone-950/50 backdrop-blur-xl flex flex-col transition-all duration-300 relative z-10",
    selectedConversation && "hidden md:flex"
   )}>
    <div className="p-10 space-y-8">
     <div className="flex items-center justify-between">
      <div className="space-y-1">
       <h2 className="text-2xl font-light tracking-tight text-white leading-snug">
        Node <span className="font-serif italic text-stone-600">Inbox</span>
       </h2>
       <p className="text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">SYSTEM_SYNC: OPTIMAL</p>
      </div>
      <Button variant="ghost" size="icon" className="w-12 h-10 text-stone-500 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5">
       <Plus className="w-6 h-6" />
      </Button>
     </div>
     <div className="relative group">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600 group-focus-within:text-white transition-colors" />
      <input 
       type="text" 
       placeholder="Filter nodes..." 
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-base text-white placeholder:text-stone-700 focus:outline-none focus:ring-2 focus:ring-white/5 focus:border-white/20 transition-all font-light"
      />
     </div>
    </div>

    <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
     {filteredConversations.map((conv) => (
      <div 
       key={conv.id}
       onClick={() => {
        messagingDispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conv.id });
        markAsRead(conv.id);
       }}
       className={cn(
        "px-10 py-8 flex items-center gap-6 cursor-pointer transition-all border-l-[3px] relative group",
        selectedConversation?.id === conv.id 
         ? "bg-white/5 border-white shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" 
         : "border-transparent hover:bg-white/[0.02]"
       )}
      >
       <div className="relative shrink-0">
        <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-700">
         <img src={conv.otherParticipant.profile?.profilePhoto || `https://picsum.photos/seed/${conv.id}/100/100`} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
        </div>
        <div className={cn(
         "absolute -bottom-1 -right-1 w-5 h-5 border-2 border-stone-950 rounded-full flex items-center justify-center shadow-lg",
         conv.otherParticipant.isAI ? "bg-stone-900" : "bg-emerald-500"
        )}>
         {conv.otherParticipant.isAI ? <Bot className="w-3 h-3 text-white" /> : <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
        </div>
       </div>
       <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
         <h4 className={cn(
          "text-lg font-medium truncate tracking-tight",
          conv.unreadCount > 0 ? "text-white" : "text-stone-400"
         )}>{conv.otherParticipant.fullName}</h4>
         <span className="text-xs text-stone-600 font-mono font-medium uppercase tracking-widest">
          {conv.lastMessageTime}
         </span>
        </div>
        <div className="flex items-center justify-between gap-3">
         <p className={cn(
          "text-sm truncate font-light leading-relaxed",
          conv.unreadCount > 0 ? "text-stone-200 font-medium" : "text-stone-500"
         )}>{conv.lastMessage}</p>
         {conv.unreadCount > 0 && (
          <span className="bg-white text-stone-950 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 shadow-[0_5px_15px_rgba(255,255,255,0.2)]">
           {conv.unreadCount}
          </span>
         )}
        </div>
       </div>
      </div>
     ))}
    </div>
   </aside>

   {/* Chat Interface */}
   <main className={cn(
    "flex-1 flex flex-col bg-stone-950 transition-all duration-300 relative overflow-hidden",
    !selectedConversation && "hidden md:flex items-center justify-center bg-[#0A0A0A]"
   )}>
    {selectedConversation ? (
     <>
      {/* Chat Header */}
      <header className="px-10 py-8 bg-stone-950/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between shadow-2xl relative z-20">
       <div className="flex items-center gap-6">
        <Button 
         variant="ghost" 
         size="icon" 
         className="md:hidden text-stone-500 hover:text-white hover:bg-white/5 rounded-2xl"
         onClick={() => messagingDispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null })}
        >
         <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-6">
         <div className="w-14 h-11 rounded-[1.5rem] overflow-hidden border border-white/10 shadow-2xl">
          <img src={selectedConversation.otherParticipant.profile?.profilePhoto || `https://picsum.photos/seed/${selectedConversation.id}/100/100`} alt="" className="w-full h-full object-cover grayscale" />
         </div>
         <div className="text-left space-y-1">
          <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-white tracking-tight">{selectedConversation.otherParticipant.fullName}</h3>
          <div className="flex items-center gap-3">
           <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-stone-500 font-mono font-medium uppercase tracking-wider">
             {selectedConversation.otherParticipant.isAI ? "AI_STRATEGIC_CORE" : "NODE_ACTIVE"}
            </span>
           </div>
           <span className="text-stone-800 text-xs font-mono">•</span>
           <span className="text-xs text-stone-700 font-mono font-medium uppercase tracking-wider">LATENCY: {systemMetadata.latency}</span>
          </div>
         </div>
        </div>
       </div>

       <div className="flex items-center gap-4">
        {selectedConversation.otherParticipant.isAI && (
         <div className="relative">
          <Button 
           variant="outline" 
           size="sm" 
           onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
           className="h-11 px-8 rounded-[1.5rem] border-white/10 text-xs font-medium uppercase tracking-wider gap-4 hover:bg-white/5 text-stone-400 hover:text-white transition-all shadow-xl"
          >
           <Cpu className="w-4 h-4 text-stone-500" />
           Switch Core
           <ChevronDown className={cn("w-4 h-4 transition-transform duration-500", isAgentDropdownOpen && "rotate-180")} />
          </Button>
          
          <AnimatePresence>
           {isAgentDropdownOpen && (
            <motion.div
             initial={{ opacity: 0, y: 12, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 12, scale: 0.95 }}
             className="absolute top-full right-0 mt-4 w-80 bg-stone-950 border border-white/10 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] z-50 p-4 overflow-hidden backdrop-blur-3xl"
            >
             {MOCK_AGENTS.map((agent) => (
              <button
               key={agent.id}
               onClick={async () => {
                const conv = await createConversation(['u1', agent.id]);
                if (conv) {
                 messagingDispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conv.id });
                }
                setIsAgentDropdownOpen(false);
               }}
               className={cn(
                "w-full flex items-start gap-5 p-5 rounded-3xl transition-all text-left group relative overflow-hidden",
                selectedConversation.otherParticipant.id === agent.id ? "bg-white/5" : "hover:bg-white/[0.02]"
               )}
              >
               <div className="w-14 h-11 rounded-2xl bg-stone-900 overflow-hidden shrink-0 border border-white/5 group-hover:border-white/20 transition-colors">
                <img src={agent.avatar} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
               </div>
               <div className="min-w-0 space-y-1">
                <p className="text-base font-medium text-white truncate">{agent.name}</p>
                <p className="text-xs text-stone-600 font-mono font-medium uppercase tracking-widest truncate">{agent.role}</p>
               </div>
              </button>
             ))}
            </motion.div>
           )}
          </AnimatePresence>
         </div>
        )}
        <div className="h-10 w-px bg-white/5 mx-2" />
        <Button variant="ghost" size="icon" className="w-14 h-11 text-stone-600 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5 transition-all">
         <Phone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-14 h-11 text-stone-600 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5 transition-all">
         <Video className="w-5 h-5" />
        </Button>
        <Button 
         variant="ghost" 
         size="icon" 
         className={cn("w-14 h-11 text-stone-600 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5 transition-all", isSidebarOpen && "text-white bg-white/5 border-white/20")}
         onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
         <Info className="w-5 h-5" />
        </Button>
       </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-12 space-y-12 bg-[#0A0A0A] relative">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_50%)] pointer-events-none" />
       
       {messagingState.messages.map((msg, i) => {
        const isMe = msg.senderId === user.id;
        const showAvatar = i === 0 || messagingState.messages[i-1].senderId !== msg.senderId;
        
        return (
         <motion.div 
          key={msg.id} 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
           "flex items-end gap-6",
           isMe ? "flex-row-reverse" : "flex-row"
          )}
         >
          {!isMe && (
           <div className="w-12 h-12 rounded-[1.5rem] overflow-hidden border border-white/10 shrink-0 mb-2 shadow-2xl">
            {showAvatar ? (
             <img src={selectedConversation.otherParticipant.profile?.profilePhoto || `https://picsum.photos/seed/${selectedConversation.id}/100/100`} alt="" className="w-full h-full object-cover grayscale" />
            ) : (
             <div className="w-full h-full bg-transparent" />
            )}
           </div>
          )}
          <div className={cn(
           "max-w-[65%] space-y-3",
           isMe ? "items-end" : "items-start"
          )}>
           <div className={cn(
            "px-8 py-6 rounded-[2.5rem] text-lg leading-relaxed shadow-2xl text-left transition-all relative group/msg",
            isMe 
             ? "bg-white text-stone-950 rounded-br-none font-medium" 
             : msg.isAI 
              ? "bg-stone-900 border border-white/10 text-stone-200 rounded-bl-none"
              : "bg-white/5 text-stone-400 rounded-bl-none border border-white/5"
           )}>
            {msg.isAI && (
             <div className="flex items-center gap-4 mb-4 text-xs font-mono font-medium uppercase tracking-wider text-stone-500 border-b border-white/5 pb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              AI_STRATEGIC_INSIGHT
             </div>
            )}
            {msg.body}
            
            {/* Monospace Timestamp on Hover */}
            <div className={cn(
             "absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-500 px-4 py-1 bg-stone-900 text-xs font-mono font-medium text-stone-500 rounded-full border border-white/10",
             isMe ? "-left-24" : "-right-24"
            )}>
             {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
           </div>
           <div className={cn(
            "flex items-center gap-4 px-4",
            isMe ? "flex-row-reverse" : "flex-row"
           )}>
            <span className="text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">
             {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMe && (
             <div className="text-stone-700">
              {msg.readStatus ? <CheckCheck className="w-4 h-4 text-white" /> : <Check className="w-4 h-4" />}
             </div>
            )}
           </div>
          </div>
         </motion.div>
        );
       })}
       {isTyping && (
        <div className="flex items-center gap-6">
         <div className="w-12 h-12 rounded-[1.5rem] bg-stone-900 border border-white/10 flex items-center justify-center shadow-2xl">
          <Bot className="w-6 h-6 text-stone-500 animate-pulse" />
         </div>
         <div className="flex gap-2.5 bg-white/5 px-4 py-2 rounded-[2rem] border border-white/5 shadow-2xl">
          <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce" />
         </div>
        </div>
       )}
       <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className="p-10 bg-stone-950 border-t border-white/5 space-y-10 relative z-20">
       {selectedConversation.otherParticipant.isAI && (
        <div className="flex flex-wrap gap-3">
         {MOCK_AGENTS.find(a => a.id === selectedConversation.otherParticipant.id)?.suggestedPrompts.map((prompt) => (
          <button
           key={prompt}
           onClick={() => handleSendMessage(prompt)}
           className="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-xs font-medium text-stone-500 uppercase tracking-wider hover:bg-white hover:text-stone-950 hover:border-white transition-all duration-500"
          >
           {prompt}
          </button>
         ))}
        </div>
       )}
       
       <div className="flex items-center gap-8">
        <input 
         type="file"
         ref={fileInputRef}
         onChange={handleFileChange}
         className="hidden"
         accept=".pdf,.png,.jpg,.jpeg"
        />
        <Button 
         variant="ghost" 
         size="icon" 
         className="w-16 h-16 text-stone-600 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5 shrink-0 transition-all"
         onClick={() => fileInputRef.current?.click()}
        >
         <Paperclip className="w-7 h-7" />
        </Button>
        <div className="flex-1 relative group">
         <div className="absolute inset-0 bg-white/5 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
         <input 
          type="text" 
          placeholder="Execute command or type message..." 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 px-10 text-lg text-white placeholder:text-stone-800 focus:outline-none focus:ring-2 focus:ring-white/5 focus:border-white/20 transition-all font-light relative z-10"
         />
         <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3 z-10">
          <Button variant="ghost" size="icon" className="h-10 w-12 text-stone-700 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
           <Smile className="w-7 h-7" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-12 text-stone-700 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
           <Mic className="w-7 h-7" />
          </Button>
         </div>
        </div>
        <Button 
         onClick={() => handleSendMessage()}
         disabled={!inputText.trim() && !attachedFile}
         className="w-16 h-16 rounded-[2rem] bg-white text-stone-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-[0_20px_50px_-10px_rgba(255,255,255,0.2)]"
        >
         <Send className="w-7 h-7" />
        </Button>
       </div>
       {attachedFile && (
        <div className="flex items-center gap-5 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 w-fit animate-in fade-in slide-in-from-bottom-4">
         <FileText className="w-6 h-6 text-stone-500" />
         <span className="text-sm font-medium text-stone-400 uppercase tracking-widest">{attachedFile.name}</span>
         <button onClick={() => setAttachedFile(null)} className="text-stone-600 hover:text-red-500 transition-colors ml-4">
          <X className="w-6 h-6" />
         </button>
        </div>
       )}
      </footer>
     </>
    ) : (
     <div className="text-center space-y-12 max-w-md relative z-10">
      <div className="w-36 h-36 bg-white/5 rounded-[4rem] flex items-center justify-center mx-auto text-stone-800 border border-white/5 shadow-inner relative group overflow-hidden">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
       <MessageSquare className="w-16 h-16 relative z-10" />
      </div>
      <div className="space-y-6">
       <h3 className="text-2xl font-light tracking-tight leading-snug text-white">
        Initialize <span className="font-serif italic text-stone-600">Comms</span>
       </h3>
       <p className="text-base sm:text-lg md:text-xl xl:text-2xl text-stone-500 leading-relaxed font-light">
        Connect with mentors, co-founders, or our AI agents to accelerate your venture with <span className="text-white font-medium">algorithmic precision</span>.
       </p>
      </div>
      <Button className="rounded-[2rem] px-16 h-20 bg-white text-stone-950 text-xs font-medium uppercase tracking-wider hover:shadow-[0_20px_50px_-10px_rgba(255,255,255,0.2)] transition-all hover:-translate-y-2">
       Start New Node Chat
      </Button>
     </div>
    )}
   </main>

   {/* Info Sidebar */}
   <AnimatePresence>
    {isSidebarOpen && selectedConversation && (
     <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 450, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="hidden lg:flex flex-col bg-stone-950 border-l border-white/5 overflow-hidden relative z-30"
     >
      <div className="p-16 space-y-16 overflow-y-auto no-scrollbar h-full text-left relative">
       <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
        <Cpu className="w-64 h-64 -mr-24 -mt-24 text-white" />
       </div>
       
       <div className="text-center space-y-10">
        <div className="relative inline-block">
         <div className="w-48 h-48 rounded-[3.5rem] overflow-hidden border-8 border-white/5 mx-auto shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
          <img src={selectedConversation.otherParticipant.profile?.profilePhoto || `https://picsum.photos/seed/${selectedConversation.id}/100/100`} alt="" className="w-full h-full object-cover grayscale" />
         </div>
         <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-[1.5rem] bg-stone-950 border border-white/10 flex items-center justify-center shadow-2xl">
          <Fingerprint className="w-8 h-8 text-stone-600" />
         </div>
        </div>
        <div className="space-y-3">
         <h3 className="text-xl font-medium tracking-tight text-white">{selectedConversation.otherParticipant.fullName}</h3>
         <p className="text-xs text-stone-600 font-mono font-medium uppercase tracking-wider">{selectedConversation.otherParticipant.roles.join(' • ')}</p>
        </div>
       </div>

       <div className="space-y-10">
        <h4 className="text-xs font-mono font-medium text-stone-700 uppercase tracking-wider border-b border-white/5 pb-4">ENTITY_METADATA</h4>
        <div className="space-y-8">
         <div className="flex items-center gap-6 text-lg text-stone-400 group cursor-pointer">
          <div className="w-14 h-11 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-stone-600 shrink-0 border border-white/5 group-hover:text-white group-hover:border-white/20 transition-all">
           <Globe className="w-6 h-6" />
          </div>
          <div className="space-y-1">
           <p className="text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">LOCATION</p>
           <span className="font-light tracking-tight">San Francisco, CA</span>
          </div>
         </div>
         <div className="flex items-center gap-6 text-lg text-stone-400 group cursor-pointer">
          <div className="w-14 h-11 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-stone-600 shrink-0 border border-white/5 group-hover:text-white group-hover:border-white/20 transition-all">
           <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
           <p className="text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">POSITION</p>
           <span className="font-light tracking-tight">Founder @ EcoSphere</span>
          </div>
         </div>
         <div className="flex items-center gap-6 text-lg text-stone-400 group cursor-pointer">
          <div className="w-14 h-11 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-stone-600 shrink-0 border border-white/5 group-hover:text-white group-hover:border-white/20 transition-all">
           <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
           <p className="text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">LAST_SYNC</p>
           <span className="font-light tracking-tight">Active 2h ago</span>
          </div>
         </div>
        </div>
       </div>

       <div className="space-y-10">
        <h4 className="text-xs font-mono font-medium text-stone-700 uppercase tracking-wider border-b border-white/5 pb-4">SHARED_ASSETS</h4>
        <div className="space-y-6">
         {[
          { name: "Executive Summary.pdf", date: "Oct 12", icon: FileText, size: "2.4 MB" },
          { name: "Product Demo.mp4", date: "Oct 10", icon: Video, size: "48.1 MB" },
         ].map((asset) => (
          <div key={asset.name} className="flex items-center gap-6 p-6 rounded-[2rem] hover:bg-white/5 transition-all cursor-pointer group border border-transparent hover:border-white/10">
           <div className="w-14 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-stone-600 group-hover:text-white group-hover:bg-white/10 transition-all border border-white/5">
            <asset.icon className="w-7 h-7" />
           </div>
           <div className="flex-1 min-w-0 space-y-1">
            <p className="text-base font-medium text-white truncate">{asset.name}</p>
            <div className="flex items-center gap-3">
             <p className="text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">{asset.date}</p>
             <span className="text-stone-800 text-xs font-mono">•</span>
             <p className="text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">{asset.size}</p>
            </div>
           </div>
          </div>
         ))}
        </div>
       </div>

       <div className="pt-12 border-t border-white/5 space-y-6">
        <Button variant="outline" className="w-full h-16 rounded-[1.5rem] text-xs font-medium uppercase tracking-wider border-white/10 hover:bg-white/5 text-stone-400 hover:text-white transition-all">
         View Entity Profile
        </Button>
        <Button variant="ghost" className="w-full h-16 rounded-[1.5rem] text-xs font-medium uppercase tracking-wider text-red-900/60 hover:text-red-500 hover:bg-red-500/5 transition-all">
         Terminate Connection
        </Button>
       </div>
      </div>
     </motion.aside>
    )}
   </AnimatePresence>
  </PageContainer>
 );
}
