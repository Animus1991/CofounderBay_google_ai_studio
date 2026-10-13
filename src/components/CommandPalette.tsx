import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
 Search, LayoutDashboard, User, Users, GraduationCap, MessageSquare, Trophy, Compass,
 Calendar, Rocket, DollarSign, Briefcase, Share2, BookOpen, Activity, Scale, Gift,
 Bell, Settings, ShieldCheck, BarChart3, Globe, Zap, ArrowRight, Command
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../App';
import { pageHelp } from '../lib/navHelp';

const COMMAND_PATH: Record<string, string> = {
 dashboard: '/dashboard',
 profile: '/profile',
 discovery: '/discovery',
 matches: '/matches',
 mentors: '/mentors',
 messages: '/messages',
 milestones: '/milestones',
 'founder-tools': '/founder-tools',
 fundraising: '/fundraising',
 workspace: '/workspace',
 calendar: '/calendar',
 community: '/community',
 events: '/events',
 programs: '/programs',
 network: '/network',
 resources: '/resources',
 insights: '/insights',
 legal: '/legal',
 perks: '/perks',
 notifications: '/notifications',
 settings: '/settings',
 pricing: '/pricing',
 admin: '/admin',
 'admin-users': '/admin/users',
 'admin-automation': '/admin/automation',
 'admin-branding': '/admin/branding',
};

interface CommandItem {
 id: string;
 label: string;
 description?: string;
 icon: React.ElementType;
 action: () => void;
 section: string;
 keywords?: string[];
}

