/**
 * The one write path for "register for an event": the Events page toggle and
 * the assistant go through this. Idempotent (setId, not toggleId) — safe to
 * call with an explicit target state. A registration also adds the event to
 * the calendar list (id evt-<eventId>) the Calendar page reads.
 */
import { addSession, eventListKeys, logActivity, readIds, removeSession, setId } from './localLists';

export type RegistrableEvent = {
  id: string;
  title: string;
  /** Epoch ms when the event's dateTime is machine-readable. */
  startsAt?: number | null;
  date: string;
  time: string;
  location: string;
  organizer: string;
};

export function setEventRegistration(event: RegistrableEvent, on: boolean, opts?: { byAssistant?: boolean }): void {
  const was = readIds(eventListKeys.registered).includes(event.id);
  setId(eventListKeys.registered, event.id, on);
  if (on && !was) {
    addSession({
      id: `evt-${event.id}`,
      title: event.title,
      type: 'Event',
      time: event.startsAt ? new Date(event.startsAt).toISOString() : `${event.date} ${event.time}`,
      duration: event.time,
      location: event.location,
      participants: [event.organizer],
      priority: 'Medium',
    });
    logActivity({ kind: 'event', title: `Registered for ${event.title}`, titleEl: `Εγγραφή: ${event.title}`, href: '/calendar', byAssistant: opts?.byAssistant });
  } else if (!on && was) {
    removeSession(`evt-${event.id}`);
  }
}
