import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDate } from './dates';
import { getLang } from './language';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact relative clock for activity rows (GitHub-style “2 hours ago”), in the active language. */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const el = getLang() === 'el';
  const sec = Math.round((now - then) / 1000);
  if (sec < 45) return el ? 'μόλις τώρα' : 'just now';
  if (sec < 90) return el ? 'πριν από 1 λεπτό' : '1 min ago';
  if (sec < 3600) return el ? `πριν από ${Math.round(sec / 60)} λεπτά` : `${Math.round(sec / 60)} min ago`;
  if (sec < 5400) return el ? 'πριν από 1 ώρα' : '1 hour ago';
  if (sec < 86400) return el ? `πριν από ${Math.round(sec / 3600)} ώρες` : `${Math.round(sec / 3600)} hours ago`;
  if (sec < 172800) return el ? 'πριν από 1 ημέρα' : '1 day ago';
  if (sec < 604800) return el ? `πριν από ${Math.round(sec / 86400)} ημέρες` : `${Math.round(sec / 86400)} days ago`;
  return formatDate(then);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

import { auth } from '../firebase';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
