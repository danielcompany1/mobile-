export type DeadlineState = 'overdue' | 'today' | 'upcoming';

export function isValidTimeZone(timeZone: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(); return true; }
  catch { return false; }
}

function dateParts(value: string, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

function offsetAt(instant: number, timeZone: string): number {
  const p = dateParts(new Date(instant).toISOString(), timeZone);
  const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!);
  return (asUtc - Math.floor(instant / 1000) * 1000) / 60_000;
}

/** Convert a wall-clock date and time into UTC. Ambiguous fall-back times choose the earlier instant. */
export function localDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite) || hour! > 23 || minute! > 59) {
    throw new RangeError('Enter a valid local date and time.');
  }
  const wallClock = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  const offsets = new Set([-36, -12, 0, 12, 36].map((hours) => offsetAt(wallClock + hours * 3_600_000, timeZone)));
  const matches = [...offsets]
    .map((offset) => wallClock - offset * 60_000)
    .filter((instant) => {
      const p = dateParts(new Date(instant).toISOString(), timeZone);
      return p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute;
    })
    .sort((a, b) => a - b);
  if (matches.length === 0) throw new RangeError('That local time does not exist because the clocks change. Choose another time.');
  return new Date(matches[0]!);
}

export function dueInstant(date: string, time: string | null, timeZone: string): Date {
  return localDateTimeToUtc(date, time ?? '09:00', timeZone);
}

export function reminderInstants(date: string, time: string | null, timeZone: string, offsetsMinutes: number[]): Date[] {
  const deadline = dueInstant(date, time, timeZone).getTime();
  return [...new Set(offsetsMinutes.filter((offset) => Number.isFinite(offset) && offset >= 0))]
    .map((offset) => new Date(deadline - offset * 60_000))
    .filter((instant) => instant.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime());
}

export function localDateAt(instant: Date, timeZone: string): string {
  const p = dateParts(instant.toISOString(), timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function deadlineState(date: string, now: Date, timeZone: string, completed = false): DeadlineState {
  if (completed) return 'upcoming';
  const today = localDateAt(now, timeZone);
  return date < today ? 'overdue' : date === today ? 'today' : 'upcoming';
}

export function formatDeadline(date: string, time: string | null, timeZone: string): string {
  const instant = dueInstant(date, time, timeZone);
  const day = new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(instant);
  return time ? `${day} · ${new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit' }).format(instant)}` : `${day} · All day`;
}
