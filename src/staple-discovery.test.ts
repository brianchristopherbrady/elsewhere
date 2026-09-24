import { expect, it } from 'vitest';
import { validActivity } from './activities';
import { defaultFilters } from './planner';
import { descriptionFor, discoverStaples, discoveryActivity, discoveryUnknowns, hasPoint, locationFlag, stapleMoods, verificationFor } from './staple-discovery';
import { filterStaples, staples } from './staples';

const located = staples.filter(staple => hasPoint(verificationFor(staple)));

it('shows the whole list by default, located entries first with mixed categories', () => {
  const results = discoverStaples(staples, defaultFilters);
  expect(results).toHaveLength(staples.length);
  const isLocated = (staple: typeof staples[number]) => !staple.event && ['verified', 'matched'].includes(verificationFor(staple)?.status ?? '');
  const firstUnlocated = results.findIndex(staple => !isLocated(staple));
  expect(results.slice(firstUnlocated).some(isLocated)).toBe(false);
  expect(new Set(results.slice(0, 12).map(staple => staple.group)).size).toBeGreaterThanOrEqual(8);
});

it('never lets unknown price, access or hours satisfy a narrowed filter', () => {
  expect(discoverStaples(staples, { ...defaultFilters, accessible: true })).toEqual([]);
  expect(discoverStaples(staples, { ...defaultFilters, openOnly: true })).toEqual([]);
  expect(discoverStaples(staples, { ...defaultFilters, maxPrice: 10 })).toEqual([]);
  const near = discoverStaples(staples, { ...defaultFilters, maxDistance: 3 });
  expect(near.every(staple => hasPoint(verificationFor(staple)))).toBe(true);
});

it('maps categories to editorial moods and applies them', () => {
  expect(stapleMoods(filterStaples('Kubota Garden')[0])).toContain('Outdoors');
  expect(discoverStaples(staples, { ...defaultFilters, moods: ['Late-night'] }).every(staple => ['Bar & brewery', 'Music venue'].includes(staple.group))).toBe(true);
});

it('uses only verified or matched locations and HTTPS websites in saved snapshots', () => {
  for (const staple of staples) {
    const activity = discoveryActivity(staple);
    expect(validActivity(activity), staple.id).toBe(true);
    const verification = verificationFor(staple);
    if (verification?.status === 'multiple' || verification?.status === 'unmatched' || !verification) expect(activity.lat).toBeUndefined();
  }
  for (const staple of located) {
    const verification = verificationFor(staple)!;
    expect(discoveryActivity(staple)).toMatchObject({ lat: verification.lat, lng: verification.lng });
    if (verification.address) expect(discoveryUnknowns(staple)).not.toContain('exact address');
    expect(discoveryUnknowns(staple)).toContain('confirmed hours');
  }
});

it('flags only entries whose location was not found', () => {
  for (const staple of staples) {
    const status = verificationFor(staple)?.status;
    const flag = locationFlag(staple);
    if (staple.event || !status || status === 'verified' || status === 'matched') expect(flag, staple.id).toBeUndefined();
    else expect(flag, staple.id).toMatch(/Address not found|possible locations/);
  }
});

it('uses attributed HTTPS Wikipedia descriptions only', () => {
  for (const staple of staples) {
    const description = descriptionFor(staple);
    if (!description) continue;
    expect(description.url, staple.id).toMatch(/^https:\/\/en\.wikipedia\.org\//);
    expect(description.title).toBeTruthy();
    expect(description.extract.length).toBeGreaterThan(20);
  }
});
