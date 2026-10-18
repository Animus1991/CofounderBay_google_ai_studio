/**
 * One next step for the signed-in founder. Same order the studio assistant
 * uses, so Dashboard and chat never disagree about what to do first.
 */
import { CAST } from '../data/cast';
import { readFitCheck } from './fitCheck';
import { fromProfile, listWords, rankPeople, type CompatibilityInput } from './compatibility';
import { effectiveStatus, readMilestones, readNeeds, readSessions, readTasks } from './localLists';

type Words = { en: string; el: string };

export type StudioNext = {
  id: string;
  /** The whole sentence, as the assistant says it. */
  en: string;
  el: string;
  href: string;
  prompt?: string;
  /** The thing itself, for the home strip. Falls back to `en` / `el`. */
  title?: Words;
  why?: Words;
  /** The verb on the one button. */
  action?: Words;
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
      title: { en: 'Take the 60-second fit check', el: 'Κάνε το fit check των 60″' },
      why: { en: 'Matches scores people on the same five fields.', el: 'Οι Αντιστοιχίσεις βαθμολογούν στα ίδια πέντε πεδία.' },
      action: { en: 'Open fit check', el: 'Άνοιγμα fit check' },
    };
  }
  if (looking.length === 0) {
    return {
      id: 'looking',
      en: 'Add what you still need on Profile — matching ranks people who cover those skills.',
      el: 'Πρόσθεσε στο Προφίλ τι χρειάζεσαι ακόμα — η αντιστοίχιση βαθμολογεί όσους τα καλύπτουν.',
      href: '/profile',
      prompt: 'What does my founding team still lack?',
      title: { en: 'Add what you still need on Profile', el: 'Πρόσθεσε στο Προφίλ τι χρειάζεσαι ακόμα' },
      why: { en: 'Matching ranks people who cover those skills.', el: 'Η αντιστοίχιση βαθμολογεί όσους τα καλύπτουν.' },
      action: { en: 'Open profile', el: 'Άνοιγμα προφίλ' },
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
      title: { en: `${overdue[0].title} is overdue`, el: `Το «${overdue[0].title}» είναι εκπρόθεσμο` },
      why: overdue.length > 1
        ? { en: `${overdue.length - 1} more overdue on Milestones.`, el: `Ακόμα ${overdue.length - 1} εκπρόθεσμα στα Ορόσημα.` }
        : { en: 'Move the date or close it on Milestones.', el: 'Άλλαξε την ημερομηνία ή κλείσ’ το στα Ορόσημα.' },
      action: { en: 'Open milestones', el: 'Άνοιγμα οροσήμων' },
    };
  }
  const openNeeds = readNeeds().filter((item) => item.status === 'open');
  if (openNeeds.length === 0) {
    return {
      id: 'need',
      en: 'Write a need card: what exists, the outcome, who is missing. The assistant stores the same list Network can read.',
      el: 'Γράψε κάρτα ανάγκης: τι υπάρχει, το αποτέλεσμα, ποιος λείπει. Ο βοηθός κρατά την ίδια λίστα.',
      href: '/network?tab=needs',
      prompt: 'Draft a need card for a co-founder',
      title: { en: 'Write a need card', el: 'Γράψε κάρτα ανάγκης' },
      why: { en: 'What exists, the outcome, who is missing — Network keeps the same list.', el: 'Τι υπάρχει, το αποτέλεσμα, ποιος λείπει — το Δίκτυο κρατά την ίδια λίστα.' },
      action: { en: 'Open need cards', el: 'Άνοιγμα καρτών' },
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
      title: { en: `Talk to ${ranked.person.fullName} · ${ranked.fit.score}%`, el: `Μίλα με ${ranked.person.fullName} · ${ranked.fit.score}%` },
      why: { en: ranked.fit.headline?.en ?? ranked.person.headline, el: ranked.fit.headline?.el ?? ranked.person.headline },
      action: { en: 'Open profile', el: 'Άνοιγμα προφίλ' },
    };
  }
  return {
    id: 'matches',
    en: 'Open Matches to rank people on this profile.',
    el: 'Άνοιξε τις Αντιστοιχίσεις για κατάταξη σε αυτό το προφίλ.',
    href: '/matches',
    action: { en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' },
  };
}

/** What waits on the founder before the next step: a session within the hour, then work due today. */
export function studioWaiting(now = Date.now()): StudioNext | null {
  const soon = readSessions()
    .map((session) => ({ session, at: Date.parse(session.time) }))
    .filter(({ at }) => !Number.isNaN(at) && at > now && at - now <= 60 * 60 * 1000)
    .sort((a, b) => a.at - b.at)[0];
  if (soon) {
    const minutes = Math.max(1, Math.round((soon.at - now) / 60_000));
    return {
      id: `session-${soon.session.id}`,
      en: `${soon.session.title} starts in ${minutes} min.`,
      el: `Το «${soon.session.title}» ξεκινά σε ${minutes} λεπτά.`,
      href: '/calendar',
      title: { en: `${soon.session.title} starts in ${minutes} min`, el: `Το «${soon.session.title}» ξεκινά σε ${minutes} λεπτά` },
      why: soon.session.location ? { en: soon.session.location, el: soon.session.location } : undefined,
      action: { en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' },
    };
  }
  const due = readTasks().filter((task) => task.status !== 'Done' && /^today$/i.test(task.deadline.trim()));
  if (due[0]) {
    return {
      id: `task-${due[0].id}`,
      en: `${due[0].title} is due today on Workspace.`,
      el: `Το «${due[0].title}» λήγει σήμερα στον Χώρο εργασίας.`,
      href: '/workspace',
      title: { en: `${due[0].title} is due today`, el: `Το «${due[0].title}» λήγει σήμερα` },
      why: due.length > 1
        ? { en: `+${due.length - 1} more due today on Workspace.`, el: `+${due.length - 1} ακόμα λήγουν σήμερα στον Χώρο εργασίας.` }
        : { en: 'Same board as Workspace and the assistant.', el: 'Ο ίδιος πίνακας με τον Χώρο εργασίας και τον βοηθό.' },
      action: { en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' },
    };
  }
  return null;
}
