import { expect, it } from 'vitest';
import { places, placeById } from './data';
import { activityUnknowns, placeUnknowns, sourceLabel, validActivities } from './activities';
import { filterStaples, stapleActivity, stapleSource, stapleUnknowns, staples } from './staples';

const normalize = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

it('imports the Seattle list as unique, valid activity snapshots', () => {
  expect(staples.length).toBeGreaterThan(400);
  expect(new Set(staples.map(staple => staple.id)).size).toBe(staples.length);
  const activities = staples.map(stapleActivity);
  for (let index = 0; index < activities.length; index += 200) expect(validActivities(activities.slice(index, index + 200))).toBe(true);
  expect(activities.every(activity => activity.lat === undefined && !activity.date)).toBe(true);
});

it('does not duplicate curated places or list closed and postponed entries', () => {
  const curated = new Set(places.map(place => normalize(place.name)));
  expect(staples.filter(staple => curated.has(normalize(staple.name)))).toEqual([]);
  const names = staples.map(staple => normalize(staple.name)).join('|');
  for (const closed of ['reserve roastery', 'ada\'s', 'living computers', 'siff egyptian', 'iranian festival', 'arab festival']) expect(names).not.toContain(closed);
});

it('names unknown details and points to the best available source', () => {
  const park = filterStaples('Kubota Garden')[0];
  expect(stapleUnknowns(park)).toEqual(['exact address', 'hours', 'step-free access']);
  expect(stapleSource(filterStaples('Cal Anderson Park')[0])).toMatchObject({ url: 'https://www.seattle.gov/parks/parks' });
  expect(stapleSource(filterStaples('Turkfest')[0]).url).toMatch(/seattlecenter\.com\/events\/featured-events\/festal$/);
  expect(stapleSource(filterStaples('Espresso Vivace')[0])).toMatchObject({ label: 'Search for the official site' });
  expect(stapleUnknowns(filterStaples('Luminata')[0])).toContain('this year\'s date');
  expect(stapleUnknowns(filterStaples('Trolloween')[0], { time: '7 PM' })).toEqual(['cost', 'step-free access']);
  expect(activityUnknowns(stapleActivity(park))).toEqual(['exact address', 'map location']);
  const burke = placeById.get('burke-museum')!;
  expect(placeUnknowns(burke)).toEqual(['hours for your date', 'step-free access', 'quieter times']);
  expect(placeUnknowns(placeById.get('vita-kexp')!, { quiet: false })).toEqual([]);
  expect(sourceLabel(stapleActivity(park).url)).toBe('Search the web');
});

it('searches names, areas and customary timing', () => {
  expect(filterStaples('solstice cyclists').map(staple => staple.id)).toEqual(['staple:fremont-solstice-cyclists']);
  expect(filterStaples('june fremont').length).toBeGreaterThanOrEqual(3);
  expect(filterStaples('', 'Coffee').every(staple => staple.group === 'Coffee')).toBe(true);
  expect(stapleActivity(filterStaples('Trolloween')[0])).toMatchObject({ category: 'Annual tradition', tags: ['October 31'] });
});
