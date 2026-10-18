import { beforeEach, describe, expect, it } from 'vitest';
import { studioNextStep, studioWaiting } from './nextStep';
import { addSession, resetAllLists, writeTasks } from './localLists';

describe('studioNextStep', () => {
  beforeEach(() => {
    resetAllLists();
    try {
      localStorage.removeItem('cfb.fitCheck');
    } catch {
      /* ignore */
    }
  });

  it('asks for the fit check when looking-for is empty', () => {
    const next = studioNextStep({});
    expect(next.id).toBe('quiz');
    expect(next.href).toBe('/quiz');
  });

  it('points at a named match when looking-for is filled', () => {
    const next = studioNextStep({
      skills: ['TypeScript', 'React'],
      lookingFor: ['Sales', 'Growth'],
      industry: 'FinTech',
      stage: 'Pre-seed',
      commitment: 'Full-time',
      city: 'Athens',
      timezone: 'Europe/Athens',
    });
    expect(['need', 'match', 'overdue']).toContain(next.id);
    expect(next.href).toBeTruthy();
  });
});

describe('studioWaiting', () => {
  beforeEach(() => {
    resetAllLists();
  });

  it('surfaces a session that starts within the hour', () => {
    const at = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    addSession({
      id: 's-soon',
      title: 'Mentor office hours',
      type: 'Mentorship',
      time: at,
      duration: '30m',
      location: 'Zoom',
      participants: [],
      priority: 'High',
    });
    const waiting = studioWaiting();
    expect(waiting?.id).toBe('session-s-soon');
    expect(waiting?.href).toBe('/calendar');
  });

  it('falls back to a task due today', () => {
    writeTasks([{
      id: 'due',
      title: 'Send the intro',
      priority: 'High',
      status: 'Todo',
      deadline: 'Today',
      timeTracked: 0,
      estimatedTime: 60,
      tags: [],
    }]);
    const waiting = studioWaiting();
    expect(waiting?.id).toBe('task-due');
    expect(waiting?.href).toBe('/workspace');
  });
});
