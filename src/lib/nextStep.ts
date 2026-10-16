/**
 * One next step for the signed-in founder. Same order the studio assistant
 * uses, so Dashboard and chat never disagree about what to do first.
 */
import { CAST } from '../data/cast';
import { readFitCheck } from './fitCheck';
import { fromProfile, listWords, rankPeople, type CompatibilityInput } from './compatibility';
import { effectiveStatus, readMilestones, readNeeds } from './localLists';

export type StudioNext = {
  id: string;
  en: string;
  el: string;
  href: string;
  prompt?: string;
};

export function studioNextStep(profile: CompatibilityInput | null): StudioNext {
  const looking = listWords(profile?.lookingFor);
  const fit = readFitCheck();
  if (!fit && looking.length === 0) {
    return {
      id: 'quiz',
      en: 'Take the 60-second fit check so Matches can score people on the same five fields.',
      el: 'Κάνε το fit check 60″ ώστε οι Αντιστοιχίσεις να βαθμολογήσουν στα ίδια πέντε πεδία.',
      href: '/quiz',
    };
  }
  if (looking.length === 0) {
    return {
      id: 'looking',
      en: 'Add what you still need on Profile — matching ranks people who cover those skills.',
      el: 'Πρόσθεσε στο Προφίλ τι χρειάζεσαι ακόμα — η αντιστοίχιση βαθμολογεί όσους τα καλύπτουν.',
      href: '/profile',
      prompt: 'What does my founding team still lack?',
    };
  }
  const overdue = readMilestones()
    .map((item) => ({ ...item, status: effectiveStatus(item) }))
    .filter((item) => item.status === 'Overdue');
  if (overdue[0]) {
    return {
      id: 'overdue',
      en: `${overdue[0].title} is overdue. Open Milestones to move it, or ask the assistant.`,
      el: `Το ${overdue[0].title} είναι εκπρόθεσμο. Άνοιξε τα Ορόσημα ή ρώτα τον βοηθό.`,
      href: '/milestones',
      prompt: 'What is overdue?',
    };
  }
  const openNeeds = readNeeds().filter((item) => item.status === 'open');
  if (openNeeds.length === 0) {
    return {
      id: 'need',
      en: 'Write a need card: what exists, the outcome, who is missing. The assistant stores the same list Network can read.',
      el: 'Γράψε κάρτα ανάγκης: τι υπάρχει, το αποτέλεσμα, ποιος λείπει. Ο βοηθός κρατά την ίδια λίστα.',
      href: '/network',
      prompt: 'Draft a need card for a co-founder',
    };
  }
  const ranked = rankPeople(
    fromProfile(profile),
    CAST.filter((person) => person.role === 'Founder' || person.role === 'Co-Founder Candidate'),
  )[0];
  if (ranked?.fit.score != null) {
    return {
      id: 'match',
      en: `Next: talk to ${ranked.person.fullName} (${ranked.fit.score}%). ${ranked.fit.headline?.en ?? ranked.person.headline}`,
      el: `Επόμενο: μίλα με ${ranked.person.fullName} (${ranked.fit.score}%). ${ranked.fit.headline?.el ?? ranked.person.headline}`,
      href: `/profile/${ranked.person.id}`,
      prompt: `Why do I match with ${ranked.person.fullName}?`,
    };
  }
  return {
    id: 'matches',
    en: 'Open Matches to rank people on this profile.',
    el: 'Άνοιξε τις Αντιστοιχίσεις για κατάταξη σε αυτό το προφίλ.',
    href: '/matches',
  };
}
