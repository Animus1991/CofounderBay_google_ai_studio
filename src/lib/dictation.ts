/**
 * The browser's own speech recognition (Web Speech API), for dictating into the
 * assistant box on phones and tablets, where typing is the hard part. Offered
 * only where the API exists and the pointer is a finger; nothing is promised
 * that the device cannot do.
 */
export type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function recognitionConstructor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function dictationAvailable(): boolean {
  if (!recognitionConstructor()) return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}
