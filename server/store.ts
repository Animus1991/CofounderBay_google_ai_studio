/**
 * The server's own records (due-diligence links and their files, the email
 * log, digest settings, snapshots and runs) behind one small async interface,
 * so the routes never know where they live:
 *
 *   memoryStore()        tests
 *   fileStore(dir)       one JSON file per collection — one server with a disk
 *   firestoreStore(db)   Firestore (server/firestoreStore.ts) — Cloud Run, or
 *                        anything that restarts or runs more than one instance
 *
 * Queries are equality on top-level fields only: every backend serves them
 * without composite indexes, and the routes sort and page what comes back.
 * Documents are plain JSON (strings, numbers, booleans, null, lists, maps);
 * `undefined` fields are dropped, as Firestore drops them, so a query never
 * matches in one backend and misses in another.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type Doc = Record<string, unknown>;
export type Scalar = string | number | boolean | null;
/** Every listed field must equal its value. */
export type Where = Record<string, Scalar>;
/** After an insert, keep only the newest `max` documents that share the inserted one's `by` (ordered by `order`). */
export type Keep = { by: string; order: string; max: number };

export interface Store {
  readonly kind: 'memory' | 'file' | 'firestore';
  get<T extends Doc>(collection: string, id: string): Promise<T | null>;
  /** Creates or replaces the document with this id. */
  put<T extends Doc>(collection: string, id: string, doc: T): Promise<T>;
  find<T extends Doc>(collection: string, where?: Where): Promise<T[]>;
  /** Adds a document (under `id` when given — an existing id is an error). */
  insert<T extends Doc>(collection: string, doc: T, options?: { id?: string; keep?: Keep }): Promise<T>;
  /** Applies `patch` to every match, atomically per document; returns the updated documents. */
  update<T extends Doc>(collection: string, where: Where, patch: (doc: T) => Partial<T>): Promise<T[]>;
  remove(collection: string, where: Where): Promise<number>;
}

export class StoreConflict extends Error {
  constructor(collection: string, id: string) {
    super(`${collection}/${id} already exists`);
  }
}

/** A JSON round trip: the copy a database would hand back (no shared references, no `undefined`). */
export const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const matches = (doc: Doc, where: Where = {}) => Object.entries(where).every(([key, value]) => doc[key] === value);

/** Updates and removals must name what they touch — never a whole collection by accident. */
export function requireWhere(where: Where, action: string) {
  if (Object.keys(where).length === 0) throw new Error(`store.${action} needs at least one field to match`);
}

/** The oldest documents beyond `keep.max` among those sharing `doc[keep.by]`. */
export function overflow<T extends Doc>(docs: Array<{ id: string; doc: T }>, keep: Keep): string[] {
  if (docs.length <= keep.max) return [];
  return [...docs]
    .sort((a, b) => String(a.doc[keep.order] ?? '').localeCompare(String(b.doc[keep.order] ?? '')))
    .slice(0, docs.length - keep.max)
    .map((entry) => entry.id);
}

type Table = Map<string, Doc>;

/** The in-memory store, plus the raw tables the file store persists. */
function memoryTables() {
  const tables = new Map<string, Table>();
  const table = (name: string) => tables.get(name) ?? (tables.set(name, new Map()), tables.get(name)!);
  const entries = (name: string, where?: Where) => [...table(name)].filter(([, doc]) => matches(doc, where));

  const store: Store = {
    kind: 'memory',
    async get<T extends Doc>(name: string, id: string) {
      const doc = table(name).get(id);
      return doc ? plain(doc as T) : null;
    },
    async put<T extends Doc>(name: string, id: string, doc: T) {
      table(name).set(id, plain(doc));
      return plain(doc);
    },
    async find<T extends Doc>(name: string, where?: Where) {
      return entries(name, where).map(([, doc]) => plain(doc as T));
    },
    async insert<T extends Doc>(name: string, doc: T, options?: { id?: string; keep?: Keep }) {
      const id = options?.id ?? randomUUID();
      if (table(name).has(id)) throw new StoreConflict(name, id);
      const saved = plain(doc);
      table(name).set(id, saved);
      const keep = options?.keep;
      if (keep) {
        const scope = entries(name, { [keep.by]: saved[keep.by] as Scalar }).map(([key, value]) => ({ id: key, doc: value }));
        for (const old of overflow(scope, keep)) table(name).delete(old);
      }
      return plain(saved as T);
    },
    async update<T extends Doc>(name: string, where: Where, patch: (doc: T) => Partial<T>) {
      requireWhere(where, 'update');
      return entries(name, where).map(([id, doc]) => {
        const next = plain({ ...doc, ...patch(plain(doc as T)) });
        table(name).set(id, next);
        return plain(next as T);
      });
    },
    async remove(name: string, where: Where) {
      requireWhere(where, 'remove');
      const gone = entries(name, where);
      for (const [id] of gone) table(name).delete(id);
      return gone.length;
    },
  };
  return { store, table };
}

