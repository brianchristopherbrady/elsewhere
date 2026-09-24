import { expect, it } from 'vitest';
import { activityAvailableOn, activityDates, activityFor, filterActivities, hasLocation, validActivities, validActivity } from './activities';
import { dayStats, scheduleWarnings, shareText, validStops } from './planner';
import { snapshotDay, validSavedDays } from './saved-days';

const activity = { id: 'city:example', name: 'Waterfront walk', category: 'Guided tour', address: 'Seattle waterfront', url: 'https://www.seattle.gov/event-calendar', date: '2026-09-26' };

it('filters saved items by notes, tags, category and available date without changing snapshots', () => {
  const idea = { ...activity, notes: 'Meet by the pier', tags: ['Friends', 'Outdoors'] };
  expect(validActivity(idea)).toBe(true);
  expect(filterActivities([idea], 'friends pier', 'Guided tour', 'Outdoors', '2026-09-26')).toEqual([idea]);
  expect(filterActivities([idea], '', '', '', '2026-09-27')).toEqual([]);
  expect(filterActivities([idea], '', '', 'Music')).toEqual([]);
  const day = snapshotDay('Walk', '2026-09-26', [{ id: idea.id, activity: idea, start: null, duration: null }]);
  idea.tags.push('Later'); idea.notes = 'Changed idea';
  expect(day.stops[0].activity?.tags).toEqual(['Friends', 'Outdoors']);
  expect(day.stops[0].activity?.notes).toBe('Meet by the pier');
  expect(validActivity({ ...idea, notes: 'x'.repeat(2001) })).toBe(false);
  expect(validActivity({ ...idea, tags: [' '] })).toBe(false);
});

it('checks single-day and inclusive multi-day availability without restricting undated venues', () => {
  expect(activityAvailableOn(activity, '2026-09-26')).toBe(true);
  expect(activityAvailableOn(activity, '2026-10-20')).toBe(false);
  const festival = { ...activity, endDate: '2026-09-28' };
  expect(validActivity(festival)).toBe(true);
  expect(activityDates(festival)).toBe('2026-09-26 to 2026-09-28');
  const stops = [{ id: festival.id, activity: festival, start: null, duration: null }];
  expect(scheduleWarnings(stops, '2026-09-27').get(festival.id)).toEqual(['Confirm published times and location with the organizer.']);
  expect(scheduleWarnings(stops, '2026-10-20').get(festival.id)?.[0]).toContain('Not available on this day');
  expect(shareText(stops, '2026-09-27')).toContain('Event dates: 2026-09-26 to 2026-09-28');
  for (const date of ['2026-09-26', '2026-09-27', '2026-09-28']) expect(activityAvailableOn(festival, date)).toBe(true);
  for (const date of ['2026-09-25', '2026-09-29']) expect(activityAvailableOn(festival, date)).toBe(false);
  expect(activityAvailableOn({ ...activity, date: undefined }, '2026-10-20')).toBe(true);
  expect(validActivity({ ...activity, endDate: '2026-09-25' })).toBe(false);
  expect(validActivity({ ...activity, endDate: '2026-02-30' })).toBe(false);
  expect(validActivity({ ...activity, date: undefined, endDate: '2026-09-28' })).toBe(false);
});

it('preserves source snapshots and notes without inventing times or coordinates', () => {
  const stops = [{ id: activity.id, activity, start: null, duration: null, notes: 'Meet friends' }];
  expect(validStops(stops)).toBe(true);
  expect(activityFor(stops[0])).toEqual(activity);
  expect(hasLocation(activity)).toBe(false);
  const day = { ...snapshotDay('', '2026-09-26', stops), notes: 'An open day', tags: ['Friends'] };
  expect(day.name).toBe('Untitled day');
  expect(validSavedDays([day])).toBe(true);
  stops[0].notes = 'Changed draft';
  expect(day.stops[0].notes).toBe('Meet friends');
  expect(dayStats([...stops, { id: 'vita-kexp', start: 600, duration: 60 }])).toMatchObject({ unknownTravel: true, total: null, remaining: null });
});

it('rejects unsafe links, invalid coordinates, invalid dates and oversized collections', () => {
  expect(validActivity(activity)).toBe(true);
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:password@example.com']) expect(validActivity({ ...activity, url })).toBe(false);
  expect(validActivity({ ...activity, lat: 47 })).toBe(false);
  expect(validActivity({ ...activity, lat: 91, lng: 0 })).toBe(false);
  expect(validActivity({ ...activity, lat: 47, lng: -122 })).toBe(true);
  expect(validActivity({ ...activity, date: '2026-02-30' })).toBe(false);
  expect(validActivity({ ...activity, name: ' ' })).toBe(false);
  expect(validActivities([activity, activity])).toBe(false);
  expect(validActivities(Array.from({ length: 201 }, (_, index) => ({ ...activity, id: `city:${index}` })))).toBe(false);
  expect(validStops([{ id: 'different-id', activity, start: null, duration: null }])).toBe(false);
});