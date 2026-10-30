import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, LayoutDashboard, User, Users, GraduationCap, MessageSquare, Trophy, Compass,
  Calendar, Rocket, DollarSign, Briefcase, Share2, BookOpen, Activity, Scale, Gift,
  Bell, Settings, ShieldCheck, Globe, Zap, ArrowRight, Command, Target,
  BarChart2, Layers, Palette, CreditCard, Lock, Tags,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../App';
import { pageHelp } from '../lib/navHelp';
import { useT } from '../lib/language';
import { labelOf } from '../lib/labels';
import { directoryPeople, onPeopleChange } from '../lib/peopleSource';
import { useUIStore } from '../stores/useUIStore';
import { askAssistant, openAssistant } from '../lib/assistantBus';

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
  'settings-billing': '/settings/billing',
  pricing: '/pricing',
  admin: '/admin',
  'admin-users': '/admin/users',
  'admin-automation': '/admin/automation',
  'admin-branding': '/admin/branding',
  'admin-sso': '/admin/sso',
  'admin-taxonomy': '/admin/taxonomy',
  'admin-domains': '/admin/domains',
  'admin-billing': '/admin/billing',
  'admin-billing-oversight': '/admin/billing-oversight',
};

type Prefix = 'command' | 'people' | 'page' | 'all';

interface CommandItem {
  id: string;
  label: string;
  labelEl: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  section: string;
  sectionEl: string;
  keywords?: string[];
  kind: 'command' | 'page';
}

function prefixOf(raw: string): { prefix: Prefix; needle: string } {
  if (raw.startsWith('>')) return { prefix: 'command', needle: raw.slice(1).trim() };
  if (raw.startsWith('@')) return { prefix: 'people', needle: raw.slice(1).trim() };
  if (raw.startsWith('/')) return { prefix: 'page', needle: raw.slice(1).trim() };
  return { prefix: 'all', needle: raw.trim() };
}

