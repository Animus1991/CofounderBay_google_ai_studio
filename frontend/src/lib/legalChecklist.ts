/** The Legal Hub compliance checklist — one definition for the page and the assistant. */
import { isDemoData, keys, readValue, writeValue } from './localLists';

export const LEGAL_CHECKLIST = [
  { id: 'incorporate', en: 'Incorporate the legal entity', el: 'Σύσταση της νομικής οντότητας', aliases: ['incorporat', 'entity', 'συσταση', 'οντοτητ'] },
  { id: 'ip', en: 'Assign all IP to the company', el: 'Ανάθεση όλης της IP στην εταιρεία', aliases: ['ip', 'intellectual', 'πνευματικ'] },
  { id: 'ein', en: 'Obtain Employer Identification Number (EIN)', el: 'Απόκτηση EIN', aliases: ['ein', 'tax id', 'employer identification', 'αφμ'] },
  { id: 'bank', en: 'Open a business bank account', el: 'Άνοιγμα επαγγελματικού λογαριασμού', aliases: ['bank', 'τραπεζ', 'λογαριασμ'] },
  { id: 'vesting', en: 'Draft and sign Founder Vesting agreements', el: 'Σύνταξη και υπογραφή συμφωνιών vesting ιδρυτών', aliases: ['vesting', 'κατοχυρωσ'] },
] as const;

export type LegalItemId = (typeof LEGAL_CHECKLIST)[number]['id'];

const DEMO_DONE: readonly string[] = ['incorporate', 'ip'];

export function readLegalChecklist(): Record<string, boolean> {
  const stored = readValue<Record<string, boolean>>(keys.legalChecklist, {});
  return stored && typeof stored === 'object' ? stored : {};
}

/** Demo accounts start with the first two done unless the founder explicitly unticked them. */
export function isLegalDone(id: string, stored = readLegalChecklist()): boolean {
  if (id in stored) return stored[id] === true;
  return isDemoData() && DEMO_DONE.includes(id);
}

export function setLegalItem(id: string, done: boolean): Record<string, boolean> {
  const next = { ...readLegalChecklist(), [id]: done };
  writeValue(keys.legalChecklist, next);
  return next;
}

export function legalProgress(): { done: number; total: number; next?: (typeof LEGAL_CHECKLIST)[number] } {
  const stored = readLegalChecklist();
  const done = LEGAL_CHECKLIST.filter((item) => isLegalDone(item.id, stored)).length;
  return { done, total: LEGAL_CHECKLIST.length, next: LEGAL_CHECKLIST.find((item) => !isLegalDone(item.id, stored)) };
}
