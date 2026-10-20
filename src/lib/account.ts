/**
 * Writes the signed-in founder to the same Firestore docs onboarding and
 * Settings already use. Demo mode never calls this.
 */
import { deleteUser, updatePassword, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AccountStatus, ProfileStatus, VerificationStatus, type UserProfile } from '../types';
import { flushCloudSync } from './cloudSync';

/** Sends any unsaved list changes to the cloud, then signs out. */
export async function signOutAccount() {
  try {
    await Promise.race([flushCloudSync(), new Promise((resolve) => setTimeout(resolve, 2500))]);
  } catch {
    /* sign out anyway */
  }
  await auth.signOut();
}

function withProtocol(url?: string) {
  const trimmed = url?.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export type AccountFields = {
  fullName?: string;
  email?: string;
  headline?: string;
  bio?: string;
  location?: string;
  role?: string;
  stage?: string;
  industry?: string;
  commitment?: string;
  company?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  photo?: string;
  timezone?: string;
};

/** First user document after email/Google sign-up, before onboarding finishes. */
export async function bootstrapAccount(user: FirebaseUser, fullName?: string) {
  const name = fullName?.trim() || user.displayName || user.email?.split('@')[0] || 'Founder';
  if (fullName?.trim() && user.displayName !== name) {
    await updateProfile(user, { displayName: name });
  }
  const ref = doc(db, 'users', user.uid);
  const now = serverTimestamp();
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await setDoc(ref, { email: user.email, updatedAt: now }, { merge: true });
      return;
    }
  } catch {
    await setDoc(ref, { email: user.email, fullName: name, updatedAt: now }, { merge: true });
    return;
  }
  await setDoc(
    ref,
    {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      fullName: name,
      roles: ['Founder'],
      profileStatus: ProfileStatus.DRAFT,
      verificationStatus: VerificationStatus.UNVERIFIED,
      profileCompletionScore: 10,
      accountStatus: AccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}

export async function persistAccount(uid: string, fields: AccountFields) {
  const now = serverTimestamp();
  const userPatch: Record<string, unknown> = { id: uid, uid, updatedAt: now };
  if (fields.fullName !== undefined) userPatch.fullName = fields.fullName;
  if (fields.email !== undefined) userPatch.email = fields.email;
  if (fields.role !== undefined) userPatch.role = fields.role;

  const profilePatch: Record<string, unknown> = { userId: uid, updatedAt: now };
  if (fields.headline !== undefined) profilePatch.headline = fields.headline;
  if (fields.bio !== undefined) profilePatch.bio = fields.bio;
  if (fields.location !== undefined) profilePatch.location = fields.location;
  if (fields.role !== undefined) profilePatch.role = fields.role;
  if (fields.stage !== undefined) profilePatch.stage = fields.stage;
  if (fields.industry !== undefined) profilePatch.industry = fields.industry;
  if (fields.commitment !== undefined) profilePatch.commitment = fields.commitment;
  if (fields.company !== undefined) profilePatch.company = fields.company;
  if (fields.timezone !== undefined) profilePatch.timezone = fields.timezone;
  if (fields.photo !== undefined) profilePatch.avatarUrl = fields.photo;
  const linkedin = withProtocol(fields.linkedin);
  const github = withProtocol(fields.github);
  const website = withProtocol(fields.website);
  profilePatch.socialLinks = {
    ...(linkedin ? { linkedin } : {}),
    ...(github ? { github } : {}),
    ...(website ? { website } : {}),
  };
  // Cleared strings must clear the stored link, not leave the old one.
  profilePatch.linkedinUrl = linkedin || deleteField();
  profilePatch.githubUrl = github || deleteField();

  await Promise.all([
    setDoc(doc(db, 'users', uid), userPatch, { merge: true }),
    setDoc(doc(db, 'profiles', uid), profilePatch, { merge: true }),
  ]);

  if (fields.fullName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: fields.fullName, photoURL: fields.photo || auth.currentUser.photoURL });
  }
}

/**
 * The profile form's single write path: the profile document, the display
 * fields other members read on `users/{uid}`, and Firebase Auth's own
 * displayName/photoURL stay in step.
 */
export async function persistProfilePatch(uid: string, patch: Partial<UserProfile>) {
  const now = serverTimestamp();
  await setDoc(doc(db, 'profiles', uid), { userId: uid, ...patch, updatedAt: now }, { merge: true });
  const userPatch: Record<string, unknown> = { updatedAt: now };
  if (patch.fullName !== undefined) userPatch.fullName = patch.fullName;
  if (patch.role !== undefined) userPatch.role = patch.role;
  if (patch.avatarUrl !== undefined) userPatch.avatarUrl = patch.avatarUrl;
  if (Object.keys(userPatch).length > 1) {
    await setDoc(doc(db, 'users', uid), userPatch, { merge: true });
  }
  if (auth.currentUser && (patch.fullName !== undefined || patch.avatarUrl !== undefined)) {
    await updateProfile(auth.currentUser, {
      displayName: patch.fullName ?? auth.currentUser.displayName,
      photoURL: patch.avatarUrl ?? auth.currentUser.photoURL,
    });
  }
}

export type PrivacyFields = {
  /** Listed in Matches, Explore and search. */
  discoverable?: boolean;
  /** Who may start a conversation. */
  messagesFrom?: 'anyone' | 'connections' | 'none';
  showEmail?: boolean;
  visibility?: 'Public' | 'Connections Only' | 'Private';
  /** Show "online now" and "last seen" to other members. */
  sharePresence?: boolean;
  openTo?: string[];
  /** Available for mentoring sessions. */
  mentorAvailability?: boolean;
};

/**
 * Privacy choices live on the profile document so other members' pages
 * (directory, messaging rules, presence) can respect them.
 */
export async function persistPrivacy(uid: string, fields: PrivacyFields) {
  const patch: Record<string, unknown> = { userId: uid, updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) patch[key] = value;
  }
  if (fields.visibility) patch.profileVisibility = fields.visibility;
  await setDoc(doc(db, 'profiles', uid), patch, { merge: true });
}

/** Once Firebase confirms the e-mail address, the profile carries the Verified badge other members see. */
export async function markEmailVerified(uid: string) {
  const patch = { verificationStatus: VerificationStatus.VERIFIED, updatedAt: serverTimestamp() };
  await Promise.all([
    setDoc(doc(db, 'users', uid), patch, { merge: true }),
    setDoc(doc(db, 'profiles', uid), { userId: uid, ...patch }, { merge: true }),
  ]);
}

export async function changeAccountPassword(next: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('signed-out');
  await updatePassword(user, next);
}

export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await Promise.all([
      deleteDoc(doc(db, 'users', user.uid)),
      deleteDoc(doc(db, 'profiles', user.uid)),
      deleteDoc(doc(db, 'onboarding', user.uid)),
    ]);
  } catch {
    /* still delete the Auth user so they can leave */
  }
  await deleteUser(user);
}
