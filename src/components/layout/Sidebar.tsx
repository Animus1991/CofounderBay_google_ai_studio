import { useState, useEffect } from "react";
import { 
 LayoutDashboard, 
 Users, 
 GraduationCap, 
 MessageSquare, 
 Trophy, 
 User as UserIcon, 
 Settings, 
 ShieldCheck,
 Globe,
 Zap,
 CreditCard,
 BarChart3,
 Rocket,
 DollarSign,
 Briefcase,
 Compass,
 Calendar,
 Share2,
 BookOpen,
 Activity,
 Bell,
 Scale,
 Gift,
 ChevronRight,
 LogOut,
 PanelLeftClose,
 PanelLeftOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "react-router-dom";
import { User, UserRole } from "../../types";
import { cn } from "../../lib/utils";
import { useTenant } from "../../context/TenantContext";

interface SidebarProps {
 user: User;
 collapsed: boolean;
 setCollapsed: (collapsed: boolean) => void;
 mobileOpen?: boolean;
 setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ user, collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
 const { tenant } = useTenant();
 const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

 const sections = [
  {
   title: "Founder Tools",
   items: [
    { icon: Rocket, label: "Founder Tools", path: "/founder-tools" },
    { icon: DollarSign, label: "Fundraising", path: "/fundraising" },
    { icon: Briefcase, label: "Workspace", path: "/workspace" },
    { icon: Trophy, label: "Milestones", path: "/milestones" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
   ]
  },
  {
   title: "Discovery",
   items: [
    { icon: Compass, label: "Discovery", path: "/discovery" },
    { icon: Users, label: "Matches", path: "/matches" },
    { icon: GraduationCap, label: "Mentors", path: "/mentors" },
    { icon: Globe, label: tenant?.content.communityNamingConvention || "Communities", path: "/community" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Rocket, label: "Programs", path: "/programs" },
    { icon: Share2, label: "Network", path: "/network" },
   ]
  },
  {
   title: "Communication",
   items: [
    { icon: MessageSquare, label: "Messages", path: "/messages" },
   ]
  },
  {
   title: "Resources",
   items: [
    { icon: BookOpen, label: "Resources", path: "/resources" },
    { icon: Activity, label: "Insights", path: "/insights" },
    { icon: Scale, label: "Legal Hub", path: "/legal" },
    { icon: Gift, label: "Startup Perks", path: "/perks" },
   ]
  }
 ];

 return (
  <>
   {/* Mobile Overlay */}
   <AnimatePresence>
    {mobileOpen && (
     <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setMobileOpen?.(false)}
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60] lg:hidden"
     />
    )}
   </AnimatePresence>

   <motion.aside 
    initial={false}
    animate={{ 
     width: collapsed ? 80 : 280,
     x: (typeof window !== 'undefined' && window.innerWidth < 1024) 
      ? (mobileOpen ? 0 : -280) 
      : 0
    }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
     "h-full bg-white border-r border-stone-200/60 flex flex-col shrink-0 overflow-hidden relative z-[70]",
     "fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out",
     !mobileOpen && "-translate-x-full lg:translate-x-0"
    )}
   >
    {/* Brand Section */}
    <div className={cn(
     "p-5 flex items-center gap-4 transition-all duration-300",
     collapsed ? "justify-center" : "justify-between"
    )}>
     <div className="flex items-center gap-3 overflow-hidden">
      <motion.div 
       whileHover={{ scale: 1.02 }}
       className="w-9 h-9 bg-stone-900 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
      >
       {tenant?.branding.logoUrl ? (
        <img src={tenant.branding.logoUrl} alt={tenant.displayName} className="h-5 w-auto" />
       ) : (
        <Zap className="w-4.5 h-4.5 text-white fill-current" />
       )}
      </motion.div>
      {!collapsed && (
       <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col whitespace-nowrap"
       >
        <h1 className="text-sm font-medium tracking-tight text-stone-900 leading-none">{tenant?.displayName || "CoFounderBay"}</h1>
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-[0.15em] mt-1.5">Ecosystem Hub</span>
       </motion.div>
      )}
     </div>
     
     <div className="flex items-center gap-1">
      <button 
       onClick={() => setCollapsed(!collapsed)}
       className={cn(
        "hidden lg:flex p-2 hover:bg-stone-50 rounded-lg transition-all text-stone-400 hover:text-stone-900",
        collapsed && "absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-stone-200 shadow-sm z-10"
       )}
      >
       {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>
      <button 
       onClick={() => setMobileOpen?.(false)}
       className="lg:hidden p-2 hover:bg-stone-50 rounded-lg transition-all text-stone-400 hover:text-stone-900"
      >
       <PanelLeftClose className="w-5 h-5" />
      </button>
     </div>
    </div>

   {/* Navigation */}
   <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto no-scrollbar pb-10">
    <div>
     <NavLink
      to="/dashboard"
      className={({ isActive }) =>
       cn(
        "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
        isActive
         ? "bg-stone-900 text-white shadow-lg shadow-stone-900/10"
         : "text-stone-500 hover:bg-stone-50 hover:text-stone-900",
        collapsed && "justify-center px-0"
       )
      }
     >
      <div className="flex items-center gap-3 relative z-10">
       <LayoutDashboard className="w-5 h-5 shrink-0" />
       {!collapsed && <span>Dashboard</span>}
      </div>
      {!collapsed && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all group-[.active]:opacity-100" />}
     </NavLink>
    </div>

    {sections.map((section) => (
     <div key={section.title} className="space-y-1.5">
      {!collapsed ? (
       <p className="px-3 text-xs font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">
        {section.title}
       </p>
      ) : (
       <div className="h-px bg-stone-100 mx-3 mb-3" />
      )}
      <div className="space-y-0.5">
       {section.items.map((item) => (
        <NavLink
         key={item.path}
         to={item.path}
         title={collapsed ? item.label : undefined}
         className={({ isActive }) =>
          cn(
           "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
           isActive
            ? "bg-stone-100 text-stone-900 shadow-sm"
            : "text-stone-500 hover:bg-stone-50/80 hover:text-stone-900",
           collapsed && "justify-center px-0"
          )
         }
        >
         <div className="flex items-center gap-3">
          <item.icon className={cn(
           "w-5 h-5 transition-colors shrink-0",
           "group-hover:text-stone-900"
          )} />
          {!collapsed && <span>{item.label}</span>}
         </div>
         {!collapsed && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all" />}
        </NavLink>
       ))}
      </div>
     </div>
    ))}

    {isAdmin && (
     <div className="space-y-1.5 pt-4 border-t border-stone-100">
      {!collapsed ? (
       <p className="px-3 text-xs font-semibold text-stone-400 uppercase tracking-[0.12em] mb-2">
        Administration
       </p>
      ) : (
       <div className="h-px bg-stone-100 mx-3 mb-3" />
      )}
      <div className="space-y-0.5">
       {[
        { icon: ShieldCheck, label: "Admin Dashboard", path: "/admin" },
        { icon: Users, label: "User Management", path: "/admin/users" },
        { icon: Zap, label: "Automation Engine", path: "/admin/automation" },
       ].map((item) => (
        <NavLink
         key={item.path}
         to={item.path}
         title={collapsed ? item.label : undefined}
         className={({ isActive }) =>
          cn(
           "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
           isActive
            ? "bg-stone-900 text-white shadow-lg shadow-stone-900/10"
            : "text-stone-500 hover:bg-stone-50 hover:text-stone-900",
           collapsed && "justify-center px-0"
          )
         }
        >
         <div className="flex items-center gap-3">
          <item.icon className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
         </div>
         {!collapsed && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all" />}
        </NavLink>
       ))}
      </div>
     </div>
    )}
   </nav>

   {/* User Footer */}
   <div className="p-4 border-t border-stone-100 bg-stone-50/30">
    <div className={cn(
     "flex items-center gap-3 p-2.5 rounded-xl bg-white border border-stone-200 shadow-sm group cursor-pointer hover:border-stone-400 transition-all",
     collapsed && "justify-center p-1.5"
    )}>
     <div className="w-9 h-9 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
      <img 
       src={`https://picsum.photos/seed/${user.id}/100/100`} 
       alt={user.fullName}
       className="w-full h-full object-cover"
       referrerPolicy="no-referrer"
      />
     </div>
     {!collapsed && (
      <div className="flex-1 min-w-0">
       <p className="text-xs font-semibold text-stone-900 truncate">{user.fullName}</p>
       <p className="text-xs text-stone-400 font-medium uppercase tracking-wider truncate">Founder</p>
      </div>
     )}
     {!collapsed && (
      <div className="flex items-center">
       <button className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-900">
        <Settings className="w-3.5 h-3.5" />
       </button>
      </div>
     )}
    </div>
    
    {!collapsed ? (
     <div className="grid grid-cols-2 gap-2 mt-3">
      <NavLink 
       to="/notifications"
       className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium uppercase tracking-wider text-stone-500 hover:bg-white hover:text-stone-900 transition-all border border-transparent hover:border-stone-200"
      >
       <Bell className="w-3 h-3" />
       Alerts
      </NavLink>
      <button 
       className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium uppercase tracking-wider text-red-500 hover:bg-red-50/50 transition-all border border-transparent hover:border-red-100"
      >
       <LogOut className="w-3 h-3" />
       Logout
      </button>
     </div>
    ) : (
     <div className="flex flex-col items-center gap-2 mt-3">
      <NavLink 
       to="/notifications"
       title="Notifications"
       className="p-2 rounded-lg text-stone-500 hover:bg-white hover:text-stone-900 transition-all border border-transparent hover:border-stone-200"
      >
       <Bell className="w-4.5 h-4.5" />
      </NavLink>
     </div>
    )}
   </div>
  </motion.aside>
  </>
 );
}