export default function CommandPalette() {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const [selectedIndex, setSelectedIndex] = useState(0);
 const inputRef = useRef<HTMLInputElement>(null);
 const listRef = useRef<HTMLDivElement>(null);
 const navigate = useNavigate();
 const { isAdmin, isDemoMode } = useAuth();

 const go = useCallback((path: string) => {
  navigate(path);
  setOpen(false);
 }, [navigate]);

 const commands: CommandItem[] = useMemo(() => {
  const items: CommandItem[] = [
   { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => go('/dashboard'), section: 'Navigation', keywords: ['home', 'main'] },
   { id: 'profile', label: 'My Profile', icon: User, action: () => go('/profile'), section: 'Navigation', keywords: ['account', 'me'] },
   { id: 'discovery', label: 'Discovery', icon: Compass, action: () => go('/discovery'), section: 'Navigation', keywords: ['explore', 'browse', 'find'] },
   { id: 'matches', label: 'Matches', icon: Users, action: () => go('/matches'), section: 'Navigation', keywords: ['cofounders', 'partners'] },
   { id: 'mentors', label: 'Mentors', icon: GraduationCap, action: () => go('/mentors'), section: 'Navigation', keywords: ['advisors', 'coaching'] },
   { id: 'messages', label: 'Messages', icon: MessageSquare, action: () => go('/messages'), section: 'Navigation', keywords: ['chat', 'conversations', 'inbox'] },
   { id: 'milestones', label: 'Milestones', icon: Trophy, action: () => go('/milestones'), section: 'Navigation', keywords: ['goals', 'progress', 'tracker'] },
   { id: 'founder-tools', label: 'Founder Tools', icon: Rocket, action: () => go('/founder-tools'), section: 'Founder Tools', keywords: ['startup', 'launch'] },
   { id: 'fundraising', label: 'Fundraising', icon: DollarSign, action: () => go('/fundraising'), section: 'Founder Tools', keywords: ['investors', 'money', 'raise'] },
   { id: 'workspace', label: 'Workspace', icon: Briefcase, action: () => go('/workspace'), section: 'Founder Tools', keywords: ['tasks', 'projects'] },
   { id: 'calendar', label: 'Calendar', icon: Calendar, action: () => go('/calendar'), section: 'Founder Tools', keywords: ['schedule', 'events', 'meetings'] },
   { id: 'community', label: 'Communities', icon: Globe, action: () => go('/community'), section: 'Discovery', keywords: ['groups', 'organizations'] },
   { id: 'events', label: 'Events', icon: Calendar, action: () => go('/events'), section: 'Discovery', keywords: ['meetups', 'webinars'] },
   { id: 'programs', label: 'Programs', icon: Rocket, action: () => go('/programs'), section: 'Discovery', keywords: ['accelerators', 'incubators'] },
   { id: 'network', label: 'Network', icon: Share2, action: () => go('/network'), section: 'Discovery', keywords: ['connections', 'people'] },
   { id: 'resources', label: 'Resources', icon: BookOpen, action: () => go('/resources'), section: 'Resources', keywords: ['guides', 'articles', 'learn'] },
   { id: 'insights', label: 'Insights', icon: Activity, action: () => go('/insights'), section: 'Resources', keywords: ['analytics', 'stats', 'data'] },
   { id: 'legal', label: 'Legal Hub', icon: Scale, action: () => go('/legal'), section: 'Resources', keywords: ['documents', 'contracts', 'templates'] },
   { id: 'perks', label: 'Startup Perks', icon: Gift, action: () => go('/perks'), section: 'Resources', keywords: ['deals', 'discounts', 'offers'] },
   { id: 'notifications', label: 'Notifications', icon: Bell, action: () => go('/notifications'), section: 'User', keywords: ['alerts', 'updates'] },
   { id: 'settings', label: 'Settings', icon: Settings, action: () => go('/settings'), section: 'User', keywords: ['preferences', 'account'] },
   { id: 'pricing', label: 'Pricing', icon: DollarSign, action: () => go('/pricing'), section: 'User', keywords: ['plans', 'billing', 'subscription'] },
  ];

  if (isAdmin || isDemoMode) {
   items.push(
    { id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck, action: () => go('/admin'), section: 'Admin', keywords: ['administration', 'manage'] },
    { id: 'admin-users', label: 'User Management', icon: Users, action: () => go('/admin/users'), section: 'Admin', keywords: ['manage users'] },
    { id: 'admin-automation', label: 'Automation Engine', icon: Zap, action: () => go('/admin/automation'), section: 'Admin', keywords: ['workflows', 'rules'] },
    { id: 'admin-branding', label: 'Branding Settings', icon: Globe, action: () => go('/admin/branding'), section: 'Admin', keywords: ['theme', 'logo'] },
   );
  }

  return items.map((item) => ({ ...item, description: pageHelp(COMMAND_PATH[item.id] || '') }));
 }, [go, isAdmin, isDemoMode]);

 const filtered = useMemo(() => {
  if (!query.trim()) return commands;
  const q = query.toLowerCase();
  return commands.filter(cmd =>
   cmd.label.toLowerCase().includes(q) ||
   cmd.description?.toLowerCase().includes(q) ||
   cmd.keywords?.some(k => k.includes(q)) ||
   cmd.section.toLowerCase().includes(q)
  );
 }, [commands, query]);

 const sections = useMemo(() => {
  const map = new Map<string, CommandItem[]>();
  filtered.forEach(item => {
   const arr = map.get(item.section) || [];
   arr.push(item);
   map.set(item.section, arr);
  });
  return map;
 }, [filtered]);

 // Keyboard shortcut to open
 useEffect(() => {
  const handler = (e: KeyboardEvent) => {
   if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    setOpen(prev => !prev);
    setQuery('');
    setSelectedIndex(0);
   }
   if (e.key === 'Escape' && open) {
    setOpen(false);
   }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
 }, [open]);

 // Focus input when opened
 useEffect(() => {
  if (open) {
   setTimeout(() => inputRef.current?.focus(), 50);
  }
 }, [open]);

 // Keyboard navigation inside palette
 const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
   e.preventDefault();
   setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
  } else if (e.key === 'ArrowUp') {
   e.preventDefault();
   setSelectedIndex(prev => Math.max(prev - 1, 0));
  } else if (e.key === 'Enter' && filtered[selectedIndex]) {
   e.preventDefault();
   filtered[selectedIndex].action();
  }
 }, [filtered, selectedIndex]);

 // Reset selected index when query changes
 useEffect(() => { setSelectedIndex(0); }, [query]);

 // Scroll selected item into view
 useEffect(() => {
  const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
  el?.scrollIntoView({ block: 'nearest' });
 }, [selectedIndex]);

 let globalIndex = -1;

 return (
  <AnimatePresence>
   {open && (
    <>
     <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setOpen(false)}
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[200]"
     />
     <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -20 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden z-[201]"
     >
      {/* Search Input */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
       <Search className="w-5 h-5 text-stone-400 shrink-0" />
       <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search commands, pages..."
        className="flex-1 text-sm text-stone-900 placeholder:text-stone-400 outline-none bg-transparent"
       />
       <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-stone-400 bg-stone-50 border border-stone-200 rounded-md tracking-wider">
        Esc
       </kbd>
      </div>

      {/* Results */}
      <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
       {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center">
         <p className="text-sm text-stone-500">No results found for "{query}"</p>
        </div>
       ) : (
        Array.from(sections.entries()).map(([section, items]) => (
         <div key={section}>
          <p className="px-5 pt-3 pb-1.5 text-xs font-semibold text-stone-400 tracking-wider">{section}</p>
          {items.map(item => {
           globalIndex++;
           const idx = globalIndex;
           return (
            <button
             key={item.id}
             data-index={idx}
             onClick={item.action}
             title={item.description}
             onMouseEnter={() => setSelectedIndex(idx)}
             className={cn(
              "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
              idx === selectedIndex ? "bg-stone-50 text-stone-900" : "text-stone-600 hover:bg-stone-50/50"
             )}
            >
             <item.icon className="w-4.5 h-4.5 shrink-0" />
             <span className="text-sm font-medium flex-1">{item.label}</span>
             {idx === selectedIndex && <ArrowRight className="w-3.5 h-3.5 text-stone-400" />}
            </button>
           );
          })}
         </div>
        ))
       )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
       <div className="flex items-center gap-3">
        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-stone-50 border border-stone-200 rounded text-[10px]">↑↓</kbd> Navigate</span>
        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-stone-50 border border-stone-200 rounded text-[10px]">↵</kbd> Open</span>
       </div>
       <span className="flex items-center gap-1">
        <Command className="w-3 h-3" />K to toggle
       </span>
      </div>
     </motion.div>
    </>
   )}
  </AnimatePresence>
 );
}
