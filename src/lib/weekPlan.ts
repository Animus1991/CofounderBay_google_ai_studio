import { agendaFor } from './agenda';
import {
  effectiveStatus,
  followUps,
  readMilestones,
  readTasks,
  type FollowUp,
} from './localLists';
import { messagingBridge } from './messagingBridge';
import { currentNotes, waitsOnReader } from './notificationFeed';
import { incomingRequests } from './requests';
import type { Milestone } from '../types';

type NamedDay = { title: string; day: number };

export type WeekPlan = {
  en: string;
  el: string;
  links: { href: string; en: string; el: string }[];
  followUps: { en: string; el: string }[];
  startable: Milestone[];
  canTriage: boolean;
  facts: {
    overdueMilestones: NamedDay[];
    dueMilestones: NamedDay[];
    sessions: NamedDay[];
    overdueTasks: NamedDay[];
    dueTasks: NamedDay[];
    overdueFollowUps: FollowUp[];
    dueFollowUps: FollowUp[];
    requests: string[];
    unreadThreads: { name: string; unread: number }[];
    waitingNotifications: number;
  };
};

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function dayOffset(value: string, now: Date): number | null {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((dayStart(date) - dayStart(now)) / 86_400_000);
}

function names(items: NamedDay[], lang: 'en' | 'el'): string {
  return items.slice(0, 3).map((item) => {
    const when = item.day === 0
      ? (lang === 'el' ? 'σήμερα' : 'today')
      : item.day === 1
        ? (lang === 'el' ? 'αύριο' : 'tomorrow')
        : lang === 'el' ? `σε ${item.day} ημέρες` : `in ${item.day} days`;
    return `${item.title} (${when})`;
  }).join(', ');
}

