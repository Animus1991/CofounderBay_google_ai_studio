/**
 * Loads the members of the platform from Firestore (`profiles`) for a signed-in
 * account and keeps them live. Pages read them through `usePeople()`.
 */
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from './logger';
import {
  clearRealPeople,
  directoryLoaded,
  directoryPeople,
  findPerson,
  onPeopleChange,
  personFromProfile,
  rememberRealPerson,
  setRealPeople,
  usingRealPeople,
  type Person,
} from './peopleSource';
import { keys, readIds } from './localLists';
import { useStored } from './useStored';

const log = createLogger('directory');
const DIRECTORY_LIMIT = 1000;

let unsubscribe: (() => void) | null = null;
let currentUid: string | null = null;
let lastError = '';

export function startDirectory(uid: string) {
  if (currentUid === uid) return;
  stopDirectory();
  currentUid = uid;
  unsubscribe = onSnapshot(
    query(collection(db, 'profiles'), limit(DIRECTORY_LIMIT)),
    (snap) => {
      const people = snap.docs
        .map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          if (data.accountStatus === 'Suspended' || data.accountStatus === 'Deactivated') return null;
          if (!data.fullName && !data.headline) return null;
          return personFromProfile(entry.id, data);
        })
        .filter((person): person is Person => person !== null);
      lastError = '';
      setRealPeople(people, true);
    },
    (error) => {
      lastError = String(error);
      log.warn('directory listener failed', { error: lastError });
      setRealPeople([], true);
    },
  );
}

export function stopDirectory() {
  unsubscribe?.();
  unsubscribe = null;
  currentUid = null;
  clearRealPeople();
}

/** One member by id, from the live list or straight from Firestore. */
export async function fetchPerson(id: string): Promise<Person | null> {
  const known = findPerson(id);
  if (known && (known.sample || !usingRealPeople() || known.fullName)) return known;
  if (!usingRealPeople()) return known ?? null;
  try {
    const snap = await getDoc(doc(db, 'profiles', id));
    if (!snap.exists()) return null;
    const person = personFromProfile(snap.id, snap.data() as Record<string, unknown>);
    rememberRealPerson(person);
    return person;
  } catch (error) {
    log.warn('could not load profile', { id, error: String(error) });
    return null;
  }
}

/**
 * The people a page can list: discoverable members (or the demo cast),
 * without yourself, people you hid, or people you blocked.
 */
export function usePeople(selfId?: string | null): { people: Person[]; loading: boolean; error: string } {
  const [, setTick] = useState(0);
  useEffect(() => onPeopleChange(() => setTick((value) => value + 1)), []);
  const hidden = useStored(() => readIds(keys.hiddenPeople), [keys.hiddenPeople]);
  const blocked = useStored(() => readIds(keys.blockedPeople), [keys.blockedPeople]);
  const people = directoryPeople().filter((person) => person.id !== selfId && !hidden.includes(person.id) && !blocked.includes(person.id));
  return { people, loading: !directoryLoaded(), error: lastError };
}

/** One person for a profile page; resolves from cache first, then Firestore. */
export function usePerson(id: string | null | undefined): { person: Person | null; loading: boolean } {
  const [state, setState] = useState<{ person: Person | null; loading: boolean }>(() => {
    const known = id ? findPerson(id) : undefined;
    return { person: known ?? null, loading: Boolean(id) && !known };
  });
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ person: null, loading: false });
      return undefined;
    }
    const known = findPerson(id);
    setState({ person: known ?? null, loading: !known });
    void fetchPerson(id).then((person) => {
      if (!cancelled) setState({ person: person ?? known ?? null, loading: false });
    });
    const off = onPeopleChange(() => {
      const next = findPerson(id);
      if (next && !cancelled) setState({ person: next, loading: false });
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [id]);
  return state;
}
