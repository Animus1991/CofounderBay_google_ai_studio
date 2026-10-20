import { describe, expect, it } from 'vitest';
import { demoActivityDelta, demoReadinessDelta, demoWeeklyConnections, demoWeeklyViews } from './demoStats';

describe('demoStats', () => {
 it('weekly sums match the series', () => {
  expect(demoWeeklyViews()).toBe(174);
  expect(demoWeeklyConnections()).toBe(23);
 });

 it('readiness delta is last minus previous', () => {
  expect(demoReadinessDelta()).toBe(13);
 });

 it('activity deltas are signed percents of the previous day', () => {
  expect(demoActivityDelta('views')).toBe(25);
  expect(demoActivityDelta('connections')).toBe(100);
  expect(demoActivityDelta('messages')).toBe(40);
 });
});
