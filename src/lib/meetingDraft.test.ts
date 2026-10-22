import { describe, expect, it } from 'vitest';
import { sessionFromMeetingDraft, type MeetingDraft } from './meetingDraft';

const draft: MeetingDraft = { date: '2026-11-12', time: '14:30', type: 'Video Call', notes: '  Review the pitch  ' };
const investor = { id: 'investor-test', name: 'Test Investor' };

describe('meeting draft → calendar session', () => {
  it('preserves the chosen local date/time as an ISO instant, investor, type and notes', () => {
    const result = sessionFromMeetingDraft(draft, investor, 'session-test');
    expect(result.error).toBeUndefined();
    expect(result.session).toMatchObject({
      id: 'session-test', title: 'Video Call · Test Investor',
      description: 'Review the pitch', participants: ['Test Investor'],
      time: new Date('2026-11-12T14:30:00').toISOString(),
    });
  });
  it.each([
    { date: '', time: '14:30' },
    { date: '2026-11-12', time: '' },
    { date: '2026-02-30', time: '14:30' },
    { date: '2026-11-12', time: '25:00' },
    { date: 'not-a-date', time: '14:30' },
  ])('does not accept an incomplete or invalid date/time: %j', (fields) => {
    expect(sessionFromMeetingDraft({ ...draft, ...fields }, investor, 'x')).toEqual({ error: 'datetime' });
  });
  it('does not silently create a meeting for an unknown investor', () => {
    expect(sessionFromMeetingDraft(draft, undefined, 'x')).toEqual({ error: 'investor' });
  });
  it('does not change the input draft or fabricate notes', () => {
    const input = { ...draft, notes: '   ' };
    const result = sessionFromMeetingDraft(input, investor, 'x');
    expect(result.session?.description).toBeUndefined();
    expect(input.notes).toBe('   ');
  });
});
