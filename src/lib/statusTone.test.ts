import { describe, expect, it } from 'vitest';
import { TONE_CLASSES, eventTone, statusTone } from './statusTone';

describe('status tones', () => {
  it('gives a status the same tone in any casing or separator', () => {
    for (const form of ['In Progress', 'in-progress', 'IN_PROGRESS', 'In-Progress', 'inprogress']) expect(statusTone(form)).toBe('info');
    expect(statusTone('Completed')).toBe('success');
    expect(statusTone('Done')).toBe('success');
    expect(statusTone('Review')).toBe('warning');
    expect(statusTone('in-review')).toBe('warning');
    expect(statusTone('Overdue')).toBe('danger');
    expect(statusTone('rejected')).toBe('danger');
    expect(statusTone('Planned')).toBe('neutral');
    expect(statusTone('Not Started')).toBe('neutral');
    expect(statusTone(undefined)).toBe('neutral');
    expect(statusTone('something new')).toBe('neutral');
  });

  it('gives calendar types one colour everywhere', () => {
    expect(eventTone('Meeting')).toBe('info');
    expect(eventTone('Deadline')).toBe('danger');
    expect(eventTone('Mentorship')).toBe('ai');
    expect(eventTone('Event')).toBe('success');
  });

  it('builds every label from the Primer quartet: subtle background, muted border, foreground text', () => {
    for (const [tone, classes] of Object.entries(TONE_CLASSES)) {
      expect(classes.label, tone).toMatch(/\bbg-/);
      expect(classes.label, tone).toMatch(/\bborder-/);
      expect(classes.label, tone).toMatch(/\btext-/);
      expect(classes.label.startsWith(classes.subtle), tone).toBe(true);
    }
    // Foreground text uses the AA steps (700/800, or the theme's primary ink), never the 400/500 tints.
    for (const tone of ['success', 'warning', 'danger', 'info', 'ai'] as const) {
      expect(TONE_CLASSES[tone].label).toMatch(/text-\w+-(700|800)\b/);
    }
  });
});
