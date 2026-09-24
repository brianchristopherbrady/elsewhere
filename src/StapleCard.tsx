import { ArrowUpRight, Bookmark, CalendarDays, Clock3, Footprints, Plus } from 'lucide-react';
import type { Activity } from './activities';
import { artFor, CategoryArt } from './category-art';
import { IconButton, Modal, UnknownDetails } from './components';
import { nextOccurrence, occurrenceActivity, occurrenceLabel } from './occurrences';
import { distanceKm, origin } from './planner';
import { descriptionFor, discoveryActivity, discoveryUnknowns, hasPoint, locationFlag, stapleLinks, stapleMoods, verificationFor } from './staple-discovery';
import type { Staple } from './staples';

const areaLabel = (staple: Staple) => staple.outside ? `${staple.area}, outside Seattle` : staple.area ?? 'Seattle';

type SaveProps = { isSaved: (id: string) => boolean; onToggle: (activity: Activity) => void };

function details(staple: Staple, today: string) {
  const next = nextOccurrence(staple.id, today);
  const verification = verificationFor(staple);
  return { next, verification, links: stapleLinks(staple), description: descriptionFor(staple), flag: next ? undefined : locationFlag(staple, verification), activity: next ? occurrenceActivity(staple, next) : discoveryActivity(staple), ...artFor(staple.group) };
}

export function StapleCard({ staple, today, isSaved, onToggle, onOpen }: { staple: Staple; today: string; onOpen: () => void } & SaveProps) {
  const { next, verification, links, description, flag, activity, Icon, family } = details(staple, today);
  const saved = isSaved(activity.id);
  const summary = description?.extract ?? staple.note;
  return <article className="place-card staple-card" data-component="StapleCard" data-staple={staple.id}>
    <div className="card-image category-art" data-family={family}>
      <button className="photo-button" onClick={onOpen} aria-label={`Explore ${staple.name}`}><Icon size={52} strokeWidth={1} aria-hidden="true" /></button>
      <span className="image-category">{staple.group}</span>
      <IconButton label={`${saved ? 'Unsave' : 'Save'} ${staple.name}`} aria-pressed={saved} onClick={() => onToggle(activity)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></IconButton>
    </div>
    <div className="card-body">
      <div className="eyebrow card-location">{areaLabel(staple)}<span>{next ? occurrenceLabel(next) : hasPoint(verification) ? `${distanceKm(origin, verification).toFixed(1)} km` : staple.timing && `Usually ${staple.timing}`}</span></div>
      <h3><button onClick={onOpen}>{staple.name}<ArrowUpRight size={17} /></button></h3>
      {summary && <p className="card-note staple-summary">{summary}</p>}
      {flag && <p className="location-flag">{flag}</p>}
      <UnknownDetails items={discoveryUnknowns(staple, next)} href={next?.url ?? links.primary.url} label={next ? 'Check the organizer page' : links.primary.label} subject={staple.name} />
      <div className="card-bottom"><div className="card-meta"><span className="mood-dot" />{stapleMoods(staple)[0] ?? staple.group}{next && <><span className="meta-divider">/</span><span>Date confirmed</span></>}</div></div>
    </div>
  </article>;
}

export function StapleDialog({ staple, today, onClose, onAdd, isSaved, onToggle }: { staple: Staple; today: string; onClose: () => void; onAdd?: (activity: Activity) => void } & SaveProps) {
  const { next, verification, links, description, flag, activity } = details(staple, today);
  const saved = isSaved(activity.id);
  const located = verification && (verification.status === 'verified' || verification.status === 'matched');
  return <Modal title={staple.name} open onClose={onClose} className="place-dialog staple-dialog">
    <CategoryArt category={staple.group} className="detail-art" size={64} />
    <div className="detail-content">
      <div className="eyebrow">{staple.group} / {areaLabel(staple)}</div>
      {description && <><p>{description.extract}</p><p className="muted small">Description from <a href={description.url} target="_blank" rel="noreferrer">Wikipedia: {description.title}</a> (CC BY-SA 4.0).</p></>}
      {staple.note && <p>{staple.note}</p>}
      {!description && !staple.note && <p className="muted">No description yet. The official site has the details.</p>}
      {located && verification.address ? <p>{verification.address}</p> : flag && <p className="location-flag">{flag}</p>}
      <p className="detail-links"><a href={next?.url ?? links.primary.url} target="_blank" rel="noreferrer">{next ? 'Organizer page' : links.primary.label}<ArrowUpRight size={14} /></a>{links.map && <a href={links.map.url} target="_blank" rel="noreferrer">{links.map.label}<ArrowUpRight size={14} /></a>}</p>
      <div className="detail-facts">
        <div><CalendarDays size={18} /><span>When<strong>{next ? `${occurrenceLabel(next)}${next.time ? `, ${next.time}` : ''}` : staple.timing ? `Usually ${staple.timing} (date not confirmed)` : 'Hours not confirmed'}</strong></span></div>
        <div><Footprints size={18} /><span>From Pike Place Market<strong>{hasPoint(verification) ? `${distanceKm(origin, verification).toFixed(1)} km` : 'Distance unknown'}</strong></span></div>
        {verification?.openingHours && <div><Clock3 size={18} /><span>Hours on OpenStreetMap (may be outdated)<strong>{verification.openingHours}</strong></span></div>}
      </div>
      {next?.note && <p>{next.note}</p>}
      <UnknownDetails items={discoveryUnknowns(staple, next)} href={next?.url ?? links.primary.url} label={next ? 'Check the organizer page' : links.primary.label} subject={staple.name} />
      <div className="dialog-actions">{onAdd && <button className="button" onClick={() => onAdd(activity)}><Plus size={17} />Add to day</button>}<button className="filter-button" aria-pressed={saved} onClick={() => onToggle(activity)}><Bookmark size={19} />{saved ? 'Remove saved activity' : 'Save activity'}</button></div>
    </div>
  </Modal>;
}
