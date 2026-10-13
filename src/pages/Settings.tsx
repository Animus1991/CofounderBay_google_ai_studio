import { useState } from "react";

import { readSaved } from "../lib/localLists";

import { useAuth } from "../App";

import { 

 User, 

 Settings as SettingsIcon, 

 Bell, 

 Shield, 

 CreditCard, 

 Globe, 

 Lock, 

 Mail, 

 Smartphone, 

 ChevronRight, 

 LogOut, 

 Trash2, 

 CheckCircle2, 

 AlertCircle, 

 Eye, 

 EyeOff, 

 HelpCircle, 

 FileText, 

 ShieldCheck, 

 Key, 

 Database, 

 Share2, 

 Plus, 

 ArrowRight, 

 ExternalLink, 

 UserPlus, 

 Rocket, 

 Scale, 

 Gift, 

 Activity, 

 BookOpen, 

 Compass, 

 Users, 

 GraduationCap, 

 Globe2, 

 MessageSquare, 

 Trophy, 

 LayoutDashboard, 

 ArrowLeft, 

 Edit3, 

 Search, 

 Filter, 

 SlidersHorizontal, 

 Star, 

 Send, 

 Linkedin, 

 Github, 

 Menu, 

 X, 

 MoreVertical, 

 Layers, 

 Lightbulb, 

 PieChart, 

 Sparkles, 

 TrendingUp, 

 Target, 

 Clock, 

 Check, 

 Trash, 

 AlertTriangle, 

 Info, 

 BarChart3, 

 Briefcase, 

 DollarSign

} from "lucide-react";

import Card from "../components/ui/Card";

import Button from "../components/ui/Button";

import { cn } from "../lib/utils";

import { NavLink } from "react-router-dom";



