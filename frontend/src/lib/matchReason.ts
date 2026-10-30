import { getLang } from './language';

type Named = { name?: string | null };
type SkillInput = string | Named | null | undefined;
type ListInput = SkillInput | SkillInput[] | null | undefined;

export type MatchExplanation = {
  pct: number | null;
  reasonPhrase: string | null;
};

function normalizeToken(value: unknown): string | null {
  let raw = '';
  if (typeof value === 'string') raw = value;
  else if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as Named).name;
    if (typeof name === 'string') raw = name;
  }
  const token = raw.toLowerCase().trim();
  return token ? token : null;
}

/** Strings and `{ name }` objects, lowercased and trimmed, duplicates dropped. */
export function normalizeList(value: ListInput): string[] {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const token = normalizeToken(item);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

function overlap(mine: string[], theirs: string[]): number {
  if (mine.length === 0 || theirs.length === 0) return 0;
  const theirsSet = new Set(theirs);
  return mine.filter((item) => theirsSet.has(item)).length;
}

/** Joins the shared causes, or null when nothing is shared. */
export function reasonPhrase(sharedSkills: number, sharedIndustries: number): string | null {
  const en: string[] = [];
  const el: string[] = [];
  if (sharedSkills > 0) {
    en.push('Same skills');
    el.push('ίδιες δεξιότητες');
  }
  if (sharedIndustries > 0) {
    en.push('Same industry');
    el.push('ίδιος κλάδος');
  }
  if (en.length === 0) return null;
  return (getLang() === 'el' ? el : en).join(', ');
}

/**
 * Same overlap the discovery sort uses: shared skills plus shared industries,
 * after normalizing strings and `{ name }` objects.
 */
export function explainMatch(
  mineSkills: ListInput,
  mineIndustry: ListInput,
  theirSkills: ListInput,
  theirIndustry: ListInput,
): MatchExplanation {
  const mySkills = normalizeList(mineSkills);
  const myIndustries = normalizeList(mineIndustry);
  const theirSkillList = normalizeList(theirSkills);
  const theirIndustryList = normalizeList(theirIndustry);

  const bothEmpty =
    mySkills.length === 0 &&
    myIndustries.length === 0 &&
    theirSkillList.length === 0 &&
    theirIndustryList.length === 0;
  if (bothEmpty) {
    return { pct: null, reasonPhrase: null };
  }

  const sharedSkills = overlap(mySkills, theirSkillList);
  const sharedIndustries = overlap(myIndustries, theirIndustryList);
  const mineCount = Math.max(mySkills.length + myIndustries.length, 1);
  const pct = Math.min(100, Math.round(((sharedSkills + sharedIndustries) / mineCount) * 100));

  return { pct, reasonPhrase: reasonPhrase(sharedSkills, sharedIndustries) };
}
