/**
 * How the studio assistant answers: length, tone and emoji. Stored per account
 * (same scoped local store as every other list) and read by every AI request,
 * so Settings, the assistant's own "/style" command and the replies agree.
 */
import { readValue, writeValue } from './localLists';

export type ReplyLength = 'short' | 'balanced' | 'detailed';
export type ReplyTone = 'friendly' | 'direct' | 'formal';
export type AssistantPrefs = { length: ReplyLength; tone: ReplyTone; emoji: boolean };

export const ASSISTANT_PREFS_KEY = 'cfb.assistantPrefs';
export const DEFAULT_ASSISTANT_PREFS: AssistantPrefs = { length: 'balanced', tone: 'friendly', emoji: false };

const LENGTHS: ReplyLength[] = ['short', 'balanced', 'detailed'];
const TONES: ReplyTone[] = ['friendly', 'direct', 'formal'];

export function readAssistantPrefs(): AssistantPrefs {
  const raw = readValue<Partial<AssistantPrefs>>(ASSISTANT_PREFS_KEY, {});
  return {
    length: LENGTHS.includes(raw.length as ReplyLength) ? (raw.length as ReplyLength) : DEFAULT_ASSISTANT_PREFS.length,
    tone: TONES.includes(raw.tone as ReplyTone) ? (raw.tone as ReplyTone) : DEFAULT_ASSISTANT_PREFS.tone,
    emoji: typeof raw.emoji === 'boolean' ? raw.emoji : DEFAULT_ASSISTANT_PREFS.emoji,
  };
}

export function writeAssistantPrefs(patch: Partial<AssistantPrefs>): AssistantPrefs {
  const next = { ...readAssistantPrefs(), ...patch };
  writeValue(ASSISTANT_PREFS_KEY, next);
  return next;
}

/** The instruction added to every AI request. */
export function assistantStyleInstruction(prefs: AssistantPrefs = readAssistantPrefs()): string {
  const length = prefs.length === 'short'
    ? 'Keep answers to 2–3 sentences or at most 3 bullets.'
    : prefs.length === 'detailed'
      ? 'Give thorough answers with steps and reasoning, still without filler.'
      : 'Keep answers concise: short paragraphs or a few bullets.';
  const tone = prefs.tone === 'direct'
    ? 'Tone: direct and plain, no pleasantries.'
    : prefs.tone === 'formal'
      ? 'Tone: formal and professional.'
      : 'Tone: warm and friendly, still practical.';
  const emoji = prefs.emoji ? 'Emoji are welcome where they help.' : 'Do not use emoji.';
  return `${length} ${tone} ${emoji}`;
}
