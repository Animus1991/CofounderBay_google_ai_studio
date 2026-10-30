/**
 * The data-layer rules, checked on the source:
 *
 *  - Account data is named once, in `keys` (lib/localLists). A key spelled out
 *    anywhere else is not cloud-synced, is left behind by "Reset data", and
 *    can be read with a different fallback on another screen — the deal-room
 *    ventures, page usage and both preference lists were all of these.
 *  - Pages, components, services and contexts never spell a storage key; they
 *    go through `keys`, an entity (lib/entities) or a lib helper.
 *  - Server data is read through the query hooks (lib/outreachQueries), not
 *    fetched again by each component.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { keys } from '../lib/localLists';
import { NOT_SYNCED } from '../lib/cloudSync';

const src = path.resolve(__dirname, '..');

function sources(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, files);
    else if (/\.(tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(full);
  }
  return files;
}

/** Keys that belong to the device or the tab, not to an account: never synced, never reset. */
const DEVICE_KEYS: Record<string, string> = {
  'lib/language.tsx': 'cfb.lang — interface language before sign-in',
  'lib/studioApi.ts': 'cfb.deviceId — this browser, for unsigned calls in development',
  'lib/lazyPage.ts': 'cfb.chunkReload — one reload after a deploy',
  'lib/fitCheck.ts': 'cfb.fitCheck — the pre-account copy, moved into the account on sign-in',
  'firebase.ts': 'cfb.firestoreCacheRepair — local cache repair flag',
};

const RAW_KEY = /['"]cfb\.[A-Za-z]/;

describe('data layer', () => {
  it('spells storage keys only in the key registry (and device-level modules)', () => {
    const offenders: string[] = [];
    for (const file of sources(src)) {
      const relative = path.relative(src, file).split(path.sep).join('/');
      if (relative === 'lib/localLists.ts' || relative in DEVICE_KEYS) continue;
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        if (RAW_KEY.test(line) && !/^\s*(\*|\/\/)/.test(line)) offenders.push(`${relative}:${index + 1} ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('gives every account list its own storage key', () => {
    const values = Object.values(keys);
    expect(values.length).toBe(new Set(values).size);
    expect(values.every((key) => key.startsWith('cfb.'))).toBe(true);
  });

  it('keeps device-only data out of cloud sync, and syncs the account preferences', () => {
    expect(NOT_SYNCED.has(keys.usage)).toBe(true);
    expect(NOT_SYNCED.has(keys.assistantPrefs)).toBe(false);
    expect(NOT_SYNCED.has(keys.uxPrefs)).toBe(false);
    expect(NOT_SYNCED.has(keys.dealRoomStartups)).toBe(false);
  });

  it('reads outreach server data through the query hooks', () => {
    const fetchers = /\b(listDDShares|emailStatus|getDigestSettings|digestHistory|emailLog)\(/;
    const offenders = sources(path.join(src, 'components'))
      .concat(sources(path.join(src, 'pages')))
      .filter((file) => fetchers.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(src, file));
    expect(offenders).toEqual([]);
  });
});
