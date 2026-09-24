import type { IncomingMessage, ServerResponse } from 'node:http';
import { convert } from 'html-to-text';
import type { ActivityKind, EventFeed, LiveEvent } from '../src/event-types';
import { sendJson } from './http.ts';

export type Calendar = { name: string; url: string; page: string; eventPage: string; defaultCost: string };
export const calendars: Calendar[] = [
  { name: 'City of Seattle', url: 'https://www.trumba.com/calendars/seattlegov-city-wide.json', page: 'https://www.seattle.gov/event-calendar', eventPage: 'https://www.seattle.gov/event-calendar', defaultCost: 'Cost not listed' },
  // SPL states its events are always free and open to everyone.
  { name: 'Seattle Public Library', url: 'https://www.trumba.com/calendars/kalendaro.json', page: 'https://www.spl.org/event-calendar', eventPage: 'https://www.spl.org/event-calendar', defaultCost: 'Free library program' },
];
export const calendarUrl = calendars[0].url;
export const cacheMilliseconds = 15 * 60 * 1000;
// Trumba JSON exports return at most 200 events per request; page forward with startdate.
export const providerPageSize = 200;
export const maxPages = 4;
export const horizonDays = 45;
const maxStaleMilliseconds = 24 * 60 * 60 * 1000;

function text(value: unknown, limit = 400): string {
  return typeof value === 'string' ? convert(value, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }, { selector: 'img', format: 'skip' }] }).trim().slice(0, limit) : '';
}

function instant(value: unknown, offset: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value) || typeof offset !== 'string' || !/^[+-]\d{4}$/.test(offset)) return null;
  const date = new Date(`${value}${offset.slice(0, 3)}:${offset.slice(3)}`);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : null;
}

function activityKinds(title: string, description: string, category: string): ActivityKind[] {
  const activities: ActivityKind[] = [];
  const content = `${title} ${description}`;
  if (/\b(councils?|commissions?|committees?|public hearings?|design review)\b/i.test(`${title} ${category}`)) return activities;
  if (!/\bself[ -]guided\b/i.test(content) && (/\b(?:guided|walking|docent[ -]led|ranger[ -]led) tours?\b/i.test(content) || /\btour\b.{0,60}\b(?:led by|with a guide)\b/i.test(content))) activities.push('guided-tour');
  if (/\b(?:meet[ -]?ups?|book club|coffee klatch|social (?:group|gathering)|conversation (?:group|circle))\b/i.test(content)) activities.push('meetup');
  return activities;
}

export function normalizeEvents(payload: unknown, calendar = calendars[0]): LiveEvent[] {
  if (!Array.isArray(payload)) throw new Error('Unexpected calendar response');
  const events = new Map<string, LiveEvent>();
  for (const raw of payload) {
    if (!raw || typeof raw !== 'object') continue;
    const title = text(raw.title, 180);
    const start = instant(raw.startDateTime, raw.startTimeZoneOffset);
    const end = instant(raw.endDateTime, raw.endTimeZoneOffset);
    if (!Number.isSafeInteger(raw.eventID) || !title || !start || !end || end < start) continue;
    const costField = Array.isArray(raw.customFields) ? raw.customFields.find((field: { label?: unknown }) => field?.label === 'Cost') : null;
    const fieldText = (label: string) => text(Array.isArray(raw.customFields) ? raw.customFields.find((field: { label?: unknown }) => field?.label === label)?.value : '');
    const description = text(raw.description, 6000) || fieldText('Event Description');
    const category = text(raw.categoryCalendar, 100) || 'Community event';
    const id = `trumba-${raw.eventID}-${start}`;
    const params = new URLSearchParams({ trumbaEmbed: `view=event&eventid=${raw.eventID}` });
    events.set(id, {
      id, title, start, end, startDate: raw.startDateTime.slice(0, 10), endDate: raw.endDateTime.slice(0, 10),
      activities: activityKinds(title, description, `${category} ${fieldText('Event Types')}`),
      organizer: fieldText('Sponsoring Organization'), audience: fieldText('Audience'),
      location: text(raw.location) || 'Location not supplied', category,
      schedule: text(raw.dateTimeFormatted) || `${raw.startDateTime.replace('T', ' ')} Pacific time`,
      url: `${calendar.eventPage}?${params}`, provider: calendar.name,
      cost: text(costField?.value, 120) || calendar.defaultCost,
      canceled: raw.canceled === true || /\bcancel(?:l)?ed\b/i.test(title), full: raw.reservationFull === true,
    });
  }
  if (payload.length > 0 && events.size === 0) throw new Error('Calendar contains no valid dated events');
  return [...events.values()].sort((first, second) => first.start.localeCompare(second.start)).slice(0, 1000);
}

