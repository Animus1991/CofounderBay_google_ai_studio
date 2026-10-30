import { dataScope } from '../lib/localLists';
import { useMemoryOnlyChanges } from '../lib/saveFeedback';
import { useBeforeUnload } from '../lib/useProtectedDraft';

/** Stays mounted across routes, including when a storage-failed editor is closed. */
export default function SaveSafetyGuard() {
 useBeforeUnload(useMemoryOnlyChanges(dataScope));
 return null;
}
