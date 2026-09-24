import { describe, expect, it } from 'vitest';
import { seedStops } from './planner';
import { snapshotDay, validSavedDays } from './saved-days';

describe('saved days', () => {
  it('takes independent snapshots including stop order, times, durations and date', () => {
    const stops = seedStops.map(stop => ({ ...stop }));
    const day = snapshotDay('  Seattle Saturday  ', '2026-09-19', stops);
    expect(day.name).toBe('Seattle Saturday');
    expect(day.stops).toEqual(seedStops);
    stops[0].start = 800;
    stops.reverse();
    expect(day.stops).toEqual(seedStops);
    expect(validSavedDays(JSON.parse(JSON.stringify([day])))).toBe(true);
    expect(snapshotDay(day.name, day.date, stops).id).not.toBe(day.id);
  });

  it('rejects malformed stored collections', () => {
    const day = snapshotDay('Seattle', '2026-09-19', seedStops);
    for (const value of [null, {}, [null], [day, day], [{ ...day, name: ' ' }], [{ ...day, stops: [] }], [{ ...day, stops: [{ id: 'missing', start: 600, duration: 30 }] }], [{ ...day, date: null }]]) {
      expect(validSavedDays(value)).toBe(false);
    }
    expect(validSavedDays([])).toBe(true);
  });
});