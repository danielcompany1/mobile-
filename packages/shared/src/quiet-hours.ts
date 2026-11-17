import { localDateAt, localDateTimeToUtc } from './dates.ts';

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

function minuteOfDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  const [hour, minute] = parts.split(':').map(Number);
  return hour! * 60 + minute!;
}

export function isQuietTime(instant: Date, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false;
  const start = quiet.start.slice(0, 5).split(':').map(Number);
  const end = quiet.end.slice(0, 5).split(':').map(Number);
  const from = start[0]! * 60 + start[1]!;
  const to = end[0]! * 60 + end[1]!;
  if (from === to) return false;
  const current = minuteOfDay(instant, quiet.timezone);
  return from < to ? current >= from && current < to : current >= from || current < to;
}

export function quietHoursEnd(instant: Date, quiet: QuietHours): Date | null {
  if (!isQuietTime(instant, quiet)) return null;
  const start = quiet.start.slice(0, 5).split(':').map(Number);
  const end = quiet.end.slice(0, 5).split(':').map(Number);
  const from = start[0]! * 60 + start[1]!;
  const to = end[0]! * 60 + end[1]!;
  const current = minuteOfDay(instant, quiet.timezone);
  const date = localDateAt(instant, quiet.timezone);
  const endDate = from >= to && current >= from
    ? new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
    : date;
  for (let minute = to; minute < to + 181; minute += 1) {
    const dayOffset = Math.floor(minute / 1440);
    const adjustedDate = dayOffset ? new Date(Date.parse(`${endDate}T00:00:00Z`) + dayOffset * 86_400_000).toISOString().slice(0, 10) : endDate;
    const localMinute = minute % 1440;
    try {
      return localDateTimeToUtc(adjustedDate, `${String(Math.floor(localMinute / 60)).padStart(2, '0')}:${String(localMinute % 60).padStart(2, '0')}`, quiet.timezone);
    } catch {
      // If quiet hours end in a DST gap, use the first valid local minute after the gap.
    }
  }
  throw new RangeError('Quiet hours do not have a valid end time in this time zone.');
}
