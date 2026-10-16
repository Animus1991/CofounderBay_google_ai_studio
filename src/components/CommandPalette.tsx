import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
 Search, LayoutDashboard, User, Users, GraduationCap, MessageSquare, Trophy, Compass,
 Calendar, Rocket, DollarSign, Briefcase, Share2, BookOpen, Activity, Scale, Gift,
 Bell, Settings, ShieldCheck, BarChart3, Globe, Zap, ArrowRight, Command, Sparkles, Target
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

 const ask = useCallback((prompt: string) => {
  window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));
  setOpen(false);
 }, []);

 const commands: CommandItem[] = useMemo(() => {
  const items: CommandItem[] = [
   { id: 'assistant', label: 'Ask the studio assistant', icon: Sparkles, action: () => { window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT')); setOpen(false); }, section: 'Studio', keywords: ['ai', 'chat', 'help', 'βοηθός', 'slash', '/match'] },
   { id: 'ask-match', label: 'Who is my best match?', icon: Users, action: () => ask('who is my best match'), section: 'Studio', keywords: ['match', 'cofounder', 'αντιστοιχ'] },
   { id: 'ask-overdue', label: 'What is overdue?', icon: Trophy, action: () => ask('What is overdue?'), section: 'Studio', keywords: ['milestone', 'overdue', 'εκπρόθεσμ'] },
   { id: 'ask-round', label: 'How is my round?', icon: DollarSign, action: () => ask('How is my round?'), section: 'Studio', keywords: ['raise', 'fundraising', 'γύρ'] },
   { id: 'ask-invest', label: 'Record a $50k investment', icon: DollarSign, action: () => ask('Record a $50k investment in my round'), section: 'Studio', keywords: ['record', 'investment'] },
   { id: 'ask-programs', label: 'What programs can I apply to?', icon: Rocket, action: () => ask('What programs can I apply to?'), section: 'Studio', keywords: ['accelerator', 'grant'] },
   { id: 'ask-events', label: 'What events are coming?', icon: Calendar, action: () => ask('what events are coming'), section: 'Studio', keywords: ['meetup', 'calendar'] },
   { id: 'ask-readiness', label: 'What is my readiness score?', icon: Activity, action: () => ask('Tell me about readiness score'), section: 'Studio', keywords: ['insights', 'score', 'ετοιμότητα'] },
   { id: 'ask-mentor', label: 'Find a fundraising mentor', icon: GraduationCap, action: () => ask('Find a fundraising mentor'), section: 'Studio', keywords: ['advisor', 'coach'] },
   { id: 'ask-perk', label: 'Claim the AWS perk', icon: Gift, action: () => ask('Claim the Amazon Web Services perk'), section: 'Studio', keywords: ['credits', 'aws'] },
   { id: 'ask-playbook', label: '7-day match plan', icon: Trophy, action: () => ask('Give me a 7-day match plan'), section: 'Studio', keywords: ['playbook', 'plan', 'πλάνο'] },
   { id: 'ask-week', label: 'Who should I meet this week?', icon: Users, action: () => ask('Who should I meet this week?'), section: 'Studio', keywords: ['week', 'meet', 'εβδομάδ'] },
   { id: 'ask-invite', label: 'Invite 3 founders', icon: Share2, action: () => ask('Invite 3 founders'), section: 'Studio', keywords: ['invite', 'referral', '1+3'] },
   { id: 'ask-scout', label: 'Propose three people (do not send)', icon: Users, action: () => ask('Propose three people — do not send'), section: 'Studio', keywords: ['scout', 'propose', '/scout'] },
   { id: 'ask-need', label: 'Draft a need card', icon: Target, action: () => ask('Draft a need card for a co-founder'), section: 'Studio', keywords: ['need', 'card', 'κάρτα'] },
   { id: 'ask-next', label: 'What should I do first?', icon: Sparkles, action: () => ask('What should I do first?'), section: 'Studio', keywords: ['next', 'πρώτα', '/next'] },
   { id: 'ask-inbox', label: 'Search my messages', icon: MessageSquare, action: () => ask('search my messages for intro'), section: 'Studio', keywords: ['inbox', '/inbox'] },
   { id: 'quiz', label: 'Fit check', icon: Sparkles, action: () => go('/quiz'), section: 'Studio', keywords: ['quiz', 'archetype'] },
   { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => go('/dashboard'), section: 'Navigation', keywords: ['home', 'main'] },
   { id: 'profile', label: 'My Profile', icon: User, action: () => go('/profile'), section: 'Navigation', keywords: ['account', 'me'] },
   { id: 'discovery', label: 'Explore', icon: Compass, action: () => go('/discovery'), section: 'Navigation', keywords: ['explore', 'browse', 'find', 'discovery'] },
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
 }, [ask, go, isAdmin, isDemoMode]);

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
   setSelectedIndex(prev => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
  } else if (e.key === 'ArrowUp') {
   e.preventDefault();
   setSelectedIndex(prev => Math.max(prev - 1, 0));
  } else if (e.key === 'Enter') {
   e.preventDefault();
   if (filtered[selectedIndex]) filtered[selectedIndex].action();
   else if (query.trim()) ask(query.trim());
  }
 }, [filtered, selectedIndex, query, ask]);

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
      className="fixed top-[10%] sm:top-[15%] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-lg max-h-[min(80dvh,100%)] bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden z-[201] flex flex-col"
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
        placeholder="Search pages, or ask the assistant…"
        className="flex-1 text-sm text-stone-900 placeholder:text-stone-400 outline-none bg-transparent"
       />
       <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-stone-400 bg-stone-50 border border-stone-200 rounded-md tracking-wider">
        Esc
       </kbd>
      </div>

      {/* Results */}
      <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
       {filtered.length === 0 ? (
        <div className="px-5 py-6 space-y-3">
         <p className="text-sm text-stone-500">No page named “{query}”. The studio assistant can still run it.</p>
         <button
          type="button"
          onClick={() => ask(query.trim())}
          className="w-full min-h-11 px-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
         >
          Ask assistant: {query.trim()}
         </button>
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
              "w-full flex items-center gap-3 min-h-11 px-5 py-2.5 text-left transition-colors",
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
