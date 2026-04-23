import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
 Search, 
 Send, 
 MoreVertical, 
 Phone, 
 Video, 
 Image as ImageIcon, 
 Paperclip, 
 Smile, 
 Check, 
 CheckCheck,
 User as UserIcon,
 Zap,
 ArrowLeft,
 Info,
 X,
 Plus,
 MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 collection, 
 query, 
 orderBy, 
 onSnapshot, 
 addDoc, 
 serverTimestamp, 
 where,
 doc,
 getDoc,
 limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Conversation, Message, UserProfile } from '../types';
import { cn } from '../lib/utils';

export default function MessagesPage() {
 const { user, profile } = useAuth();
 const navigate = useNavigate();
 const [conversations, setConversations] = useState<Conversation[]>([]);
 const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
 const [messages, setMessages] = useState<Message[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [loading, setLoading] = useState(true);
 const [showDetails, setShowDetails] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (!user) return;

  const q = query(
   collection(db, 'conversations'),
   where('participants', 'array-contains', user.uid),
   orderBy('updatedAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
   const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
   setConversations(convs);
   setLoading(false);
  }, (error) => {
   console.error('Error listening to conversations:', error);
   setLoading(false);
  });

  return () => unsubscribe();
 }, [user]);

 useEffect(() => {
  if (!activeConversation) return;

  const q = query(
   collection(db, 'conversations', activeConversation.id, 'messages'),
   orderBy('createdAt', 'asc'),
   limit(50)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
   const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
   setMessages(msgs);
   scrollToBottom();
  }, (error) => {
   console.error('Error listening to messages:', error);
  });

  return () => unsubscribe();
 }, [activeConversation]);

 const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newMessage.trim() || !activeConversation || !user) return;

  const messageData = {
   senderId: user.uid,
   text: newMessage.trim(),
   createdAt: serverTimestamp(),
   read: false
  };

  try {
   await addDoc(collection(db, 'conversations', activeConversation.id, 'messages'), messageData);
   setNewMessage('');
  } catch (error) {
   console.error('Error sending message:', error);
  }
 };

 if (loading) {
  return (
   <div className="h-[calc(100vh-80px)] flex items-center justify-center bg-stone-50">
    <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
   </div>
  );
 }

 return (
  <div className="h-[calc(100vh-80px)] flex overflow-hidden bg-white">
   {/* Sidebar - Conversation List */}
   <div className={cn(
    "w-full md:w-96 flex flex-col border-r border-stone-100 bg-stone-50/50",
    activeConversation ? "hidden md:flex" : "flex"
   )}>
    <div className="p-6 space-y-6">
     <div className="flex items-center justify-between">
      <h1 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Messages</h1>
      <button className="p-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all">
       <Zap className="w-5 h-5" />
      </button>
     </div>
     <div className="relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
      <input 
       type="text"
       placeholder="Search conversations..."
       className="w-full pl-10 pr-4 py-3 bg-white border border-stone-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-stone-900 transition-all"
      />
     </div>
    </div>

    <div className="flex-1 overflow-y-auto px-3 space-y-1">
     {conversations.length > 0 ? (
      conversations.map((conv) => (
       <button
        key={conv.id}
        onClick={() => setActiveConversation(conv)}
        className={cn(
         "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
         activeConversation?.id === conv.id 
          ? "bg-white shadow-xl shadow-stone-200/50 border border-stone-100" 
          : "hover:bg-white/50"
        )}
       >
        <div className="relative">
         <img 
          src={`https://picsum.photos/seed/${conv.id}/100/100`} 
          alt="User" 
          className="w-14 h-11 rounded-2xl object-cover shadow-sm"
          referrerPolicy="no-referrer"
         />
         <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
         <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-stone-900 truncate">
           {conv.id === '1' ? 'Alex Rivera' : 'Sarah Chen'}
          </h3>
          <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">12:45 PM</span>
         </div>
         <p className="text-sm text-stone-500 truncate font-medium">
          {conv.status === 'Active' ? 'Start a conversation...' : 'Archived'}
         </p>
        </div>
       </button>
      ))
     ) : (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
       <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-300">
        <MessageSquare className="w-8 h-8" />
       </div>
       <p className="text-stone-500 font-medium">No conversations yet. Connect with founders to start chatting!</p>
      </div>
     )}
    </div>
   </div>

   {/* Main Chat Area */}
   <div className={cn(
    "flex-1 flex flex-col bg-white relative",
    !activeConversation ? "hidden md:flex" : "flex"
   )}>
    {activeConversation ? (
     <>
      {/* Chat Header */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-stone-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
       <div className="flex items-center gap-4">
        <button 
         onClick={() => setActiveConversation(null)}
         className="md:hidden p-2 text-stone-600 hover:bg-stone-50 rounded-xl"
        >
         <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
         <img 
          src={`https://picsum.photos/seed/${activeConversation.id}/100/100`} 
          alt="User" 
          className="w-10 h-10 rounded-xl object-cover shadow-sm"
          referrerPolicy="no-referrer"
         />
         <div>
          <h2 className="font-medium text-stone-900 leading-tight">
           {activeConversation.id === '1' ? 'Alex Rivera' : 'Sarah Chen'}
          </h2>
          <span className="text-xs font-medium text-green-600 uppercase tracking-widest">Online</span>
         </div>
        </div>
       </div>
       <div className="flex items-center gap-2">
        <button className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all">
         <Phone className="w-5 h-5" />
        </button>
        <button className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all">
         <Video className="w-5 h-5" />
        </button>
        <button 
         onClick={() => setShowDetails(!showDetails)}
         className={cn(
          "p-2.5 rounded-xl transition-all",
          showDetails ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
         )}
        >
         <Info className="w-5 h-5" />
        </button>
       </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/30">
       {messages.map((msg, idx) => {
        const isOwn = msg.senderId === user?.uid;
        return (
         <motion.div 
          key={msg.id}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
           "flex flex-col max-w-[80%] sm:max-w-[70%]",
           isOwn ? "ml-auto items-end" : "mr-auto items-start"
          )}
         >
          <div className={cn(
           "px-5 py-3 rounded-2xl text-sm font-medium shadow-sm",
           isOwn 
            ? "bg-stone-900 text-white rounded-tr-none" 
            : "bg-white text-stone-900 border border-stone-100 rounded-tl-none"
          )}>
           {msg.body}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
           <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">12:45 PM</span>
           {isOwn && (
            msg.readStatus ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-stone-300" />
           )}
          </div>
         </motion.div>
        );
       })}
       <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-stone-100">
       <form onSubmit={handleSendMessage} className="flex items-center gap-3">
        <div className="flex items-center gap-1">
         <button type="button" className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all">
          <Plus className="w-5 h-5" />
         </button>
         <button type="button" className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all">
          <Smile className="w-5 h-5" />
         </button>
        </div>
        <div className="flex-1 relative">
         <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full px-4 py-2 bg-stone-50 border-none rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-stone-900 transition-all"
         />
        </div>
        <button 
         type="submit"
         disabled={!newMessage.trim()}
         className="p-4 bg-stone-900 text-white rounded-2xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/20 disabled:opacity-50 disabled:shadow-none group"
        >
         <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
       </form>
      </div>
     </>
    ) : (
     <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
      <div className="w-24 h-24 bg-stone-50 rounded-[32px] flex items-center justify-center text-stone-200">
       <MessageSquare className="w-12 h-12" />
      </div>
      <div className="space-y-2">
       <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900 tracking-tight">Your Inbox</h2>
       <p className="text-stone-500 max-w-sm mx-auto font-medium">
        Select a conversation from the list to start chatting with your potential co-founders and mentors.
       </p>
      </div>
      <button 
       onClick={() => navigate('/matches')}
       className="px-5 py-2.5 bg-stone-900 text-white rounded-2xl font-medium hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/20"
      >
       New Message
      </button>
     </div>
    )}

    {/* Details Sidebar (Overlay) */}
    <AnimatePresence>
     {showDetails && activeConversation && (
      <motion.div 
       initial={{ x: '100%' }}
       animate={{ x: 0 }}
       exit={{ x: '100%' }}
       className="absolute inset-y-0 right-0 w-80 bg-white border-l border-stone-100 shadow-2xl z-20 flex flex-col"
      >
       <div className="p-6 border-b border-stone-100 flex items-center justify-between">
        <h3 className="font-medium text-stone-900">Details</h3>
        <button 
         onClick={() => setShowDetails(false)}
         className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl"
        >
         <X className="w-5 h-5" />
        </button>
       </div>
       <div className="p-8 flex flex-col items-center text-center space-y-6">
        <img 
         src={`https://picsum.photos/seed/${activeConversation.id}/200/200`} 
         alt="User" 
         className="w-32 h-32 rounded-[32px] object-cover shadow-xl"
         referrerPolicy="no-referrer"
        />
        <div>
         <h4 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900">
          {activeConversation.id === '1' ? 'Alex Rivera' : 'Sarah Chen'}
         </h4>
         <p className="text-sm font-medium text-stone-500 mt-1">CTO / Full-stack Developer</p>
        </div>
        <div className="flex gap-2 w-full">
         <button 
          onClick={() => {
           const otherId = activeConversation.participants.find(id => id !== user?.uid);
           if (otherId) navigate(`/profile/${otherId}`);
          }}
          className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/10"
         >
          View Profile
         </button>
        </div>
       </div>
       <div className="flex-1 px-6 space-y-8 overflow-y-auto">
        <div className="space-y-4">
         <h5 className="text-xs font-medium text-stone-400 uppercase tracking-widest">Shared Media</h5>
         <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
           <div key={i} className="aspect-square bg-stone-100 rounded-xl overflow-hidden">
            <img src={`https://picsum.photos/seed/media-${i}/100/100`} alt="Media" className="w-full h-full object-cover" />
           </div>
          ))}
         </div>
        </div>
        <div className="space-y-4">
         <h5 className="text-xs font-medium text-stone-400 uppercase tracking-widest">Settings</h5>
         <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-xl transition-all">Mute Notifications</button>
          <button className="w-full text-left px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-xl transition-all">Clear Chat</button>
          <button className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all">Block User</button>
         </div>
        </div>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </div>
  </div>
 );
}
