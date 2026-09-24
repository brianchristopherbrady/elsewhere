import { expect, it, vi } from 'vitest';
import { createMusicService, normalizeMusic } from '../server/music';

const event = {
  id: 'show-1', name: '<b>Seattle &amp; Sound</b>', url: 'https://www.ticketmaster.com/event/show-1',
  dates: { start: { dateTime: '2026-09-22T02:00:00Z', localDate: '2026-09-21' }, status: { code: 'onsale' } },
  classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }],
  _embedded: { venues: [{ name: 'The Showbox', city: { name: 'Seattle' }, state: { stateCode: 'WA' }, address: { line1: '1426 1st Avenue' } }] },
};
const payload = (events: unknown[] = [event], totalPages = 1) => ({ _embedded: { events }, page: { totalPages } });

it('normalizes music dates, safe links and unknown details without inventing duration or age limits', () => {
  const result = normalizeMusic(payload([event, event])).shows;
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ id: 'ticketmaster-show-1', title: 'Seattle & Sound', date: '2026-09-21', price: 'Price not listed', age: 'Age restrictions not listed' });
  expect(normalizeMusic(payload([{ ...event, dates: { start: { localDate: '2026-09-21', timeTBA: true } } }])).shows[0]).toMatchObject({ start: null, schedule: '2026-09-21 / Time not announced' });
  expect(normalizeMusic(payload([{ ...event, priceRanges: [{ min: 20, max: 40, currency: 'USD' }], ageRestrictions: { legalAgeEnforced: '21+' } }])).shows[0]).toMatchObject({ price: '$20.00 - $40.00 / Fees may apply', age: '21+' });
});

it('rejects unsafe URLs, invalid dates, non-music and non-Seattle listings', () => {
  for (const url of ['javascript:alert(1)', 'https://ticketmaster.com.evil.test/show', 'https://user@ticketmaster.com/show']) expect(normalizeMusic(payload([{ ...event, url }])).shows).toEqual([]);
  expect(normalizeMusic(payload([{ ...event, dates: { start: { localDate: '2026-02-30' } } }])).shows).toEqual([]);
  expect(normalizeMusic(payload([{ ...event, classifications: [] }, { ...event, _embedded: {} }])).shows).toEqual([]);
  expect(normalizeMusic({ page: { totalPages: 0 } }).shows).toEqual([]);
  expect(() => normalizeMusic({})).toThrow();
  expect(() => normalizeMusic({ page: { totalPages: 1 } })).toThrow();
});

it('reports missing configuration without making a provider request', async () => {
  const fetcher = vi.fn<typeof fetch>();
  expect(await createMusicService(() => undefined, fetcher)()).toMatchObject({ configured: false, shows: [] });
  expect(fetcher).not.toHaveBeenCalled();
});

it('paginates, coalesces, caches and expires stale music independently', async () => {
  let time = Date.parse('2026-09-20T12:00:00Z');
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(payload([event], 2))));
  const service = createMusicService(() => 'test-key', fetcher, () => time);
  const [first, concurrent] = await Promise.all([service(), service()]);
  expect(first).toEqual(concurrent);
  expect(first.shows).toHaveLength(1);
  await service();
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(String(fetcher.mock.calls[0][0])).toContain('classificationName=music');
  time += 16 * 60 * 1000;
  fetcher.mockRejectedValue(new Error('offline'));
  expect(await service()).toMatchObject({ stale: true, fetchedAt: first.fetchedAt });
  await service();
  expect(fetcher).toHaveBeenCalledTimes(3);
  time += 25 * 60 * 60 * 1000;
  await expect(service()).rejects.toThrow('temporarily unavailable');
});