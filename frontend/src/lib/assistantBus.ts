/**
 * The one way any page, card or button hands something to the studio
 * assistant.
 *
 * Pages used to dispatch an untyped `window` event inline — some sixty copies
 * of `new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } })`, a second name
 * (`OPEN_AI_CHAT`) for the same thing, and no shared type for the payload. A
 * typo in the event name or a field silently did nothing. These helpers keep
 * the same event underneath (so nothing listening breaks) but give it one
 * typed entry point.
 */

export type AssistantRequest = {
  /** Sent as if the person typed it. */
  prompt?: string;
  /** Pinned as context for the next turns (e.g. a person's name). */
  context?: string;
  /** Opens a specialist instead of the studio operator. */
  agentId?: string;
};

export const ASSISTANT_EVENT = 'OPEN_ASSISTANT';
/** Older name some pages and tests still dispatch; handled the same way. */
export const LEGACY_ASSISTANT_EVENT = 'OPEN_AI_CHAT';

function dispatch(request: AssistantRequest) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AssistantRequest>(ASSISTANT_EVENT, { detail: request }));
}

/** Opens the assistant and sends `prompt` as the person's next message. */
export function askAssistant(prompt: string, options: Omit<AssistantRequest, 'prompt'> = {}) {
  dispatch({ ...options, prompt });
}

/** Opens the assistant without sending anything. */
export function openAssistant(options: Omit<AssistantRequest, 'prompt'> = {}) {
  dispatch(options);
}

/** Subscribes to assistant requests from anywhere in the app. Returns the unsubscribe. */
export function onAssistantRequest(handler: (request: AssistantRequest) => void): () => void {
  const listener = (event: Event) => handler(((event as CustomEvent<AssistantRequest>).detail ?? {}) as AssistantRequest);
  window.addEventListener(ASSISTANT_EVENT, listener);
  window.addEventListener(LEGACY_ASSISTANT_EVENT, listener);
  return () => {
    window.removeEventListener(ASSISTANT_EVENT, listener);
    window.removeEventListener(LEGACY_ASSISTANT_EVENT, listener);
  };
}
