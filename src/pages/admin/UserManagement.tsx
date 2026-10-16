import { useState, useEffect } from "react";
import { 
 ShieldCheck, Search, Filter, SlidersHorizontal, ArrowRight, 
 CheckCircle2, XCircle, Star, Plus, Users, Send, TrendingUp, 
 Zap, Globe, MessageSquare, AlertCircle, MoreVertical, Palette, 
 Tag, BarChart3, ShieldAlert, Briefcase, Download, Mail,
 UserPlus, Ban, Trash2, Edit3, ChevronRight, ChevronLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { User } from "../../types";
import { cn } from "../../lib/utils";

interface AdminProps {
 user: User;
}

const UserManagementSkeleton = () => (
 <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-24 space-y-6 animate-pulse">
  <div className="h-64 w-full bg-stone-100 rounded-xl"></div>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
   {[1, 2, 3, 4].map(i => (
    <div key={i} className="h-32 bg-stone-100 rounded-xl"></div>
   ))}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
   <div className="lg:col-span-2 h-[600px] bg-stone-100 rounded-xl"></div>
   <div className="h-[600px] bg-stone-100 rounded-xl"></div>
  </div>
 </div>
);

export default function UserManagement({ user }: AdminProps) {
 const [users, setUsers] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedTab, setSelectedTab] = useState("All Users");

 useEffect(() => {
  const fetchUsers = async () => {
   try {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
   } catch (err) {
    console.error("Error fetching users", err);
   } finally {
    setTimeout(() => setLoading(false), 800);
   }
  };
  fetchUsers();
 }, []);

 if (loading) return <UserManagementSkeleton />;

 const moderationQueue = [
  { id: 1, type: "Profile", user: "Alex Rivera", reason: "Potential spam", time: "2h ago", severity: "medium" },
  { id: 2, type: "Community", user: "Web3 Builders", reason: "Inappropriate content", time: "4h ago", severity: "high" },
  { id: 3, type: "Message", user: "Sarah Chen", reason: "Harassment report", time: "6h ago", severity: "low" },
 ];

 const filteredUsers = users.filter(u => 
  u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  u.email.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
  <motion.div 
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   className="w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-24 space-y-6"
  >
   {/* Premium Header */}
   <div className="relative overflow-hidden rounded-xl bg-white p-8 border border-stone-100 lg:pr-36">

    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
     <div className="space-y-4">
      <motion.div 
       initial={{ opacity: 0, x: -10 }}
       animate={{ opacity: 1, x: 0 }}
       className="flex items-center gap-5"
      >
       <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
        <Users className="w-7 h-7 text-stone-900" />
       </div>
       <div>
        <h2 className="text-xl font-medium tracking-tight text-stone-900">User Management</h2>
        <p className="text-stone-400 text-xs font-medium tracking-wider mt-1">Orchestrate your ecosystem's member base</p>
       </div>
      </motion.div>
     </div>

     <div className="flex flex-wrap items-center gap-4">
      <div className="hidden lg:flex items-center gap-3 mr-4">
       <Link to="/admin/branding">
        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-stone-900 font-medium text-xs tracking-wider transition-all h-11 px-6 rounded-xl">
         <Palette className="w-4 h-4 mr-2.5" /> Branding
        </Button>
       </Link>
       <Link to="/admin/taxonomies">
        <Button variant="ghost" size="sm" className="text-stone-400 hover:text-stone-900 font-medium text-xs tracking-wider transition-all h-11 px-6 rounded-xl">
         <Tag className="w-4 h-4 mr-2.5" /> Taxonomies
        </Button>
       </Link>
      </div>
      <Button variant="outline" className="bg-white border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 rounded-xl h-11 px-6 text-xs font-medium tracking-wide transition-all shadow-sm">
       <Download className="w-3.5 h-3.5 mr-2.5" /> Export
      </Button>
      <Button className="bg-stone-900 hover:bg-stone-800 text-white border-none rounded-xl h-11 px-8 text-xs font-medium tracking-wide shadow-xl shadow-stone-200 transition-all">
       <UserPlus className="w-3.5 h-3.5 mr-2.5" /> Invite Member
      </Button>
     </div>
    </div>
   </div>

   {/* Stats Grid */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[
     { label: "Total Members", value: "2,542", change: "+12%", icon: Users, color: "text-blue-600", bg: "bg-blue-50/50" },
     { label: "Active Now", value: "850", change: "+5%", icon: Zap, color: "text-amber-600", bg: "bg-amber-50/50" },
     { label: "Verified Hubs", value: "42", change: "Stable", icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50/50" },
     { label: "Pending Issues", value: "3", change: "Critical", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50/50" },
    ].map((stat, i) => (
     <motion.div
      key={i}
      whileHover={{ y: -4, scale: 1.02 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 25 }}
     >
      <Card noPadding className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] transition-all overflow-hidden group rounded-xl">
       <div className="p-8 flex items-center justify-between">
        <div className="space-y-3">
         <p className="text-xs font-medium text-stone-400 tracking-wider">{stat.label}</p>
         <h4 className="text-xl font-medium tracking-tight text-stone-900">{stat.value}</h4>
        </div>
        <div className={cn("w-14 h-11 rounded-2xl flex items-center justify-center transition-all shadow-inner border border-stone-100/50", stat.bg, stat.color)}>
         <stat.icon className="w-7 h-7" />
        </div>
       </div>
       <div className={cn(
        "px-5 py-2.5 bg-stone-50/30 border-t border-stone-50 flex items-center gap-3 text-xs font-medium tracking-wider",
        stat.color
       )}>
        <TrendingUp className="w-3.5 h-3.5" /> {stat.change} this month
       </div>
      </Card>
     </motion.div>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* User Management Table */}
    <div className="lg:col-span-2 space-y-6">
     <Card 
      noPadding 
      className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden rounded-xl"
     >
      <div className="p-8 border-b border-stone-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
       <div className="flex items-center gap-8">
        {["All Users", "Admins", "Mentors", "Founders"].map((tab) => (
         <button
          key={tab}
          onClick={() => setSelectedTab(tab)}
          className={cn(
           "text-xs font-medium tracking-wider pb-3 border-b-2 transition-all relative",
           selectedTab === tab 
            ? "border-stone-900 text-stone-900" 
            : "border-transparent text-stone-400 hover:text-stone-600"
          )}
         >
          {tab}
         </button>
        ))}
       </div>
       <div className="relative w-full md:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input 
         type="text"
         placeholder="Search members..."
         value={searchQuery}
         onChange={(e) => setSearchQuery(e.target.value)}
         className="input-minimal pl-12 text-xs font-medium tracking-wide"
        />
       </div>
      </div>

      <div className="overflow-x-auto">
       <table className="w-full text-left border-collapse">
        <thead>
         <tr className="bg-stone-50/20 border-b border-stone-50">
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">Member</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">Role & Hub</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">Status</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">Activity</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider text-right">Actions</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
         <AnimatePresence mode="popLayout">
          {filteredUsers.map((u, i) => (
           <motion.tr 
            key={u.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: i * 0.02 }}
            className="hover:bg-stone-50/40 transition-all group cursor-pointer"
           >
            <td className="px-8 py-7">
             <div className="flex items-center gap-6">
              <div className="relative">
               <div className="w-14 h-11 rounded-2xl bg-stone-100 overflow-hidden border border-stone-100 shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                <img 
                 src={`https://picsum.photos/seed/${u.id}/100/100`} 
                 alt={u.fullName}
                 className="w-full h-full object-cover transition-transform"
                 referrerPolicy="no-referrer"
                />
               </div>
               <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
              </div>
              <div className="space-y-1">
               <p className="text-base font-medium text-stone-900 group-hover:text-stone-600 transition-colors tracking-tight">{u.fullName}</p>
               <p className="text-xs text-stone-400 font-medium tracking-wide">{u.email}</p>
              </div>
             </div>
            </td>
            <td className="px-8 py-7">
             <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
               {u.roles.map((role: string) => (
                <span key={role} className="text-xs font-medium px-2.5 py-1 bg-stone-50 text-stone-500 rounded-md tracking-wide border border-stone-100">
                 {role}
                </span>
               ))}
              </div>
              <span className="text-xs text-stone-300 font-medium tracking-wider">Techstars Hub</span>
             </div>
            </td>
            <td className="px-8 py-7">
             <span className={cn(
              "text-xs font-medium px-3.5 py-1.5 rounded-xl tracking-wide inline-flex items-center gap-2.5 border",
              u.accountStatus === "Active" 
               ? "text-emerald-600 border-transparent" 
               : "text-red-600 border-transparent"
             )}>
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-sm", u.accountStatus === "Active" ? "bg-emerald-500" : "bg-red-500")}></div>
              {u.accountStatus}
             </span>
            </td>
            <td className="px-8 py-7">
             <div className="space-y-1.5">
              <p className="text-xs font-medium text-stone-700 tracking-tight">Last login: 2h ago</p>
              <p className="text-xs text-stone-300 font-medium tracking-wider">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
             </div>
            </td>
            <td className="px-8 py-7 text-right">
             <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white hover:shadow-md border border-transparent hover:border-stone-100 transition-all">
               <Mail className="w-4.5 h-4.5 text-stone-400" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white hover:shadow-md border border-transparent hover:border-stone-100 transition-all">
               <Edit3 className="w-4.5 h-4.5 text-stone-400" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-red-50 border border-transparent hover:border-red-100 group/btn transition-all">
               <Trash2 className="w-4.5 h-4.5 text-stone-300 group-hover/btn:text-red-500" />
              </Button>
             </div>
            </td>
           </motion.tr>
          ))}
         </AnimatePresence>
        </tbody>
       </table>
      </div>
      <div className="p-8 bg-stone-50/20 border-t border-stone-50 flex flex-col md:flex-row items-center justify-between gap-8">
       <p className="text-xs text-stone-400 font-medium tracking-wider">
        Showing <span className="text-stone-900">{filteredUsers.length}</span> of <span className="text-stone-900">2,542</span> members
       </p>
       <div className="flex items-center gap-8">
        <div className="flex gap-2">
         {[1, 2, 3, "...", 12].map((p, i) => (
          <button 
           key={i}
           className={cn(
            "w-9 h-9 rounded-xl text-xs font-medium transition-all border",
            p === 1 
             ? "bg-stone-900 text-white border-stone-900 shadow-sm" 
             : "text-stone-400 border-transparent hover:bg-white hover:border-stone-100 hover:shadow-sm"
           )}
          >
           {p}
          </button>
         ))}
        </div>
        <div className="flex gap-2">
         <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-stone-200 hover:border-stone-900 transition-all bg-white shadow-sm">
          <ChevronLeft className="w-4.5 h-4.5" />
         </Button>
         <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-stone-200 hover:border-stone-900 transition-all bg-white shadow-sm">
          <ChevronRight className="w-4.5 h-4.5" />
         </Button>
        </div>
       </div>
      </div>
     </Card>

     {/* Moderation Queue */}
     <div className="space-y-8">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-6">
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100/50 shadow-sm">
         <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <div className="space-y-1">
         <h2 className="text-sm font-semibold text-stone-900 tracking-wider">Moderation Queue</h2>
         <p className="text-stone-400 font-medium text-xs tracking-wider mt-1">Items requiring administrative review</p>
        </div>
       </div>
       <Button variant="ghost" className="text-xs font-medium tracking-wider text-stone-400 hover:text-stone-900 h-11 px-8 rounded-xl transition-all">
        View All Reports
       </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
       {moderationQueue.map((item, i) => (
        <motion.div
         key={item.id}
         whileHover={{ y: -4, scale: 1.01 }}
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: i * 0.1, type: "spring", stiffness: 400, damping: 25 }}
        >
         <Card noPadding className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.08)] transition-all group rounded-xl overflow-hidden">
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-10">
           <div className="flex items-center gap-8 w-full md:w-auto">
            <div className={cn(
             "w-20 h-20 rounded-xl flex items-center justify-center shadow-inner shrink-0 border border-stone-100/50 transition-all group-hover:scale-105",
             item.severity === 'high' ? "bg-red-50 text-red-500" :
             item.severity === 'medium' ? "bg-amber-50 text-amber-500" :
             "bg-blue-50 text-blue-500"
            )}>
             {item.type === 'Profile' ? <Users className="w-10 h-10" /> :
              item.type === 'Community' ? <Globe className="w-10 h-10" /> :
              <MessageSquare className="w-10 h-10" />}
            </div>
            <div className="space-y-3">
             <div className="flex items-center gap-5">
              <span className="text-sm font-semibold text-stone-900">{item.user}</span>
              <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-md text-xs font-medium tracking-wider border border-stone-200/50">
               {item.type}
              </span>
             </div>
             <p className="text-sm text-stone-500 font-medium flex items-center gap-4">
              <span className="text-red-500 font-medium text-xs tracking-wider">{item.reason}</span>
              <span className="w-1 h-1 rounded-full bg-stone-200"></span>
              <span className="text-stone-400 font-medium text-xs tracking-[0.15em]">Reported {item.time}</span>
             </p>
            </div>
           </div>
           <div className="flex items-center gap-4 w-full md:w-auto">
            <Button variant="ghost" className="flex-1 md:flex-none h-10 px-10 text-xs font-medium tracking-wide text-stone-400 hover:text-stone-900 rounded-xl transition-all">
             Dismiss
            </Button>
            <Button className="flex-1 md:flex-none h-10 px-12 text-xs font-medium tracking-wide bg-red-600 hover:bg-red-700 text-white border-none shadow-xl shadow-red-900/10 rounded-xl transition-all">
             Review & Action
            </Button>
           </div>
          </div>
         </Card>
        </motion.div>
       ))}
      </div>
     </div>
    </div>

    {/* Sidebar Area */}
    <div className="space-y-6">
     <div className="flex items-center gap-4 mb-4">
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
       <BarChart3 className="w-5 h-5 text-stone-900" />
      </div>
      <h2 className="text-lg font-medium text-stone-900 tracking-tight">Ecosystem Health</h2>
     </div>

     <Card className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-8 rounded-xl space-y-10">
      <div className="space-y-8">
       {[
        { label: "Profile Completion", value: 78, color: "bg-blue-500" },
        { label: "Match Success Rate", value: 64, color: "bg-emerald-500" },
        { label: "Daily Engagement", value: 42, color: "bg-amber-500" },
       ].map((metric, i) => (
        <div key={i} className="space-y-4">
         <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-400 tracking-wider">{metric.label}</span>
          <span className="text-sm font-medium text-stone-900">{metric.value}%</span>
         </div>
         <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden shadow-inner border border-stone-200/20">
          <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${metric.value}%` }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className={cn("h-full rounded-full shadow-lg", metric.color)}
          ></motion.div>
         </div>
        </div>
       ))}
      </div>

      <div className="pt-8 border-t border-stone-50">
       <div className="flex items-center gap-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm">
        <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
         <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
         <p className="text-xs font-medium text-emerald-900 tracking-wider">All Systems Normal</p>
         <p className="text-xs text-emerald-600 font-medium tracking-wide mt-0.5">Last check: 1m ago</p>
        </div>
       </div>
      </div>
     </Card>

     {/* Ecosystem Distribution */}
     <div className="space-y-4">
      <h3 className="text-xs font-medium text-stone-400 tracking-wider ml-2">Member Distribution</h3>
      <Card className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-8 rounded-xl space-y-8">
       {[
        { label: "Founders", value: 45, color: "bg-stone-900", icon: Zap },
        { label: "Co-Founders", value: 35, color: "bg-stone-600", icon: Users },
        { label: "Mentors", value: 15, color: "bg-stone-400", icon: Star },
        { label: "Advisors", value: 5, color: "bg-stone-200", icon: ShieldCheck },
       ].map((item, i) => (
        <div key={i} className="space-y-3">
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
           <div className="p-1.5 bg-stone-50 rounded-lg border border-stone-100 shadow-sm">
            <item.icon className="w-3.5 h-3.5 text-stone-400" />
           </div>
           <span className="text-xs font-medium text-stone-500 tracking-wide">{item.label}</span>
          </div>
          <span className="text-xs font-medium text-stone-900">{item.value}%</span>
         </div>
         <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${item.value}%` }}
           className={cn("h-full rounded-full", item.color)}
          ></motion.div>
         </div>
        </div>
       ))}
      </Card>
     </div>

     {/* Quick Actions */}
     <div className="space-y-4">
      <h3 className="text-xs font-medium text-stone-400 tracking-wider ml-2">Administrative Actions</h3>
      <div className="grid grid-cols-1 gap-4">
       <motion.button
        whileHover={{ x: 6, scale: 1.01 }}
        className="w-full flex items-center gap-6 p-6 bg-white border border-stone-100 rounded-[1.75rem] hover:border-stone-900 hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] transition-all text-left group shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
       >
        <div className="w-14 h-11 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all shadow-inner border border-stone-100/50">
         <Globe className="w-7 h-7" />
        </div>
        <div className="space-y-1">
         <p className="text-sm font-medium text-stone-900 tracking-tight">New Ecosystem Hub</p>
         <p className="text-xs text-stone-500 font-medium">Create a branded tenant environment</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center ml-auto group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm border border-stone-100/50">
         <ChevronRight className="w-4 h-4" />
        </div>
       </motion.button>

       <motion.button
        whileHover={{ x: 6, scale: 1.01 }}
        className="w-full flex items-center gap-6 p-6 bg-white border border-stone-100 rounded-[1.75rem] hover:border-stone-900 hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] transition-all text-left group shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
       >
        <div className="w-14 h-11 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all shadow-inner border border-stone-100/50">
         <Briefcase className="w-7 h-7" />
        </div>
        <div className="space-y-1">
         <p className="text-sm font-medium text-stone-900 tracking-tight">Export Platform Data</p>
         <p className="text-xs text-stone-500 font-medium">Generate CSV/JSON ecosystem reports</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center ml-auto group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm border border-stone-100/50">
         <ChevronRight className="w-4 h-4" />
        </div>
       </motion.button>
      </div>
     </div>
    </div>
   </div>
  </motion.div>
 );
}
