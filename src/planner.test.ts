import { describe, expect, it } from 'vitest';
import { places, placeById } from './data';
import { appendStop, dayStats, defaultFilters, filterPlaces, generateDay, isOpen, scheduleWarnings, seedStops, shareText, validStops, walkingMinutes } from './planner';

describe('discovery', () => {
  it('combines text, mood, price, and accessibility filters', () => {
    const matches = filterPlaces({ ...defaultFilters, query: 'Vita', moods: ['Quiet'], maxPrice: 10, accessible: true }, []);
    expect(matches.map(place => place.id)).toEqual(['vita-kexp']);
  });
  it('keeps saved and planned status independent and sorts by price', () => {
    expect(filterPlaces({ ...defaultFilters, savedOnly: true }, ['elliott-bay-books']).map(place => place.id)).toEqual(['elliott-bay-books']);
    const sorted = filterPlaces({ ...defaultFilters, sort: 'price' }, []);
    expect(sorted[0].price).toBe(0);
    expect(sorted.map(place => place.price)).toEqual(places.map(place => place.price).sort((first, second) => first - second));
  });
  it('applies open and distance filters', () => {
    expect(filterPlaces({ ...defaultFilters, openOnly: true }, [], 570).some(place => place.id === 'sub-pop-kexp')).toBe(false);
    expect(filterPlaces({ ...defaultFilters, maxDistance: 0.3 }, []).length).toBeLessThan(places.length);
  });
});

describe('planning', () => {
  it('keeps optional times unknown rather than inventing free time', () => {
    const stops = [{ id: 'vita-kexp', start: 600, duration: null }, { id: 'sub-pop-kexp', start: null, duration: null }];
    expect(validStops(stops)).toBe(true);
    expect(dayStats(stops)).toMatchObject({ complete: false, total: null, remaining: null });
    expect(validStops([{ id: 'vita-kexp', start: 600, duration: null, end: 590 }])).toBe(false);
    expect(dayStats([{ id: 'vita-kexp', start: 600, duration: null, end: 660 }])).toMatchObject({ complete: true, occupied: 60, total: 60, remaining: 780 });
  });
  it('prevents duplicate stops', () => expect(appendStop(seedStops, 'vita-kexp')).toBe(seedStops));
  it('does not claim definite remaining time for overlapping or reordered schedules', () => {
    expect(dayStats([{ id: 'vita-kexp', start: 600, duration: 60 }, { id: 'sub-pop-kexp', start: 660, duration: 45 }])).toMatchObject({ conflicted: true, complete: false, total: null, remaining: null });
    expect(dayStats([...seedStops].reverse())).toMatchObject({ conflicted: true, complete: false, remaining: null });
    expect(dayStats(seedStops)).toMatchObject({ conflicted: false, complete: true });
  });
  it('accounts for walks when adding stops', () => {
    const next = appendStop(seedStops, 'elliott-bay-books');
    expect(next.at(-1)!.start).toBeGreaterThan(seedStops.at(-1)!.start! + seedStops.at(-1)!.duration!);
    expect(walkingMinutes(places[0], places[2])).toBeGreaterThan(0);
  });
  it('warns about closing, overlap, and unconfirmed seasonal hours', () => {
    expect([...scheduleWarnings(seedStops).values()].flat()).toEqual(['Hours not confirmed for this date. Check the official source.']);
    expect(scheduleWarnings([{ id: 'vita-kexp', start: 1060, duration: 60 }]).get('vita-kexp')).toHaveLength(1);
    expect(scheduleWarnings([{ id: 'vita-kexp', start: 570, duration: 60 }, { id: 'olympic-sculpture-park', start: 580, duration: 60 }]).get('olympic-sculpture-park')).toHaveLength(2);
  });
  it('supports overnight windows using a synthetic schedule', () => expect(isOpen({ ...placeById.get('vita-kexp')!, open: 840, close: 1560 }, 1450, 60)).toBe(true));
  it('generates only from the filtered pool and handles an empty pool', () => {
    expect(generateDay([placeById.get('olympic-sculpture-park')!], ['Outdoors']).map(stop => stop.id)).toEqual(['olympic-sculpture-park']);
    expect(generateDay([], [])).toEqual([]);
  });
  it('derives statistics and share content from the current day', () => {
    expect(dayStats(seedStops).cost).toBe(10);
    expect(dayStats([]).walking).toBe(0);
    expect(shareText(seedStops, '2026-09-19')).toContain('09:30 Caffe Vita at KEXP');
  });
  it('rejects corrupt persisted plans', () => {
    expect(validStops(seedStops)).toBe(true);
    expect(validStops([{ id: 'unknown', start: 0, duration: 60 }])).toBe(false);
    expect(validStops([...seedStops, seedStops[0]])).toBe(false);
    expect(validStops([{ id: 'vita-kexp', start: -1, duration: 0 }])).toBe(false);
  });
});