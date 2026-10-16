import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, UserPlus, Zap, Trophy, Rocket, Check, Trash2, MoreVertical, ArrowRight } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import EmptyHint, { AskLink } from "../components/ui/EmptyHint";
import { cn, formatRelativeTime } from "../lib/utils";
import { clearActivity, keys, markActivityRead, readActivity, type ActivityKind } from "../lib/localLists";
import { useStored } from "../lib/useStored";

interface Notification {
 id: string;
 type: 'message' | 'match' | 'milestone' | 'system' | 'community';
 title: string;
 description: string;
 time: string;
 read: boolean;
 actionUrl?: string;
}

function kindToType(kind: ActivityKind): Notification['type'] {
 if (kind === 'message') return 'message';
 if (kind === 'request' || kind === 'profile') return 'match';
 if (kind === 'milestone') return 'milestone';
 if (kind === 'community' || kind === 'event') return 'community';
 return 'system';
}

export default function Notifications() {
 const navigate = useNavigate();
 const activity = useStored(readActivity, [keys.activity]);
 const [hiddenIds, setHiddenIds] = useState<string[]>([]);
 const [seed, setSeed] = useState<Notification[]>([
  {
   id: "1",
   type: "match",
   title: "New Match Suggestion",
   description: "Sarah Chen is a 94% match for your Fintech project. View her profile to connect.",
   time: "2 hours ago",
   read: false,
   actionUrl: "/profile/sarah-chen"
  },
  {
   id: "2",
   type: "message",
   title: "New Message from Marcus",
   description: "Hey! I'd love to discuss the product roadmap we talked about yesterday.",
   time: "5 hours ago",
   read: false,
   actionUrl: "/messages"
  },
  {
   id: "3",
   type: "milestone",
   title: "Milestone Achieved!",
   description: "Congratulations! You've completed your 'First 5 Match Requests' milestone.",
   time: "1 day ago",
   read: true
  },
  {
   id: "4",
   type: "system",
   title: "Platform Update",
   description: "We've added new AI-powered matching dimensions to help you find better partners.",
   time: "2 days ago",
   read: true
  }
 ]);

 const studioNotes: Notification[] = useMemo(() => activity.map((item) => ({
  id: item.id,
  type: kindToType(item.kind),
  title: item.title,
  description: item.titleEl || item.title,
  time: formatRelativeTime(item.at),
  read: item.read,
  actionUrl: item.href,
 })), [activity]);
 const notifications = [...studioNotes, ...seed].filter((item) => !hiddenIds.includes(item.id));

 const markAllAsRead = () => {
  markActivityRead('all');
  setSeed((prev) => prev.map((n) => ({ ...n, read: true })));
 };

 const deleteNotification = (id: string) => {
  setHiddenIds((prev) => [...prev, id]);
  setSeed((prev) => prev.filter((n) => n.id !== id));
 };

 const clearAll = () => {
  clearActivity();
  setSeed([]);
  setHiddenIds([]);
 };

 const getIcon = (type: Notification['type']) => {
  const iconCls = "w-4 h-4 text-stone-500";
  switch (type) {
   case 'message': return <MessageSquare className={iconCls} />;
   case 'match': return <UserPlus className={iconCls} />;
   case 'milestone': return <Trophy className={iconCls} />;
   case 'system': return <Zap className={iconCls} />;
   case 'community': return <Rocket className={iconCls} />;
   default: return <Bell className={iconCls} />;
  }
 };

 return (
  <PageShell
   title="Notifications"
   description="Stay updated with your ecosystem activity and connections."
   actions={
    <div className="flex flex-wrap items-center gap-2">
     <AskLink prompt="show my studio activity" />
     <Button variant="outline" size="sm" onClick={markAllAsRead}>
      <Check className="w-4 h-4 mr-2" /> Mark all as read
     </Button>
     <Button type="button" variant="ghost" size="sm" className="text-stone-400 hover:text-red-600" onClick={clearAll}>
      <Trash2 className="w-4 h-4 mr-2" /> Clear all
     </Button>
    </div>
   }
  >
  <div className="space-y-8">

   <Card noPadding className="overflow-hidden border-stone-200 shadow-sm">
    <div className="divide-y divide-stone-100">
     {notifications.length > 0 ? (
      notifications.map((notification) => (
       <div 
        key={notification.id} 
        className={cn(
         "p-6 flex gap-4 transition-colors hover:bg-stone-50/50 group relative",
         !notification.read && "bg-stone-50/30"
        )}
       >
        {!notification.read && (
         <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-900"></div>
        )}

        <div className={cn(
         "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
         "bg-white border border-stone-100 shadow-sm"
        )}>
         {getIcon(notification.type)}
        </div>

        <div className="flex-1 space-y-1">
         <div className="flex items-center justify-between">
          <h4 className={cn("text-sm", !notification.read ? "font-medium text-stone-900" : "font-medium text-stone-600")}>
           {notification.title}
          </h4>
          <span className="text-xs font-medium text-stone-400 tracking-wide">{notification.time}</span>
         </div>
         <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
          {notification.description}
         </p>
         {notification.actionUrl && (
          <div className="pt-2">
           <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-stone-900 font-medium text-xs tracking-wide hover:bg-transparent" onClick={() => navigate(notification.actionUrl!)}>
            Take Action <ArrowRight className="w-3 h-3 ml-1" />
           </Button>
          </div>
         )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
         <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-900" onClick={() => { markActivityRead([notification.id]); setSeed((prev) => prev.map((n) => n.id === notification.id ? { ...n, read: true } : n)); }}>
          <Check className="w-4 h-4" />
         </Button>
         <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-stone-400 hover:text-red-600"
          onClick={() => deleteNotification(notification.id)}
         >
          <Trash2 className="w-4 h-4" />
         </Button>
        </div>
       </div>
      ))
     ) : (
      <EmptyHint className="m-6" title="All caught up" detail="No notifications in this list. Ask the studio assistant what changed today.">
       <AskLink prompt="show my studio activity" />
      </EmptyHint>
     )}
    </div>
   </Card>

   {/* Notification Settings Shortcut */}
   <Card className="bg-stone-900 text-white border-none p-8">
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
     <div className="space-y-2 text-center md:text-left">
      <h4 className="text-lg font-medium">Manage your alerts</h4>
      <p className="text-sm text-white/60">Choose how and when you want to be notified about ecosystem activity.</p>
     </div>
     <Button type="button" variant="secondary" onClick={() => navigate('/settings')}>Notification Settings</Button>
    </div>
   </Card>
  </div>
  </PageShell>
 );
}
