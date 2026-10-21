/**
 * Platform-published catalogues (programs, learning resources, services, jobs).
 * Admins publish documents; members read them. Every mapper is defensive —
 * partial documents render with the fields they have.
 *
 * Listeners are synchronous so React can unsubscribe in the same effect tick
 * (an async subscribe + immediate unsubscribe is the Firestore ca9 race).
 */
import { collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toMillis } from './peopleSource';

export type CatalogDoc = { id: string } & Record<string, unknown>;

/** Live documents of one platform catalogue collection. */
export function onCatalog(name: string, cb: (docs: CatalogDoc[]) => void, onError?: (error: unknown) => void): () => void {
  return onSnapshot(
    query(collection(db, name), limit(100)),
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
  const ref = doc(collection(db, 'jobs'));
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