export function weekPlan(now: Date = new Date()): WeekPlan {
  // Soonest first everywhere, so the names read in the order they fall due.
  const byDay = (a: { day: number }, b: { day: number }) => a.day - b.day;
  const milestones = readMilestones()
    .map((item) => ({ item, day: dayOffset(item.targetDate, now) }))
    .filter((entry): entry is { item: Milestone; day: number } => entry.day != null && effectiveStatus(entry.item, now) !== 'Completed')
    .sort(byDay);
  const overdueMilestones = milestones.filter(({ day }) => day < 0).map(({ item, day }) => ({ title: item.title, day }));
  const dueMilestones = milestones.filter(({ day }) => day >= 0 && day <= 6).map(({ item, day }) => ({ title: item.title, day }));
  const sessions = agendaFor('week', now)
    .filter((item) => item.kind === 'session')
    .map((item) => ({ title: item.title, day: dayOffset(item.at, now) ?? 0 }));
  const tasks = readTasks()
    .filter((task) => task.status !== 'Done' && task.due)
    .map((task) => ({ title: task.title, day: dayOffset(task.due!, now) }))
    .filter((entry): entry is NamedDay => entry.day != null)
    .sort(byDay);
  const overdueTasks = tasks.filter((item) => item.day < 0);
  const dueTasks = tasks.filter((item) => item.day >= 0 && item.day <= 6);
  const investor = followUps(undefined, now);
  const overdueFollowUps = investor.overdue;
  const dueFollowUps = investor.soon.filter((item) => item.inDays <= 7);
  const requests = incomingRequests().map((item) => item.name);
  const unreadThreads = (messagingBridge()?.threads() ?? [])
    .filter((thread) => !thread.muted && thread.unread > 0)
    .map((thread) => ({ name: thread.name, unread: thread.unread }));
  const unreadNotes = currentNotes().filter((note) => !note.read);
  const waitingNotifications = unreadNotes.filter(waitsOnReader).length;
  const canTriage = unreadNotes.some((note) => !waitsOnReader(note));

  const en: string[] = ['**The next 7 days**'];
  const el: string[] = ['**Οι επόμενες 7 ημέρες**'];
  if (overdueMilestones.length) {
    en.push(`• Overdue milestones: ${overdueMilestones.slice(0, 3).map((item) => item.title).join(', ')}.`);
    el.push(`• Εκπρόθεσμα ορόσημα: ${overdueMilestones.slice(0, 3).map((item) => item.title).join(', ')}.`);
  }
  if (dueMilestones.length) {
    en.push(`• Milestones due: ${names(dueMilestones, 'en')}.`);
    el.push(`• Ορόσημα που λήγουν: ${names(dueMilestones, 'el')}.`);
  }
  if (sessions.length) {
    en.push(`• Calendar sessions: ${names(sessions, 'en')}.`);
    el.push(`• Συναντήσεις Ημερολογίου: ${names(sessions, 'el')}.`);
  }
  if (overdueTasks.length || dueTasks.length) {
    en.push(`• Workspace tasks: ${overdueTasks.length ? `${overdueTasks.length} overdue` : ''}${overdueTasks.length && dueTasks.length ? ' · ' : ''}${dueTasks.length ? names(dueTasks, 'en') : ''}.`);
    el.push(`• Εργασίες Χώρου εργασίας: ${overdueTasks.length ? `${overdueTasks.length} εκπρόθεσμες` : ''}${overdueTasks.length && dueTasks.length ? ' · ' : ''}${dueTasks.length ? names(dueTasks, 'el') : ''}.`);
  }
  if (overdueFollowUps.length || dueFollowUps.length) {
    const followUpDays = (lang: 'en' | 'el') => names(dueFollowUps.map((item) => ({ title: item.name ?? item.investorId, day: item.inDays })), lang);
    en.push(`• Investor follow-ups: ${overdueFollowUps.length ? `${overdueFollowUps.length} overdue (${overdueFollowUps.slice(0, 3).map((item) => item.name ?? item.investorId).join(', ')})` : ''}${overdueFollowUps.length && dueFollowUps.length ? ' · ' : ''}${followUpDays('en')}.`);
    el.push(`• Follow-ups επενδυτών: ${overdueFollowUps.length ? `${overdueFollowUps.length} εκπρόθεσμα (${overdueFollowUps.slice(0, 3).map((item) => item.name ?? item.investorId).join(', ')})` : ''}${overdueFollowUps.length && dueFollowUps.length ? ' · ' : ''}${followUpDays('el')}.`);
  }
  if (requests.length) {
    en.push(`• Connection requests waiting: ${requests.slice(0, 3).join(', ')}.`);
    el.push(`• Αιτήματα σύνδεσης σε αναμονή: ${requests.slice(0, 3).join(', ')}.`);
  }
  if (unreadThreads.length) {
    en.push(`• Unread messages: ${unreadThreads.slice(0, 3).map((item) => `${item.name} (${item.unread})`).join(', ')}.`);
    el.push(`• Αδιάβαστα μηνύματα: ${unreadThreads.slice(0, 3).map((item) => `${item.name} (${item.unread})`).join(', ')}.`);
  }
  if (waitingNotifications) {
    en.push(`• Notifications waiting on you: ${waitingNotifications}.`);
    el.push(`• Ειδοποιήσεις που περιμένουν από σένα: ${waitingNotifications}.`);
  }

  const startable = milestones
    .filter(({ item, day }) => (item.status === 'Planned' || item.status === 'Delayed') && (day < 0 || day <= 6))
    .sort((a, b) => (a.day < 0 ? -1 : 0) - (b.day < 0 ? -1 : 0) || a.day - b.day)
    .map(({ item }) => item)
    .slice(0, 3);
  const hasSteps = canTriage || startable.length > 0;
  const hasFacts = en.length > 1;
  if (!hasFacts) {
    en.push('• It is a quiet week — nothing due or waiting on you.');
    el.push('• Ήσυχη εβδομάδα — τίποτα δεν λήγει ή περιμένει από σένα.');
  }
  if (hasSteps) {
    en.push('', 'Below, what I can prepare now — each runs only if you confirm it, and can be undone.');
    el.push('', 'Παρακάτω είναι όσα μπορώ να ετοιμάσω τώρα — το καθένα εκτελείται μόνο αν το επιβεβαιώσεις και μπορεί να αναιρεθεί.');
  }

  const links = [
    { href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' },
    { href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' },
    { href: '/notifications', en: 'Open notifications', el: 'Άνοιγμα ειδοποιήσεων' },
    { href: '/fundraising?tab=crm', en: 'Open investor CRM', el: 'Άνοιγμα CRM επενδυτών' },
    { href: '/network?tab=requests', en: 'Open requests', el: 'Άνοιγμα αιτημάτων' },
    { href: '/messages', en: 'Open messages', el: 'Άνοιγμα μηνυμάτων' },
  ].filter((link) => {
    if (link.href === '/calendar') return sessions.length > 0;
    if (link.href === '/milestones') return overdueMilestones.length + dueMilestones.length > 0;
    if (link.href === '/notifications') return waitingNotifications > 0 || canTriage;
    if (link.href.startsWith('/fundraising')) return overdueFollowUps.length + dueFollowUps.length > 0;
    if (link.href.startsWith('/network')) return requests.length > 0;
    return unreadThreads.length > 0;
  });
  const firstInvestor = overdueFollowUps[0];
  // Worded the way investorOps.parseInvestorEmail reads a request, so the chip drafts the email.
  const followUpChips = firstInvestor
    ? [{
      en: `Draft a follow-up email to ${firstInvestor.name}`,
      el: `Γράψε follow-up email για ${firstInvestor.name}`,
    }]
    : [];

  return {
    en: en.join('\n'),
    el: el.join('\n'),
    links,
    followUps: followUpChips,
    startable,
    canTriage,
    facts: {
      overdueMilestones,
      dueMilestones,
      sessions,
      overdueTasks,
      dueTasks,
      overdueFollowUps,
      dueFollowUps,
      requests,
      unreadThreads,
      waitingNotifications,
    },
  };
}
