/**
 * Up to three co-founder candidates side by side (adapted from cofoundersbay's
 * /matches/compare). Every number is the scorer Matches, the score breakdown
 * and the assistant already use (lib/compatibility): no new weights, nothing
 * estimated. A row lines one dimension up across the people and names who
 * leads it; a tie for first, or a dimension fewer than two people have data
 * for, has no leader rather than a guessed one.
 */
import { compatibility, fromCast, type Bilingual, type Compatibility, type CompatibilityInput, type DimensionKey } from './compatibility';

export const MAX_COMPARE = 3;

export type CompareColumn<T> = { person: T; fit: Compatibility };
export type CompareRow = { key: 'overall' | DimensionKey; label: Bilingual; scores: (number | null)[]; leader: number | null };
export type Comparison<T> = { columns: CompareColumn<T>[]; rows: CompareRow[]; summary: Bilingual };

type Comparable = Parameters<typeof fromCast>[0] & { fullName: string };

/** Index of the one highest score; null on a tie for first or with fewer than two scored. */
export function leaderOf(scores: readonly (number | null)[]): number | null {
  const scored = scores.flatMap((score, index) => (score == null ? [] : [{ score, index }]));
  if (scored.length < 2) return null;
  const top = Math.max(...scored.map((item) => item.score));
  const first = scored.filter((item) => item.score === top);
  return first.length === 1 ? (first[0]?.index ?? null) : null;
}

const joinEn = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const joinEl = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} και ${items[items.length - 1]}`);
const firstName = (person: Comparable) => person.fullName.split(' ')[0] || person.fullName;

function summarize<T extends Comparable>(columns: CompareColumn<T>[], rows: CompareRow[]): Bilingual {
  if (columns.length < 2) return { en: 'Pick at least two people to compare.', el: 'Διάλεξε τουλάχιστον δύο άτομα για σύγκριση.' };
  const [overall, ...dimensions] = rows;
  const leads = columns.map((_, index) => dimensions.filter((row) => row.leader === index).map((row) => row.label));
  const en: string[] = [];
  const el: string[] = [];
  const top = overall?.leader ?? null;
  if (top != null) {
    const person = columns[top]?.person;
    const lead = leads[top] ?? [];
    if (person) {
      en.push(`${firstName(person)} has the highest overall match at ${overall?.scores[top]}%${lead.length ? `, leading on ${joinEn(lead.map((l) => l.en.toLowerCase()))}` : ''}.`);
      el.push(`${firstName(person)}: η υψηλότερη συνολική αντιστοίχιση, ${overall?.scores[top]}%${lead.length ? `, με προβάδισμα σε ${joinEl(lead.map((l) => l.el.toLowerCase()))}` : ''}.`);
    }
  } else {
    en.push('No one leads overall: the top scores are level or missing.');
    el.push('Κανείς δεν προηγείται συνολικά: τα κορυφαία σκορ είναι ισόπαλα ή λείπουν.');
  }
  columns.forEach((column, index) => {
    const lead = leads[index] ?? [];
    if (index === top || lead.length === 0) return;
    en.push(`${firstName(column.person)} leads on ${joinEn(lead.map((l) => l.en.toLowerCase()))}.`);
    el.push(`${firstName(column.person)}: προβάδισμα σε ${joinEl(lead.map((l) => l.el.toLowerCase()))}.`);
  });
  return { en: en.join(' '), el: el.join(' ') };
}

export function compareCandidates<T extends Comparable>(me: CompatibilityInput, people: readonly T[]): Comparison<T> {
  const columns = people.slice(0, MAX_COMPARE).map((person) => ({ person, fit: compatibility(me, fromCast(person)) }));
  const overallScores = columns.map((column) => column.fit.score);
  const rows: CompareRow[] = [
    { key: 'overall', label: { en: 'Overall match', el: 'Συνολική αντιστοίχιση' }, scores: overallScores, leader: leaderOf(overallScores) },
  ];
  for (const dimension of columns[0]?.fit.dimensions ?? []) {
    const scores = columns.map((column) => column.fit.dimensions.find((d) => d.key === dimension.key)?.score ?? null);
    rows.push({ key: dimension.key, label: dimension.label, scores, leader: leaderOf(scores) });
  }
  return { columns, rows, summary: summarize(columns, rows) };
}
