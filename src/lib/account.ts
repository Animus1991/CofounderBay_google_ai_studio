/**
 * Writes the signed-in founder to the same Firestore docs onboarding and
 * Settings already use. Demo mode never calls this.
 */
import { deleteUser, updatePassword, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AccountStatus, ProfileStatus, VerificationStatus } from '../types';

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
  if (fields.fullName) userPatch.fullName = fields.fullName;
  if (fields.email) userPatch.email = fields.email;
  if (fields.role) userPatch.role = fields.role;

  const profilePatch: Record<string, unknown> = { userId: uid, updatedAt: now };
  if (fields.headline !== undefined) profilePatch.headline = fields.headline;
  if (fields.bio !== undefined) profilePatch.bio = fields.bio;
  if (fields.location !== undefined) profilePatch.location = fields.location;
  if (fields.role) profilePatch.role = fields.role;
  if (fields.stage) profilePatch.stage = fields.stage;
  if (fields.industry) profilePatch.industry = fields.industry;
  if (fields.commitment) profilePatch.commitment = fields.commitment;
  if (fields.company !== undefined) profilePatch.company = fields.company;
  if (fields.timezone) profilePatch.timezone = fields.timezone;
  if (fields.photo) profilePatch.avatarUrl = fields.photo;
  const linkedin = withProtocol(fields.linkedin);
  const github = withProtocol(fields.github);
  const website = withProtocol(fields.website);
  if (linkedin || github || website) {
    profilePatch.socialLinks = {
      ...(linkedin ? { linkedin } : {}),
      ...(github ? { github } : {}),
      ...(website ? { website } : {}),
    };
  }
  if (linkedin) profilePatch.linkedinUrl = linkedin;
  if (github) profilePatch.githubUrl = github;

  await Promise.all([
    setDoc(doc(db, 'users', uid), userPatch, { merge: true }),
    setDoc(doc(db, 'profiles', uid), profilePatch, { merge: true }),
  ]);

  if (fields.fullName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: fields.fullName, photoURL: fields.photo || auth.currentUser.photoURL });
  }
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
