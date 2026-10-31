// @vitest-environment node
/**
 * firestore.rules against the Firestore emulator — `npm run test:emulator`,
 * the CI job "Firestore rules · store (emulator)". Skipped without the emulator.
 *
 * Each block states one promise the rules make to members, and tries the
 * obvious ways around it.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc, type Firestore } from 'firebase/firestore';

type Data = Record<string, unknown>;

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('firestore.rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-cofounderbay', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  });
  afterAll(async () => {
    await env?.cleanup();
  });
  beforeEach(async () => {
    await env.clearFirestore();
  });

  const as = (uid: string, claims: Data = {}) => env.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
  const guest = () => env.unauthenticatedContext().firestore() as unknown as Firestore;
  const seed = (path: string, data: Data) =>
    env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore() as unknown as Firestore, path), data);
    });
  const user = (uid: string, extra: Data = {}): Data => ({
    id: uid, fullName: `Member ${uid}`, email: `${uid}@example.com`, roles: ['Founder'],
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  });
  const admin = () => seed('users/admin', user('admin', { roles: ['Admin'] }));

  describe('server-only outreach records', () => {
    const collections = ['ddShares', 'ddShareFiles', 'emailLog', 'digestSettings', 'digestSnapshots', 'digests', 'tenant_overrides'];

    it('no member — and no admin — reads or writes them', async () => {
      await admin();
      await seed('outreach_ddShares/t1', { owner: 'uid:alice', token: 't1' });
      for (const name of collections) {
        for (const db of [as('alice'), as('admin'), guest()]) {
          await assertFails(getDoc(doc(db, `outreach_${name}/t1`)));
          await assertFails(setDoc(doc(db, `outreach_${name}/x`), { owner: 'uid:alice' }));
        }
      }
    });
  });

  describe('accounts', () => {
    it('a guest reads nothing', async () => {
      await seed('users/alice', user('alice'));
      await assertFails(getDoc(doc(guest(), 'users/alice')));
    });

    it('a member creates only their own account, and never an admin one', async () => {
      await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), user('alice')));
      await assertFails(setDoc(doc(as('alice'), 'users/bob'), user('bob')));
      await assertFails(setDoc(doc(as('carol'), 'users/carol'), user('carol', { roles: ['Admin'] })));
    });

    it('roles change only by an admin', async () => {
      await seed('users/alice', user('alice'));
      await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { roles: ['Founder', 'Super Admin'] }));
      await admin();
      await assertSucceeds(updateDoc(doc(as('admin'), 'users/alice'), { roles: ['Founder', 'Mentor'] }));
    });

    it('the Verified badge needs a confirmed e-mail address', async () => {
      await assertFails(setDoc(doc(as('alice'), 'users/alice'), user('alice', { verificationStatus: 'Verified' })));
      await seed('users/alice', user('alice', { verificationStatus: 'Unverified' }));
      await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { verificationStatus: 'Verified' }));
      await assertSucceeds(updateDoc(doc(as('alice', { email_verified: true }), 'users/alice'), { verificationStatus: 'Verified' }));
      // Once earned, other edits keep it.
      await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { fullName: 'Alice A.' }));
    });

    it('a suspension is lifted only by an admin; members may deactivate themselves', async () => {
      await seed('users/alice', user('alice', { accountStatus: 'Suspended' }));
      await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { accountStatus: 'Active' }));
      await admin();
      await assertSucceeds(updateDoc(doc(as('admin'), 'users/alice'), { accountStatus: 'Active' }));

      await seed('users/bob', user('bob', { accountStatus: 'Active' }));
      await assertSucceeds(updateDoc(doc(as('bob'), 'users/bob'), { accountStatus: 'Deactivated' }));
      await assertSucceeds(updateDoc(doc(as('bob'), 'users/bob'), { accountStatus: 'Active' }));
      await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { accountStatus: 'Suspended' }));
      await assertFails(setDoc(doc(as('carol'), 'users/carol'), user('carol', { accountStatus: 'Pending review' })));
    });

    it('an account’s own lists are private to it', async () => {
      await assertSucceeds(setDoc(doc(as('alice'), 'users/alice/lists/cfb.tasks'), { value: [] }));
      await assertFails(getDoc(doc(as('bob'), 'users/alice/lists/cfb.tasks')));
      await assertFails(setDoc(doc(as('bob'), 'users/alice/lists/cfb.tasks'), { value: ['x'] }));
    });
  });

  describe('profiles', () => {
    it('members read them; only the owner writes; Verified needs a confirmed address', async () => {
      await assertSucceeds(setDoc(doc(as('alice'), 'profiles/alice'), { userId: 'alice', headline: 'Builder' }));
      await assertSucceeds(getDoc(doc(as('bob'), 'profiles/alice')));
      await assertFails(getDoc(doc(guest(), 'profiles/alice')));
      await assertFails(updateDoc(doc(as('bob'), 'profiles/alice'), { headline: 'Hacked' }));
      await assertFails(updateDoc(doc(as('alice'), 'profiles/alice'), { verificationStatus: 'Verified' }));
      await assertSucceeds(updateDoc(doc(as('alice', { email_verified: true }), 'profiles/alice'), { verificationStatus: 'Verified' }));
    });
  });

  describe('connection requests', () => {
    const request = (extra: Data = {}): Data => ({
      id: 'alice_bob', senderId: 'alice', receiverId: 'bob', participants: ['alice', 'bob'],
      requestType: 'Co-Founder', note: '', status: 'Pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
    });

    it('start pending, from the sender, under the pair’s id', async () => {
      await assertSucceeds(setDoc(doc(as('alice'), 'connectionRequests/alice_bob'), request()));
      await env.clearFirestore();
      await assertFails(setDoc(doc(as('alice'), 'connectionRequests/alice_bob'), request({ status: 'Accepted' })));
      await assertFails(setDoc(doc(as('alice'), 'connectionRequests/whatever'), request()));
      await assertFails(setDoc(doc(as('carol'), 'connectionRequests/alice_bob'), request()));
      await assertFails(setDoc(doc(as('alice'), 'connectionRequests/alice_alice'), request({ receiverId: 'alice', participants: ['alice', 'alice'] })));
    });

    it('only the person asked accepts or declines', async () => {
      await seed('connectionRequests/alice_bob', request());
      await assertFails(updateDoc(doc(as('alice'), 'connectionRequests/alice_bob'), { status: 'Accepted' }));
      await assertFails(updateDoc(doc(as('carol'), 'connectionRequests/alice_bob'), { status: 'Accepted' }));
      await assertSucceeds(updateDoc(doc(as('bob'), 'connectionRequests/alice_bob'), { status: 'Accepted', respondedAt: serverTimestamp() }));
    });

    it('the sender withdraws and may ask again; a decline stays declined', async () => {
      await seed('connectionRequests/alice_bob', request());
      await assertSucceeds(updateDoc(doc(as('alice'), 'connectionRequests/alice_bob'), { status: 'Withdrawn' }));
      await assertFails(updateDoc(doc(as('bob'), 'connectionRequests/alice_bob'), { status: 'Accepted' }));
      await assertSucceeds(setDoc(doc(as('alice'), 'connectionRequests/alice_bob'), request()));
      await seed('connectionRequests/alice_bob', request({ status: 'Rejected' }));
      await assertFails(updateDoc(doc(as('alice'), 'connectionRequests/alice_bob'), { status: 'Pending' }));
    });

    it('no one rewrites who is involved, and outsiders read nothing', async () => {
      await seed('connectionRequests/alice_bob', request());
      await assertFails(updateDoc(doc(as('bob'), 'connectionRequests/alice_bob'), { status: 'Accepted', senderId: 'carol', participants: ['carol', 'bob'] }));
      await assertFails(getDoc(doc(as('carol'), 'connectionRequests/alice_bob')));
      await assertSucceeds(getDoc(doc(as('bob'), 'connectionRequests/alice_bob')));
    });
  });

  describe('endorsements', () => {
    const endorsement = (extra: Data = {}): Data => ({
      id: 'bob_alice_react', authorId: 'alice', endorserId: 'alice', endorserName: 'Alice', recipientId: 'bob',
      recipientName: 'Bob', skillId: 'React', comment: '', createdAt: serverTimestamp(), ...extra,
    });

    it('are given only in your own name, and never to yourself', async () => {
      await assertSucceeds(setDoc(doc(as('alice'), 'endorsements/bob_alice_react'), endorsement()));
      await assertFails(setDoc(doc(as('alice'), 'endorsements/bob_carol_react'), endorsement({ endorserId: 'carol', endorserName: 'Carol' })));
      await assertFails(setDoc(doc(as('alice'), 'endorsements/alice_alice_react'), endorsement({ recipientId: 'alice' })));
      await assertSucceeds(getDoc(doc(as('carol'), 'endorsements/bob_alice_react')));
    });
  });

  describe('communities', () => {
    const community = (memberIds: string[]): Data => ({
      id: 'c1', title: 'Fintech founders', description: '', category: 'Fintech', tags: [], isPublic: true,
      ownerId: 'owner', memberIds, memberCount: memberIds.length, postCount: 0, createdAt: serverTimestamp(),
    });

    it('a member joins or leaves alone, with the count moving by one', async () => {
      await seed('communities/c1', community(['owner', 'bob']));
      await assertSucceeds(updateDoc(doc(as('alice'), 'communities/c1'), { memberIds: arrayUnion('alice'), memberCount: increment(1) }));
      await assertSucceeds(updateDoc(doc(as('bob'), 'communities/c1'), { memberIds: arrayRemove('bob'), memberCount: increment(-1) }));
    });

    it('no one adds or removes someone else, or inflates the count', async () => {
      await seed('communities/c1', community(['owner', 'bob']));
      await assertFails(updateDoc(doc(as('alice'), 'communities/c1'), { memberIds: arrayUnion('carol'), memberCount: increment(1) }));
      await assertFails(updateDoc(doc(as('alice'), 'communities/c1'), { memberIds: arrayUnion('alice'), memberCount: 999 }));
      await assertFails(updateDoc(doc(as('alice'), 'communities/c1'), { memberIds: arrayRemove('bob'), memberCount: increment(-1) }));
      await seed('communities/c1', community(['owner', 'bob', 'alice']));
      await assertFails(updateDoc(doc(as('alice'), 'communities/c1'), { memberIds: ['owner'], memberCount: increment(-2) }));
      await assertFails(updateDoc(doc(as('alice'), 'communities/c1'), { title: 'Mine now' }));
      await assertSucceeds(updateDoc(doc(as('owner'), 'communities/c1'), { title: 'Fintech founders (EU)' }));
    });
  });

  describe('messages', () => {
    const message = (extra: Data = {}): Data => ({
      id: 'm1', conversationId: 'c1', senderId: 'alice', body: 'Hi Bob', createdAt: serverTimestamp(), readStatus: false, ...extra,
    });

    it('only participants read and write, and only as themselves', async () => {
      await seed('conversations/c1', { id: 'c1', participants: ['alice', 'bob'], status: 'Active' });
      await assertSucceeds(setDoc(doc(as('alice'), 'conversations/c1/messages/m1'), message()));
      await assertFails(setDoc(doc(as('alice'), 'conversations/c1/messages/m2'), message({ id: 'm2', senderId: 'bob' })));
      await assertFails(setDoc(doc(as('carol'), 'conversations/c1/messages/m3'), message({ id: 'm3', senderId: 'carol' })));
      await assertSucceeds(getDoc(doc(as('bob'), 'conversations/c1/messages/m1')));
      await assertFails(getDoc(doc(as('carol'), 'conversations/c1/messages/m1')));
      // The other side may mark it read, not rewrite it.
      await assertSucceeds(updateDoc(doc(as('bob'), 'conversations/c1/messages/m1'), { readStatus: true }));
      await assertFails(updateDoc(doc(as('bob'), 'conversations/c1/messages/m1'), { body: 'Edited by Bob' }));
    });
  });

  describe('AI usage events', () => {
    it('are append-only and in your own name', async () => {
      const db = as('alice');
      const ref = await assertSucceeds(addDoc(collection(db, 'aiUsage'), { userId: 'alice', tokens: 120 }));
      await assertFails(addDoc(collection(db, 'aiUsage'), { userId: 'bob', tokens: 1 }));
      await assertFails(updateDoc(doc(db, `aiUsage/${ref.id}`), { tokens: 0 }));
      await assertFails(getDoc(doc(db, `aiUsage/${ref.id}`)));
    });
  });
});
