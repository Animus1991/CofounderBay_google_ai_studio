/**
 * Communities on Firestore.
 *
 * Members can create communities, join and leave them, and post inside them.
 * The four platform spaces are bundled in the page; when a member joins one and
 * no cloud document exists yet, the document is created so member counts and
 * posts are real from then on.
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { toMillis } from './peopleSource';

export type CommunityDoc = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  ownerId: string;
  memberIds: string[];
  postCount: number;
  createdAt: number | null;
};

export type CommunityPost = {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number | null;
  reactionsCount: number;
  commentsCount: number;
};

export function communityFromDoc(id: string, data: Record<string, unknown>): CommunityDoc {
  const memberIds = Array.isArray(data.memberIds) ? data.memberIds.filter((item): item is string => typeof item === 'string') : [];
  const postCount = typeof data.postCount === 'number' ? data.postCount : typeof data.posts === 'number' ? data.posts : 0;
  return {
    id,
    name: String(data.title ?? data.name ?? 'Community'),
    description: String(data.description ?? ''),
    category: String(data.category ?? 'General'),
    tags: Array.isArray(data.tags) ? data.tags.filter((item): item is string => typeof item === 'string') : [],
    isPublic: data.isPublic !== false,
    ownerId: String(data.ownerId ?? ''),
    memberIds,
    postCount,
    createdAt: toMillis(data.createdAt),
  };
}

/** Live list of every community document. `onError` receives permission/config failures. */
export function onCommunities(cb: (list: CommunityDoc[]) => void, onError?: (error: unknown) => void): () => void {
  return onSnapshot(
    query(collection(db, 'communities'), orderBy('createdAt', 'desc'), limit(100)),
    (snapshot) => cb(snapshot.docs.map((entry) => communityFromDoc(entry.id, entry.data()))),
    (error) => onError?.(error),
  );
}

/** Creates a community document and returns its id. */
export async function createCommunity(input: { name: string; description: string; category: string; isPublic: boolean; ownerId: string }): Promise<string> {
  const ref = doc(collection(db, 'communities'));
  await setDoc(ref, {
    id: ref.id,
    title: input.name.trim().slice(0, 100),
    description: input.description.trim().slice(0, 1000),
    category: input.category || 'General',
    tags: [],
    isPublic: input.isPublic,
    ownerId: input.ownerId,
    memberIds: [input.ownerId],
    memberCount: 1,
    postCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Creates the cloud document for a platform space the first time someone joins it. */
async function ensureCommunityDoc(space: { id: string; name: string; description: string; category: string }, uid: string) {
  const ref = doc(db, 'communities', space.id);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    id: space.id,
    title: space.name,
    description: space.description,
    category: space.category,
    tags: [],
    isPublic: true,
    ownerId: uid,
    memberIds: [uid],
    memberCount: 1,
    postCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function joinCommunity(communityId: string, uid: string, seed?: { name: string; description: string; category: string }) {
  if (seed) await ensureCommunityDoc({ id: communityId, ...seed }, uid);
  const ref = doc(db, 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const memberIds: string[] = Array.isArray(snap.data().memberIds) ? snap.data().memberIds : [];
  if (memberIds.includes(uid)) return;
  await updateDoc(ref, { memberIds: arrayUnion(uid), memberCount: increment(1) });
}

export async function leaveCommunity(communityId: string, uid: string) {
  const ref = doc(db, 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, { memberIds: arrayRemove(uid), memberCount: increment(-1) });
}

/** Live posts of one community. */
export function onCommunityPosts(communityId: string, cb: (list: CommunityPost[]) => void, onError?: (error: unknown) => void): () => void {
  return onSnapshot(
    query(collection(db, 'communities', communityId, 'posts'), orderBy('createdAt', 'desc'), limit(50)),
    (snapshot) =>
      cb(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            communityId,
            authorId: String(data.authorId ?? ''),
            authorName: String(data.authorName ?? data.authorId ?? 'Member'),
            title: String(data.title ?? ''),
            body: String(data.body ?? ''),
            tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown): tag is string => typeof tag === 'string') : [],
            createdAt: toMillis(data.createdAt),
            reactionsCount: typeof data.reactionsCount === 'number' ? data.reactionsCount : 0,
            commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : 0,
          } satisfies CommunityPost;
        }),
      ),
    (error) => onError?.(error),
  );
}

export async function addCommunityPost(communityId: string, post: { authorId: string; authorName: string; title: string; body: string }): Promise<string> {
  const ref = doc(collection(db, 'communities', communityId, 'posts'));
  await setDoc(ref, {
    id: ref.id,
    communityId,
    authorId: post.authorId,
    authorName: post.authorName,
    title: post.title.trim().slice(0, 200),
    body: post.body.trim().slice(0, 10000),
    tags: [],
    reactionsCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, 'communities', communityId), { postCount: increment(1) });
  } catch {
    /* the count is cosmetic */
  }
  return ref.id;
}