export function createEventService(fetcher: typeof fetch = fetch, now = Date.now) {
  const failure = (reason: unknown) => { const error = reason as Error & { cause?: { code?: string } }; return error?.cause?.code ?? error?.message ?? 'unknown error'; };
  const pacificDate = (time: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
  async function fetchPage(calendar: Calendar, startDate: string): Promise<{ events: LiveEvent[]; raw: number }> {
    const response = await fetcher(`${calendar.url}?startdate=${startDate.replaceAll('-', '')}`, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json', 'User-Agent': 'Elsewhere-Seattle/0.1 (public calendar reader)' } });
    if (!response.ok) throw new Error('Calendar request failed');
    const body = await response.text();
    if (body.length > 8_000_000) throw new Error('Calendar response too large');
    const payload: unknown = JSON.parse(body);
    return { events: normalizeEvents(payload, calendar), raw: Array.isArray(payload) ? payload.length : 0 };
  }
  async function fetchCalendar(calendar: Calendar): Promise<LiveEvent[]> {
    const collected = new Map<string, LiveEvent>();
    const horizon = pacificDate(now() + horizonDays * 86_400_000);
    let startDate = pacificDate(now());
    for (let page = 0; page < maxPages; page += 1) {
      let result: { events: LiveEvent[]; raw: number };
      try { result = await fetchPage(calendar, startDate); }
      catch (error) { if (page === 0) throw error; console.warn(`[events] ${calendar.name} page ${page + 1} failed: ${failure(error)}`); break; }
      for (const event of result.events) collected.set(event.id, event);
      const last = result.events.at(-1)?.startDate;
      if (result.raw < providerPageSize || !last || last >= horizon) break;
      // A page that ends on the day it started would repeat; move on a day.
      startDate = last > startDate ? last : pacificDate(Date.parse(`${startDate}T12:00:00Z`) + 86_400_000);
    }
    return [...collected.values()];
  }
  let cache: EventFeed | null = null;
  let pending: Promise<EventFeed> | null = null;
  let retryAfter = 0;
  function fallback(): EventFeed {
    if (cache && now() - Date.parse(cache.fetchedAt) < maxStaleMilliseconds) return { ...cache, stale: true };
    throw new Error('Seattle calendar is temporarily unavailable');
  }
  return async function getEvents(): Promise<EventFeed> {
    if (cache && now() - Date.parse(cache.fetchedAt) < cacheMilliseconds) return cache;
    if (pending) return pending;
    if (now() < retryAfter) return fallback();
    pending = (async () => {
      try {
        const results = await Promise.allSettled(calendars.map(fetchCalendar));
        const unavailable = calendars.filter((_, index) => results[index].status === 'rejected').map(calendar => calendar.name);
        results.forEach((result, index) => { if (result.status === 'rejected') console.warn(`[events] ${calendars[index].name} calendar failed: ${failure(result.reason)}`); });
        if (results.every(result => result.status === 'rejected')) throw new Error('All calendars failed');
        const merged = new Map<string, LiveEvent>();
        for (const result of results) if (result.status === 'fulfilled') for (const event of result.value) if (!merged.has(event.id)) merged.set(event.id, event);
        const events = [...merged.values()].sort((first, second) => first.start.localeCompare(second.start)).slice(0, 4000);
        cache = { events, fetchedAt: new Date(now()).toISOString(), stale: false, source: calendars[0].page, ...(unavailable.length ? { unavailable } : {}) };
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

export function createEventHandler() {
  const getEvents = createEventService();
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    if (request.url?.split('?')[0] !== '/api/events') return false;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.statusCode = 405; response.setHeader('Allow', 'GET'); response.end(JSON.stringify({ error: 'Method not allowed' })); return true;
    }
    try { sendJson(request, response, 200, await getEvents()); }
    catch { sendJson(request, response, 503, { error: 'Seattle calendar is temporarily unavailable. Please retry shortly.' }); }
    return true;
  };
}