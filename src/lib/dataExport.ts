import { keys, readRawValue } from './localLists';
import { downloadJson } from './download';

export type DataExportPayload = {
  exportedAt: string;
  profile: unknown;
  lists: Record<string, unknown>;
};

function parseStored(raw: string | null): unknown {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** The GDPR payload: the profile plus every registered local list of the account. */
export function buildDataExport(profile: unknown, at = new Date()): DataExportPayload {
  const lists: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(keys)) {
    lists[name] = parseStored(readRawValue(key));
  }
  return { exportedAt: at.toISOString(), profile: profile ?? null, lists };
}

/** Parts of the export a reader can ask for alone. Every list stays in the full export. */
export const EXPORT_GROUPS = [
  { id: 'network', en: 'Network', el: 'Δίκτυο', lists: ['saved', 'requests', 'follow', 'mentors', 'watch', 'hiddenPeople', 'blockedPeople'] },
  { id: 'venture', en: 'Venture', el: 'Εγχείρημα', lists: ['startup', 'builder', 'builderInputs', 'pitch', 'canvas', 'milestones', 'tasks', 'venture', 'assets', 'tracked', 'savedResources', 'completedCourses'] },
  { id: 'fundraising', en: 'Fundraising', el: 'Χρηματοδότηση', lists: ['round', 'investors', 'room', 'dueDiligence', 'capTable'] },
  { id: 'calendar', en: 'Calendar and events', el: 'Ημερολόγιο και εκδηλώσεις', lists: ['sessions', 'registered', 'bookmarked'] },
  { id: 'assistant', en: 'Assistant', el: 'Βοηθός', lists: ['assistant', 'aiChats', 'assistantFeedback', 'plan'] },
] as const satisfies ReadonlyArray<{ id: string; en: string; el: string; lists: ReadonlyArray<keyof typeof keys> }>;

export type ExportGroupId = (typeof EXPORT_GROUPS)[number]['id'];

/** One group's lists; the profile belongs to the full export. */
export function buildGroupExport(id: ExportGroupId, at = new Date()): Omit<DataExportPayload, 'profile'> & { group: ExportGroupId } {
  const group = EXPORT_GROUPS.find((item) => item.id === id);
  const lists: Record<string, unknown> = {};
  for (const name of group?.lists ?? []) lists[name] = parseStored(readRawValue(keys[name]));
  return { exportedAt: at.toISOString(), group: id, lists };
}

export function exportGroup(id: ExportGroupId) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`cofounderbay-${id}-${stamp}.json`, buildGroupExport(id));
}

export function exportMyData(profile: unknown) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`cofounderbay-data-${stamp}.json`, buildDataExport(profile));
}
