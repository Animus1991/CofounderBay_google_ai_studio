/**
 * One colour per meaning, for every status label in the app (round 9).
 *
 * The audit found the same status in three colours: "In progress" was blue on
 * Milestones, violet on Workspace and amber in Founder Tools; a Meeting was
 * blue on Calendar and violet on Workspace; a Mentorship violet on one and
 * amber on the other. Colour only helps if it means the same thing on every
 * page, so the meaning → tone map lives here and pages read it.
 *
 * The classes follow GitHub's Primer "Label" logic (docs/COLOR_SYSTEM.md): a
 * subtle tint for the background, the family's muted colour for the border and
 * its foreground colour for the text — all role tokens, so every theme
 * (including Dark Obsidian) re-colours them and the AA checks hold.
 */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'accent';

export type ToneClasses = {
  /** Label: subtle background + muted border + foreground text (add `border`). */
  label: string;
  /** Background tint only (Primer `bgColor-*-muted`/subtle). */
  subtle: string;
  /** Text only, for a status word set inline. */
  text: string;
  /** A small dot or bar fill. */
  dot: string;
  /** Icon tile: subtle background + foreground icon, no border. */
  tile: string;
};

export const TONE_CLASSES: Record<Tone, ToneClasses> = {
  neutral: { label: 'bg-stone-50 text-stone-600 border-stone-200', subtle: 'bg-stone-50', text: 'text-stone-500', dot: 'bg-stone-400', tile: 'bg-stone-100 text-stone-500' },
  success: { label: 'bg-emerald-50 text-emerald-700 border-emerald-200', subtle: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', tile: 'bg-emerald-50 text-emerald-700' },
  warning: { label: 'bg-amber-50 text-amber-800 border-amber-200', subtle: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', tile: 'bg-amber-50 text-amber-700' },
  danger: { label: 'bg-red-50 text-red-700 border-red-200', subtle: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', tile: 'bg-red-50 text-red-700' },
  info: { label: 'bg-blue-50 text-blue-700 border-blue-200', subtle: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', tile: 'bg-blue-50 text-blue-700' },
  ai: { label: 'bg-violet-50 text-violet-700 border-violet-200', subtle: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', tile: 'bg-violet-50 text-violet-700' },
  accent: { label: 'bg-[var(--cfb-accent-soft)] text-primary border-[var(--cfb-accent-border)]', subtle: 'bg-[var(--cfb-accent-soft)]', text: 'text-primary', dot: 'bg-stone-900', tile: 'bg-[var(--cfb-accent-soft)] text-primary' },
};

const key = (status: string) => status.toLowerCase().replace(/[\s_-]+/g, '');

const STATUS_TONES: Record<string, Tone> = {
  // Finished, accepted, agreed, working.
  completed: 'success', complete: 'success', done: 'success', accepted: 'success', approved: 'success', connected: 'success', registered: 'success', paid: 'success', resolved: 'success', active: 'success', verified: 'success', confirmed: 'success', enabled: 'success', executed: 'success', success: 'success',
  // Moving.
  inprogress: 'info', submitted: 'info', scheduled: 'info', open: 'info', sent: 'info', running: 'info', filling: 'info', suggested: 'info',
  // Waiting on someone, or slipping.
  review: 'warning', inreview: 'warning', reviewing: 'warning', pending: 'warning', delayed: 'warning', atrisk: 'warning', waiting: 'warning', outgoing: 'warning', trial: 'warning', trialing: 'warning', lastcall: 'warning',
  // Late, refused, broken.
  overdue: 'danger', rejected: 'danger', declined: 'danger', failed: 'danger', failure: 'danger', blocked: 'danger', cancelled: 'danger', canceled: 'danger', pastdue: 'danger', suspended: 'danger', banned: 'danger', uncollectible: 'danger',
  // Not started, or no longer in play.
  planned: 'neutral', todo: 'neutral', draft: 'neutral', notstarted: 'neutral', backlog: 'neutral', idle: 'neutral', inactive: 'neutral', paused: 'neutral', disabled: 'neutral', closed: 'neutral', archived: 'neutral', expired: 'neutral', void: 'neutral', none: 'neutral', ignored: 'neutral', dismissed: 'neutral',
};

/** The tone of a status word, in any casing or separator ("In Progress", "in-progress", "IN_PROGRESS"). */
export function statusTone(status: string | null | undefined): Tone {
  return (status && STATUS_TONES[key(status)]) || 'neutral';
}

const EVENT_TONES: Record<string, Tone> = { meeting: 'info', deadline: 'danger', mentorship: 'ai' };

/** Calendar entry types: the same colour on Calendar (chips and dots) and Workspace; events and the rest are green. */
export function eventTone(type: string | null | undefined): Tone {
  return (type && EVENT_TONES[key(type)]) || 'success';
}
