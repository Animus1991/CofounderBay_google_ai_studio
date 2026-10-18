/** Dates and clock times in the active language. Clocks are 24-hour in both languages. */
import { getLang } from './language';

type When = Date | string | number;

const locale = () => (getLang() === 'el' ? 'el-GR' : 'en-GB');

function toDate(value: When): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 16 Oct 2026 · 16 Οκτ 2026 */
export function formatDate(
  value: When,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString(locale(), options) : String(value);
}

/** 07:00 */
export function formatTime(value: When): string {
  const date = toDate(value);
  return date ? date.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : String(value);
}

/** Thu 15 October 2026, 15:42 · Πέμ 15 Οκτωβρίου 2026, 15:42 */
export function formatDateTime(value: When): string {
  const date = toDate(value);
  if (!date) return String(value);
  const day = date.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  return `${day}, ${formatTime(date)}`;
}

/** Today, 07:00 · Tomorrow, 07:00 · Sat 18 Oct, 07:00 — and the Greek equivalents. */
export function formatWhen(value: When, now: When = Date.now()): string {
  const date = toDate(value);
  const today = toDate(now);
  if (!date || !today) return String(value);
  const dayIndex = (d: Date) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
  const diff = dayIndex(date) - dayIndex(today);
  const el = getLang() === 'el';
  const day =
    diff === 0 ? (el ? 'Σήμερα' : 'Today')
      : diff === 1 ? (el ? 'Αύριο' : 'Tomorrow')
        : diff === -1 ? (el ? 'Χθες' : 'Yesterday')
          : date.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${formatTime(date)}`;
}