export default function CommandPalette() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [peopleTick, setPeopleTick] = useState(0);
  useEffect(() => onPeopleChange(() => setPeopleTick((value) => value + 1)), []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAdmin, isDemoMode } = useAuth();
  const setMatchBreakdownModalOpen = useUIStore((s) => s.setMatchBreakdownModalOpen);
  const setDealRoomModalOpen = useUIStore((s) => s.setDealRoomModalOpen);
  const setNeedWallModalOpen = useUIStore((s) => s.setNeedWallModalOpen);
  const setPaletteTheme = useUIStore((s) => s.setPaletteTheme);

  const go = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  const ask = useCallback((prompt: string) => {
    askAssistant(prompt);
    setOpen(false);
  }, []);

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      { id: 'match-6axis', label: 'Open 6-Axis Match Breakdown', labelEl: 'Άνοιγμα Ανάλυσης Συμβατότητας 6 Αξόνων', icon: BarChart2, action: () => { setOpen(false); setMatchBreakdownModalOpen(true, 'fp-1'); }, section: 'Studio Tools', sectionEl: 'Εργαλεία Studio', keywords: ['6-axis', 'breakdown', 'score', 'matching'], kind: 'command' },
      { id: 'deal-room', label: 'Open my Deal Room & Pitch Deck', labelEl: 'Άνοιγμα του Deal Room & Pitch Deck μου', icon: Briefcase, action: () => { setOpen(false); setDealRoomModalOpen(true, 'sv-my-venture'); }, section: 'Studio Tools', sectionEl: 'Εργαλεία Studio', keywords: ['deal room', 'pitch deck', 'venture', 'apply'], kind: 'command' },
      { id: 'need-wall', label: 'Open Startup Need Cards Wall', labelEl: 'Άνοιγμα Πίνακα Αναγκών & Ρόλων Startup', icon: Layers, action: () => { setOpen(false); setNeedWallModalOpen(true); }, section: 'Studio Tools', sectionEl: 'Εργαλεία Studio', keywords: ['need', 'bounties', 'roles', 'wall'], kind: 'command' },
      { id: 'assistant', label: 'Ask the studio assistant', labelEl: 'Ρώτα τον βοηθό', icon: Zap, action: () => { openAssistant(); setOpen(false); }, section: 'Studio', sectionEl: 'Βοηθός', keywords: ['ai', 'chat', 'help', 'βοηθός', 'slash', '/match'], kind: 'command' },
      { id: 'ask-match', label: 'Who is my best match?', labelEl: 'Ποια είναι η καλύτερη αντιστοίχιση;', icon: Users, action: () => ask('who is my best match'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['match', 'cofounder', 'αντιστοιχ'], kind: 'command' },
      { id: 'ask-overdue', label: 'What is overdue?', labelEl: 'Τι είναι εκπρόθεσμο;', icon: Trophy, action: () => ask('What is overdue?'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['milestone', 'overdue', 'εκπρόθεσμ'], kind: 'command' },
      { id: 'ask-round', label: 'How is my round?', labelEl: 'Πώς πάει ο γύρος;', icon: DollarSign, action: () => ask('How is my round?'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['raise', 'fundraising', 'γύρ'], kind: 'command' },
      { id: 'ask-invest', label: 'Record a $50k investment', labelEl: 'Καταγραφή επένδυσης $50k', icon: DollarSign, action: () => ask('Record a $50k investment in my round'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['record', 'investment'], kind: 'command' },
      { id: 'ask-programs', label: 'What programs can I apply to?', labelEl: 'Σε ποια προγράμματα κάνω αίτηση;', icon: Rocket, action: () => ask('What programs can I apply to?'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['accelerator', 'grant'], kind: 'command' },
      { id: 'ask-events', label: 'What events are coming?', labelEl: 'Ποιες εκδηλώσεις έρχονται;', icon: Calendar, action: () => ask('what events are coming'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['meetup', 'calendar'], kind: 'command' },
      { id: 'ask-readiness', label: 'What is my readiness score?', labelEl: 'Ποιο είναι το readiness score;', icon: Activity, action: () => ask('Tell me about readiness score'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['insights', 'score', 'ετοιμότητα'], kind: 'command' },
      { id: 'ask-mentor', label: 'Find a fundraising mentor', labelEl: 'Βρες μέντορα χρηματοδότησης', icon: GraduationCap, action: () => ask('Find a fundraising mentor'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['advisor', 'coach'], kind: 'command' },
      { id: 'ask-perk', label: 'Claim the AWS perk', labelEl: 'Διεκδίκηση παροχής AWS', icon: Gift, action: () => ask('Claim the Amazon Web Services perk'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['credits', 'aws'], kind: 'command' },
      { id: 'ask-playbook', label: '7-day match plan', labelEl: 'Πλάνο 7 ημερών', icon: Trophy, action: () => ask('Give me a 7-day match plan'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['playbook', 'plan', 'πλάνο'], kind: 'command' },
      { id: 'ask-week', label: 'Who should I meet this week?', labelEl: 'Ποιον να γνωρίσω αυτή την εβδομάδα;', icon: Users, action: () => ask('Who should I meet this week?'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['week', 'meet', 'εβδομάδ'], kind: 'command' },
      { id: 'ask-invite', label: 'Invite 3 founders', labelEl: 'Προσκάλεσε 3 ιδρυτές', icon: Share2, action: () => ask('Invite 3 founders'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['invite', 'referral', '1+3'], kind: 'command' },
      { id: 'ask-scout', label: 'Propose three people (do not send)', labelEl: 'Πρότεινε τρία πρόσωπα (χωρίς αποστολή)', icon: Users, action: () => ask('Propose three people — do not send'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['scout', 'propose', '/scout'], kind: 'command' },
      { id: 'ask-need', label: 'Draft a need card', labelEl: 'Πρόχειρο κάρτας ανάγκης', icon: Target, action: () => ask('Draft a need card for a co-founder'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['need', 'card', 'κάρτα'], kind: 'command' },
      { id: 'ask-next', label: 'What should I do first?', labelEl: 'Τι να κάνω πρώτα;', icon: Target, action: () => ask('What should I do first?'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['next', 'πρώτα', '/next'], kind: 'command' },
      { id: 'ask-inbox', label: 'Search my messages', labelEl: 'Αναζήτηση στα μηνύματα', icon: MessageSquare, action: () => ask('search my messages for intro'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['inbox', '/inbox'], kind: 'command' },
      { id: 'quiz', label: 'Fit check', labelEl: 'Fit check', icon: Command, action: () => go('/quiz'), section: 'Studio', sectionEl: 'Βοηθός', keywords: ['quiz', 'archetype'], kind: 'command' },
      { id: 'theme-stone', label: 'Theme: Comfort Stone', labelEl: 'Θέμα: Comfort Stone', icon: Palette, action: () => { setPaletteTheme('stone'); setOpen(false); }, section: 'Themes', sectionEl: 'Θέματα', keywords: ['theme', 'palette', 'stone', 'light'], kind: 'command' },
      { id: 'theme-dark', label: 'Theme: Dark Obsidian', labelEl: 'Θέμα: Dark Obsidian', icon: Palette, action: () => { setPaletteTheme('dark'); setOpen(false); }, section: 'Themes', sectionEl: 'Θέματα', keywords: ['theme', 'palette', 'dark', 'obsidian'], kind: 'command' },
      { id: 'theme-cyan', label: 'Theme: Cyan Pulse', labelEl: 'Θέμα: Cyan Pulse', icon: Palette, action: () => { setPaletteTheme('cyan'); setOpen(false); }, section: 'Themes', sectionEl: 'Θέματα', keywords: ['theme', 'palette', 'cyan'], kind: 'command' },
      { id: 'theme-mint', label: 'Theme: Mint Catalyst', labelEl: 'Θέμα: Mint Catalyst', icon: Palette, action: () => { setPaletteTheme('mint'); setOpen(false); }, section: 'Themes', sectionEl: 'Θέματα', keywords: ['theme', 'palette', 'mint'], kind: 'command' },
      { id: 'theme-apricot', label: 'Theme: Apricot Warmth', labelEl: 'Θέμα: Apricot Warmth', icon: Palette, action: () => { setPaletteTheme('apricot'); setOpen(false); }, section: 'Themes', sectionEl: 'Θέματα', keywords: ['theme', 'palette', 'apricot'], kind: 'command' },
      { id: 'theme-lilac', label: 'Theme: Lilac Vision', labelEl: 'Θέμα: Lilac Vision', icon: Palette, action: () => { setPaletteTheme('lilac'); setOpen(false); }, section: 'Themes', sectionEl: 'Θέματα', keywords: ['theme', 'palette', 'lilac'], kind: 'command' },
      { id: 'theme-burgundy', label: 'Theme: Burgundy Velvet', labelEl: 'Θέμα: Burgundy Velvet', icon: Palette, action: () => { setPaletteTheme('burgundy'); setOpen(false); }, section: 'Themes', sectionEl: 'Θέματα', keywords: ['theme', 'palette', 'burgundy', 'wine', 'maroon'], kind: 'command' },
      { id: 'dashboard', label: 'Dashboard', labelEl: 'Πίνακας', icon: LayoutDashboard, action: () => go('/dashboard'), section: 'Navigation', sectionEl: 'Πλοήγηση', keywords: ['home', 'main'], kind: 'page' },
      { id: 'profile', label: 'My Profile', labelEl: 'Το προφίλ μου', icon: User, action: () => go('/profile'), section: 'Navigation', sectionEl: 'Πλοήγηση', keywords: ['account', 'me'], kind: 'page' },
      { id: 'discovery', label: 'Explore', labelEl: 'Εξερεύνηση', icon: Compass, action: () => go('/discovery'), section: 'Navigation', sectionEl: 'Πλοήγηση', keywords: ['explore', 'browse', 'find', 'discovery'], kind: 'page' },
      { id: 'matches', label: 'Matches', labelEl: 'Αντιστοιχίσεις', icon: Users, action: () => go('/matches'), section: 'Navigation', sectionEl: 'Πλοήγηση', keywords: ['cofounders', 'partners'], kind: 'page' },
      { id: 'mentors', label: 'Mentors', labelEl: 'Μέντορες', icon: GraduationCap, action: () => go('/mentors'), section: 'Navigation', sectionEl: 'Πλοήγηση', keywords: ['advisors', 'coaching'], kind: 'page' },
      { id: 'messages', label: 'Messages', labelEl: 'Μηνύματα', icon: MessageSquare, action: () => go('/messages'), section: 'Navigation', sectionEl: 'Πλοήγηση', keywords: ['chat', 'conversations', 'inbox'], kind: 'page' },
      { id: 'milestones', label: 'Milestones', labelEl: 'Ορόσημα', icon: Trophy, action: () => go('/milestones'), section: 'Navigation', sectionEl: 'Πλοήγηση', keywords: ['goals', 'progress', 'tracker'], kind: 'page' },
      { id: 'founder-tools', label: 'Founder Tools', labelEl: 'Εργαλεία ιδρυτή', icon: Rocket, action: () => go('/founder-tools'), section: 'Founder Tools', sectionEl: 'Εργαλεία ιδρυτή', keywords: ['startup', 'launch'], kind: 'page' },
      { id: 'fundraising', label: 'Fundraising', labelEl: 'Χρηματοδότηση', icon: DollarSign, action: () => go('/fundraising'), section: 'Founder Tools', sectionEl: 'Εργαλεία ιδρυτή', keywords: ['investors', 'money', 'raise'], kind: 'page' },
      { id: 'workspace', label: 'Workspace', labelEl: 'Χώρος εργασίας', icon: Briefcase, action: () => go('/workspace'), section: 'Founder Tools', sectionEl: 'Εργαλεία ιδρυτή', keywords: ['tasks', 'projects'], kind: 'page' },
      { id: 'calendar', label: 'Calendar', labelEl: 'Ημερολόγιο', icon: Calendar, action: () => go('/calendar'), section: 'Founder Tools', sectionEl: 'Εργαλεία ιδρυτή', keywords: ['schedule', 'events', 'meetings'], kind: 'page' },
      { id: 'community', label: 'Communities', labelEl: 'Κοινότητες', icon: Globe, action: () => go('/community'), section: 'Discovery', sectionEl: 'Εξερεύνηση', keywords: ['groups', 'organizations'], kind: 'page' },
      { id: 'events', label: 'Events', labelEl: 'Εκδηλώσεις', icon: Calendar, action: () => go('/events'), section: 'Discovery', sectionEl: 'Εξερεύνηση', keywords: ['meetups', 'webinars'], kind: 'page' },
      { id: 'programs', label: 'Programs', labelEl: 'Προγράμματα', icon: Rocket, action: () => go('/programs'), section: 'Discovery', sectionEl: 'Εξερεύνηση', keywords: ['accelerators', 'incubators'], kind: 'page' },
      { id: 'network', label: 'Network', labelEl: 'Δίκτυο', icon: Share2, action: () => go('/network'), section: 'Discovery', sectionEl: 'Εξερεύνηση', keywords: ['connections', 'people'], kind: 'page' },
      { id: 'resources', label: 'Resources', labelEl: 'Πόροι', icon: BookOpen, action: () => go('/resources'), section: 'Resources', sectionEl: 'Πόροι', keywords: ['guides', 'articles', 'learn'], kind: 'page' },
      { id: 'insights', label: 'Insights', labelEl: 'Εικόνα', icon: Activity, action: () => go('/insights'), section: 'Resources', sectionEl: 'Πόροι', keywords: ['analytics', 'stats', 'data'], kind: 'page' },
      { id: 'legal', label: 'Legal Hub', labelEl: 'Νομικά', icon: Scale, action: () => go('/legal'), section: 'Resources', sectionEl: 'Πόροι', keywords: ['documents', 'contracts', 'templates'], kind: 'page' },
      { id: 'perks', label: 'Startup Perks', labelEl: 'Παροχές', icon: Gift, action: () => go('/perks'), section: 'Resources', sectionEl: 'Πόροι', keywords: ['deals', 'discounts', 'offers'], kind: 'page' },
      { id: 'notifications', label: 'Notifications', labelEl: 'Ειδοποιήσεις', icon: Bell, action: () => go('/notifications'), section: 'User', sectionEl: 'Λογαριασμός', keywords: ['alerts', 'updates'], kind: 'page' },
      { id: 'settings', label: 'Settings', labelEl: 'Ρυθμίσεις', icon: Settings, action: () => go('/settings'), section: 'User', sectionEl: 'Λογαριασμός', keywords: ['preferences', 'account'], kind: 'page' },
      { id: 'settings-billing', label: 'Billing & Subscription', labelEl: 'Χρέωση & Συνδρομή', icon: CreditCard, action: () => go('/settings/billing'), section: 'User', sectionEl: 'Λογαριασμός', keywords: ['billing', 'invoices', 'plan'], kind: 'page' },
      { id: 'pricing', label: 'Pricing', labelEl: 'Τιμές', icon: DollarSign, action: () => go('/pricing'), section: 'User', sectionEl: 'Λογαριασμός', keywords: ['plans', 'billing', 'subscription'], kind: 'page' },
    ];

    if (isAdmin || isDemoMode) {
      items.push(
        { id: 'admin', label: 'Admin Dashboard', labelEl: 'Πίνακας διαχείρισης', icon: ShieldCheck, action: () => go('/admin'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['administration', 'manage'], kind: 'page' },
        { id: 'admin-users', label: 'User Management', labelEl: 'Μέλη', icon: Users, action: () => go('/admin/users'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['manage users'], kind: 'page' },
        { id: 'admin-automation', label: 'Automation Engine', labelEl: 'Αυτοματισμοί', icon: Zap, action: () => go('/admin/automation'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['workflows', 'rules'], kind: 'page' },
        { id: 'admin-branding', label: 'Branding Settings', labelEl: 'Ταυτότητα', icon: Globe, action: () => go('/admin/branding'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['theme', 'logo'], kind: 'page' },
        { id: 'admin-sso', label: 'SSO Settings', labelEl: 'Ρυθμίσεις SSO', icon: Lock, action: () => go('/admin/sso'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['sso', 'saml', 'oidc'], kind: 'page' },
        { id: 'admin-taxonomy', label: 'Taxonomy Settings', labelEl: 'Ταξινομίες', icon: Tags, action: () => go('/admin/taxonomy'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['taxonomy', 'skills', 'tags'], kind: 'page' },
        { id: 'admin-domains', label: 'Domain Settings', labelEl: 'Domains', icon: Globe, action: () => go('/admin/domains'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['domains', 'dns'], kind: 'page' },
        { id: 'admin-billing', label: 'Tenant Billing', labelEl: 'Χρέωση Οργανισμού', icon: CreditCard, action: () => go('/admin/billing'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['tenant billing'], kind: 'page' },
        { id: 'admin-billing-oversight', label: 'SuperAdmin Billing Oversight', labelEl: 'Εποπτεία Χρεώσεων SuperAdmin', icon: DollarSign, action: () => go('/admin/billing-oversight'), section: 'Admin', sectionEl: 'Διαχείριση', keywords: ['superadmin', 'oversight', 'mrr'], kind: 'page' },
      );
    }

    return items.map((item) => ({ ...item, description: pageHelp(COMMAND_PATH[item.id] || '') }));
  }, [ask, go, isAdmin, isDemoMode, setDealRoomModalOpen, setMatchBreakdownModalOpen, setNeedWallModalOpen, setPaletteTheme]);

  const { prefix, needle } = prefixOf(query);
  const q = needle.toLowerCase();

  const filtered = useMemo(() => {
    const pool = prefix === 'command' ? commands.filter((item) => item.kind === 'command')
      : prefix === 'page' ? commands.filter((item) => item.kind === 'page')
        : prefix === 'people' ? [] : commands;
    if (!q) return pool;
    return pool.filter((cmd) =>
      cmd.label.toLowerCase().includes(q)
      || cmd.labelEl.toLowerCase().includes(q)
      || cmd.description?.toLowerCase().includes(q)
      || cmd.keywords?.some((k) => k.includes(q))
      || cmd.section.toLowerCase().includes(q)
      || cmd.sectionEl.includes(q),
    );
  }, [commands, prefix, q]);

  const people = useMemo(() => {
    if (prefix !== 'people' && !(prefix === 'all' && q.startsWith('@'))) return [];
    const n = q.replace(/^@/, '');
    return directoryPeople().filter((person) => {
      if (!n) return true;
      return person.fullName.toLowerCase().includes(n)
        || person.skills.some((skill) => skill.toLowerCase().includes(n))
        || person.role.toLowerCase().includes(n)
        || person.headline.toLowerCase().includes(n);
    }).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, q, peopleTick]);

  const discoveryRow = useMemo(
    () => (prefix === 'people' && needle ? { id: 'discovery-search', name: needle } : null),
    [prefix, needle],
  );

  const flatCount = filtered.length + people.length + (discoveryRow ? 1 : 0);

  const sections = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      const key = t(item.section, item.sectionEl);
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    });
    return map;
  }, [filtered, t]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    // Visible search triggers (header, sidebar) open the same palette as Ctrl/⌘ K.
    const openFromUi = () => {
      setOpen(true);
      setQuery('');
      setSelectedIndex(0);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('OPEN_COMMAND_PALETTE', openFromUi);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('OPEN_COMMAND_PALETTE', openFromUi);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runIndex = useCallback((index: number) => {
    if (prefix === 'people' || people.length) {
      if (index < people.length) {
        const person = people[index];
        if (person) go(`/profile/${person.id}`);
        return;
      }
      if (discoveryRow && index === people.length) {
        go(`/discovery?q=${encodeURIComponent(discoveryRow.name)}`);
        return;
      }
    }
    const cmd = filtered[prefix === 'people' ? index - people.length - (discoveryRow ? 1 : 0) : index];
    if (cmd) cmd.action();
    else if (needle) ask(needle);
  }, [ask, discoveryRow, filtered, go, needle, people, prefix]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(flatCount - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runIndex(selectedIndex);
    }
  }, [flatCount, runIndex, selectedIndex]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let globalIndex = -1;
  const placeholder = prefix === 'command' ? t('Search commands…', 'Αναζήτηση εντολών…')
    : prefix === 'people' ? t('Search people…', 'Αναζήτηση προσώπων…')
      : prefix === 'page' ? t('Search pages…', 'Αναζήτηση σελίδων…')
        : t('> commands  @ people  / pages', '> εντολές  @ πρόσωπα  / σελίδες');

  const emptyCopy = prefix === 'command' ? t(`No command matches “${needle}”.`, `Καμία εντολή για «${needle}».`)
    : prefix === 'people' ? t(`No one named “${needle}”. Search Discovery instead.`, `Κανείς με όνομα «${needle}». Δοκίμασε την Εξερεύνηση.`)
      : prefix === 'page' ? t(`No page named “${needle}”.`, `Καμία σελίδα «${needle}».`)
        : t(`No page named “${query}”. The studio assistant can still run it.`, `Καμία σελίδα «${query}». Ο βοηθός μπορεί ακόμα να το τρέξει.`);

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
            <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
              <Search className="w-5 h-5 text-stone-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 text-sm text-stone-900 placeholder:text-stone-400 outline-none bg-transparent"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-400 bg-stone-50 border border-stone-200 rounded-md tracking-wider">
                Esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
              {people.length > 0 && (
                <div>
                  <p className="px-5 pt-3 pb-1.5 text-xs font-semibold text-stone-400 tracking-wider">{t('People', 'Πρόσωπα')}</p>
                  {people.map((person) => {
                    globalIndex++;
                    const idx = globalIndex;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        data-index={idx}
                        onClick={() => go(`/profile/${person.id}`)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 min-h-11 px-5 py-2.5 text-left transition-colors',
                          idx === selectedIndex ? 'bg-stone-50 text-stone-900' : 'text-stone-600 hover:bg-stone-50/50',
                        )}
                      >
                        <User className="w-4.5 h-4.5 shrink-0" />
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{person.fullName}</span>
                        <span className="text-xs text-stone-400 shrink-0">{labelOf(person.role)}</span>
                        {idx === selectedIndex && <ArrowRight className="w-3.5 h-3.5 text-stone-400" />}
                      </button>
                    );
                  })}
                  {discoveryRow && (() => {
                    globalIndex++;
                    const idx = globalIndex;
                    return (
                      <button
                        type="button"
                        data-index={idx}
                        onClick={() => go(`/discovery?q=${encodeURIComponent(discoveryRow.name)}`)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 min-h-11 px-5 py-2.5 text-left transition-colors',
                          idx === selectedIndex ? 'bg-stone-50 text-stone-900' : 'text-stone-600 hover:bg-stone-50/50',
                        )}
                      >
                        <Compass className="w-4.5 h-4.5 shrink-0" />
                        <span className="text-sm font-medium flex-1">{t(`Search Discovery for “${discoveryRow.name}”`, `Αναζήτηση στην Εξερεύνηση για «${discoveryRow.name}»`)}</span>
                      </button>
                    );
                  })()}
                </div>
              )}
              {filtered.length === 0 && people.length === 0 ? (
                <div className="px-5 py-6 space-y-3">
                  <p className="text-sm text-stone-500">{emptyCopy}</p>
                  {needle && prefix !== 'page' && (
                    <button
                      type="button"
                      onClick={() => (prefix === 'people' ? go(`/discovery?q=${encodeURIComponent(needle)}`) : ask(needle))}
                      className="w-full min-h-11 px-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
                    >
                      {prefix === 'people'
                        ? t(`Search Discovery: ${needle}`, `Εξερεύνηση: ${needle}`)
                        : t(`Ask assistant: ${needle}`, `Ρώτα τον βοηθό: ${needle}`)}
                    </button>
                  )}
                </div>
              ) : (
                Array.from(sections.entries()).map(([section, items]) => (
                  <div key={section}>
                    <p className="px-5 pt-3 pb-1.5 text-xs font-semibold text-stone-400 tracking-wider">{section}</p>
                    {items.map((item) => {
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
                            'w-full flex items-center gap-3 min-h-11 px-5 py-2.5 text-left transition-colors',
                            idx === selectedIndex ? 'bg-stone-50 text-stone-900' : 'text-stone-600 hover:bg-stone-50/50',
                          )}
                        >
                          <item.icon className="w-4.5 h-4.5 shrink-0" />
                          <span className="text-sm font-medium flex-1">{t(item.label, item.labelEl)}</span>
                          {idx === selectedIndex && <ArrowRight className="w-3.5 h-3.5 text-stone-400" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-stone-50 border border-stone-200 rounded text-xs">↑↓</kbd> {t('Navigate', 'Μετακίνηση')}</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-stone-50 border border-stone-200 rounded text-xs">↵</kbd> {t('Open', 'Άνοιγμα')}</span>
                <span className="hidden sm:flex items-center gap-2 text-xs tracking-wide">
                  <span>&gt; {t('commands', 'εντολές')}</span>
                  <span>@ {t('people', 'πρόσωπα')}</span>
                  <span>/ {t('pages', 'σελίδες')}</span>
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3" />K {t('to toggle', 'άνοιγμα/κλείσιμο')}
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
