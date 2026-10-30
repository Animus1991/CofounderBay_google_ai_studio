/**
 * One next step for the signed-in founder. Same order the studio assistant
 * uses, so Dashboard and chat never disagree about what to do first.
 */
import { cofounderPool } from './peopleSource';
import { readFitCheck } from './fitCheck';
import { fromProfile, listWords, rankPeople, type CompatibilityInput } from './compatibility';
import { effectiveStatus, followUps, readMilestones, readNeeds, readRound, readSessions, readTasks } from './localLists';

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
      en: 'Complete the 60-second fit check to unlock compatibility scoring.',
      el: 'Ολοκλήρωσε το fit check 60″ για να ξεκλειδώσεις τη βαθμολόγηση συμβατότητας.',
      href: '/quiz?from=/matches',
      title: { en: 'Complete the 60-second fit check', el: 'Ολοκλήρωσε το fit check των 60″' },
      action: { en: 'Fit check', el: 'Fit check' },
    };
  }
  if (looking.length === 0) {
    return {
      id: 'looking',
      en: 'Add the roles and skills you are looking for on your Profile.',
      el: 'Πρόσθεσε στο Προφίλ τους ρόλους και τις δεξιότητες που αναζητάς.',
      href: '/profile',
      prompt: 'What does my founding team still lack?',
      title: { en: 'Add what you are looking for on your Profile', el: 'Πρόσθεσε στο Προφίλ τι αναζητάς στην ομάδα σου' },
      action: { en: 'Profile', el: 'Προφίλ' },
    };
  }
  const overdue = readMilestones()
    .map((item) => ({ ...item, status: effectiveStatus(item) }))
    .filter((item) => item.status === 'Overdue');
  if (overdue[0]) {
    return {
      id: 'overdue',
      en: `Milestone "${overdue[0].title}" is overdue.`,
      el: `Το ορόσημο «${overdue[0].title}» είναι εκπρόθεσμο.`,
      href: '/milestones',
      prompt: 'What is overdue?',
      title: { en: `"${overdue[0].title}" is overdue`, el: `Το «${overdue[0].title}» είναι εκπρόθεσμο` },
      why: overdue.length > 1
        ? { en: `+${overdue.length - 1} more overdue`, el: `+${overdue.length - 1} ακόμη εκπρόθεσμα` }
        : undefined,
      action: { en: 'Milestones', el: 'Ορόσημα' },
    };
  }
  const openNeeds = readNeeds().filter((item) => item.status === 'open');
  if (openNeeds.length === 0) {
    return {
      id: 'need',
      en: 'Publish a need card to share what role or outcome your team needs next.',
      el: 'Δημοσίευσε μια κάρτα ανάγκης για τον ρόλο ή τον στόχο που χρειάζεσαι.',
      href: '/network?tab=needs',
      prompt: 'Draft a need card for a co-founder',
      title: { en: 'Publish a startup need card', el: 'Δημοσίευσε μια κάρτα ανάγκης' },
      action: { en: 'Need cards', el: 'Κάρτες ανάγκης' },
    };
  }
  const ranked = rankPeople(
    fromProfile(profile),
    cofounderPool(),
  )[0];
  if (ranked?.fit.score != null) {
    return {
      id: 'match',
      en: `Top match: ${ranked.person.fullName} (${ranked.fit.score}%).`,
      el: `Κορυφαία αντιστοίχιση: ${ranked.person.fullName} (${ranked.fit.score}%).`,
      href: `/profile/${ranked.person.id}`,
      prompt: `Why do I match with ${ranked.person.fullName}?`,
      title: { en: `Talk to ${ranked.person.fullName} · ${ranked.fit.score}%`, el: `Μίλα με ${ranked.person.fullName} · ${ranked.fit.score}%` },
      why: { en: ranked.fit.headline?.en ?? ranked.person.headline, el: ranked.fit.headline?.el ?? ranked.person.headline },
      action: { en: 'Profile', el: 'Προφίλ' },
    };
  }
  return {
    id: 'matches',
    en: 'Explore ranked co-founder matches for your profile.',
    el: 'Δες τις προτεινόμενες αντιστοιχίσεις για το προφίλ σου.',
    href: '/matches',
    action: { en: 'Matches', el: 'Αντιστοιχίσεις' },
  };
}

/** What waits on the founder before the next step: a session within the hour, then work due today. */
/** "29 Oct" / "29 Οκτ" for a YYYY-MM-DD. */
function dayLabel(day: string, lang: 'en' | 'el'): string {
  const date = new Date(`${day}T12:00:00`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' });
}

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
      action: { en: 'Calendar', el: 'Ημερολόγιο' },
    };
  }
  // An investor follow-up that has slipped outranks today's tasks: the investor is waiting.
  const late = followUps(readRound(), new Date(now)).overdue;
  if (late[0]) {
    const first = late[0];
    return {
      id: `followup-${first.investorId}`,
      en: `${first.name}: ${first.nextStep} is overdue.`,
      el: `${first.name}: «${first.nextStep}» είναι εκπρόθεσμο.`,
      href: '/fundraising?tab=tracker',
      title: { en: `${first.name} is waiting: ${first.nextStep}`, el: `Η/Ο ${first.name} περιμένει: ${first.nextStep}` },
      why: late.length > 1
        ? { en: `+${late.length - 1} more investor follow-up overdue`, el: `+${late.length - 1} ακόμη εκπρόθεσμα follow-ups` }
        : { en: `Was due ${dayLabel(first.nextDate, 'en')}`, el: `Έληγε ${dayLabel(first.nextDate, 'el')}` },
      action: { en: 'Open pipeline', el: 'Άνοιγμα ροής' },
      prompt: 'What follow-ups are due?',
    };
  }
  const due = readTasks().filter((task) => task.status !== 'Done' && /^today$/i.test(task.deadline.trim()));
  if (due[0]) {
    return {
      id: `task-${due[0].id}`,
      en: `${due[0].title} is due today.`,
      el: `Το «${due[0].title}» λήγει σήμερα.`,
      href: '/workspace',
      title: { en: `${due[0].title} is due today`, el: `Το «${due[0].title}» λήγει σήμερα` },
      why: due.length > 1
        ? { en: `+${due.length - 1} more due today`, el: `+${due.length - 1} ακόμη σήμερα` }
        : undefined,
      action: { en: 'Workspace', el: 'Χώρος εργασίας' },
    };
  }
  return null;
}
