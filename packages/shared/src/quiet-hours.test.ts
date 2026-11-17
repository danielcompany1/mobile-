import test from 'node:test';
import assert from 'node:assert/strict';
import { isQuietTime, quietHoursEnd, type QuietHours } from './quiet-hours.ts';

const overnight: QuietHours = { enabled: true, start: '22:00', end: '08:00', timezone: 'America/Chicago' };
test('quiet hours handle windows that cross midnight in the user time zone', () => {
  assert.equal(isQuietTime(new Date('2026-06-01T04:00:00Z'), overnight), true);
  assert.equal(isQuietTime(new Date('2026-06-01T15:00:00Z'), overnight), false);
  assert.equal(quietHoursEnd(new Date('2026-06-01T04:00:00Z'), overnight)?.toISOString(), '2026-06-01T13:00:00.000Z');
});

test('quiet hours defer across a daylight-saving gap and equal endpoints disable the window', () => {
  const springGap = { ...overnight, start: '01:00', end: '02:30' };
  const end = quietHoursEnd(new Date('2026-03-08T07:30:00Z'), springGap);
  assert.equal(end?.toISOString(), '2026-03-08T08:00:00.000Z');
  assert.equal(isQuietTime(new Date('2026-06-01T04:00:00Z'), { ...overnight, start: '08:00', end: '08:00' }), false);
});
