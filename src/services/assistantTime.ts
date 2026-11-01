/**
 * Clock-time parsing for the assistant, on the same folded text as the rest of
 * the router. Returns the parsed hour/minute plus the span in the folded text
 * so callers can strip the phrase from a title, like parseDay's DayMatch.
 *
 * Accepted: "3pm", "3 pm", "3:30pm", "15:00", "15.30", "at 15", "at 3pm",
 * «στις 3», «στις 15:30», «3μμ», «3 μ.μ.», «10πμ», «10 π.μ.».
 * A bare hour 1–7 (EN "at 3", EL «στις 3») reads as business hours → +12;
 * 8–12 stays. Dates ("14/11", "2026-11-05") and amounts ("$500k", "3 days")
 * are not times.
 */
export type TimeMatch = { hours: number; minutes: number; start: number; end: number };

const HM = /(?:^|[^\d])(\d{1,2})[:.](\d{2})\s*(πμ|μμ|π\.μ\.|μ\.μ\.|am|pm)?(?![\dα-ωa-z])/g;
const SUFFIX = /(?:^|[^\d:])(\d{1,2})\s*(πμ|μμ|π\.μ\.|μ\.μ\.|am|pm)(?![\dα-ωa-z.])/g;
const BARE = /(?:^|[^\d])(?:at|στις|stis)\s+(\d{1,2})(?![\d:.α-ωa-z])/g;

const isDateContext = (folded: string, index: number): boolean => {
  const around = folded.slice(Math.max(0, index - 3), index + 12);
  return /\d{1,2}\/\d{1,2}/.test(around) || /\d{4}-\d{2}-\d{2}/.test(around);
};

const isAmountContext = (folded: string, index: number): boolean => {
  const before = folded.slice(Math.max(0, index - 3), index);
  const after = folded.slice(index, index + 12);
  return /[$€£]\s*$/.test(before) || /^\s*\d*\s*(k|m|days?|ημερ|μερες|hours?|ωρες|leads?|users?|members?)/.test(after);
};

function toTime(hour: number, minutes: number, suffix: string | undefined, bare: boolean): Omit<TimeMatch, 'start' | 'end'> | null {
  if (minutes > 59 || hour > 24) return null;
  let h = hour;
  if (suffix) {
    const pm = /μμ|μ\.μ\.|pm/.test(suffix);
    if (h > 12) return null;
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  } else if (bare) {
    // Business-hours reading: "at 3" / «στις 3» means 15:00; 8–12 stays.
    if (h >= 1 && h <= 7) h += 12;
    if (h > 23) return null;
  }
  if (h > 23) return null;
  return { hours: h, minutes };
}

export function parseTime(folded: string): TimeMatch | null {
  for (const match of folded.matchAll(SUFFIX)) {
    const index = match.index + match[0].indexOf(match[1] ?? '');
    if (isAmountContext(folded, index)) continue;
    const t = toTime(Number(match[1]), 0, match[2], false);
    if (t) return { ...t, start: index, end: index + match[0].length - match[0].indexOf(match[1] ?? '') };
  }
  for (const match of folded.matchAll(HM)) {
    const index = match.index + match[0].indexOf(match[1] ?? '');
    if (isDateContext(folded, index) || isAmountContext(folded, index)) continue;
    const t = toTime(Number(match[1]), Number(match[2]), match[3], false);
    if (t) return { ...t, start: index, end: index + match[0].length - match[0].indexOf(match[1] ?? '') };
  }
  for (const match of folded.matchAll(BARE)) {
    const index = match.index;
    if (isDateContext(folded, index) || isAmountContext(folded, index)) continue;
    const t = toTime(Number(match[1]), 0, undefined, true);
    if (t) return { ...t, start: index, end: index + match[0].length };
  }
  return null;
}
