import { useState, useEffect } from "react";
import { 
 Shield, Users, Globe, Zap, Settings, 
 BarChart3, Activity, AlertCircle, CheckCircle2,
 ArrowUpRight, ArrowDownRight, Search, Filter,
 MoreVertical, ChevronRight, Mail, Bell,
 Database, Server, Lock, Eye, RefreshCw,
 Cpu, HardDrive, Network, Flag, Calendar, Plus
} from "lucide-react";
import { 
 LineChart, Line, XAxis, YAxis, CartesianGrid, 
 Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { cn } from "../../lib/utils";
import { User, Milestone } from "../../types";
import { Link } from "react-router-dom";
import { milestoneService } from "../../services/milestoneService";

interface AdminDashboardProps {
 user: User;
}

const systemHealthData = [
 { time: '00:00', cpu: 12, mem: 45, req: 120 },
 { time: '04:00', cpu: 8, mem: 42, req: 80 },
 { time: '08:00', cpu: 25, mem: 58, req: 450 },
 { time: '12:00', cpu: 45, mem: 72, req: 850 },
 { time: '16:00', cpu: 32, mem: 65, req: 620 },
 { time: '20:00', cpu: 18, mem: 52, req: 320 },
 { time: '23:59', cpu: 14, mem: 48, req: 150 },
];

const AdminDashboardSkeleton = () => (
 <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
  <div className="flex justify-between items-end">
   <div className="space-y-3">
    <div className="h-10 w-64 bg-stone-200 rounded-lg"></div>
    <div className="h-4 w-96 bg-stone-100 rounded-lg"></div>
   </div>
   <div className="flex gap-3">
    <div className="h-10 w-32 bg-stone-200 rounded-lg"></div>
    <div className="h-10 w-32 bg-stone-200 rounded-lg"></div>
   </div>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
   {[1, 2, 3, 4].map(i => (
    <div key={i} className="h-32 bg-stone-100 rounded-2xl"></div>
   ))}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
   <div className="lg:col-span-8 h-[500px] bg-stone-100 rounded-2xl"></div>
   <div className="lg:col-span-4 space-y-8">
    <div className="h-64 bg-stone-100 rounded-2xl"></div>
    <div className="h-64 bg-stone-100 rounded-2xl"></div>
   </div>
  </div>
 </div>
);

export default function AdminDashboard({ user }: AdminDashboardProps) {
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
 const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
 const [newDate, setNewDate] = useState("");
 const [strategicMilestones, setStrategicMilestones] = useState<Milestone[]>([]);

 useEffect(() => {
  const fetchData = async () => {
   try {
    const milestones = await milestoneService.getStrategicMilestones();
    setStrategicMilestones(milestones);
   } catch (error) {
    console.error("Error fetching strategic milestones:", error);
   } finally {
    setLoading(false);
   }
  };
  fetchData();
 }, []);

 const handleRefresh = async () => {
  setRefreshing(true);
  try {
   const milestones = await milestoneService.getStrategicMilestones();
   setStrategicMilestones(milestones);
  } catch (error) {
   console.error("Error refreshing data:", error);
  } finally {
   setRefreshing(false);
  }
 };

 const handleOpenMilestoneModal = (milestone: Milestone) => {
  setSelectedMilestone(milestone);
  setNewDate(milestone.targetDate);
  setIsMilestoneModalOpen(true);
 };

 const handleUpdateDate = async () => {
  if (!selectedMilestone) return;
  try {
   await milestoneService.updateMilestone(selectedMilestone.id, { targetDate: newDate });
   const updated = await milestoneService.getStrategicMilestones();
   setStrategicMilestones(updated);
   setIsMilestoneModalOpen(false);
  } catch (error) {
   console.error("Error updating milestone date:", error);
  }
 };

 if (loading) return <AdminDashboardSkeleton />;

 return (
  <motion.div 
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   className="space-y-6 max-w-7xl mx-auto pb-20"
  >
   {/* Premium Header */}
   <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-12 shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-stone-100">
    <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]"></div>
    <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]"></div>
    
    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
     <div className="space-y-4">
      <motion.div 
       initial={{ opacity: 0, x: -10 }}
       animate={{ opacity: 1, x: 0 }}
       className="flex items-center gap-5"
      >
       <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
        <Shield className="w-7 h-7 text-stone-900" />
       </div>
       <div>
        <h2 className="text-xl font-medium tracking-tight text-stone-900">Control Center</h2>
        <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mt-1">Global Ecosystem Orchestration</p>
       </div>
      </motion.div>
     </div>
     
     <div className="flex flex-wrap items-center gap-4">
      <Button 
       variant="outline" 
       onClick={handleRefresh}
       className="bg-white border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 rounded-xl h-11 px-6 text-xs font-medium uppercase tracking-widest transition-all shadow-sm"
      >
       <RefreshCw className={cn("w-3.5 h-3.5 mr-2.5", refreshing && "animate-spin")} />
       {refreshing ? "Refreshing..." : "Sync Data"}
      </Button>
      <Button className="bg-stone-900 hover:bg-stone-800 text-white border-none rounded-xl h-11 px-8 text-xs font-medium uppercase tracking-widest shadow-xl shadow-stone-200 transition-all">
       <Settings className="w-3.5 h-3.5 mr-2.5" />
       Global Config
      </Button>
     </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-16 mt-14 pt-12 border-t border-stone-50">
     {[
      { label: "Total Users", value: "12,482", change: "+12%", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
      { label: "Active Nodes", value: "48", change: "Stable", icon: Server, color: "text-purple-500", bg: "bg-purple-50" },
      { label: "Daily Requests", value: "1.2M", change: "+5%", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50" },
      { label: "Security Score", value: "98/100", change: "Optimal", icon: Lock, color: "text-amber-500", bg: "bg-amber-50" },
     ].map((stat, i) => (
      <motion.div 
       key={i}
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: i * 0.05 }}
       className="space-y-3"
      >
       <div className="flex items-center gap-3">
        <div className={cn("p-1.5 rounded-lg border border-stone-100/50 shadow-inner", stat.bg)}>
         <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
        </div>
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{stat.label}</span>
       </div>
       <div className="flex items-baseline gap-4">
        <span className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900 tracking-tight">{stat.value}</span>
        <span className={cn(
         "text-xs font-medium px-2 py-0.5 rounded-md uppercase tracking-widest",
         stat.change.startsWith('+') ? "text-emerald-600 bg-emerald-50 border border-emerald-100/50" : "text-stone-400 bg-stone-50 border border-stone-100/50"
        )}>{stat.change}</span>
       </div>
      </motion.div>
     ))}
    </div>
   </div>

   {/* Quick Navigation Cards */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
    {[
     { label: "User Management", icon: Users, path: "/admin/users", color: "text-blue-600", bg: "bg-blue-50/50", count: "1,240" },
     { label: "Automation Engine", icon: Zap, path: "/admin/automation", color: "text-amber-600", bg: "bg-amber-50/50", count: "24 Active" },
     { label: "Milestones", icon: Flag, path: "/milestones", color: "text-purple-600", bg: "bg-purple-50/50", count: "12 Goals" },
     { label: "Ecosystem Hub", icon: Globe, path: "/admin/branding", color: "text-emerald-600", bg: "bg-emerald-50/50", count: "12 Hubs" },
     { label: "System Health", icon: Activity, path: "/admin/taxonomies", color: "text-stone-600", bg: "bg-stone-50/50", count: "v2.4.0" },
    ].map((item, i) => (
     <motion.div
      key={i}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 25 }}
     >
      <Link to={item.path}>
       <Card className="p-6 hover:border-stone-900 transition-all group cursor-pointer h-full border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.08)] rounded-[1.75rem]">
        <div className="flex items-start justify-between">
         <div className={cn("w-14 h-11 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:shadow-lg group-hover:scale-110 border border-stone-100/50", item.bg, item.color)}>
          <item.icon className="w-7 h-7" />
         </div>
         <div className="text-right">
          <p className="text-base font-medium text-stone-900 tracking-tight">{item.count}</p>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-1">Status</p>
         </div>
        </div>
        <div className="mt-10 flex items-end justify-between">
         <h4 className="text-xs font-medium text-stone-900 leading-tight pr-4 uppercase tracking-widest">{item.label}</h4>
         <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm border border-stone-100/50">
          <ChevronRight className="w-4 h-4" />
         </div>
        </div>
       </Card>
      </Link>
     </motion.div>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    {/* Main Content Area */}
    <div className="lg:col-span-8 space-y-6">
     <Card 
      className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden p-8 rounded-[2rem]"
      title="Infrastructure Performance" 
      subtitle="Real-time CPU, Memory, and Network throughput"
     >
      <div className="h-[320px] w-full pt-8">
       <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={systemHealthData}>
         <defs>
          <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
           <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
           <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
           <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
           <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
          </linearGradient>
         </defs>
         <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f5f5f4" />
         <XAxis 
          dataKey="time" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a29e' }}
          dy={15}
         />
         <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a29e' }}
          dx={-15}
         />
         <Tooltip 
          contentStyle={{ 
           backgroundColor: '#fff', 
           borderRadius: '20px', 
           border: '1px solid #f5f5f4',
           boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.08)',
           fontSize: '11px',
           fontWeight: '700',
           color: '#1c1917',
           padding: '16px'
          }}
          itemStyle={{ padding: '4px 0' }}
          cursor={{ stroke: '#e7e5e4', strokeWidth: 1.5 }}
         />
         <Area 
          type="monotone" 
          dataKey="cpu" 
          stroke="#3b82f6" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorCpu)" 
          animationDuration={2000}
          activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
         />
         <Area 
          type="monotone" 
          dataKey="mem" 
          stroke="#8b5cf6" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorMem)" 
          animationDuration={2500}
          activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
         />
        </AreaChart>
       </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-12 pt-10 border-t border-stone-50 mt-8">
       <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]"></div>
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">CPU Load</span>
       </div>
       <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]"></div>
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Memory Usage</span>
       </div>
       <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Network I/O</span>
       </div>
      </div>
     </Card>

     <Card 
      className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-8 rounded-[2rem]"
      title="Strategic Milestones" 
      subtitle="Global ecosystem goals and deadlines"
     >
      <div className="space-y-5 pt-6">
       {strategicMilestones.map((milestone, i) => (
        <div key={milestone.id} className="group p-6 bg-white rounded-[1.5rem] border border-stone-100 hover:border-stone-900 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] transition-all">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2.5">
           <div className="flex items-center gap-4">
            <h4 className="text-base font-medium text-stone-900 tracking-tight">{milestone.title}</h4>
            <span className={cn(
             "text-xs font-medium px-2.5 py-0.5 rounded-md uppercase tracking-wider border",
             milestone.status === 'Overdue' || milestone.status === 'Delayed' 
              ? "bg-red-50 text-red-600 border-red-100" 
              : "bg-blue-50 text-blue-600 border-blue-100"
            )}>
             {milestone.status}
            </span>
           </div>
           <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 text-stone-400">
             <Calendar className="w-4 h-4" />
             <span className="text-xs font-medium uppercase tracking-[0.15em]">Due: {milestone.targetDate}</span>
            </div>
            <span className="text-xs font-medium text-stone-300 uppercase tracking-[0.15em]">{milestone.category}</span>
           </div>
          </div>
          <div className="flex items-center gap-8">
           <div className="flex flex-col items-end gap-2">
            <div className="w-40 h-2 bg-stone-100 rounded-full overflow-hidden shadow-inner border border-stone-200/20">
             <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${milestone.progress}%` }}
              className="h-full bg-stone-900 rounded-full shadow-lg"
             ></motion.div>
            </div>
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{milestone.progress}% Complete</span>
           </div>
           <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-5 text-xs font-medium uppercase tracking-widest rounded-xl border-stone-200 hover:border-stone-900 hover:bg-stone-50 transition-all shadow-sm"
            onClick={() => handleOpenMilestoneModal(milestone)}
           >
            Update
           </Button>
          </div>
         </div>
        </div>
       ))}
       {strategicMilestones.length === 0 && (
        <div className="text-center py-16 bg-stone-50/50 rounded-[2rem] border border-dashed border-stone-200">
         <Flag className="w-10 h-10 text-stone-300 mx-auto mb-4 opacity-50" />
         <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">No strategic milestones found.</p>
        </div>
       )}
      </div>
      <div className="mt-8 pt-8 border-t border-stone-50 text-center">
       <Link to="/milestones">
        <Button variant="ghost" className="text-xs font-medium uppercase tracking-wider text-stone-400 hover:text-stone-900 h-11 px-8 rounded-xl transition-all">
         Manage All Milestones <ChevronRight className="w-4 h-4 ml-2.5" />
        </Button>
       </Link>
      </div>
     </Card>

     <Card 
      className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] rounded-[2rem] overflow-hidden"
      title="System Audit Log" 
      noPadding
     >
      <div className="divide-y divide-stone-50">
       {[
        { user: "Admin (You)", action: "Updated Global Pricing", target: "Pricing Engine", time: "12m ago", icon: Settings, type: "config" },
        { user: "System", action: "Auto-scaled Infrastructure", target: "AWS Cluster", time: "45m ago", icon: Server, type: "system" },
        { user: "Security", action: "Blocked Suspicious IP", target: "192.168.1.105", time: "1h ago", icon: Lock, type: "security" },
        { user: "Admin (Sarah)", action: "Approved New Program", target: "CleanTech Grant", time: "3h ago", icon: Globe, type: "action" },
       ].map((action, i) => (
        <motion.div 
         key={i} 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: i * 0.05 }}
         className="flex items-center justify-between p-6 hover:bg-stone-50 transition-all group cursor-pointer"
        >
         <div className="flex items-center gap-6">
          <div className={cn(
           "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-inner border border-stone-100/50",
           action.type === 'security' ? "bg-red-50 text-red-500" :
           action.type === 'system' ? "bg-blue-50 text-blue-500" :
           action.type === 'config' ? "bg-amber-50 text-amber-500" :
           "bg-emerald-50 text-emerald-500"
          )}>
           <action.icon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
           <p className="text-sm font-medium text-stone-900 group-hover:text-stone-600 transition-colors tracking-tight">{action.action}</p>
           <p className="text-xs text-stone-400 font-medium uppercase tracking-[0.15em]">by {action.user} • {action.target}</p>
          </div>
         </div>
         <div className="flex items-center gap-5">
          <span className="text-xs font-medium text-stone-400 uppercase tracking-[0.15em]">{action.time}</span>
          <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-stone-100/50">
           <ChevronRight className="w-4 h-4 text-stone-900" />
          </div>
         </div>
        </motion.div>
       ))}
      </div>
      <div className="p-6 bg-stone-50/30 border-t border-stone-50 text-center">
       <Button variant="ghost" className="text-xs font-medium uppercase tracking-wider text-stone-400 hover:text-stone-900 h-11 px-8 rounded-xl transition-all">
        View Full Audit History
       </Button>
      </div>
     </Card>
    </div>

    {/* Sidebar Area */}
    <aside className="lg:col-span-4 space-y-6">
     <Card 
      className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-8 rounded-[2rem]"
      title="Service Health" 
      subtitle="Global infrastructure status"
     >
      <div className="space-y-4 pt-6">
       {[
        { name: "API Gateway", status: "Operational", color: "text-emerald-600", icon: Network },
        { name: "Database", status: "Operational", color: "text-emerald-600", icon: Database },
        { name: "Auth Service", status: "Operational", color: "text-emerald-600", icon: Lock },
        { name: "Storage", status: "Degraded", color: "text-amber-600", icon: HardDrive },
        { name: "Compute", status: "Operational", color: "text-emerald-600", icon: Cpu },
       ].map((service, i) => (
        <div key={i} className="flex items-center justify-between p-5 bg-stone-50/30 rounded-[1.25rem] border border-stone-100 hover:border-stone-200 hover:bg-white hover:shadow-sm transition-all group">
         <div className="flex items-center gap-4">
          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-stone-100 group-hover:border-stone-200 transition-all">
           <service.icon className="w-4.5 h-4.5 text-stone-400" />
          </div>
          <span className="text-sm font-medium text-stone-700 tracking-tight">{service.name}</span>
         </div>
         <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.1)]", service.color.replace('text', 'bg'))}></div>
          <span className={cn("text-xs font-medium uppercase tracking-[0.15em]", service.color)}>{service.status}</span>
         </div>
        </div>
       ))}
      </div>
     </Card>

     <Card 
      className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] relative overflow-hidden p-8 rounded-[2rem]"
      title="Security Posture"
     >
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
      <div className="space-y-10 relative z-10 pt-6">
       <div className="flex items-center justify-between">
        <div className="space-y-2">
         <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tighter">0</p>
         <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Active Threats</p>
        </div>
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-inner border border-emerald-100/50">
         <Shield className="w-8 h-8" />
        </div>
       </div>
       
       <div className="space-y-5">
        {[
         { label: "SSL Certificate", value: "Valid", status: "success" },
         { label: "WAF Protection", value: "Active", status: "success" },
         { label: "Last Scan", value: "2h ago", status: "neutral" },
        ].map((item, i) => (
         <div key={i} className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-400 uppercase tracking-[0.15em]">{item.label}</span>
          <span className={cn(
           "text-xs font-medium tracking-tight",
           item.status === 'success' ? "text-emerald-600" : "text-stone-900"
          )}>{item.value}</span>
         </div>
        ))}
       </div>
       
       <Button variant="outline" className="w-full rounded-xl h-11 font-medium text-xs uppercase tracking-widest border-stone-200 hover:border-stone-900 hover:bg-stone-50 transition-all shadow-sm">
        Security Dashboard
       </Button>
      </div>
     </Card>

     <motion.div
      whileHover={{ y: -4 }}
      className="bg-stone-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/5"
     >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
      <div className="space-y-6 relative z-10">
       <div className="w-14 h-11 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center text-amber-500 border border-white/10 shadow-xl">
        <AlertCircle className="w-7 h-7" />
       </div>
       <div className="space-y-2">
        <h4 className="font-medium text-lg tracking-tight">Maintenance</h4>
        <p className="text-xs text-stone-400 leading-relaxed font-medium">Database engine optimization scheduled for Sunday, March 29 at 02:00 UTC.</p>
       </div>
       <Button className="w-full bg-white text-stone-900 hover:bg-stone-100 rounded-xl h-11 text-xs font-medium uppercase tracking-widest shadow-lg shadow-black/20 transition-all">
        Broadcast Notice
       </Button>
      </div>
     </motion.div>
    </aside>
   </div>

   {/* Update Date Modal */}
   <AnimatePresence>
    {isMilestoneModalOpen && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
       initial={{ opacity: 0, scale: 0.98 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.98 }}
       className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-stone-100"
      >
       <div className="p-6">
        <div className="flex items-center justify-between mb-6">
         <h3 className="text-lg font-medium text-stone-900 tracking-tight">Update Deadline</h3>
         <button 
          onClick={() => setIsMilestoneModalOpen(false)}
          className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
         >
          <Plus className="w-5 h-5 rotate-45" />
         </button>
        </div>

        <div className="space-y-5">
         <div className="p-3.5 bg-stone-50/50 rounded-xl border border-stone-100">
          <p className="text-micro mb-1">Milestone</p>
          <p className="text-sm font-medium text-stone-900">{selectedMilestone?.title}</p>
         </div>

         <div className="space-y-1.5">
          <label className="text-micro">New Due Date</label>
          <div className="relative">
           <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
           <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all"
           />
          </div>
         </div>

         <div className="pt-2 flex gap-2">
          <Button 
           variant="outline" 
           className="flex-1 h-10 text-xs font-medium" 
           onClick={() => setIsMilestoneModalOpen(false)}
          >
           Cancel
          </Button>
          <Button 
           className="flex-1 h-10 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800"
           onClick={handleUpdateDate}
          >
           Update Date
          </Button>
         </div>
        </div>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </motion.div>
 );
}
