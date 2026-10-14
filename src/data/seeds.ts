/**
 * Starting data for the demo account. Dates are relative to the day the demo
 * is opened, so "overdue" and "next week" stay true whenever it is viewed.
 */
import type { Milestone } from '../types';

function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function seedMilestones(): Milestone[] {
  const now = new Date().toISOString();
  const base = { ownerId: 'demo-user', createdAt: now, updatedAt: now };
  return [
    {
      ...base,
      id: 'm-mvp',
      title: 'MVP launch',
      description: 'Release the first version to the beta testers on the waitlist.',
      targetDate: inDays(21),
      status: 'In Progress',
      category: 'Product',
      priority: 'High',
      progress: 67,
      tasks: [
        { id: 'm-mvp-1', title: 'User authentication', completed: true },
        { id: 'm-mvp-2', title: 'Profile system', completed: true },
        { id: 'm-mvp-3', title: 'Matching algorithm', completed: false },
      ],
    },
    {
      ...base,
      id: 'm-legal',
      title: 'Legal incorporation',
      description: 'Register the company and sign the founder agreements.',
      targetDate: inDays(-30),
      status: 'Completed',
      category: 'Legal',
      priority: 'Medium',
      progress: 100,
      tasks: [
        { id: 'm-legal-1', title: 'Articles of association', completed: true },
        { id: 'm-legal-2', title: 'Tax registration', completed: true },
      ],
    },
    {
      ...base,
      id: 'm-round',
      title: 'Pre-seed round preparation',
      description: 'Finish the deck, the financial model and the investor list.',
      targetDate: inDays(60),
      status: 'Planned',
      category: 'Funding',
      priority: 'High',
      progress: 50,
      tasks: [
        { id: 'm-round-1', title: 'Pitch deck final version', completed: true },
        { id: 'm-round-2', title: 'Investor outreach list', completed: false },
      ],
    },
    {
      ...base,
      id: 'm-users',
      title: 'First 100 users',
      description: 'Reach 100 weekly active users from the beta.',
      targetDate: inDays(-5),
      status: 'In Progress',
      category: 'Marketing',
      priority: 'High',
      progress: 50,
      tasks: [
        { id: 'm-users-1', title: 'Referral programme launch', completed: true },
        { id: 'm-users-2', title: 'Content marketing plan', completed: false },
      ],
    },
    {
      ...base,
      id: 'm-gdpr',
      title: 'GDPR compliance review',
      description: 'Check data handling against GDPR before the public launch.',
      targetDate: inDays(35),
      status: 'In Progress',
      category: 'Legal',
      priority: 'Medium',
      progress: 50,
      tasks: [
        { id: 'm-gdpr-1', title: 'Data map and records of processing', completed: true },
        { id: 'm-gdpr-2', title: 'Privacy policy and DPA', completed: false },
      ],
    },
  ];
}
