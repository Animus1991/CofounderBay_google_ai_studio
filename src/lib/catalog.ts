/**
 * Platform-published catalogues (programs, learning resources, services, jobs).
 * Admins publish documents; members read them. Every mapper is defensive —
 * partial documents render with the fields they have.
 */
import { toMillis } from './peopleSource';

export type CatalogDoc = { id: string } & Record<string, unknown>;

async function db() {
  const { db } = await import('../firebase');
  if (!db) throw new Error('Firestore is not configured');
  return db;
}

/** Live documents of one platform catalogue collection. */
export async function onCatalog(collection: string, cb: (docs: CatalogDoc[]) => void, onError?: (error: unknown) => void): Promise<() => void> {
  const firestore = await db();
  const { collection: col, onSnapshot, query, limit } = await import('firebase/firestore');
  return onSnapshot(
    query(col(firestore, collection), limit(100)),
    (snapshot) => cb(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
    (error) => onError?.(error),
  );
}

export const str = (value: unknown, fallback = ''): string => (typeof value === 'string' && value.trim() ? value : fallback);
export const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
export const strList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
export { toMillis };

/** Member-posted job listing (authorId enforced by the rules). */
export async function postJob(input: { authorId: string; title: string; company: string; type: string; location: string; salary: string; authorName?: string }): Promise<string> {
  const firestore = await db();
  const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(collection(firestore, 'jobs'));
  await setDoc(ref, {
    id: ref.id,
    authorId: input.authorId,
    authorName: input.authorName ?? '',
    title: input.title.trim().slice(0, 120),
    company: input.company.trim().slice(0, 120),
    type: input.type,
    location: input.location.trim().slice(0, 120),
    salary: input.salary.trim().slice(0, 60),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
