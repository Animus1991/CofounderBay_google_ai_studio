/**
 * A small document store for the server's own records (due-diligence links,
 * the email log, digest settings and snapshots).
 *
 * Default: one JSON file per collection under OUTREACH_DATA_DIR (default
 * `.data/`), written atomically (temp file + rename) shortly after a change.
 * Tests use the in-memory store. A production deployment on an ephemeral
 * filesystem (Cloud Run, serverless) should give OUTREACH_DATA_DIR a mounted
 * volume or swap in a database behind the same four methods — the routes only
 * use `all`, `insert`, `update` and `remove`.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type Doc = Record<string, unknown>;

export interface Store {
  all<T extends Doc>(collection: string): T[];
  insert<T extends Doc>(collection: string, doc: T, options?: { cap?: number }): T;
  /** Applies `patch` to every document `match` accepts; returns the updated ones. */
  update<T extends Doc>(collection: string, match: (doc: T) => boolean, patch: (doc: T) => Partial<T>): T[];
  remove<T extends Doc>(collection: string, match: (doc: T) => boolean): number;
}

export function memoryStore(): Store {
  const data = new Map<string, Doc[]>();
  const list = (name: string) => data.get(name) ?? (data.set(name, []), data.get(name)!);
  return {
    all: <T extends Doc>(name: string) => list(name) as T[],
    insert(name, doc, options) {
      const items = list(name);
      items.push(doc);
      if (options?.cap && items.length > options.cap) items.splice(0, items.length - options.cap);
      return doc;
    },
    update(name, match, patch) {
      const changed: Doc[] = [];
      const items = list(name);
      items.forEach((doc, index) => {
        if (!match(doc as never)) return;
        items[index] = { ...doc, ...patch(doc as never) };
        changed.push(items[index]!);
      });
      return changed as never;
    },
    remove(name, match) {
      const items = list(name);
      const kept = items.filter((doc) => !match(doc as never));
      data.set(name, kept);
      return items.length - kept.length;
    },
  };
}

export function fileStore(dir: string, delayMs = 250): Store {
  const memory = memoryStore();
  const loaded = new Set<string>();
  const pending = new Map<string, NodeJS.Timeout>();
  mkdirSync(dir, { recursive: true });
  const file = (name: string) => path.join(dir, `${name.replace(/[^a-z0-9_-]/gi, '')}.json`);

  const load = (name: string) => {
    if (loaded.has(name)) return;
    loaded.add(name);
    try {
      const items = JSON.parse(readFileSync(file(name), 'utf8')) as Doc[];
      if (Array.isArray(items)) for (const item of items) memory.insert(name, item);
    } catch {
      /* first use: nothing saved yet */
    }
  };
  const persist = (name: string) => {
    clearTimeout(pending.get(name));
    pending.set(name, setTimeout(() => {
      pending.delete(name);
      const target = file(name);
      const temp = `${target}.${process.pid}.tmp`;
      writeFileSync(temp, JSON.stringify(memory.all(name)));
      renameSync(temp, target);
    }, delayMs));
  };

  return {
    all(name) { load(name); return memory.all(name); },
    insert(name, doc, options) { load(name); const out = memory.insert(name, doc, options); persist(name); return out; },
    update(name, match, patch) { load(name); const out = memory.update(name, match, patch); if (out.length) persist(name); return out; },
    remove(name, match) { load(name); const out = memory.remove(name, match); if (out) persist(name); return out; },
  };
}
