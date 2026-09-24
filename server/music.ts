import type { IncomingMessage, ServerResponse } from 'node:http';
import { convert } from 'html-to-text';
import type { MusicFeed, MusicShow } from '../src/music-types';
import { sendJson } from './http.ts';

const cacheMilliseconds = 15 * 60 * 1000;
const maxAge = 24 * 60 * 60 * 1000;
const pacificDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
const scheduleFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, limit = 240): string {
  return typeof value === 'string' ? convert(value, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }, { selector: 'img', format: 'skip' }] }).trim().slice(0, limit) : '';
}

function ticketUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const hosts = ['ticketmaster.com', 'ticketmaster.ca', 'livenation.com', 'universe.com', 'frontgatetickets.com'];
    return url.protocol === 'https:' && !url.username && !url.password && hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
  } catch { return null; }
}

export function normalizeMusic(payload: unknown): { shows: MusicShow[]; pages: number } {
  const root = record(payload);
  const page = record(root.page);
  if (!Number.isSafeInteger(page.totalPages) || (page.totalPages as number) < 0) throw new Error('Invalid music response');
  const entries = record(root._embedded).events;
  if (entries !== undefined && !Array.isArray(entries)) throw new Error('Invalid music listings');
  if (!Array.isArray(entries) && page.totalPages !== 0) throw new Error('Missing music listings');
  const shows = new Map<string, MusicShow>();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const raw = record(entry);
    const dates = record(raw.dates);
    const startData = record(dates.start);
    const title = text(raw.name, 180);
    const id = text(raw.id, 120);
    const url = ticketUrl(raw.url);
    if (!id || !title || !url || startData.dateTBA === true || startData.dateTBD === true) continue;
    const instant = typeof startData.dateTime === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(startData.dateTime) ? Date.parse(startData.dateTime) : NaN;
    const start = Number.isFinite(instant) && startData.timeTBA !== true && startData.noSpecificTime !== true ? new Date(instant).toISOString() : null;
    const date = start ? pacificDate.format(new Date(start)) : text(startData.localDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) continue;
    const venues = record(raw._embedded).venues;
    const venue = record(Array.isArray(venues) ? venues[0] : null);
    if (text(record(venue.city).name).toLowerCase() !== 'seattle' || text(record(venue.state).stateCode) !== 'WA') continue;
    const classifications = Array.isArray(raw.classifications) ? raw.classifications.map(record) : [];
    const music = classifications.find(classification => text(record(classification.segment).name) === 'Music');
    if (!music) continue;
    const prices = Array.isArray(raw.priceRanges) ? raw.priceRanges.map(record) : [];
    const price = prices.find(range => range.currency === 'USD' && typeof range.min === 'number' && Number.isFinite(range.min) && range.min >= 0);
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const minimum = price?.min as number | undefined;
    const maximum = price?.max;
    const priceLabel = minimum === undefined ? 'Price not listed' : typeof maximum === 'number' && Number.isFinite(maximum) && maximum > minimum ? `${currency.format(minimum)} - ${currency.format(maximum)}` : currency.format(minimum);
    shows.set(id, {
      id: `ticketmaster-${id}`, title, date, start,
      schedule: start ? scheduleFormat.format(new Date(start)) : `${date} / Time not announced`,
      venue: text(venue.name) || 'Venue not supplied',
      address: [text(record(venue.address).line1), 'Seattle, WA', text(venue.postalCode)].filter(Boolean).join(', '),
      genre: text(record(music.genre).name) || 'Music', url,
      price: minimum === undefined ? priceLabel : `${priceLabel} / Fees may apply`,
      age: record(raw.ageRestrictions).legalAgeEnforced === true ? 'Age restriction applies; confirm with venue' : text(record(raw.ageRestrictions).legalAgeEnforced) || 'Age restrictions not listed',
      status: text(record(dates.status).code) || 'unknown',
    });
  }
  return { shows: [...shows.values()], pages: page.totalPages as number };
}

export function createMusicService(getKey = () => process.env.TICKETMASTER_API_KEY, fetcher: typeof fetch = fetch, now = Date.now) {
  let cache: MusicFeed | null = null;
  let pending: Promise<MusicFeed> | null = null;
  let retryAfter = 0;
  function fallback(): MusicFeed {
    if (cache && now() - Date.parse(cache.fetchedAt) < maxAge) return { ...cache, stale: true };
    throw new Error('Music listings temporarily unavailable');
  }
  return async (): Promise<MusicFeed> => {
    const key = getKey()?.trim();
    if (!key) return { shows: [], configured: false, fetchedAt: new Date(now()).toISOString(), stale: false, truncated: false };
    if (cache && now() - Date.parse(cache.fetchedAt) < cacheMilliseconds) return cache;
    if (pending) return pending;
    if (now() < retryAfter) return fallback();
    pending = (async () => {
      try {
        const shows = new Map<string, MusicShow>();
        let pages = 1;
        for (let page = 0; page < Math.min(pages, 5); page += 1) {
          const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
          url.search = new URLSearchParams({ apikey: key, city: 'Seattle', stateCode: 'WA', countryCode: 'US', classificationName: 'music', sort: 'date,asc', size: '200', page: String(page), includeTBA: 'no', includeTBD: 'no', startDateTime: new Date(now()).toISOString().replace(/\.\d{3}Z$/, 'Z'), endDateTime: new Date(now() + 90 * maxAge).toISOString().replace(/\.\d{3}Z$/, 'Z') }).toString();
          const response = await fetcher(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error('Music request failed');
          const body = await response.text();
          if (body.length > 8_000_000) throw new Error('Music response too large');
          const normalized = normalizeMusic(JSON.parse(body));
          pages = normalized.pages;
          for (const show of normalized.shows) shows.set(show.id, show);
        }
        cache = { shows: [...shows.values()].sort((first, second) => first.date.localeCompare(second.date) || (first.start ?? '').localeCompare(second.start ?? '')), configured: true, fetchedAt: new Date(now()).toISOString(), stale: false, truncated: pages > 5 };
        retryAfter = 0;
        return cache;
      } catch {
        retryAfter = now() + 60_000;
        return fallback();
      } finally { pending = null; }
    })();
    return pending;
  };
}

export function createMusicHandler(getKey = () => process.env.TICKETMASTER_API_KEY) {
  const getMusic = createMusicService(getKey);
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    if (request.url?.split('?')[0] !== '/api/music') return false;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.statusCode = 405; response.setHeader('Allow', 'GET'); response.end(JSON.stringify({ error: 'Method not allowed' })); return true;
    }
    try { sendJson(request, response, 200, await getMusic()); }
    catch { sendJson(request, response, 503, { error: 'Music listings temporarily unavailable. Please retry shortly.' }); }
    return true;
  };
}