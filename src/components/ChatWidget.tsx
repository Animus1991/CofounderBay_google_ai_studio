import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 MessageSquare, 
 X, 
 Send, 
 Bot, 
 User, 
 Sparkles, 
 Minimize2, 
 Maximize2,
 Cpu,
 Globe,
 Search,
 MoreHorizontal,
 Flame,
 Zap,
 CheckCircle2,
 ArrowRight,
 Paperclip,
 FileText,
 ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AIService, MOCK_AGENTS } from '../services/aiService';
import { AIAgent, Message as MessageType } from '../types';
import { useMessaging } from '../context/MessagingContext';

export default function ChatWidget() {
 const { state: messagingState, dispatch: messagingDispatch, sendMessage: sendUserMessage, markAsRead, createConversation } = useMessaging();
 const [isOpen, setIsOpen] = useState(false);
 const [isMinimized, setIsMinimized] = useState(false);
 const [activeTab, setActiveTab] = useState<'messages' | 'agents'>('messages');
 const [selectedChat, setSelectedChat] = useState<string | null>(null);
 const [inputText, setInputText] = useState('');
 const [isTyping, setIsTyping] = useState(false);
 const [attachedFile, setAttachedFile] = useState<{name: string, data: string} | null>(null);
 const scrollRef = useRef<HTMLDivElement>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleSelectAgent = async (agentId: string) => {
  const conversation = await createConversation(['u1', agentId]);
  if (conversation) {
   setSelectedChat(conversation.id);
   setActiveTab('agents');
  }
 };

 useEffect(() => {
  const handleOpenChat = async (event: any) => {
   const { agentId, prompt } = event.detail;
   setIsOpen(true);
   setIsMinimized(false);

   const conversation = await createConversation(['u1', agentId]);
   if (conversation) {
    setSelectedChat(conversation.id);
    setActiveTab('agents');
    if (prompt) {
     setInputText(prompt);
    }
   }
  };

  window.addEventListener('OPEN_AI_CHAT', handleOpenChat);
  return () => window.removeEventListener('OPEN_AI_CHAT', handleOpenChat);
 }, []);

 // Auto-scroll to bottom
 useEffect(() => {
  if (scrollRef.current) {
   scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
 }, [messagingState.messages, selectedChat]);

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

 const handleSendMessage = async (textOverride?: string) => {
  const text = textOverride !== undefined ? textOverride : inputText;
  if ((!text.trim() && !attachedFile) || !selectedChat) return;

  if (activeTab === 'agents') {
   // AI Agent Logic
   const agent = MOCK_AGENTS.find(a => a.id === selectedChat);
   if (!agent) return;

   // 1. Send user message to backend to persist it
   sendUserMessage(text, attachedFile);

   setInputText('');
   setAttachedFile(null);
   setIsTyping(true);

   try {
    const startTime = Date.now();
    const response = await AIService.chat(text, agent.role, 'llama3.2', attachedFile?.data);
    const endTime = Date.now();

    // 2. Send AI response to backend to persist it
    sendUserMessage(response.text, undefined, agent.id);
   } catch (error) {
    console.error('AI Chat Error:', error);
    const errorMsg = error instanceof Error ? error.message : "I'm sorry, I'm having trouble connecting right now. Please try again later.";
    sendUserMessage(errorMsg, undefined, agent.id);
   } finally {
    setIsTyping(false);
   }
  } else {
   // User-to-User Logic
   sendUserMessage(text, attachedFile);
   setInputText('');
   setAttachedFile(null);
  }
 };

 return (
  <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-stretch sm:items-end gap-3">
   <AnimatePresence>
    {isOpen && !isMinimized && (
     <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="w-full sm:w-[380px] h-[min(550px,70dvh)] bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col overflow-hidden"
     >
      {/* Header */}
      <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
       <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
         <MessageSquare className="w-4 h-4" />
        </div>
        <div>
         <h3 className="text-xs font-medium tracking-wide">Cofounder Chat</h3>
         <p className="text-xs text-white/50 tracking-tighter">Real-time & AI Powered</p>
        </div>
       </div>
       <div className="flex items-center gap-1">
        <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
         <Minimize2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
         <X className="w-3.5 h-3.5" />
        </button>
       </div>
      </div>

      {/* Tabs */}
      {!selectedChat && (
       <div className="flex border-b border-stone-100 shrink-0">
        <button 
         onClick={() => setActiveTab('messages')}
         className={cn(
          "flex-1 py-3 text-xs font-medium tracking-wide transition-colors",
          activeTab === 'messages' ? "text-stone-900 border-b-2 border-stone-900" : "text-stone-400 hover:text-stone-600"
         )}
        >
         Messages
        </button>
        <button 
         onClick={() => setActiveTab('agents')}
         className={cn(
          "flex-1 py-3 text-xs font-medium tracking-wide transition-colors",
          activeTab === 'agents' ? "text-stone-900 border-b-2 border-stone-900" : "text-stone-400 hover:text-stone-600"
         )}
        >
         AI Agents
        </button>
       </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-stone-50/30">
       {selectedChat ? (
        <>
         {/* Chat Header */}
         <div className="p-3 bg-white border-b border-stone-100 flex items-center justify-between shrink-0">
          <button onClick={() => {
           setSelectedChat(null);
           messagingDispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null });
          }} className="p-1 hover:bg-stone-100 rounded-md transition-colors">
           <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full bg-stone-100 overflow-hidden">
            <img 
             src={
              activeTab === 'agents' 
               ? MOCK_AGENTS.find(a => a.id === selectedChat)?.avatar 
               : messagingState.conversations.find(c => c.id === selectedChat)?.otherParticipant.profile?.profilePhoto || "https://picsum.photos/seed/user/100/100"
             } 
             alt="Avatar" 
             className="w-full h-full object-cover"
            />
           </div>
           <span className="text-xs font-medium text-stone-900">
            {
             activeTab === 'agents'
              ? MOCK_AGENTS.find(a => a.id === selectedChat)?.name
              : messagingState.conversations.find(c => c.id === selectedChat)?.otherParticipant.fullName || "User Chat"
            }
           </span>
          </div>
          <button className="p-1 hover:bg-stone-100 rounded-md transition-colors">
           <MoreHorizontal className="w-4 h-4" />
          </button>
         </div>

         {/* Messages List */}
         <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {messagingState.messages.map((msg) => {
           const isMe = msg.senderId === 'u1';
           const agent = MOCK_AGENTS.find(a => a.id === msg.senderId);
           return (
            <div key={msg.id} className={cn(
             "flex flex-col max-w-[85%]",
             isMe ? "ml-auto items-end" : "mr-auto items-start"
            )}>
             <div className={cn(
              "p-3 rounded-2xl text-xs leading-relaxed shadow-sm",
              isMe 
               ? "bg-stone-900 text-white rounded-tr-none" 
               : "bg-white border border-stone-100 text-stone-800 rounded-tl-none"
             )}>
              {msg.body}
             </div>
             {!isMe && agent && (
              <div className="mt-1 flex items-center gap-2 text-[8px] font-medium tracking-wide text-stone-400">
               <Cpu className="w-2.5 h-2.5" />
               {agent.name}
              </div>
             )}
            </div>
           );
          })}
          {isTyping && (
           <div className="flex items-center gap-2 text-stone-400">
            <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
             <Bot className="w-3 h-3" />
            </div>
            <div className="flex gap-1">
             <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-stone-400 rounded-full" />
             <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-stone-400 rounded-full" />
             <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-stone-400 rounded-full" />
            </div>
           </div>
          )}
         </div>

         {/* Input */}
         <div className="p-3 bg-white border-t border-stone-100 shrink-0">
          {/* Suggested Prompts */}
          {MOCK_AGENTS.find(a => a.id === selectedChat) && (
           <div className="mb-3 flex flex-wrap gap-1.5">
            {MOCK_AGENTS.find(a => a.id === selectedChat)?.suggestedPrompts?.map((prompt, i) => (
             <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="px-2 py-1 bg-stone-50 border border-stone-100 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:border-stone-900 transition-all"
             >
              {prompt}
             </button>
            ))}
           </div>
          )}

          {attachedFile && (
           <div className="mb-2 p-2 bg-stone-50 rounded-lg flex items-center justify-between border border-stone-200">
            <div className="flex items-center gap-2 overflow-hidden">
             <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
             <span className="text-xs font-medium text-stone-600 truncate">{attachedFile.name}</span>
            </div>
            <button onClick={() => setAttachedFile(null)} className="p-0.5 hover:bg-stone-200 rounded transition-colors">
             <X className="w-3 h-3 text-stone-400" />
            </button>
           </div>
          )}
          <div className="flex items-center gap-2 bg-stone-50 rounded-xl border border-stone-200 p-1 pr-2">
           <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
           />
           <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors text-stone-400"
            title="Upload pitch deck"
           >
            <Paperclip className="w-4 h-4" />
           </button>
           <input 
            type="text"
            placeholder={attachedFile ? "Add a comment..." : "Type your message..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-transparent border-none text-xs focus:ring-0 px-2 py-1.5"
           />
           <button 
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() && !attachedFile}
            className="w-8 h-8 bg-stone-900 text-white rounded-lg flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
           >
            <Send className="w-3.5 h-3.5" />
           </button>
          </div>
         </div>
        </>
       ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
         {activeTab === 'messages' ? (
          <div className="space-y-4">
           <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-stone-400 tracking-wide">Recent Chats</h4>
            <button className="text-xs font-medium text-stone-900 tracking-wide hover:underline">New</button>
           </div>

           {messagingState.conversations.length > 0 ? (
            <div className="space-y-2">
             {messagingState.conversations.map((conv) => (
              <button
               key={conv.id}
               onClick={() => {
                setSelectedChat(conv.id);
                messagingDispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conv.id });
               }}
               className="w-full p-3 bg-white rounded-xl border border-stone-100 hover:border-stone-300 transition-all text-left flex items-center gap-3 group"
              >
               <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden shrink-0 relative">
                <img 
                 src={conv.otherParticipant.profile?.profilePhoto || "https://picsum.photos/seed/user/100/100"} 
                 alt={conv.otherParticipant.fullName} 
                 className="w-full h-full object-cover" 
                />
                {conv.unreadCount > 0 && (
                 <div className="absolute top-0 right-0 w-3 h-3 bg-stone-900 border-2 border-white rounded-full" />
                )}
               </div>
               <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                 <h5 className="text-xs font-medium text-stone-900 truncate">{conv.otherParticipant.fullName}</h5>
                 <span className="text-[8px] text-stone-400">{conv.lastMessageTime}</span>
                </div>
                <p className="text-xs text-stone-500 truncate">{conv.lastMessage}</p>
               </div>
              </button>
             ))}
            </div>
           ) : (
            <div className="text-center py-12">
             <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-300">
              <MessageSquare className="w-6 h-6" />
             </div>
             <p className="text-xs text-stone-400 font-medium">No active conversations</p>
             <p className="text-xs text-stone-300 mt-1">Start a chat with a co-founder or AI Agent</p>
            </div>
           )}
          </div>
         ) : (
          <div className="space-y-4">
           <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-stone-400 tracking-wide">Available Agents</h4>
            <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
             <Globe className="w-2.5 h-2.5" /> Local AI Ready
            </div>
           </div>
           <div className="grid grid-cols-1 gap-3">
            {MOCK_AGENTS.map((agent) => (
             <button 
              key={agent.id}
              onClick={() => handleSelectAgent(agent.id)}
              className="p-3 bg-white rounded-xl border border-stone-100 hover:border-stone-300 hover:shadow-md transition-all text-left flex items-start gap-3 group"
             >
              <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0">
               <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between mb-0.5">
                <h5 className="text-xs font-medium text-stone-900 group-hover:text-stone-900 transition-colors">{agent.name}</h5>
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
               </div>
               <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{agent.description}</p>
               <div className="mt-2 flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 2).map((cap, i) => (
                 <span key={i} className="text-[8px] font-medium tracking-tighter bg-stone-50 text-stone-400 px-1.5 py-0.5 rounded">
                  {cap}
                 </span>
                ))}
               </div>
              </div>
             </button>
            ))}
           </div>
          </div>
         )}
        </div>
       )}
      </div>
     </motion.div>
    )}
   </AnimatePresence>

   {/* Floating Buttons */}
   <div className="flex items-center gap-3">
    {isMinimized && isOpen && (
     <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => setIsMinimized(false)}
      className="h-12 px-4 bg-white border border-stone-200 rounded-2xl shadow-xl flex items-center gap-3 hover:bg-stone-50 transition-all group"
     >
      <div className="w-8 h-8 bg-stone-900 text-white rounded-lg flex items-center justify-center">
       <MessageSquare className="w-4 h-4" />
      </div>
      <div className="text-left">
       <p className="text-xs font-medium text-stone-900 tracking-wide">Active Chat</p>
       <p className="text-xs text-stone-400 tracking-tighter">Click to expand</p>
      </div>
     </motion.button>
    )}

    <motion.button
     whileHover={{ scale: 1.05 }}
     whileTap={{ scale: 0.95 }}
     onClick={() => {
      if (isOpen && isMinimized) {
       setIsMinimized(false);
      } else {
       setIsOpen(!isOpen);
      }
     }}
     className={cn(
      "self-end w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center transition-all relative overflow-hidden group",
      isOpen && !isMinimized ? "bg-stone-100 text-stone-900" : "bg-stone-900 text-white"
     )}
    >
     {isOpen && !isMinimized ? (
      <X className="w-6 h-6" />
     ) : (
      <>
       <MessageSquare className="w-6 h-6 z-10" />
       <div className="absolute inset-0 bg-gradient-to-tr from-stone-800 to-stone-900 opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full z-20" />
      </>
     )}
    </motion.button>
   </div>
  </div>
 );
}
