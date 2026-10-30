import { useEffect, useRef, useState } from 'react';
import { onDataChange } from './localLists';

/**
 * Reads a stored list and re-reads it whenever one of `watch` changes,
 * whether the change came from this page, another page, the assistant or
 * another tab.
 */
export function useStored<T>(read: () => T, watch: readonly string[]): T {
  const [value, setValue] = useState<T>(read);
  const readRef = useRef(read);
  readRef.current = read;
  const watchKey = watch.join('|');

  useEffect(() => {
    const watched = watchKey.split('|');
    setValue(readRef.current());
    return onDataChange((key) => {
      if (key === '*' || watched.includes(key)) setValue(readRef.current());
    });
  }, [watchKey]);

  return value;
}
