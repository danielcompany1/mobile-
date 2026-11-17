import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlineState, isValidTimeZone, localDateAt, localDateTimeToUtc, reminderInstants } from './dates.ts';

test('converts local due times across daylight-saving transitions', () => {
  assert.equal(localDateTimeToUtc('2026-03-08', '09:00', 'America/Chicago').toISOString(), '2026-03-08T14:00:00.000Z');
  assert.equal(localDateTimeToUtc('2026-11-01', '01:30', 'America/Chicago').toISOString(), '2026-11-01T06:30:00.000Z');
  assert.throws(() => localDateTimeToUtc('2026-03-08', '02:30', 'America/Chicago'), /does not exist/);
});

test('labels dates using the student time zone and ignores completed items', () => {
  const now = new Date('2026-05-10T04:30:00Z'); // still May 9 in Chicago
  assert.equal(localDateAt(now, 'America/Chicago'), '2026-05-09');
  assert.equal(deadlineState('2026-05-08', now, 'America/Chicago'), 'overdue');
  assert.equal(deadlineState('2026-05-09', now, 'America/Chicago'), 'today');
  assert.equal(deadlineState('2026-05-08', now, 'America/Chicago', true), 'upcoming');
});

test('time zone identifiers are validated before saving', () => {
  assert.equal(isValidTimeZone('America/Chicago'), true);
  assert.equal(isValidTimeZone('Not/A_TimeZone'), false);
});

test('reminder offsets are converted to stable UTC instants', () => {
  const reminders = reminderInstants('2030-05-15', '12:00', 'America/Chicago', [60, 1440, 60, -4]);
  assert.deepEqual(reminders.map((d) => d.toISOString()), ['2030-05-14T17:00:00.000Z', '2030-05-15T16:00:00.000Z']);
});
