import { describe, expect, it } from 'vitest';
import { helpEntries } from './assistantHelp';
import { memberPages, pageEntry } from './pageRegistry';

describe('assistantHelp', () => {
  it('answers for every member page that has a description', () => {
    const entries = helpEntries();
    const withHelp = memberPages().filter((page) => page.help);
    const hrefs = new Set(entries.map((entry) => entry.href).filter(Boolean));
    for (const page of withHelp) {
      expect(hrefs.has(page.path), `help entry missing for ${page.path}`).toBe(true);
    }
  });

  it('keeps the assistant’s own questions first and gives every entry both languages', () => {
    const entries = helpEntries();
    expect(entries.length).toBeGreaterThan(memberPages().length);
    expect(entries[0]?.id).toBe('what-changes');
    for (const entry of entries) {
      expect(entry.q.en.length).toBeGreaterThan(0);
      expect(entry.q.el.length).toBeGreaterThan(0);
      expect(entry.a.en.length).toBeGreaterThan(0);
      expect(entry.a.el.length).toBeGreaterThan(0);
    }
  });

  it('has unique ids and links only to pages that exist', () => {
    const entries = helpEntries();
    const ids = new Set(entries.map((entry) => entry.id));
    expect(ids.size).toBe(entries.length);
    for (const entry of entries) {
      if (entry.href) expect(pageEntry(entry.href), `unknown page ${entry.href}`).toBeTruthy();
    }
  });

  it('reuses the page’s own description as the answer', () => {
    const calendar = memberPages().find((page) => page.path === '/calendar');
    const entry = helpEntries().find((item) => item.href === '/calendar');
    expect(entry?.a.en).toBe(calendar?.help?.en);
    expect(entry?.a.el).toBe(calendar?.help?.el);
  });
});
