import type { Milestone } from '../types';
import type { Round } from './localLists';

type Lang = 'en' | 'el';

/** A whole euro amount the way a founder writes it; zero is "not set", never a figure. */
const money = (value: number) => `€${Math.round(value).toLocaleString('en-GB')}`;

/**
 * A first draft of a monthly investor update, from the round and the milestones.
 *
 * Every line comes from a stored field and a line with nothing behind it is left
 * out: an update that invents a number is worse than a short one. The founder
 * edits the text before anything leaves the page.
 */
export function draftInvestorUpdate(input: { venture: string; round: Round; milestones: Milestone[]; lang: Lang; now?: Date }): string {
  const { venture, round, milestones, lang } = input;
  const el = lang === 'el';
  const now = input.now ?? new Date();
  const month = now.toLocaleDateString(el ? 'el-GR' : 'en-GB', { month: 'long', year: 'numeric' });
  const lines: string[] = [`# ${el ? 'Ενημέρωση επενδυτών' : 'Investor update'}: ${venture || (el ? 'το εγχείρημά μας' : 'our venture')}`, month, ''];

  const roundLines: string[] = [];
  if (round.targetAmount > 0) {
    roundLines.push(el
      ? `- Δεσμεύσεις: ${money(round.committedAmount)} από ${money(round.targetAmount)}`
      : `- Committed: ${money(round.committedAmount)} of ${money(round.targetAmount)}`);
  }
  if (round.monthlyBurn > 0 && round.cashOnHand > 0) {
    const months = Math.floor(round.cashOnHand / round.monthlyBurn);
    roundLines.push(el ? `- Runway: περίπου ${months} μήνες` : `- Runway: about ${months} months`);
  }
  if (round.closeDate) roundLines.push(el ? `- Στόχος κλεισίματος: ${round.closeDate}` : `- Target close: ${round.closeDate}`);
  if (roundLines.length) lines.push(`## ${el ? 'Ο γύρος' : 'The round'}`, ...roundLines, '');

  const done = milestones.filter((item) => item.status === 'Completed').slice(0, 5);
  if (done.length) lines.push(`## ${el ? 'Τι ολοκληρώθηκε' : 'What we finished'}`, ...done.map((item) => `- ${item.title}`), '');

  const open = milestones
    .filter((item) => item.status !== 'Completed')
    .sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate)))
    .slice(0, 3);
  if (open.length) lines.push(`## ${el ? 'Τι ακολουθεί' : 'What is next'}`, ...open.map((item) => `- ${item.title}`), '');

  lines.push(`## ${el ? 'Πώς μπορείτε να βοηθήσετε' : 'How you can help'}`, el ? '- Γράψε εδώ τι χρειάζεσαι από τους επενδυτές σου.' : '- Write here what you need from your investors.');
  return lines.join('\n');
}
