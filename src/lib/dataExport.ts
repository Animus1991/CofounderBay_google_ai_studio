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

export function exportMyData(profile: unknown) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`cofounderbay-data-${stamp}.json`, buildDataExport(profile));
}
