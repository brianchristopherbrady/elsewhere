import { useEffect, useState, type ReactNode } from 'react';
import type { Activity } from './activities';
import { ArrowUpRight, MapPin, Music2, RefreshCw, Search } from 'lucide-react';
import { IconButton, UnknownDetails } from './components';
import type { MusicFeed } from './music-types';
import { musicVenues, musicVenueReviewDate } from './music-venues';
import { feedUrl, staticSite } from './static-mode';
import './live-events.css';

const pacificDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
const updateTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const statusLabels: Record<string, string> = { cancelled: 'Canceled', canceled: 'Canceled', postponed: 'Postponed', rescheduled: 'Rescheduled', offsale: 'Off sale', unknown: 'Status not supplied' };

export function MusicDiscovery({ renderAction }: { renderAction?: (activity: Activity) => ReactNode }) {
  const [view, setView] = useState<'shows' | 'venues'>('shows');
  const [feed, setFeed] = useState<MusicFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [genre, setGenre] = useState('');
  const [limit, setLimit] = useState(20);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetch(feedUrl('music'), { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Music unavailable');
      const data: MusicFeed = await response.json();
      if (!Array.isArray(data.shows) || typeof data.configured !== 'boolean' || !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error('Invalid music feed');
      if (!controller.signal.aborted) { setFeed(data); setError(false); setNow(Date.now()); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
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
  const upcoming = (!expired && feed?.configured ? feed.shows : []).filter(show => show.start ? Date.parse(show.start) > now : show.date >= pacificDate.format(new Date(now)));
  const genres = [...new Set(upcoming.map(show => show.genre))].sort();
  const search = query.trim().toLowerCase();
  const shows = upcoming.filter(show => (!date || show.date === date) && (!genre || show.genre === genre) && `${show.title} ${show.venue} ${show.genre}`.toLowerCase().includes(search));
  const venues = musicVenues.filter(venue => `${venue.name} ${venue.neighborhood} ${venue.address}`.toLowerCase().includes(search));
  const status = loading ? 'Refreshing music listings...' : error && !feed ? 'Music listings are temporarily unavailable.' : feed?.configured === false ? 'Live concerts are not connected. Venue details and official calendars are available.' : expired ? 'Cached music listings expired. Refresh to try again.' : feed ? `${stale ? 'Stale music listings. Last successful update' : 'Updated'} ${updateTime.format(new Date(feed.fetchedAt))}.${stale ? ' Refresh temporarily unavailable.' : ''}` : '';

  return <section className="live-events music-discovery" aria-labelledby="music-heading">
    <div className="feed-heading"><div><p className="eyebrow">SEATTLE / MUSIC</p><h1 id="music-heading">Music &amp; Venues</h1></div><Music2 size={32} aria-hidden="true" /></div>
    <div className="segmented music-views" role="group" aria-label="Music view"><button aria-pressed={view === 'shows'} onClick={() => { setView('shows'); setQuery(''); }}>Upcoming shows</button><button aria-pressed={view === 'venues'} onClick={() => { setView('venues'); setQuery(''); }}>Venues</button></div>
    {view === 'shows' && <div className="feed-status"><p role="status">{status}</p><IconButton label="Refresh music" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={18} /></IconButton></div>}
    <div className="feed-filters"><label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">{view === 'shows' ? 'Search music' : 'Search music venues'}</span><input type="search" enterKeyHint="search" placeholder={view === 'shows' ? 'Artist, venue, or genre' : 'Venue or neighborhood'} value={query} onChange={event => { setQuery(event.target.value); setLimit(20); }} /></label>
      {view === 'shows' && <><label className="feed-date">Show date (Pacific)<input type="date" value={date} onChange={event => { setDate(event.target.value); setLimit(20); }} /></label><label className="feed-date">Genre<select aria-label="Genre" value={genre} onChange={event => { setGenre(event.target.value); setLimit(20); }}><option value="">All genres</option>{genre && !genres.includes(genre) && <option value={genre}>{genre}</option>}{genres.map(value => <option key={value} value={value}>{value}</option>)}</select></label></>}
      {(query || (view === 'shows' && (date || genre))) && <button className="text-button" onClick={() => { setQuery(''); setDate(''); setGenre(''); setLimit(20); }}>Clear music filters</button>}
    </div>
    {view === 'shows' ? <>
      <div className="feed-summary"><span aria-live="polite">{shows.length} upcoming shows</span><a href="https://www.ticketmaster.com/" target="_blank" rel="noreferrer">Source: Ticketmaster <ArrowUpRight size={14} /></a></div>
      <ul className="event-list music-shows" aria-busy={loading}>{shows.slice(0, limit).map(show => <li className="event-row" key={show.id}><div className="event-timing"><p>{show.schedule}</p><span className="muted small">{show.genre}</span></div><div className="event-content"><h2><a href={show.url} target="_blank" rel="noreferrer">{show.title}<ArrowUpRight size={17} /></a></h2><p>{show.venue}</p><p className="muted small">{show.address}</p>{show.price !== 'Price not listed' && <p className="small">{show.price}</p>}{show.age !== 'Age restrictions not listed' && <p className="small">{show.age}</p>}<UnknownDetails items={[...(show.start === null ? ['start time'] : []), ...(show.price === 'Price not listed' ? ['price'] : []), ...(show.age === 'Age restrictions not listed' ? ['age restrictions'] : []), ...(show.status === 'unknown' ? ['ticket status'] : [])]} href={show.url} subject={show.title} />{show.status !== 'onsale' && show.status !== 'unknown' && <p className="event-warning small">{statusLabels[show.status] ?? 'Confirm status with ticket provider'}</p>}<a className="music-source small" href={show.url} target="_blank" rel="noreferrer">Ticketmaster listing <ArrowUpRight size={14} /></a>{renderAction?.({ id: show.id, name: show.title, category: show.genre, address: `${show.venue}, ${show.address}`, url: show.url, date: show.date })}</div></li>)}</ul>
      {!loading && !error && feed?.configured && !expired && !shows.length && <p className="feed-empty">No upcoming shows match these filters.</p>}
      {!loading && (!feed?.configured || error || expired) && <button className="filter-button" onClick={() => { setView('venues'); setQuery(''); }}><MapPin size={16} />Browse venues</button>}
      {shows.length > limit && <button className="filter-button" onClick={() => setLimit(value => value + 20)}>Show more music</button>}
      <p className="muted small feed-note">Ticketmaster coverage / Next 90 days / Refreshed every 15 minutes. {feed?.truncated && 'Limited to the first 1,000 provider listings. '}Confirm ticket availability, age restrictions, and access with the venue. Start times are not door times; end times are not supplied.</p>
    </> : <>
      <div className="feed-summary"><span aria-live="polite">{venues.length} music venues</span><span>Reviewed {musicVenueReviewDate}</span></div>
      <ul className="event-list music-venues">{venues.map(venue => <li className="event-row" key={venue.id}><div className="event-timing"><MapPin size={22} aria-hidden="true" /><p>{venue.neighborhood}</p></div><div className="event-content"><h2><a href={venue.website} target="_blank" rel="noreferrer">{venue.name}<ArrowUpRight size={17} /></a></h2><p className="muted">{venue.address}</p><div className="music-venue-links"><a href={venue.calendar} target="_blank" rel="noreferrer">Official calendar <ArrowUpRight size={14} /></a><a href={venue.info} target="_blank" rel="noreferrer">{venue.infoLabel} <ArrowUpRight size={14} /></a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address}`)}`} target="_blank" rel="noreferrer">Map &amp; directions <ArrowUpRight size={14} /></a></div>{renderAction?.({ id: `venue:${venue.id}`, name: venue.name, category: 'Music venue', address: venue.address, url: venue.website })}</div></li>)}</ul>
      {!venues.length && <p className="feed-empty">No venues match this search.</p>}
      <p className="muted small feed-note">Source: each venue's official website. This is a reviewed directory, not a live venue feed. Age policies and accessibility arrangements vary by performance; confirm with the venue.</p>
    </>}
  </section>;
}