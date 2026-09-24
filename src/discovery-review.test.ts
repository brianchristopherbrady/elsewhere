import { expect, it } from 'vitest';
import { validActivity } from './activities';
import { customaryMonths, reviewDiscovery } from './discovery-review';
import { nextOccurrence, occurrenceActivity, occurrences, stapleById } from './occurrences';

it('keeps confirmed occurrences sourced, ordered and linked to staples', () => {
  for (const occurrence of occurrences) {
    const staple = stapleById.get(occurrence.stapleId);
    expect(staple, occurrence.stapleId).toBeDefined();
    expect(occurrence.url).toMatch(/^https:\/\//);
    expect(occurrence.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((occurrence.end ?? occurrence.start) >= occurrence.start).toBe(true);
    expect(validActivity(occurrenceActivity(staple!, occurrence))).toBe(true);
  }
});

it('hides occurrences after they end', () => {
  expect(nextOccurrence('staple:trolloween', '2026-10-31')?.start).toBe('2026-10-31');
  expect(nextOccurrence('staple:trolloween', '2026-11-01')).toBeUndefined();
  expect(nextOccurrence('staple:wildlanterns-at-woodland-park-zoo', '2027-01-17')?.end).toBe('2027-01-17');
});

it('parses customary timing into months', () => {
  expect(customaryMonths('Late November-December')).toEqual([11, 12]);
  expect(customaryMonths('Late May-June')).toEqual([5, 6]);
  expect(customaryMonths('Winter-early spring')).toEqual([12, 1, 2, 3, 4]);
  expect(customaryMonths('October 31')).toEqual([10]);
  expect(customaryMonths('Recurring')).toEqual([]);
});

it('flags traditions that need dates, upcoming dates to reconfirm, ended editions and stale places', () => {
  const now = reviewDiscovery('2026-09-22');
  expect(now.filter(issue => issue.kind !== 'needs-date')).toEqual([]);
  const needs = now.filter(issue => issue.kind === 'needs-date').map(issue => issue.name);
  expect(needs).toEqual(expect.arrayContaining(['Christmas Ship Festival', 'Great Pumpkin Beer Festival']));
  expect(needs).not.toContain('Trolloween');
  expect(needs).not.toContain('Pathway of Lights');
  expect(needs).not.toContain('Live Aloha');
  expect(reviewDiscovery('2026-10-25').some(issue => issue.kind === 'recheck-occurrence' && issue.name === 'Trolloween')).toBe(true);
  const later = reviewDiscovery('2027-02-01');
  expect(later.some(issue => issue.kind === 'stale-place' && issue.id === 'vita-kexp')).toBe(true);
  expect(later.some(issue => issue.name === 'Trolloween')).toBe(false);
  expect(reviewDiscovery('2027-09-15').some(issue => issue.kind === 'needs-date' && issue.name === 'Trolloween')).toBe(true);
  expect(reviewDiscovery('2027-12-15').some(issue => issue.kind === 'ended-occurrence' && issue.name === 'Trolloween')).toBe(true);
});
