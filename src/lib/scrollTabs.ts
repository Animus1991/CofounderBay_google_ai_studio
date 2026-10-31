/**
 * One-row tab strips on phones (`.scroll-tabs`, see index.css): marks which
 * side continues (data-overflow = start | end | both) so the CSS can fade it,
 * and keeps the active tab in view — on first render, when it changes, and
 * when a deep link (?tab=needs) opens a tab that would start off-screen.
 *
 * Installed once for the whole app; it watches the document for tab strips
 * instead of every page wiring its own hook (21 strips across 17 pages).
 */

const ACTIVE = '[aria-pressed="true"], [aria-selected="true"], [aria-current="page"], [data-active="true"]';

export function overflowState(scrollLeft: number, scrollWidth: number, clientWidth: number): 'none' | 'start' | 'end' | 'both' {
  // A few pixels of slack: the strip's own padding is not "more to see".
  const slack = 8;
  const max = scrollWidth - clientWidth;
  if (max <= slack) return 'none';
  const atStart = scrollLeft <= slack;
  const atEnd = scrollLeft >= max - slack;
  if (atStart) return 'end';
  if (atEnd) return 'start';
  return 'both';
}

function update(strip: HTMLElement) {
  const state = overflowState(strip.scrollLeft, strip.scrollWidth, strip.clientWidth);
  if (state === 'none') delete strip.dataset.overflow;
  else strip.dataset.overflow = state;
}

/** Scrolls the strip (only the strip, never the page) so its active tab is fully visible. */
export function revealActive(strip: HTMLElement) {
  const active = strip.querySelector<HTMLElement>(ACTIVE);
  if (!active || strip.scrollWidth <= strip.clientWidth) return;
  const left = active.offsetLeft - strip.offsetLeft;
  const right = left + active.offsetWidth;
  if (left < strip.scrollLeft) strip.scrollLeft = Math.max(0, left - 16);
  else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth + 16;
}

export function installScrollTabs(root: Document = document): () => void {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  const tracked = new WeakSet<HTMLElement>();
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => entries.forEach((entry) => update(entry.target as HTMLElement)));

  const attach = (strip: HTMLElement) => {
    if (tracked.has(strip)) return;
    tracked.add(strip);
    strip.addEventListener('scroll', () => update(strip), { passive: true });
    resize?.observe(strip);
    update(strip);
    revealActive(strip);
  };

  let queued = false;
  const scan = () => {
    queued = false;
    root.querySelectorAll<HTMLElement>('.scroll-tabs').forEach((strip) => {
      attach(strip);
      update(strip);
    });
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // A tab became active: bring it into view.
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement && mutation.target.matches(ACTIVE)) {
        const strip = mutation.target.closest<HTMLElement>('.scroll-tabs');
        if (strip) revealActive(strip);
      }
    }
    schedule();
  });
  observer.observe(root.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-selected', 'aria-current', 'data-active'] });
  scan();
  return () => {
    observer.disconnect();
    resize?.disconnect();
  };
}
