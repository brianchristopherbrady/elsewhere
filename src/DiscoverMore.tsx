import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Activity } from './activities';
import type { EventFeed, LiveEvent } from './event-types';
import { feedUrl } from './static-mode';
import './live-events.css';

const previewSize = 8;

export function eventMatches(event: LiveEvent, query: string): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = `${event.title} ${event.location} ${event.category} ${event.organizer} ${event.provider ?? ''}`.toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}

export function DiscoverMore({ query, renderAction, onShowEvents }: { query: string; renderAction: (activity: Activity) => ReactNode; onShowEvents: () => void }) {
  const [feed, setFeed] = useState<EventFeed | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(feedUrl('events'), { signal: controller.signal }).then(async response => { if (response.ok) { const body: EventFeed = await response.json(); if (!controller.signal.aborted) setFeed(body); } })
      .catch(() => undefined).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const now = Date.now();
  const upcoming = (feed?.events ?? []).filter(event => Date.parse(event.end) > now && !event.canceled && eventMatches(event, query));

  return <section className="discover-more" aria-labelledby="discover-more-heading" aria-busy={loading}>
    <h2 id="discover-more-heading">Happening soon {!loading && feed && <span className="muted small">{upcoming.length}</span>}</h2>
    <p className="muted small">Live City of Seattle and Seattle Public Library calendars. Mood, budget and distance filters apply only to the places above.</p>
    {loading ? <p className="muted small" role="status">Checking the city and library calendars...</p>
      : !feed ? <p className="muted small">Live calendars are unavailable right now.</p>
      : upcoming.length ? <ul className="more-list">{upcoming.slice(0, previewSize).map(event => <li key={event.id}><div><a href={event.url} target="_blank" rel="noreferrer"><strong>{event.title}</strong><ArrowUpRight size={13} aria-hidden="true" /></a><p className="muted small">{[event.schedule, event.location, event.provider].filter(Boolean).join(' / ')}</p></div>{renderAction({ id: `city:${event.id}`, name: event.title, category: event.category, address: event.location, url: event.url, date: event.startDate, endDate: event.endDate })}</li>)}</ul>
      : <p className="muted small">No upcoming events match this search.</p>}
    {!loading && feed && upcoming.length > 0 && <button className="filter-button" onClick={onShowEvents}>Browse all {upcoming.length} upcoming events<ArrowRight size={16} /></button>}
  </section>;
}
