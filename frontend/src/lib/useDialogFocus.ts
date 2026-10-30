import { useEffect, useRef, type RefObject } from 'react';

const activeDialogs: HTMLElement[] = [];
let previousBodyOverflow = '';
const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Keyboard containment and focus restoration, shared by dialogs and the mobile drawer. */
export function useDialogFocus(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  dismissible = true,
) {
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  closeRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (activeDialogs.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeDialogs.push(container);
    const isTopDialog = () => activeDialogs[activeDialogs.length - 1] === container;
    // Announce the dialog title before moving through its controls. This also
    // avoids focusing a destructive action as soon as a confirmation opens.
    container.focus({ preventScroll: true });

    const getControls = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => !element.closest('[inert], [hidden], [aria-hidden="true"]')
        && window.getComputedStyle(element).display !== 'none'
        && window.getComputedStyle(element).visibility !== 'hidden'
        && element.getClientRects().length > 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (dismissibleRef.current) closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = getControls();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        container.focus({ preventScroll: true });
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === container)) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isTopDialog() && !container.contains(event.target as Node)) container.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      const index = activeDialogs.lastIndexOf(container);
      const wasTop = isTopDialog();
      if (index !== -1) activeDialogs.splice(index, 1);
      if (activeDialogs.length === 0) document.body.style.overflow = previousBodyOverflow;
      if (wasTop && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, containerRef]);
}
