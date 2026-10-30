/**
 * The outreach store on Firestore — the production choice on Cloud Run, where
 * the local disk is wiped on every restart and each instance has its own.
 *
 * Collections are prefixed (`outreach_ddShares`, `outreach_emailLog`, …) so
 * they sit apart from the app's own data in the same database, and
 * firestore.rules gives clients no access to them: only this server, through
 * the service account (Application Default Credentials), reads or writes them.
 *
 * Only equality queries are used, so no composite index is needed. Updates run
 * in a transaction: a view counted on two instances at once is counted twice.
 */
import type { Firestore, Query, DocumentReference } from '@google-cloud/firestore';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { overflow, plain, requireWhere, StoreConflict, type Doc, type Keep, type Store, type Where } from './store';

/** Firestore ids cannot contain "/", be "." or "..", or look like "__x__". */
export function safeId(id: string): string {
  const escaped = id.replace(/[%/]/g, (char) => encodeURIComponent(char));
  return escaped === '.' || escaped === '..' || /^__.*__$/.test(escaped) ? `%${escaped}` : escaped;
}

const BATCH = 400;

export function firestoreStore(db: Firestore, prefix = 'outreach_'): Store {
  const collection = (name: string) => db.collection(`${prefix}${name}`);
  const query = (name: string, where: Where = {}) =>
    Object.entries(where).reduce<Query>((scope, [field, value]) => scope.where(field, '==', value), collection(name));

  const removeAll = async (refs: DocumentReference[]) => {
    for (let start = 0; start < refs.length; start += BATCH) {
      const batch = db.batch();
      for (const ref of refs.slice(start, start + BATCH)) batch.delete(ref);
      await batch.commit();
    }
  };

  const trim = async (name: string, doc: Doc, keep: Keep) => {
    const scope = collection(name).where(keep.by, '==', doc[keep.by] ?? null);
    const total = (await scope.count().get()).data().count;
    if (total <= keep.max) return;
    const snapshot = await scope.get();
    const old = new Set(overflow(snapshot.docs.map((entry) => ({ id: entry.id, doc: entry.data() })), keep));
    await removeAll(snapshot.docs.filter((entry) => old.has(entry.id)).map((entry) => entry.ref));
  };

  return {
    kind: 'firestore',
    async get<T extends Doc>(name: string, id: string) {
      const snapshot = await collection(name).doc(safeId(id)).get();
      return snapshot.exists ? (snapshot.data() as T) : null;
    },
    async put<T extends Doc>(name: string, id: string, doc: T) {
      const saved = plain(doc);
      await collection(name).doc(safeId(id)).set(saved);
      return saved;
    },
    async find<T extends Doc>(name: string, where?: Where) {
      const snapshot = await query(name, where).get();
      return snapshot.docs.map((entry) => entry.data() as T);
    },
    async insert<T extends Doc>(name: string, doc: T, options?: { id?: string; keep?: Keep }) {
      const saved = plain(doc);
      const ref = options?.id ? collection(name).doc(safeId(options.id)) : collection(name).doc();
      try {
        await ref.create(saved);
      } catch (error) {
        // gRPC 6 = ALREADY_EXISTS
        if ((error as { code?: number }).code === 6) throw new StoreConflict(name, options?.id ?? ref.id);
        throw error;
      }
      if (options?.keep) await trim(name, saved, options.keep);
      return saved;
    },
    async update<T extends Doc>(name: string, where: Where, patch: (doc: T) => Partial<T>) {
      requireWhere(where, 'update');
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(query(name, where));
        return snapshot.docs.map((entry) => {
          const next = plain({ ...entry.data(), ...patch(entry.data() as T) }) as T;
          transaction.set(entry.ref, next);
          return next;
        });
      });
    },
    async remove(name: string, where: Where) {
      requireWhere(where, 'remove');
      const snapshot = await query(name, where).get();
      await removeAll(snapshot.docs.map((entry) => entry.ref));
      return snapshot.size;
    },
  };
}

type Env = Record<string, string | undefined>;

function appletConfig(): { projectId?: string; firestoreDatabaseId?: string } {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Which project and database the server writes to: OUTREACH_FIRESTORE_* first,
 * then the variables the client build uses, then firebase-applet-config.json —
 * so by default the server shares the app's own (named) database.
 */
export function firestoreTarget(env: Env) {
  const config = appletConfig();
  return {
    projectId: env.OUTREACH_FIRESTORE_PROJECT || env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT || config.projectId,
    databaseId: env.OUTREACH_FIRESTORE_DATABASE || env.VITE_FIREBASE_FIRESTORE_DB_ID || config.firestoreDatabaseId || '(default)',
    prefix: env.OUTREACH_FIRESTORE_PREFIX ?? 'outreach_',
  };
}

/** Loaded only when the Firestore store is chosen, so the other stores never pay for the client. */
export async function openFirestoreStore(env: Env): Promise<{ store: Store; target: ReturnType<typeof firestoreTarget> }> {
  const target = firestoreTarget(env);
  const { Firestore } = await import('@google-cloud/firestore');
  const db = new Firestore({ projectId: target.projectId, databaseId: target.databaseId, ignoreUndefinedProperties: true });
  return { store: firestoreStore(db, target.prefix), target };
}
