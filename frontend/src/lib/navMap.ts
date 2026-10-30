/**
 * Path → icon + label for every member destination. The sidebar keeps its
 * section grouping; anything that resolves a path to a name or icon (the Pinned
 * group, the UX coach, ⌘K, the assistant) reads this map.
 *
 * Derived from `pageRegistry`, the one description of every page.
 */
import { Globe, type LucideIcon } from 'lucide-react';
import { memberPages, pageEntry } from './pageRegistry';

export type NavEntry = { path: string; en: string; el?: string; icon: LucideIcon };

export const NAV_ENTRIES: NavEntry[] = memberPages().map((entry) => ({
  path: entry.path,
  en: entry.label.en,
  el: entry.label.el,
  icon: entry.icon ?? Globe,
}));

export const NAV_PATHS: string[] = NAV_ENTRIES.map((e) => e.path);

export function navEntry(path: string): NavEntry | undefined {
  return NAV_ENTRIES.find((e) => e.path === path);
}

/** Label for a nav path in both languages; falls back to the path itself for anything unmapped. */
export function navLabel(path: string): { en: string; el: string } {
  const entry = pageEntry(path);
  if (entry) return { en: entry.label.en, el: entry.label.el };
  const en = path.replace(/^\//, '').replace(/\//g, ' · ') || 'Home';
  return { en, el: en };
}

export function navIcon(path: string): LucideIcon {
  return navEntry(path)?.icon ?? Globe;
}
