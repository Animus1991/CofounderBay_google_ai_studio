import { useState } from "react";

import { Bell, MessageSquare, UserPlus, Zap, Trophy, Rocket, Check, Trash2, MoreVertical, ArrowRight } from "lucide-react";

import Card from "../components/ui/Card";

import Button from "../components/ui/Button";

import { cn } from "../lib/utils";



interface Notification {

 id: string;

 type: 'message' | 'match' | 'milestone' | 'system' | 'community';

 title: string;

 description: string;

 time: string;

 read: boolean;

 actionUrl?: string;

}



export default function Notifications() {

 const [notifications, setNotifications] = useState<Notification[]>([

  {

   id: "1",

   type: "match",

   title: "New Match Suggestion",

   description: "Sarah Chen is a 94% match for your Fintech project. View her profile to connect.",

   time: "2 hours ago",

   read: false,

   actionUrl: "/profile/sarah"

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



 const markAllAsRead = () => {

  setNotifications(prev => prev.map(n => ({ ...n, read: true })));

 };



 const deleteNotification = (id: string) => {

  setNotifications(prev => prev.filter(n => n.id !== id));

 };



 const getIcon = (type: Notification['type']) => {

  switch (type) {

   case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;

   case 'match': return <UserPlus className="w-4 h-4 text-amber-500" />;

   case 'milestone': return <Trophy className="w-4 h-4 text-green-500" />;

   case 'system': return <Zap className="w-4 h-4 text-purple-500" />;

   case 'community': return <Rocket className="w-4 h-4 text-rose-500" />;

   default: return <Bell className="w-4 h-4 text-stone-400" />;

  }

 };



 return (

  <div className="max-w-4xl mx-auto space-y-8">

   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">

    <div>

     <h2 className="text-xl font-medium tracking-tight mb-2">Notifications</h2>

     <p className="text-stone-500">Stay updated with your ecosystem activity and connections.</p>

    </div>

    <div className="flex items-center gap-3">

     <Button variant="outline" size="sm" onClick={markAllAsRead}>

      <Check className="w-4 h-4 mr-2" /> Mark all as read

     </Button>

     <Button variant="ghost" size="sm" className="text-stone-400 hover:text-red-600">

      <Trash2 className="w-4 h-4 mr-2" /> Clear all

     </Button>

    </div>

   </div>



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

           <Button variant="ghost" size="sm" className="h-auto p-0 text-stone-900 font-medium text-xs tracking-wide hover:bg-transparent">

            Take Action <ArrowRight className="w-3 h-3 ml-1" />

           </Button>

          </div>

         )}

        </div>



        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">

         <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-900">

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

      <div className="p-20 text-center space-y-4">

       <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300">

        <Bell className="w-8 h-8" />

       </div>

       <div className="space-y-1">

        <h3 className="font-medium text-stone-900">All caught up!</h3>

        <p className="text-sm text-stone-500">You don't have any new notifications at the moment.</p>

       </div>

      </div>

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

     <Button variant="secondary">Notification Settings</Button>

    </div>

   </Card>

  </div>

 );

}

