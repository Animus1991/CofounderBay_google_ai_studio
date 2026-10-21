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

/** 13–19 October 2026 · 13–19 Οκτωβρίου 2026 — the seven days starting at `start`. */
export function formatWeekRange(start: When): string {
  const first = toDate(start);
  if (!first) return String(start);
  const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);
  const loc = locale();
  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();
  const leftOptions: Intl.DateTimeFormatOptions = { day: 'numeric' };
  if (!sameMonth) leftOptions.month = 'long';
  if (!sameYear) leftOptions.year = 'numeric';
  return `${first.toLocaleDateString(loc, leftOptions)}–${last.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

const WEEKDAY_EL: Record<string, string> = {
  Sun: 'Κυρ', Mon: 'Δευ', Tue: 'Τρί', Wed: 'Τετ', Thu: 'Πέμ', Fri: 'Παρ', Sat: 'Σάβ',
};

const MONTH_EL: Record<string, string> = {
  Jan: 'Ιαν', Feb: 'Φεβ', Mar: 'Μάρ', Apr: 'Απρ', May: 'Μάι', Jun: 'Ιούν',
  Jul: 'Ιούλ', Aug: 'Αύγ', Sep: 'Σεπ', Oct: 'Οκτ', Nov: 'Νοέ', Dec: 'Δεκ',
};

/**
 * Chart axis label for a canonical English short day or month name — 'Thu' · 'Πέμ'.
 * Chart series keep their English keys so the data stays comparable; only the
 * rendered tick is translated. Pass the active language mode from `useLanguage()`
 * at a call site that must re-render on a language switch.
 */
export function localizeAxisLabel(name: string, mode: 'en' | 'el' = getLang()): string {
  if (mode !== 'el') return name;
  return WEEKDAY_EL[name] ?? MONTH_EL[name] ?? name;
}

/** Short weekday in the active language — 'Thu' · 'Πέμ'. */
export function shortWeekday(value: When): string {
  const date = toDate(value);
  if (!date) return String(value);
  return localizeAxisLabel(date.toLocaleDateString('en-GB', { weekday: 'short' }));
}

/** Time-of-day greeting: 05–11 morning, 12–17 afternoon, otherwise evening. */
export function greetingFor(hour: number): { en: string; el: string } {
  if (hour >= 5 && hour <= 11) return { en: 'Good morning', el: 'Καλημέρα' };
  if (hour >= 12 && hour <= 17) return { en: 'Good afternoon', el: 'Καλό απόγευμα' };
  return { en: 'Good evening', el: 'Καλησπέρα' };
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
