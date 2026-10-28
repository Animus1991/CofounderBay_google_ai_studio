/**
 * One place that knows every member destination: path, icon and label.
 * The sidebar keeps its section grouping, but anything that needs to resolve a
 * path to a name/icon (the Pinned group, the UX coach, ⌘K) reads this map instead
 * of duplicating the list.
 */
import {
 Activity, Award, Bell, BookOpen, Briefcase, Calendar, Compass, CreditCard,
 DollarSign, Gem, Gift, Globe, GraduationCap, LayoutDashboard, MessageSquare, Rocket,
 Scale, Settings, Share2, Ticket, Trophy, User as UserIcon, Users,
 type LucideIcon,
} from 'lucide-react';

export type NavEntry = { path: string; en: string; el?: string; icon: LucideIcon };

export const NAV_ENTRIES: NavEntry[] = [
 { path: '/dashboard', en: 'Dashboard', icon: LayoutDashboard },
 { path: '/messages', en: 'Messages', icon: MessageSquare },
 { path: '/matches', en: 'Matches', icon: Users },
 { path: '/discovery', en: 'Explore', icon: Compass },
 { path: '/network', en: 'Network', icon: Share2 },
 { path: '/mentors', en: 'Mentors', icon: GraduationCap },
 { path: '/communities', en: 'Communities', icon: Globe },
 { path: '/events', en: 'Events', icon: Ticket },
 { path: '/programs', en: 'Programs', icon: Award },
 { path: '/workspace', en: 'Workspace', icon: Briefcase },
 { path: '/founder-tools', en: 'Founder Tools', icon: Rocket },
 { path: '/fundraising', en: 'Fundraising', icon: DollarSign },
 { path: '/milestones', en: 'Milestones', icon: Trophy },
 { path: '/calendar', en: 'Calendar', icon: Calendar },
 { path: '/resources', en: 'Resources', icon: BookOpen },
 { path: '/insights', en: 'Insights', icon: Activity },
 { path: '/legal', en: 'Legal Hub', icon: Scale },
 { path: '/perks', en: 'Startup Perks', icon: Gift },
 { path: '/notifications', en: 'Alerts', icon: Bell },
 { path: '/profile', en: 'My Profile', icon: UserIcon },
 { path: '/settings', en: 'Settings', icon: Settings },
 { path: '/settings/billing', en: 'Billing', icon: CreditCard },
 { path: '/pricing', en: 'Pricing', icon: Gem },
];

export const NAV_PATHS: string[] = NAV_ENTRIES.map((e) => e.path);

export function navEntry(path: string): NavEntry | undefined {
  return NAV_ENTRIES.find((e) => e.path === path);
}

/** Label for a nav path; falls back to the path itself for anything unmapped. */
export function navLabel(path: string): { en: string; el: string } {
  const entry = navEntry(path);
  if (entry) return { en: entry.en, el: entry.el ?? entry.en };
  const en = path.replace(/^\//, '').replace(/\//g, ' · ') || 'Home';
  return { en, el: en };
}

export function navIcon(path: string): LucideIcon {
  return navEntry(path)?.icon ?? Globe;
}
