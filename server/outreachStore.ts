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
  if (choice === 'firestore') {
    const { store, target } = await openFirestoreStore(env);
    log(`outreach store: Firestore ${target.projectId || '(project from credentials)'} / ${target.databaseId}, collections ${target.prefix}*`);
    // One read at start, so a missing permission shows in the logs now rather than on a founder's first share.
    void store.get('meta', 'ping').catch((error: unknown) =>
      log('outreach store: Firestore is not reachable. Give the service account the "Cloud Datastore User" role (roles/datastore.user).', error instanceof Error ? error.message : error));
    return store;
  }
  if (choice === 'memory') {
    log('outreach store: memory only — share links, the email log and digest settings are lost on restart');
    return memoryStore();
  }
  const dir = env.OUTREACH_DATA_DIR || path.join(process.cwd(), '.data');
  const store = fileStore(dir);
  process.once('exit', () => store.flush());
  log(`outreach store: JSON files in ${dir}`);
  return store;
}
