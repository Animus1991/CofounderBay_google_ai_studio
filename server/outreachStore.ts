/**
 * Which store the outreach routes use (server/store):
 *
 *   OUTREACH_STORE=firestore   Firestore, through the service account — the
 *                              default on Cloud Run (K_SERVICE is set there),
 *                              whose disk is wiped on every restart
 *   OUTREACH_STORE=file        JSON files in OUTREACH_DATA_DIR (default .data)
 *                              — the default anywhere else
 *   OUTREACH_STORE=memory      nothing kept across restarts (demos)
 */
import path from 'node:path';
import { fileStore, memoryStore, type Store } from './store';
import { openFirestoreStore } from './firestoreStore';

type Env = Record<string, string | undefined>;
type Log = (message: string, detail?: unknown) => void;

export type StoreChoice = 'firestore' | 'file' | 'memory';

export function storeChoice(env: Env): StoreChoice {
  const asked = (env.OUTREACH_STORE || '').trim().toLowerCase();
  if (asked === 'firestore' || asked === 'file' || asked === 'memory') return asked;
  return env.K_SERVICE ? 'firestore' : 'file';
}

export async function openOutreachStore(env: Env, log: Log = (message, detail) => console.warn(message, detail ?? '')): Promise<Store> {
  const choice = storeChoice(env);
  const openFallbackStore = (): Store => {
    try {
      const dir = env.OUTREACH_DATA_DIR || path.join(process.cwd(), '.data');
      const store = fileStore(dir);
      process.once('exit', () => store.flush());
      log(`outreach store: JSON files in ${dir}`);
      return store;
    } catch {
      log('outreach store: memory fallback');
      return memoryStore();
    }
  };

  if (choice === 'firestore') {
    const fallback = openFallbackStore();
    try {
      const { store, target } = await openFirestoreStore(env);
      await store.get('meta', 'ping');
      log(`outreach store: Firestore ${target.projectId || '(project from credentials)'} / ${target.databaseId}, collections ${target.prefix}*`);
      let useFallback = false;
      const withFallback = async <T>(primary: () => Promise<T>, backup: () => Promise<T>): Promise<T> => {
        if (useFallback) return backup();
        try {
          return await primary();
        } catch (error: unknown) {
          const code = (error as { code?: number | string })?.code;
          const msg = error instanceof Error ? error.message : String(error);
          if (code === 7 || code === 'PERMISSION_DENIED' || msg.includes('PERMISSION_DENIED') || msg.includes('Missing or insufficient permissions')) {
            useFallback = true;
            return backup();
          }
          throw error;
        }
      };
      return {
        kind: 'firestore',
        get: (collection, id) => withFallback(() => store.get(collection, id), () => fallback.get(collection, id)),
        put: (collection, id, doc) => withFallback(() => store.put(collection, id, doc), () => fallback.put(collection, id, doc)),
        find: (collection, where) => withFallback(() => store.find(collection, where), () => fallback.find(collection, where)),
        insert: (collection, doc, options) => withFallback(() => store.insert(collection, doc, options), () => fallback.insert(collection, doc, options)),
        update: (collection, where, patch) => withFallback(() => store.update(collection, where, patch), () => fallback.update(collection, where, patch)),
        remove: (collection, where) => withFallback(() => store.remove(collection, where), () => fallback.remove(collection, where)),
      };
    } catch {
      return fallback;
    }
  }
  if (choice === 'memory') {
    log('outreach store: memory only — share links, the email log and digest settings are lost on restart');
    return memoryStore();
  }
  return openFallbackStore();
}
