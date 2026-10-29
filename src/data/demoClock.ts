/**
 * Sample dates that move with today.
 *
 * The sample account showed "Upcoming deadlines · Soon: Apr 15", "upcoming"
 * investor meetings in April 2026 and a data room last updated in spring —
 * while today is later than all of them. Some pages had already switched to
 * relative dates with their own `ahead()` helper, but the assistant still
 * quoted the old fixed dates, so a page and the assistant could disagree about
 * the same item. Every dated sample now takes an offset in days from here.
 */

/** Local calendar day `days` from today, as YYYY-MM-DD. */
export function daysFromToday(days: number, now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** A Date `days` from today at `hour`:00 local time. */
export function atDaysFromToday(days: number, hour: number, now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);
  return d;
}

/** "15 Nov" / "15 Νοε" (with the year when it is not this year) for a YYYY-MM-DD or Date, in a given language. */
export function shortDay(value: string | Date, lang: 'en' | 'el', now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (date.getFullYear() !== now.getFullYear()) options.year = 'numeric';
  return date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', options);
}

/** "Mar 2027" / "Μαρ 2027" for a month `days` from today. */
export function monthFromToday(days: number, lang: 'en' | 'el', now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return d.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { month: 'short', year: 'numeric' });
}
