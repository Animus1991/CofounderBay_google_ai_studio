/**
 * One look for every segmented tab strip (round 10).
 *
 * The audit found three tab styles: a white selected pill (Fundraising, Founder
 * Tools, Network, Resources, Communities, Calendar, Workspace), a black
 * selected pill (Events, Programs, Perks, Legal, the Insights range) and an
 * underline (Discovery). Following GitHub's Primer logic, a solid dark fill
 * means "primary action" — a selected tab is a state, not an action, so it is
 * the raised white segment everywhere and black stays for the one primary
 * button. Unselected text is stone-500 (AA), not stone-400. Sizes are left to
 * each strip (no type changes).
 */
export const SEGMENT_TRACK = 'scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100';

export const segmentItem = (active: boolean) =>
  active ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200' : 'text-stone-500 hover:text-stone-900 hover:bg-white';

/** The small count after a tab label. */
export const segmentCount = (active: boolean) => (active ? 'bg-stone-100 text-stone-700' : 'bg-stone-200/70 text-stone-600');
