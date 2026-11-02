/**
 * UI consistency rules, checked on the source (round 10):
 *
 *  - Member pages draw a segmented tab strip with lib/segmented, so a selected
 *    tab looks the same on every page (the audit found white, black and
 *    underlined selected tabs). A solid black fill is for the one primary
 *    action, not for a selected tab.
 *  - The demo numbers a page quotes come from one series, so two pages cannot
 *    show two different counts for the same thing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_ACTIVITY, demoWeeklyViews } from '../data/demoStats';
import { DEMO_CONNECTIONS, demoNetworkCounts } from '../data/demoNetwork';

const pages = path.resolve(__dirname, '../pages');
const memberPages = fs
  .readdirSync(pages)
  .filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))
  .map((name) => ({ name, text: fs.readFileSync(path.join(pages, name), 'utf8') }));

describe('ui consistency', () => {
  it('draws member tab strips with the shared segmented style', () => {
    const handRolled = memberPages.filter(({ text }) => text.includes('"scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100"'));
    expect(handRolled.map(({ name }) => name)).toEqual([]);
    // No selected tab painted as a primary button inside a segmented strip.
    const blackTabs = memberPages.filter(({ text }) => /SEGMENT_TRACK[\s\S]{0,900}\? "bg-stone-900 text-white/.test(text));
    expect(blackTabs.map(({ name }) => name)).toEqual([]);
  });

  it('quotes one demo series for profile views and one list for connections', () => {
    expect(demoWeeklyViews()).toBe(DEMO_ACTIVITY.reduce((sum, day) => sum + day.views, 0));
    const dashboard = memberPages.find(({ name }) => name === 'DashboardPage.tsx')!.text;
    // The dashboard chart reads the shared series instead of keeping its own copy.
    expect(dashboard).toMatch(/const ACTIVITY_DATA = DEMO_ACTIVITY\.map/);
    expect(demoNetworkCounts()).toEqual({ connected: 3, sent: 1 });
    expect(demoNetworkCounts().connected + demoNetworkCounts().sent).toBe(DEMO_CONNECTIONS.length);
    const network = memberPages.find(({ name }) => name === 'Network.tsx')!.text;
    expect(network).toContain('DEMO_CONNECTIONS.flatMap');
  });
});
