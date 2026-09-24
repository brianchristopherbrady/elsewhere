import { expect, it } from 'vitest';
import { places, placeById } from './data';
import { appendStop, defaultFilters, filterPlaces, isOpen, scheduleWarnings, seedStops, shareText, validStops } from './planner';

it('provides sourced Seattle identities and rejects old Lisbon IDs', () => {
  expect(new Set(places.map(place => place.id)).size).toBe(places.length);
  expect(places.length).toBeGreaterThanOrEqual(17);
  for (const place of places) {
    expect(place.lat).toBeGreaterThan(47.5); expect(place.lat).toBeLessThan(47.8);
    expect(place.lng).toBeGreaterThan(-122.5); expect(place.lng).toBeLessThan(-122.2);
    expect(new URL(place.website).protocol).toBe('https:');
    expect(['2026-09-17', '2026-09-22']).toContain(place.checkedAt);
  }
  expect(validStops([{ id: 'flora', start: 570, duration: 60 }])).toBe(false);
  expect(shareText(seedStops, '2026-09-19')).toContain('Estimated spend for curated places: USD 10');
});

it('excludes unknown hours and unknown access from affirmative filters', () => {
  expect(filterPlaces({ ...defaultFilters, openOnly: true }, []).every(place => place.hoursKnown)).toBe(true);
  expect(isOpen(placeById.get('olympic-sculpture-park')!, 660)).toBe(false);
  expect(filterPlaces({ ...defaultFilters, query: 'book', accessible: true }, [])).toEqual([]);
});

it('collects dated ideas without a date filter and limits date-specific discovery', () => {
  expect(filterPlaces(defaultFilters, [], 660, '2026-09-19')).toHaveLength(places.length);
  expect(filterPlaces(defaultFilters, [], 660, '2026-09-20')).toHaveLength(places.length - 1);
  expect(filterPlaces(defaultFilters, [])).toHaveLength(places.length);
  expect(filterPlaces({ ...defaultFilters, query: 'Burke' }, []).map(place => place.id)).toEqual(['burke-museum']);
  expect(filterPlaces({ ...defaultFilters, query: 'Flight' }, []).map(place => place.id)).toEqual(['museum-of-flight']);
  const event = placeById.get('sam-tour-2026-09-19')!;
  const planned = appendStop([], event.id);
  expect(planned[0].start).toBe(780);
  expect(scheduleWarnings(planned, '2026-09-19').get(event.id)).toEqual([]);
  expect(scheduleWarnings(planned, '2026-09-20').get(event.id)?.[0]).toContain('Event only on');
  expect(scheduleWarnings([{ ...planned[0], start: 800 }], '2026-09-19').get(event.id)?.[0]).toContain('Event runs');
});