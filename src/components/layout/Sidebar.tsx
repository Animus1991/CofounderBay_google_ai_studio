import { useNotificationFeed } from "../../lib/notificationFeed";
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
 LogIn,
 LogOut,
 Menu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { User, UserRole } from "../../types";
import { cn } from "../../lib/utils";
import { bothText, labelOf, withEl } from "../../lib/labels";
import { navTitle } from "../../lib/navHelp";
import { useLanguage } from "../../lib/language";
import { useTenant } from "../../context/TenantContext";
import { signOutAccount } from "../../lib/account";
import { useOptionalMessaging } from "../../context/MessagingContext";

interface SidebarProps {
 user: User & { avatarUrl?: string };
 guest?: boolean;
 collapsed: boolean;
 setCollapsed: (collapsed: boolean) => void;
 mobileOpen?: boolean;
 setMobileOpen?: (open: boolean) => void;
 onMenuToggle?: () => void;
}

export default function Sidebar({ user, guest = false, collapsed, setCollapsed, mobileOpen, setMobileOpen, onMenuToggle }: SidebarProps) {
 useLanguage();
 const { tenant } = useTenant();
 const navigate = useNavigate();
 const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

 const handleLogout = async () => {
  try {
   await signOutAccount();
   navigate('/');
  } catch (e) {
   console.error('Logout error', e);
  }
 };

 const sections = [
  {
   title: "Build",
   items: [
    { icon: Rocket, label: "Founder Tools", path: "/founder-tools" },
    { icon: DollarSign, label: "Fundraising", path: "/fundraising" },
    { icon: Briefcase, label: "Workspace", path: "/workspace" },
    { icon: Trophy, label: "Milestones", path: "/milestones" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
   ]
  },
  {
   title: "Find",
   items: [
    { icon: Compass, label: "Explore", path: "/discovery" },
    { icon: Users, label: "Matches", path: "/matches" },
    { icon: GraduationCap, label: "Mentors", path: "/mentors" },
    { icon: Globe, label: tenant?.content?.communityNamingConvention || "Communities", path: "/communities" },
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
  },
  {
   title: "Account",
   items: [
    { icon: UserIcon, label: "My Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
   ]
  }
 ];

 const feed = useNotificationFeed();
 const messaging = useOptionalMessaging();
 const unread = feed.unread;
 const unreadMessages = messaging?.totalUnread ?? 0;
 const badgeFor = (path: string) => (path === '/messages' ? unreadMessages : 0);

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
    onClick={(event) => { if ((event.target as HTMLElement).closest('a')) setMobileOpen?.(false); }}
    className={cn(
     "h-full bg-white border-r border-stone-200/60 flex flex-col shrink-0 overflow-hidden relative z-[70]",
     "fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out",
     !mobileOpen && "-translate-x-full lg:translate-x-0"
    )}
   >
    {/* Brand Section */}
    <div className={cn(
     "p-4 flex items-center gap-3 border-b border-stone-100 h-14",
     collapsed ? "justify-center" : "justify-between"
    )}>
     <div className="flex items-center gap-2.5 overflow-hidden">
      {/* Mobile hamburger */}
      <button
       onClick={onMenuToggle}
       className="lg:hidden p-1.5 hover:bg-stone-100 rounded-lg text-stone-500"
      >
       <Menu className="w-4 h-4" />
      </button>
      <motion.div 
       whileHover={{ scale: 1.05 }}
       whileTap={{ scale: 0.95 }}
       onClick={() => setCollapsed(!collapsed)}
       className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
       title={withEl(collapsed ? "Expand sidebar" : "Collapse sidebar")}
      >
       {tenant?.branding?.logoUrl ? (
        <img src={tenant.branding.logoUrl} alt={tenant.displayName} className="h-4 w-auto" />
       ) : (
        <Zap className="w-4 h-4 text-white fill-current" />
       )}
      </motion.div>
      {!collapsed && (
       <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col whitespace-nowrap"
       >
        <h1 className="text-xs font-semibold tracking-tight text-stone-900 leading-none">{tenant?.displayName || "CoFounderBay"}</h1>
        <span className="text-xs font-medium text-stone-400 tracking-wide mt-1">{withEl("Ecosystem Hub")}</span>
       </motion.div>
      )}
     </div>
    </div>

   {/* Navigation */}
   <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto no-scrollbar pb-10">
    <div>
     <NavLink
      to="/dashboard"
      title={navTitle("Dashboard", "/dashboard")}
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
       {!collapsed && <span>{withEl("Dashboard")}</span>}
      </div>
      {!collapsed && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all group-[.active]:opacity-100" />}
     </NavLink>
    </div>

    {sections.map((section) => (
     <div key={section.title} className="space-y-1.5">
      {!collapsed ? (
       <p className="px-3 text-xs font-semibold text-stone-400 tracking-[0.12em] mb-2">
        {withEl(section.title)}
       </p>
      ) : (
       <div className="h-px bg-stone-100 mx-3 mb-3" />
      )}
      <div className="space-y-1">
       {section.items.map((item) => (
        <NavLink
         key={item.path}
         to={item.path}
         title={navTitle(item.label, item.path)}
         className={({ isActive }) =>
          cn(
           "flex items-center justify-between gap-3 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium transition-all duration-200 group",
           isActive
            ? "bg-stone-100 text-stone-900 shadow-sm"
            : "text-stone-500 hover:bg-stone-50/80 hover:text-stone-900",
           collapsed && "justify-center px-0"
          )
         }
        >
         <div className="relative flex items-center gap-3">
          <item.icon className={cn(
           "w-5 h-5 transition-colors shrink-0",
           "group-hover:text-stone-900"
          )} />
          {!collapsed && <span>{withEl(item.label)}</span>}
          {collapsed && badgeFor(item.path) > 0 && (
           <span className="absolute -top-1.5 -right-2 min-w-3.5 h-3.5 px-0.5 rounded-full bg-stone-900 text-white text-[8px] font-medium tabular-nums leading-[14px] text-center">
            {badgeFor(item.path) > 99 ? '99+' : badgeFor(item.path)}
           </span>
          )}
         </div>
         {!collapsed && badgeFor(item.path) > 0 ? (
          <span className="min-w-4 h-4 px-1 rounded-full bg-stone-900 text-white text-xs font-medium tabular-nums leading-4 text-center">
           {badgeFor(item.path) > 99 ? '99+' : badgeFor(item.path)}
          </span>
         ) : !collapsed && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all" />}
        </NavLink>
       ))}
      </div>
     </div>
    ))}

    {isAdmin && (
     <div className="space-y-1.5 pt-4 border-t border-stone-100">
      {!collapsed ? (
       <p className="px-3 text-xs font-semibold text-stone-400 tracking-[0.12em] mb-2">
        {withEl("Administration")}
       </p>
      ) : (
       <div className="h-px bg-stone-100 mx-3 mb-3" />
      )}
      <div className="space-y-1">
       {[
        { icon: ShieldCheck, label: "Admin Dashboard", path: "/admin" },
        { icon: Users, label: "User Management", path: "/admin/users" },
        { icon: Zap, label: "Automation Engine", path: "/admin/automation" },
       ].map((item) => (
        <NavLink
         key={item.path}
         to={item.path}
         title={navTitle(item.label, item.path)}
         className={({ isActive }) =>
          cn(
           "flex items-center justify-between gap-3 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium transition-all duration-200 group",
           isActive
            ? "bg-stone-900 text-white shadow-lg shadow-stone-900/10"
            : "text-stone-500 hover:bg-stone-50 hover:text-stone-900",
           collapsed && "justify-center px-0"
          )
         }
        >
         <div className="flex items-center gap-3">
          <item.icon className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{withEl(item.label)}</span>}
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
    <div
     onClick={() => navigate(guest ? '/login' : '/profile')}
     className={cn(
     "flex items-center gap-3 p-2.5 rounded-xl bg-white border border-stone-200 shadow-sm group cursor-pointer hover:border-stone-400 transition-all",
     collapsed && "justify-center p-1.5"
    )}>
     <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 shrink-0 flex items-center justify-center">
      {user.avatarUrl ? (
       <img 
        src={user.avatarUrl}
        alt={user.fullName}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
       />
      ) : (
       <span className="text-xs font-semibold text-stone-600">{(user.fullName || 'U').charAt(0).toUpperCase()}</span>
      )}
     </div>
     {!collapsed && (
      <div className="flex-1 min-w-0">
       <p className="text-xs font-semibold text-stone-900 truncate">{user.fullName}</p>
       {!guest && (
        <p className="text-xs text-stone-400 font-medium truncate">{labelOf(user.roles.find((role) => role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) || user.roles[0] || UserRole.FOUNDER)}</p>
       )}
      </div>
     )}
     {!collapsed && !guest && (
      <div className="flex items-center">
       <button type="button" onClick={() => { setMobileOpen?.(false); navigate('/settings'); }} aria-label={bothText('Settings', 'Ρυθμίσεις')} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900">
        <Settings className="w-4 h-4" />
       </button>
      </div>
     )}
    </div>

    {!collapsed ? (
     guest ? (
      <NavLink
       to="/login"
       title={bothText("Sign in", "Είσοδος")}
       className="mt-3 flex items-center justify-center gap-2 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium tracking-wider hover:bg-stone-700 transition-all"
      >
       <LogIn className="w-3 h-3" />
       {bothText("Sign in", "Είσοδος")}
      </NavLink>
     ) : (
     <div className="grid grid-cols-2 gap-2 mt-3">
      <NavLink 
       to="/notifications"
       title={navTitle("Alerts", "/notifications")}
       className="relative flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium tracking-wider text-stone-500 hover:bg-white hover:text-stone-900 transition-all border border-transparent hover:border-stone-200"
      >
       <Bell className="w-3 h-3" />
       {withEl("Alerts")}
       {unread > 0 && (
        <span className="min-w-4 h-4 px-1 rounded-full bg-stone-900 text-white text-xs font-medium tabular-nums leading-4">
         {unread > 99 ? '99+' : unread}
        </span>
       )}
      </NavLink>
      <button 
       onClick={handleLogout}
       title={navTitle("Logout", "/logout")}
       className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium tracking-wider text-red-500 hover:bg-red-50/50 transition-all border border-transparent hover:border-red-100"
      >
       <LogOut className="w-3 h-3" />
       {withEl("Logout")}
      </button>
     </div>
     )
    ) : (
     <div className="flex flex-col items-center gap-2 mt-3">
      {guest ? (
       <NavLink
        to="/login"
        title={bothText("Sign in", "Είσοδος")}
        className="p-2 rounded-lg bg-stone-900 text-white hover:bg-stone-700 transition-all"
       >
        <LogIn className="w-4.5 h-4.5" />
       </NavLink>
      ) : (
      <NavLink 
       to="/notifications"
       title={navTitle("Alerts", "/notifications")}
       className="relative p-2 rounded-lg text-stone-500 hover:bg-white hover:text-stone-900 transition-all border border-transparent hover:border-stone-200"
      >
       <Bell className="w-4.5 h-4.5" />
       {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-stone-900 text-white text-[8px] font-medium tabular-nums leading-[14px] text-center">
         {unread > 99 ? '99+' : unread}
        </span>
       )}
      </NavLink>
      )}
     </div>
    )}
   </div>
  </motion.aside>
  </>
 );
}
