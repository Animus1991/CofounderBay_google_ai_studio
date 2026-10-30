/** Search keys a founder can type. English and Greek map onto the same five fields. */

export type QualifierKey = 'role' | 'location' | 'skill' | 'industry' | 'stage';

export type ParsedQualifiers = {
  text: string;
  filters: Partial<Record<QualifierKey, string>>;
};

const KEY_ALIASES: Record<string, QualifierKey> = {
  role: 'role',
  location: 'location',
  loc: 'location',
  skill: 'skill',
  skills: 'skill',
  industry: 'industry',
  stage: 'stage',
  ρόλος: 'role',
  ρολος: 'role',
  τόπος: 'location',
  τοπος: 'location',
  τοποθεσία: 'location',
  τοποθεσια: 'location',
  δεξιότητα: 'skill',
  δεξιοτητα: 'skill',
  κλάδος: 'industry',
  κλαδος: 'industry',
  στάδιο: 'stage',
  σταδιο: 'stage',
};

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const QUALIFIER_RE = /(?:^|\s)([A-Za-zΑ-Ωα-ωΆ-Ώά-ώϊΐϋΰ]+)\s*:\s*(?:"([^"]+)"|'([^']+)'|(\S+))/g;

export function parseQualifiers(input: string): ParsedQualifiers {
  const filters: Partial<Record<QualifierKey, string>> = {};
  let text = input;
  const re = new RegExp(QUALIFIER_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) {
    const key = KEY_ALIASES[fold(match[1] || '')];
    const value = (match[2] || match[3] || match[4] || '').replace(/[.,;]+$/, '').trim();
    if (!key || !value) continue;
    filters[key] = value;
    text = text.replace(match[0], ' ');
  }
  return { text: text.replace(/\s+/g, ' ').trim(), filters };
}

export type QualifierFields = {
  role?: string;
  location?: string;
  skills?: string[];
  industry?: string | string[];
  stage?: string;
};

function hay(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return fold(value.join(' '));
  return fold(value || '');
}

export function matchesQualifiers(fields: QualifierFields, filters: Partial<Record<QualifierKey, string>>): boolean {
  if (filters.role && !hay(fields.role).includes(fold(filters.role))) return false;
  if (filters.location && !hay(fields.location).includes(fold(filters.location))) return false;
  if (filters.skill && !hay(fields.skills).includes(fold(filters.skill))) return false;
  if (filters.industry && !hay(fields.industry).includes(fold(filters.industry))) return false;
  if (filters.stage && !hay(fields.stage).includes(fold(filters.stage))) return false;
  return true;
}

export function applyQualifiers<T>(
  items: T[],
  filters: Partial<Record<QualifierKey, string>>,
  pick: (item: T) => QualifierFields,
): T[] {
  if (!filters.role && !filters.location && !filters.skill && !filters.industry && !filters.stage) return items;
  return items.filter((item) => matchesQualifiers(pick(item), filters));
}

export const QUALIFIER_HINT_EN = 'role:Founder location:"Athens" skill:TypeScript';
export const QUALIFIER_HINT_EL = 'ρόλος:Founder τόπος:"Αθήνα" δεξιότητα:TypeScript';
