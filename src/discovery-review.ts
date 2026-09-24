import { places } from './data.ts';
import { lastEnded, occurrences, pacificToday, stapleById } from './occurrences.ts';
import { staples } from './staples.ts';

export type ReviewIssue = { kind: 'needs-date' | 'recheck-occurrence' | 'ended-occurrence' | 'stale-place' | 'invalid'; id: string; name: string; detail: string; url?: string };

const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const seasons: Record<string, number[]> = {
  autumn: [9, 10, 11], 'winter-early spring': [12, 1, 2, 3, 4], 'late spring': [4, 5, 6], summer: [6, 7, 8],
  'late summer-autumn': [8, 9, 10, 11], 'holiday season': [11, 12],
};

export function customaryMonths(timing = ''): number[] {
  const value = timing.toLowerCase();
  if (seasons[value]) return seasons[value];
  const found = monthNames.map((name, index) => ({ index: value.indexOf(name), month: index + 1 })).filter(match => match.index >= 0).sort((first, second) => first.index - second.index).map(match => match.month);
  if (found.length === 2 && value.includes('-')) {
    const months: number[] = [];
    for (let month = found[0]; ; month = month % 12 + 1) { months.push(month); if (month === found[1]) break; }
    return months;
  }
  return found;
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
function daysBetween(first: string, second: string): number {
  return Math.round((Date.parse(`${second}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000);
}
function monthsInWindow(start: string, end: string): Set<number> {
  const months = new Set<number>();
  for (let date = start; date <= end; date = addDays(date, 1)) months.add(Number(date.slice(5, 7)));
  return months;
}

export function reviewDiscovery(today = pacificToday(), { lookaheadDays = 60, placeMaxAgeDays = 120, occurrenceMaxAgeDays = 30 } = {}): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const window = monthsInWindow(today, addDays(today, lookaheadDays));
  for (const occurrence of occurrences) {
    const staple = stapleById.get(occurrence.stapleId);
    if (!staple) { issues.push({ kind: 'invalid', id: occurrence.stapleId, name: occurrence.stapleId, detail: 'Occurrence references an unknown staple.' }); continue; }
    const last = occurrence.end ?? occurrence.start;
    if (last < today) {
      // Recent editions stay as history so the review knows this year's event already happened.
      if (daysBetween(last, today) > 400) issues.push({ kind: 'ended-occurrence', id: staple.id, name: staple.name, detail: `Ended ${last}; remove this old edition.`, url: occurrence.url });
      continue;
    }
    const age = daysBetween(occurrence.checkedAt, today);
    const soon = daysBetween(today, occurrence.start) <= 14;
    if (age > occurrenceMaxAgeDays || soon && age > 7) issues.push({ kind: 'recheck-occurrence', id: staple.id, name: staple.name, detail: `${occurrence.start}${soon ? ' is coming up' : ''}; last checked ${occurrence.checkedAt}. Reconfirm dates and cancellations.`, url: occurrence.url });
  }
  for (const staple of staples) {
    if (!staple.event) continue;
    const months = customaryMonths(staple.timing);
    if (!months.some(month => window.has(month))) continue;
    if (occurrences.some(occurrence => occurrence.stapleId === staple.id && (occurrence.end ?? occurrence.start) >= today)) continue;
    const ended = lastEnded(staple.id, today);
    if (ended && daysBetween(ended, today) <= 180) continue;
    issues.push({ kind: 'needs-date', id: staple.id, name: staple.name, detail: `Usually ${staple.timing}; no confirmed upcoming date. Check the organizer and add an occurrence, or note that it is not happening.` });
  }
  for (const place of places) {
    // Dated places are retained only so existing saved plans still resolve.
    if (place.eventDate) continue;
    const age = daysBetween(place.checkedAt, today);
    if (age > placeMaxAgeDays) issues.push({ kind: 'stale-place', id: place.id, name: place.name, detail: `Reviewed ${place.checkedAt} (${age} days ago). Recheck hours, prices, closures and access.`, url: place.website });
  }
  return issues;
}

export function reviewUrls(): { id: string; name: string; url: string }[] {
  return [
    ...places.map(place => ({ id: place.id, name: place.name, url: place.website })),
    ...occurrences.map(occurrence => ({ id: occurrence.stapleId, name: stapleById.get(occurrence.stapleId)?.name ?? occurrence.stapleId, url: occurrence.url })),
  ];
}
