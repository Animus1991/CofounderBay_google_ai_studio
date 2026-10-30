import { describe, expect, it } from 'vitest';
import { PAGE_REGISTRY } from '../lib/pageRegistry';
import { WHERE_IS, whereIsResult } from './whereIs';

const routes = new Set(PAGE_REGISTRY.map((page) => page.path));

describe('where is', () => {
  it('links only to real pages, and to tabs those pages read from the URL', () => {
    const tabbed: Record<string, string[]> = {
      '/settings': ['notifications', 'privacy', 'billing'],
      '/network': ['saved', 'needs', 'endorsements', 'compare'],
      '/fundraising': ['tracker', 'investors', 'programs', 'opportunities'],
      '/founder-tools': ['builder', 'pitch', 'applications', 'tools', 'templates'],
    };
    for (const spot of WHERE_IS) {
      if (!spot.href) continue;
      const url = new URL(spot.href, 'https://studio.test');
      expect(routes.has(url.pathname), spot.id).toBe(true);
      const tab = url.searchParams.get('tab');
      if (tab) expect(tabbed[url.pathname], spot.id).toContain(tab);
    }
  });

  it('points to the place, not just the page', () => {
    const pitch = whereIsResult('Where do I export my pitch deck?');
    expect(pitch?.href).toBe('/founder-tools?tab=pitch');
    expect(pitch?.en).toMatch(/Export PDF/);
    expect(whereIsResult('How do I change my notification emails?')?.href).toBe('/settings?tab=notifications');
    expect(whereIsResult('where can I upload documents for investors')?.href).toBe('/fundraising');
    expect(whereIsResult('Where do I set the next step with an investor?')?.href).toBe('/fundraising?tab=tracker');
  });

  it('understands Greek', () => {
    expect(whereIsResult('Πού κάνω εξαγωγή του pitch deck;')?.href).toBe('/founder-tools?tab=pitch');
    expect(whereIsResult('Πού αλλάζω το θέμα;')?.en).toMatch(/palette/);
    expect(whereIsResult('Πού βρίσκω τις κάρτες ανάγκης;')?.href).toBe('/network?tab=needs');
  });

  it('stays out of questions that are not about the studio', () => {
    expect(whereIsResult('Where is Sarah Chen based?')).toBeNull();
    expect(whereIsResult('Who is my best match?')).toBeNull();
  });
});
