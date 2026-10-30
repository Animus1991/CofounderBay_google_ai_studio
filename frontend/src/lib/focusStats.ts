/** Today's focus-timer totals — shared by Workspace and the assistant. */
import { keys, readValue, writeValue } from './localLists';

export type FocusStats = { date: string; seconds: number; sessions: number };

export const todayKey = () => new Date().toISOString().slice(0, 10);

export function readFocusToday(): FocusStats {
  const stats = readValue<FocusStats>(keys.focus, { date: todayKey(), seconds: 0, sessions: 0 });
  return stats && stats.date === todayKey() ? stats : { date: todayKey(), seconds: 0, sessions: 0 };
}

export function addFocusSession(minutes = 25): FocusStats {
  const stats = readFocusToday();
  const next = { date: todayKey(), seconds: stats.seconds + minutes * 60, sessions: stats.sessions + 1 };
  writeValue(keys.focus, next);
  return next;
}
