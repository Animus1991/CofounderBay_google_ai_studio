import type { StudioSession } from './localLists';

export interface MeetingDraft {
  date: string;
  time: string;
  type: string;
  notes: string;
}

/** Store an actual instant, not a bare clock time that Calendar cannot place. */
export function sessionFromMeetingDraft(
  draft: MeetingDraft,
  investor: { id: string; name: string } | undefined,
  id: string,
): { session: StudioSession; error?: never } | { error: 'investor' | 'datetime'; session?: never } {
  if (!investor) return { error: 'investor' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^\d{2}:\d{2}$/.test(draft.time)) {
    return { error: 'datetime' };
  }
  const start = new Date(`${draft.date}T${draft.time}:00`);
  const [year, month, day] = draft.date.split('-').map(Number);
  const [hour, minute] = draft.time.split(':').map(Number);
  if (Number.isNaN(start.getTime()) || start.getFullYear() !== year || start.getMonth() + 1 !== month
    || start.getDate() !== day || start.getHours() !== hour || start.getMinutes() !== minute) {
    return { error: 'datetime' };
  }
  return {
    session: {
      id,
      title: `${draft.type} · ${investor.name}`,
      type: 'Meeting',
      time: start.toISOString(),
      duration: '30m',
      location: draft.type,
      participants: [investor.name],
      priority: 'Medium',
      description: draft.notes.trim() || undefined,
    },
  };
}
