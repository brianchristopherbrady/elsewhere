import { useEffect, useState, type ReactNode } from 'react';
import type { Activity } from './activities';
import { ArrowUpRight, CalendarDays, RefreshCw, Search } from 'lucide-react';
import { activityLabels, type ActivityKind, type EventFeed } from './event-types';
import { IconButton, UnknownDetails } from './components';
import { feedUrl, staticSite } from './static-mode';
import './live-events.css';

export function LiveEvents({ activity, renderAction, initialQuery = '' }: { activity?: ActivityKind; renderAction?: (activity: Activity) => ReactNode; initialQuery?: string }) {
  const [feed, setFeed] = useState<EventFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [date, setDate] = useState('');
  const [limit, setLimit] = useState(20);
  const [now, setNow] = useState(Date.now());
  const Heading = 'h1';
  const ListingHeading = 'h2';

  useEffect(() => { setLimit(20); }, [activity]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetch(feedUrl('events'), { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Calendar unavailable');
        const data: EventFeed = await response.json();
        if (!Array.isArray(data.events) || !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error('Invalid calendar');
        if (!controller.signal.aborted) { setFeed(data); setError(false); setNow(Date.now()); }
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const refresh = () => { if (!document.hidden) setRevision(value => value + 1); };
    const timer = window.setInterval(refresh, 15 * 60 * 1000);
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);
    addEventListener('online', refresh);
    return () => { clearInterval(timer); clearInterval(clock); removeEventListener('online', refresh); };
  }, []);

  const expired = !!feed && now - Date.parse(feed.fetchedAt) >= (staticSite ? 7 * 24 : 24) * 60 * 60 * 1000;
  const stale = !!feed && (error || feed.stale || now - Date.parse(feed.fetchedAt) >= (staticSite ? 36 * 60 : 16) * 60 * 1000);
  const events = (expired ? [] : feed?.events ?? []).filter(event => Date.parse(event.end) > now
    && (!activity || event.activities?.includes(activity))
    && (!date || (event.startDate <= date && event.endDate >= date))
    && `${event.title} ${event.location} ${event.category} ${event.organizer ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const updated = feed ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(new Date(feed.fetchedAt)) : '';

  return <section className="live-events" aria-labelledby="events-heading">
    <div className="feed-heading"><div><p className="eyebrow">SEATTLE / CITY &amp; LIBRARY CALENDARS</p><Heading id="events-heading">{activity ? activityLabels[activity] : 'Live events'}</Heading><p className="muted">{activity === 'guided-tour' ? 'Published guided walks and hosted tours.' : activity === 'meetup' ? 'Social groups, book clubs, and community meetups.' : 'Community, arts, parks, and public meetings.'}</p></div><CalendarDays size={32} aria-hidden="true" /></div>
    <div className="feed-status"><p role="status">{loading ? 'Refreshing Seattle calendar...' : expired ? 'Cached calendar expired. Refresh to try again.' : error && !feed ? 'Seattle calendar is unavailable. Please try again.' : feed ? `${stale ? 'Stale calendar. Last successful update' : 'Updated'} ${updated}${stale ? '. Refresh temporarily unavailable.' : staticSite ? ' / Daily snapshot.' : ' / Refreshes every 15 minutes.'}${feed.unavailable?.length ? ` ${feed.unavailable.join(', ')} unavailable right now.` : ''}` : ''}</p><IconButton label="Refresh events" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={18} /></IconButton></div>
    <div className="feed-filters"><label className="search-field"><Search size={18} /><span className="sr-only">Search live events</span><input type="search" enterKeyHint="search" placeholder="Event, location, or category" value={query} onChange={event => { setQuery(event.target.value); setLimit(20); }} /></label><label className="feed-date">Event date (Pacific)<input type="date" value={date} onChange={event => { setDate(event.target.value); setLimit(20); }} /></label>{(date || query) && <button className="text-button" onClick={() => { setDate(''); setQuery(''); setLimit(20); }}>Clear event filters</button>}</div>
    <div className="feed-summary"><span aria-live="polite">{events.length} upcoming listings</span><a href="https://www.seattle.gov/event-calendar" target="_blank" rel="noreferrer">City of Seattle calendar <ArrowUpRight size={14} /></a><a href="https://www.spl.org/event-calendar" target="_blank" rel="noreferrer">Library calendar <ArrowUpRight size={14} /></a></div>
    <ul className="event-list" aria-busy={loading}>{events.slice(0, limit).map(event => <li key={event.id} className="event-row"><div className="event-timing"><p>{event.schedule}</p><span className="muted small">{event.category}</span></div><div className="event-content"><ListingHeading><a href={event.url} target="_blank" rel="noreferrer">{event.title}<ArrowUpRight size={17} /></a></ListingHeading><p className="muted">{event.location}</p>{event.provider && <p className="small">Source: {event.provider}</p>}{event.organizer && <p className="small">Hosted by {event.organizer}</p>}{event.audience && <p className="small">Audience: {event.audience}</p>}<p className="small">{event.canceled ? <strong className="event-warning">Canceled</strong> : event.full ? <strong className="event-warning">Registration full</strong> : event.cost === 'Cost not listed' ? null : event.cost}</p><UnknownDetails items={[...(event.cost === 'Cost not listed' ? ['cost'] : []), ...(event.location === 'Location not supplied' ? ['location'] : [])]} href={event.url} label="Check the event listing" subject={event.title} />{renderAction?.({ id: `city:${event.id}`, name: event.title, category: event.category, address: event.location, url: event.url, date: event.startDate, endDate: event.endDate })}</div></li>)}</ul>
    {!loading && !error && feed && !expired && events.length === 0 && <p className="feed-empty">No upcoming events match these filters.</p>}
    {events.length > limit && <button className="filter-button" onClick={() => setLimit(value => value + 20)}>Show more events</button>}
    <p className="muted small feed-note">Published schedules may change. Confirm times, tickets, and access with the organizer. Multi-day listings may not run continuously. City calendar coverage is not comprehensive.</p>
    {activity && <p className="muted small">Categories are inferred from published listing text. No Meetup.com or commercial tour inventory is connected. Locations, age restrictions, and registration requirements may vary; confirm the original listing.</p>}
  </section>;
}