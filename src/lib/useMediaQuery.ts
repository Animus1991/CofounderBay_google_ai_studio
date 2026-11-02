import { useSyncExternalStore } from 'react';

/**
 * True while the CSS media query matches; re-renders when it flips (a phone
 * rotated, a window resized). Pages use it only where one layout cannot serve
 * every width — the dashboard's phone/tablet arrangement (round 12) — and use
 * plain responsive classes everywhere else. Server/test default: false.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}