export default function Settings() {

 const { user, profile } = useAuth();

 const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'billing'>('account');

 const downloadMyData = () => {
  const payload = {
   exportedAt: new Date().toISOString(),
   account: user ? { uid: user.uid, email: user.email, name: user.displayName } : null,
   profile: profile ?? null,
   savedProfiles: readSaved(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cofounderbay-data.json';
  link.click();
  URL.revokeObjectURL(url);
 };

 const [notifications, setNotifications] = useState({

  matches: true,

  messages: true,

  community: false,

  news: false

 });



 const toggleNotification = (key: keyof typeof notifications) => {

  setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

 };



 const settingsTabs = [

  { id: 'account', label: 'Account', icon: User },

  { id: 'notifications', label: 'Notifications', icon: Bell },

  { id: 'privacy', label: 'Privacy & Security', icon: Shield },

  { id: 'billing', label: 'Billing & Plans', icon: CreditCard },

 ] as const;



 return (

  <div className="max-w-5xl mx-auto space-y-6">

   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">

    <div>

     <h2 className="text-lg font-medium tracking-tight text-stone-900 mb-1">Settings</h2>

     <p className="text-xs text-stone-500 font-medium">Manage your account, preferences, and security.</p>

    </div>

   </div>



   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

    {/* Sidebar Navigation */}

    <div className="lg:col-span-3 space-y-1">

     <div className="sticky top-24 space-y-1">

      {settingsTabs.map((tab) => (

       <button

        key={tab.id}

        onClick={() => setActiveTab(tab.id)}

        className={cn(

         "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",

         activeTab === tab.id 

          ? "bg-stone-100 text-stone-900 shadow-sm ring-1 ring-stone-200/50" 

          : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"

        )}

       >

        <tab.icon className={cn(

         "w-4 h-4 transition-colors",

         activeTab === tab.id ? "text-stone-900" : "text-stone-400 group-hover:text-stone-600"

        )} />

        {tab.label}

       </button>

      ))}

      

      <div className="pt-6 mt-6 border-t border-stone-100 space-y-1">

       <button className="w-full group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200">

        <LogOut className="w-4 h-4 text-stone-400 group-hover:text-red-500 transition-colors" />

        Log Out

       </button>

      </div>

     </div>

    </div>



    {/* Main Content Area */}

    <div className="lg:col-span-9 space-y-6">

     {activeTab === 'account' && (

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">

       <Card title="Personal Information" subtitle="Basic details for your ecosystem profile.">

        <div className="space-y-6">

         <div className="flex items-center gap-6 pb-6 border-b border-stone-100">

          <div className="w-20 h-20 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 shadow-sm relative group">

           <img src="https://picsum.photos/seed/user/200/200" alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />

           <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">

            <Edit3 className="w-5 h-5 text-white" />

           </div>

          </div>

          <div className="space-y-2">

           <h4 className="text-sm font-semibold text-stone-900">Profile Photo</h4>

           <p className="text-xs text-stone-500">Recommended size: 400x400px. JPG, PNG or GIF.</p>

           <div className="flex gap-2.5 pt-1">

            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold">Upload New</Button>

            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</Button>

           </div>

          </div>

         </div>



         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="space-y-2">

           <label className="text-xs font-medium text-stone-500 tracking-wider">Full Name</label>

           <input 

            type="text" 

            defaultValue="Alex Rivera" 

            className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200/50 focus:border-stone-300 transition-all" 

           />

          </div>

          <div className="space-y-2">

           <label className="text-xs font-medium text-stone-500 tracking-wider">Email Address</label>

           <input 

            type="email" 

            defaultValue="alex@techstars.com" 

            className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200/50 focus:border-stone-300 transition-all" 

           />

          </div>

          <div className="space-y-2 md:col-span-2">

           <label className="text-xs font-medium text-stone-500 tracking-wider">Headline</label>

           <input 

            type="text" 

            defaultValue="Senior Product Manager @ TechFlow Systems | Building Ecosystems" 

            className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200/50 focus:border-stone-300 transition-all" 

           />

          </div>

         </div>

         

         <div className="flex justify-end pt-2">

          <Button variant="primary" size="sm" className="px-6">Save Changes</Button>

         </div>

        </div>

       </Card>



       <Card title="Ecosystem Preferences" subtitle="How you interact with the platform.">

        <div className="space-y-4">

         <div className="flex items-center justify-between p-4 bg-stone-50/50 rounded-2xl border border-stone-100">

          <div className="space-y-1">

           <p className="text-sm font-semibold text-stone-900">Public Profile</p>

           <p className="text-xs text-stone-500">Allow others to see your profile in the discovery hub.</p>

          </div>

          <div className="w-11 h-6 bg-stone-900 rounded-full relative cursor-pointer p-1 transition-all">

           <div className="w-4 h-4 bg-white rounded-full absolute right-1 shadow-sm"></div>

          </div>

         </div>

         

         <div className="flex items-center justify-between p-4 bg-stone-50/50 rounded-2xl border border-stone-100">

          <div className="space-y-1">

           <p className="text-sm font-semibold text-stone-900">Mentor Availability</p>

           <p className="text-xs text-stone-500">Show that you are open to mentoring others.</p>

          </div>

          <div className="w-11 h-6 bg-stone-200 rounded-full relative cursor-pointer p-1 transition-all hover:bg-stone-300">

           <div className="w-4 h-4 bg-white rounded-full absolute left-1 shadow-sm"></div>

          </div>

         </div>

        </div>

       </Card>

      </div>

     )}



     {activeTab === 'notifications' && (

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">

       <Card title="Email Notifications" subtitle="Choose what updates you want in your inbox.">

        <div className="space-y-1">

         {[

          { id: "matches", title: "New Match Alerts", desc: "Get notified when a highly compatible co-founder joins." },

          { id: "messages", title: "Direct Messages", desc: "Receive an email when someone sends you a message." },

          { id: "community", title: "Community Activity", desc: "Stay updated on new posts and events in your communities." },

          { id: "news", title: "Ecosystem News", desc: "Monthly digest of startup programs, grants, and insights." }

         ].map((item, i) => {

          const isActive = notifications[item.id as keyof typeof notifications];

          return (

          <div key={item.id} className="flex items-center justify-between py-4 border-b border-stone-100 last:border-0">

           <div className="space-y-1">

            <p className="text-sm font-semibold text-stone-900">{item.title}</p>

            <p className="text-xs text-stone-500">{item.desc}</p>

           </div>

           <div 

            onClick={() => toggleNotification(item.id as keyof typeof notifications)}

            className={cn(

            "w-11 h-6 rounded-full relative cursor-pointer p-1 transition-all",

            isActive ? "bg-stone-900" : "bg-stone-200 hover:bg-stone-300"

           )}>

            <div className={cn(

             "w-4 h-4 bg-white rounded-full absolute shadow-sm transition-all duration-200",

             isActive ? "right-1" : "left-1"

            )}></div>

           </div>

          </div>

         )})}

        </div>

       </Card>



       <Card title="Push Notifications" subtitle="Real-time alerts on your desktop or mobile.">

        <div className="flex items-center justify-between p-6 bg-stone-900 text-white rounded-2xl border-none shadow-lg shadow-stone-200">

         <div className="space-y-1.5">

          <h4 className="text-sm font-semibold">Enable Browser Notifications</h4>

          <p className="text-xs text-white/60">Never miss a match or message with real-time alerts.</p>

         </div>

         <Button variant="secondary" size="sm" className="px-5" onClick={() => { if ('Notification' in window) void Notification.requestPermission(); }}>Enable Now</Button>

        </div>

       </Card>

      </div>

     )}



     {activeTab === 'privacy' && (

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">

       <Card title="Security Settings" subtitle="Keep your account safe and secure.">

        <div className="space-y-4">

         <div className="flex items-center justify-between p-4 bg-stone-50/50 rounded-2xl border border-stone-100">

          <div className="flex items-center gap-4">

           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-stone-400 shadow-sm border border-stone-100">

            <Lock className="w-4 h-4" />

           </div>

           <div className="space-y-1">

            <p className="text-sm font-semibold text-stone-900">Change Password</p>

            <p className="text-xs text-stone-500">Last changed 3 months ago.</p>

           </div>

          </div>

          <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-semibold">Update</Button>

         </div>



         <div className="flex items-center justify-between p-4 bg-stone-50/50 rounded-2xl border border-stone-100">

          <div className="flex items-center gap-4">

           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-stone-400 shadow-sm border border-stone-100">

            <Smartphone className="w-4 h-4" />

           </div>

           <div className="space-y-1">

            <p className="text-sm font-semibold text-stone-900">Two-Factor Authentication</p>

            <p className="text-xs text-stone-500">Add an extra layer of security to your account.</p>

           </div>

          </div>

          <Button variant="secondary" size="sm" className="h-9 px-4 text-xs font-semibold">Enable</Button>

         </div>

        </div>

       </Card>



       <Card title="Data & Privacy" subtitle="Manage your data and visibility.">

        <div className="space-y-2">

         <button type="button" onClick={downloadMyData} className="w-full flex items-center justify-between p-4 hover:bg-stone-50 rounded-2xl transition-all group text-left">

          <div className="flex items-center gap-4">

           <FileText className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition-colors" />

           <span className="text-sm font-semibold text-stone-600 group-hover:text-stone-900">Download My Data</span>

          </div>

          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-400 transition-colors" />

         </button>

         <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition-all group text-left">

          <div className="flex items-center gap-4">

           <Trash2 className="w-4 h-4 text-stone-400 group-hover:text-red-600 transition-colors" />

           <span className="text-sm font-semibold text-stone-600 group-hover:text-red-600">Delete Account</span>

          </div>

          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-red-300 transition-colors" />

         </button>

        </div>

       </Card>

      </div>

     )}



     {activeTab === 'billing' && (

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">

       <Card title="Current Plan" subtitle="You are currently on the Pro Plan.">

        <div className="p-8 bg-stone-900 text-white rounded-3xl space-y-6 relative overflow-hidden shadow-xl shadow-stone-200">

         <div className="relative z-10 space-y-6">

          <div className="flex items-center justify-between">

           <div className="space-y-1">

            <h4 className="text-base font-medium tracking-tight">Pro Founder</h4>

            <p className="text-xs text-white/60">Billed annually • $240/year</p>

           </div>

           <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium tracking-wide border border-white/10">Active</span>

          </div>

          

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

           {[

            { label: "Matches", val: "Unlimited" },

            { label: "Mentors", val: "5/mo" },

            { label: "Communities", val: "All" },

            { label: "Perks", val: "$50k value" }

           ].map((stat, i) => (

            <div key={i} className="space-y-1">

             <p className="text-xs text-white/40 tracking-wide font-medium">{stat.label}</p>

             <p className="text-sm font-semibold">{stat.val}</p>

            </div>

           ))}

          </div>



          <div className="flex gap-3 pt-4">

           <Button variant="secondary" size="sm" className="px-5 font-semibold">Manage Subscription</Button>

           <NavLink to="/pricing">

            <Button variant="ghost" size="sm" className="px-5 font-semibold text-white/60 hover:text-white hover:bg-white/5">View Plans</Button>

           </NavLink>

          </div>

         </div>


        </div>

       </Card>



       <Card title="Payment Methods" subtitle="Manage your credit cards and billing info.">

        <div className="space-y-4">

         <div className="flex items-center justify-between p-4 bg-stone-50/50 rounded-2xl border border-stone-100">

          <div className="flex items-center gap-4">

           <div className="w-12 h-8 bg-white rounded-lg border border-stone-200 flex items-center justify-center text-xs font-medium text-stone-400 shadow-sm">VISA</div>

           <div className="space-y-0.5">

            <p className="text-sm font-semibold text-stone-900">•••• 4242</p>

            <p className="text-xs text-stone-500">Expires 12/26</p>

           </div>

          </div>

          <Button variant="ghost" size="sm" className="h-9 px-4 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</Button>

         </div>

         <Button variant="outline" size="sm" className="w-full border-dashed h-11 text-sm font-semibold rounded-2xl hover:bg-stone-50 transition-all">

          <Plus className="w-4 h-4 mr-2" /> Add Payment Method

         </Button>

        </div>

       </Card>

      </div>

     )}

    </div>

   </div>

  </div>

 );

}

