import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAGE_ALIASES, PAGE_REGISTRY, assistantPages, memberPages, pageEntry, pageTitle } from './pageRegistry';
import { NAV_ENTRIES, navLabel } from './navMap';
import { pageHelp } from './navHelp';

const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
const declaredRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1]!)
  .filter((route) => route !== '*' && !route.includes(':'));

describe('page registry', () => {
  it('describes every route the app declares (directly or as an alias)', () => {
    expect(declaredRoutes.length).toBeGreaterThan(30);
    const missing = declaredRoutes.filter((route) => !pageEntry(route));
    expect(missing).toEqual([]);
  });

  it('has no entry for a route the app does not declare', () => {
    const declared = new Set(declaredRoutes);
    const stale = PAGE_REGISTRY.map((entry) => entry.path).filter((route) => !declared.has(route));
    expect(stale).toEqual([]);
    for (const target of Object.values(PAGE_ALIASES)) expect(pageEntry(target), target).toBeDefined();
  });

  it('names every page in both languages, once', () => {
    const paths = PAGE_REGISTRY.map((entry) => entry.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const entry of PAGE_REGISTRY) {
      expect(entry.label.en.trim(), entry.path).not.toBe('');
      expect(entry.label.el.trim(), entry.path).not.toBe('');
      expect(pageTitle(entry.path), entry.path).toBeDefined();
    }
  });

  it('gives pinned pages and the assistant Greek names, not English fallbacks', () => {
    expect(navLabel('/insights')).toEqual({ en: 'Insights', el: 'Αναλύσεις' });
    expect(navLabel('/discovery').el).toBe('Εξερεύνηση');
    for (const entry of NAV_ENTRIES) expect(entry.el, entry.path).toBeTruthy();
  });

  it('explains every member page before it opens', () => {
    for (const entry of memberPages()) expect(pageHelp(entry.path), entry.path).toBeTruthy();
  });

  it('keeps the assistant page table in its matching order', () => {
    expect(assistantPages().map((page) => page.href).slice(0, 8)).toEqual([
      '/dashboard', '/matches', '/discovery', '/mentors', '/messages', '/milestones', '/fundraising', '/calendar',
    ]);
    expect(assistantPages().some((page) => page.href === '/assistant')).toBe(true);
  });
});
