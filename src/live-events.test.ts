import { expect, it, vi } from 'vitest';
import { cacheMilliseconds, calendars, createEventService, normalizeEvents } from '../server/live-events';

const entry = {
  eventID: 123, title: '<b>Art &amp; music</b>', location: '<a href="javascript:alert(1)">Seattle Center</a>',
  startDateTime: '2026-09-19T13:00:00', endDateTime: '2026-09-19T14:00:00',
  startTimeZoneOffset: '-0700', endTimeZoneOffset: '-0700', dateTimeFormatted: 'Sep 19, 1&ndash;2pm PDT',
  customFields: [{ label: 'Cost', value: 'Free' }], categoryCalendar: 'Arts',
};
it('normalizes Pacific timestamps, text, safe source links, and unknown prices', () => {
  const event = normalizeEvents([entry])[0];
  expect(event.title).toBe('Art & music');
  expect(event.location).toBe('Seattle Center');
  expect(event.start).toBe('2026-09-19T20:00:00.000Z');
  expect(event.startDate).toBe('2026-09-19');
  expect(event.url).toMatch(/^https:\/\/www.seattle.gov\/event-calendar\?/);
  expect(normalizeEvents([{ ...entry, customFields: [] }])[0].cost).toBe('Cost not listed');
  expect(normalizeEvents([{ ...entry, title: 'Meeting - Cancelled', canceled: false }])[0].canceled).toBe(true);
});
it('deduplicates and rejects malformed feed data', () => {
  expect(normalizeEvents([entry, entry])).toHaveLength(1);
  expect(normalizeEvents([])).toEqual([]);
  expect(() => normalizeEvents({})).toThrow();
  expect(() => normalizeEvents([{ ...entry, startTimeZoneOffset: undefined }])).toThrow();
});
it('coalesces requests, caches for 15 minutes, and labels stale data on failure', async () => {
  let time = Date.parse('2026-09-17T12:00:00Z');
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify([entry])));
  const service = createEventService(fetcher, () => time);
  const [first, concurrent] = await Promise.all([service(), service()]);
  expect(first).toEqual(concurrent);
  await service();
  expect(fetcher).toHaveBeenCalledTimes(calendars.length);
  time += cacheMilliseconds + 1;
  fetcher.mockRejectedValue(new Error('offline'));
  expect(await service()).toMatchObject({ stale: true, fetchedAt: first.fetchedAt });
  await service();
  expect(fetcher).toHaveBeenCalledTimes(calendars.length * 2);
  time += 25 * 60 * 60 * 1000;
  await expect(service()).rejects.toThrow('temporarily unavailable');
});
it('merges city and library calendars and reports a single unavailable source', async () => {
  const library = { ...entry, eventID: 456, title: 'English Conversation Circle', customFields: [] };
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => String(input).includes('kalendaro')
    ? new Response(JSON.stringify([library])) : new Response('', { status: 500 }));
  const feed = await createEventService(fetcher, () => Date.parse('2026-09-22T12:00:00Z'))();
  expect(feed).toMatchObject({ stale: false, unavailable: ['City of Seattle'] });
  expect(feed.events[0]).toMatchObject({ provider: 'Seattle Public Library', cost: 'Free library program' });
  expect(feed.events[0].url).toMatch(/^https:\/\/www.spl.org\/event-calendar\?/);
});
it('pages forward past the 200-event export limit up to the horizon', async () => {
  const day = (offset: number) => new Date(Date.UTC(2026, 8, 23 + offset)).toISOString().slice(0, 10);
  const page = (firstId: number, from: number) => Array.from({ length: 200 }, (_, index) => ({ ...entry, eventID: firstId + index, startDateTime: `${day(from + Math.floor(index / 20))}T13:00:00`, endDateTime: `${day(from + Math.floor(index / 20))}T14:00:00` }));
  const requested: string[] = [];
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => {
    const url = String(input); requested.push(url);
    if (!url.includes('kalendaro')) return new Response('[]');
    const start = new URL(url).searchParams.get('startdate');
    return new Response(JSON.stringify(start === '20260923' ? page(1000, 0) : start === '20261002' ? page(2000, 9) : [{ ...entry, eventID: 3000, startDateTime: `${day(20)}T13:00:00`, endDateTime: `${day(20)}T14:00:00` }]));
  });
  const feed = await createEventService(fetcher, () => Date.parse('2026-09-23T19:00:00Z'))();
  const library = requested.filter(url => url.includes('kalendaro'));
  expect(library.map(url => new URL(url).searchParams.get('startdate'))).toEqual(['20260923', '20261002', '20261011']);
  expect(feed.events.filter(event => event.provider === 'Seattle Public Library')).toHaveLength(401);
  expect(feed.events.at(-1)?.startDate).toBe('2026-10-13');
}, 30_000);
it('classifies published tours and social groups without treating civic meetings or self-guided visits as activities', () => {
  const classify = (title: string, description = '', customFields = entry.customFields) => normalizeEvents([{ ...entry, title, description, customFields }])[0].activities;
  expect(classify('Chinatown-International District Walking Tour')).toEqual(['guided-tour']);
  expect(classify('Museum afternoon', 'Join a docent-led tour.')).toEqual(['guided-tour']);
  expect(classify('Black Futures Book Club')).toEqual(['meetup']);
  expect(classify('Coffee Klatch')).toEqual(['meetup']);
  expect(classify('Games and Crafts', 'Our friendly social group welcomes seniors.')).toEqual(['meetup']);
  expect(classify('Photography meet-up and guided tour')).toEqual(['guided-tour', 'meetup']);
  expect(classify('Self-guided walking tour')).toEqual([]);
  expect(classify('Park restoration', 'See where to meet.')).toEqual([]);
  expect(classify('Council meeting', 'Meetup to discuss walking tours')).toEqual([]);
  expect(classify('Community meetup', '', [{ label: 'Event Types', value: 'Boards &amp; Commissions' }])).toEqual([]);
  expect(classify('Workshop', '<a href="https://teams.microsoft.com/l/meetup-join/example">Join online</a>')).toEqual([]);
  expect(classify('Museum afternoon', '', [{ label: 'Event Description', value: '<b>Guided tour</b>' }])).toEqual(['guided-tour']);
});