export function memoryStore(): Store {
  return memoryTables().store;
}

/**
 * One JSON file per collection under `dir` (`{ id: document }`), written
 * atomically (temp file + rename) shortly after a change. Fine for one
 * long-running server with a persistent disk; not for Cloud Run, where the
 * disk is wiped on every restart and instances don't share it.
 */
export type FileStore = Store & {
  /** Writes every pending change now (tests, and a server shutting down). */
  flush(): void;
};

export function fileStore(dir: string, delayMs = 250, log: (message: string, detail?: unknown) => void = (message, detail) => console.error(message, detail)): FileStore {
  const { store: memory, table } = memoryTables();
  const loaded = new Set<string>();
  const pending = new Map<string, NodeJS.Timeout>();
  mkdirSync(dir, { recursive: true });
  const file = (name: string) => path.join(dir, `${name.replace(/[^a-z0-9_-]/gi, '')}.json`);

  const load = (name: string) => {
    if (loaded.has(name)) return;
    loaded.add(name);
    let saved: unknown;
    try {
      saved = JSON.parse(readFileSync(file(name), 'utf8'));
    } catch {
      return; // first use: nothing saved yet
    }
    const rows = table(name);
    // The first version kept a plain list; those documents get ids now.
    if (Array.isArray(saved)) for (const doc of saved) rows.set(randomUUID(), doc as Doc);
    else if (saved && typeof saved === 'object') for (const [id, doc] of Object.entries(saved)) rows.set(id, doc as Doc);
  };
  const write = (name: string) => {
    clearTimeout(pending.get(name));
    pending.delete(name);
    const target = file(name);
    const temp = `${target}.${process.pid}.tmp`;
    try {
      writeFileSync(temp, JSON.stringify(Object.fromEntries(table(name))));
      renameSync(temp, target);
    } catch (error) {
      // A full or vanished disk must not take the server down; the change stays in memory.
      log(`outreach store: could not save ${name}`, error);
    }
  };
  const persist = (name: string) => {
    clearTimeout(pending.get(name));
    pending.set(name, setTimeout(() => write(name), delayMs));
  };
  const after = async <R>(name: string, run: () => Promise<R>, changed: (result: R) => boolean) => {
    load(name);
    const result = await run();
    if (changed(result)) persist(name);
    return result;
  };

  return {
    kind: 'file',
    get: <T extends Doc>(name: string, id: string) => after(name, () => memory.get<T>(name, id), () => false),
    put: <T extends Doc>(name: string, id: string, doc: T) => after(name, () => memory.put<T>(name, id, doc), () => true),
    find: <T extends Doc>(name: string, where?: Where) => after(name, () => memory.find<T>(name, where), () => false),
    insert: <T extends Doc>(name: string, doc: T, options?: { id?: string; keep?: Keep }) => after(name, () => memory.insert<T>(name, doc, options), () => true),
    update: <T extends Doc>(name: string, where: Where, patch: (doc: T) => Partial<T>) => after(name, () => memory.update<T>(name, where, patch), (out) => out.length > 0),
    remove: (name: string, where: Where) => after(name, () => memory.remove(name, where), (out) => out > 0),
    flush: () => [...pending.keys()].forEach(write),
  };
}
