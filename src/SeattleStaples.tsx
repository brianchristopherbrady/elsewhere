import { useState, type ReactNode } from 'react';
import { ArrowUpRight, ListChecks, Search } from 'lucide-react';
import type { Activity } from './activities';
import { nextOccurrence, occurrenceActivity, occurrenceLabel, pacificToday } from './occurrences';
import { filterStaples, stapleGroups } from './staples';
import { discoveryActivity, discoveryUnknowns, locationFlag, stapleLinks, verificationFor } from './staple-discovery';
import { UnknownDetails } from './components';
import './live-events.css';

export function SeattleStaples({ renderAction, initialQuery = '' }: { renderAction?: (activity: Activity) => ReactNode; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState('');
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [limit, setLimit] = useState(40);
  const today = pacificToday();
  const results = filterStaples(query, group).map(staple => ({ staple, next: nextOccurrence(staple.id, today) }))
    .filter(result => !confirmedOnly || result.next)
    .sort((first, second) => confirmedOnly ? first.next!.start.localeCompare(second.next!.start) : 0);

  return <section className="live-events" aria-labelledby="staples-heading">
    <div className="feed-heading"><div><p className="eyebrow">SEATTLE / YOUR LIST</p><h1 id="staples-heading">Seattle staples &amp; traditions</h1><p className="muted">Parks, museums, coffee, food, venues, neighborhoods and annual events.</p></div><ListChecks size={32} aria-hidden="true" /></div>
    <div className="feed-filters"><label className="search-field"><Search size={18} /><span className="sr-only">Search staples</span><input type="search" enterKeyHint="search" placeholder="Name, neighborhood, or month" value={query} onChange={event => { setQuery(event.target.value); setLimit(40); }} /></label><label className="feed-date">Category<select value={group} onChange={event => { setGroup(event.target.value); setLimit(40); }}><option value="">All categories</option>{stapleGroups.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={confirmedOnly} onChange={event => { setConfirmedOnly(event.target.checked); setLimit(40); }} />Confirmed upcoming dates only</label>{(query || group || confirmedOnly) && <button className="text-button" onClick={() => { setQuery(''); setGroup(''); setConfirmedOnly(false); setLimit(40); }}>Clear staple filters</button>}</div>
    <div className="feed-summary"><span aria-live="polite">{results.length} staples</span></div>
    <ul className="event-list">{results.slice(0, limit).map(({ staple, next }) => { const verification = verificationFor(staple); const links = stapleLinks(staple); return <li key={staple.id} className="event-row" data-staple={staple.id}><div className="event-timing"><p>{next ? occurrenceLabel(next) : staple.timing ?? staple.group}</p><span className="muted small">{next ? `Confirmed / checked ${next.checkedAt}` : staple.timing ? `${staple.group} / date not confirmed` : ''}</span></div><div className="event-content"><h2>{staple.name}</h2><p className="muted">{verification?.address && ['verified', 'matched'].includes(verification.status) ? verification.address : staple.outside ? `${staple.area}, outside Seattle` : staple.area ?? 'Seattle'}</p>{!next && locationFlag(staple, verification) && <p className="location-flag">{locationFlag(staple, verification)}</p>}{next?.time && <p className="small">{next.time}</p>}{next?.note && <p className="small">{next.note}</p>}{staple.note && <p className="small">{staple.note}</p>}<UnknownDetails items={discoveryUnknowns(staple, next)} href={next?.url ?? links.primary.url} label={next ? 'Check the organizer page' : links.primary.label} subject={staple.name} />{links.map && <p className="small"><a href={links.map.url} target="_blank" rel="noreferrer">{links.map.label}<span className="sr-only"> for {staple.name}</span><ArrowUpRight size={14} /></a></p>}{renderAction?.(next ? occurrenceActivity(staple, next) : discoveryActivity(staple))}</div></li>; })}</ul>
    {!results.length && <p className="feed-empty">No staples match these filters.</p>}
    {results.length > limit && <button className="filter-button" onClick={() => setLimit(value => value + 40)}>Show more staples</button>}
    <p className="muted small feed-note">From your Seattle list. Places are checked against Seattle Parks data and OpenStreetMap; each shows what was found. Confirmed dates come from organizer pages and disappear after they end. Customary timing is not a promise. Confirm the business is open, hours, access and this year's dates before visiting.</p>
  </section>;
}
