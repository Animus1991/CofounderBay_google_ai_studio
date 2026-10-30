/**
 * A specialist's on-device answer when the AI model is not configured — the same
 * operator as the studio panel. Its own module so Messages loads the operator
 * only when a specialist is actually asked something.
 */
import { assistantContextBlock, runAssistant, type AssistantProfile } from '../services/assistantOps';
import { getLang } from './language';

export { assistantContextBlock, runAssistant };

export function localSpecialistReply(text: string, profile: AssistantProfile | null, lang: 'en' | 'el' = getLang()): string {
  const result = runAssistant(text, profile);
  const primary = (lang === 'el' ? result.el : result.en).trim();
  const secondary = (lang === 'el' ? result.en : result.el).trim();
  return primary || secondary;
}
