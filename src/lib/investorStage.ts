import { labelIn } from './labels';

/** One Greek name per investor-pipeline stage: the CRM, the notifications and the assistant all read it. */
export const INVESTOR_STAGE_EL: Record<string, string> = {
  Identified: 'Εντοπίστηκε',
  Contacted: 'Έγινε επαφή',
  Meeting: 'Συνάντηση',
  'Due Diligence': 'Δέουσα επιμέλεια',
  'Term Sheet': 'Βασικοί όροι συμφωνίας',
  Closed: 'Κλειστό',
  Passed: 'Απορρίφθηκε',
};

export function investorStageLabel(stage: string, lang: 'en' | 'el'): string {
  return lang === 'el' ? INVESTOR_STAGE_EL[stage] ?? labelIn(stage, 'el') : stage;
}
