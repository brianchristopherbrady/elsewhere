import type { Activity } from './activities.ts';
import { staples, type Staple } from './staples.ts';

// Organizer-confirmed dates. Add next year's edition when the organizer publishes it; ended entries hide automatically.
export type Occurrence = { stapleId: string; start: string; end?: string; time?: string; note?: string; url: string; checkedAt: string };

export const occurrences: Occurrence[] = [
  { stapleId: 'staple:live-aloha', start: '2026-09-13', url: 'https://www.seattlecenter.com/events/featured-events/festal/live-aloha-hawaiian-cultural-festival', checkedAt: '2026-09-22' },
  { stapleId: 'staple:sea-mar-fiestas-patrias', start: '2026-09-19', end: '2026-09-20', url: 'https://www.seattlecenter.com/events/featured-events/festal/sea-mar-fiestas-patrias', checkedAt: '2026-09-22' },
  { stapleId: 'staple:italian-festival', start: '2026-09-26', end: '2026-09-27', url: 'https://www.seattlecenter.com/events/featured-events/festal/the-italian-festival', checkedAt: '2026-09-22' },
  { stapleId: 'staple:croatiafest', start: '2026-10-04', url: 'https://www.seattlecenter.com/events/featured-events/festal/croatiafest', checkedAt: '2026-09-22' },
  { stapleId: 'staple:turkfest', start: '2026-10-10', end: '2026-10-11', url: 'https://www.seattlecenter.com/events/featured-events/festal/turkfest', checkedAt: '2026-09-22' },
  { stapleId: 'staple:trolloween', start: '2026-10-31', time: '7 PM at the Fremont Troll', url: 'https://fremontartscouncil.org/trolloween', checkedAt: '2026-09-22' },
  { stapleId: 'staple:dia-de-muertos', start: '2026-10-31', end: '2026-11-01', url: 'https://www.seattlecenter.com/events/featured-events/festal/dia-de-muertos', checkedAt: '2026-09-22' },
  { stapleId: 'staple:diwali', start: '2026-11-07', url: 'https://www.seattlecenter.com/events/featured-events/festal/diwali-lights-of-india', checkedAt: '2026-09-22' },
  { stapleId: 'staple:wildlanterns-at-woodland-park-zoo', start: '2026-11-13', end: '2027-01-17', time: '4-9 PM; last entry 8:30 PM', note: 'Closed Nov 16-18, 23, 26, 30; Dec 7, 14, 24-25; Jan 4-6, 11-13. Timed tickets.', url: 'https://www.zoo.org/wildlanterns', checkedAt: '2026-09-22' },
  { stapleId: 'staple:seattle-hmong-new-year', start: '2026-11-14', url: 'https://www.seattlecenter.com/events/featured-events/festal/hmong-new-year', checkedAt: '2026-09-22' },
  { stapleId: 'staple:seattle-marathon', start: '2026-11-29', note: 'Kids Marathon is November 28.', url: 'https://seattlemarathon.org/', checkedAt: '2026-09-22' },
];

export function pacificToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function nextOccurrence(stapleId: string, today = pacificToday()): Occurrence | undefined {
  return occurrences.filter(occurrence => occurrence.stapleId === stapleId && (occurrence.end ?? occurrence.start) >= today).sort((first, second) => first.start.localeCompare(second.start))[0];
}

export function lastEnded(stapleId: string, today = pacificToday()): string | undefined {
  return occurrences.map(occurrence => occurrence.stapleId === stapleId ? occurrence.end ?? occurrence.start : '').filter(end => end && end < today).sort().at(-1);
}

export function occurrenceLabel(occurrence: Occurrence): string {
  const format = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  return occurrence.end && occurrence.end !== occurrence.start ? `${format(occurrence.start)} - ${format(occurrence.end)}` : format(occurrence.start);
}

export function occurrenceActivity(staple: Staple, occurrence: Occurrence): Activity {
  return { id: `${staple.id}:${occurrence.start}`, name: staple.name, category: staple.group, address: `${staple.area ? `${staple.area}, ` : ''}Seattle, WA`, url: occurrence.url, date: occurrence.start, ...(occurrence.end ? { endDate: occurrence.end } : {}), ...(occurrence.time ? { notes: occurrence.time } : {}) };
}

export const stapleById = new Map(staples.map(staple => [staple.id, staple]));
