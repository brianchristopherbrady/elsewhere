import { useEffect, useId, useRef, useState, lazy, Suspense } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Bookmark, CalendarDays, Check, Compass, GripVertical, Map, Plus, Save, Search, Share2, Trash2 } from 'lucide-react';
import { activityDates, activityFor, activityUnknowns, sourceLabel, type Activity } from './activities';
import { places, placeById, type Lens, type Mode } from './data';
import { dayStats, parseTime, scheduleWarnings, stopEnd, timeLabel, type Stop } from './planner';
import { IconButton, UnknownDetails } from './components';
import { CategoryArt } from './category-art';
import { DiscoveryFilter, type DiscoveryKind } from './DiscoveryFilter';
import { LiveEvents } from './LiveEvents';
import { MusicDiscovery } from './MusicDiscovery';
import { SeattleStaples } from './SeattleStaples';
import { SavedItemPicker } from './SavedItemPicker';
import { placeActivity } from './activities';
import 'react-day-picker/style.css';

const MapView = lazy(() => import('./MapView').then(module => ({ default: module.MapView })));

type Props = {
  stops: Stop[]; date: string; name: string; notes: string; tags: string; ideas: Activity[]; editing: boolean;
  setDate: (value: string) => void; setName: (value: string) => void; setNotes: (value: string) => void; setTags: (value: string) => void;
  onAdd: (activity: Activity) => void; onIdea: (activity: Activity) => void; onSave: () => void; onNew: () => void; onShare: () => void;
  onEdit: (id: string, changes: Partial<Stop>) => void; onRemove: (id: string) => void; onMove: (id: string, direction: number) => void;
  onSelect: (id: string) => void; mode: Mode; lens: Lens;
};

function ActivityStop({ stop, index, total, warnings, onEdit, onRemove, onMove }: { stop: Stop; index: number; total: number; warnings: string[] } & Pick<Props, 'onEdit' | 'onRemove' | 'onMove'>) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: `stop-${stop.id}` });
  const activity = activityFor(stop);
  const place = placeById.get(stop.id);
  const end = stopEnd(stop);
  const arrivalRef = useRef<HTMLInputElement>(null);
  const departureRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [error, setError] = useState('');
  useEffect(() => {
    const arrival = arrivalRef.current!;
    const departure = departureRef.current!;
    const startValue = stop.start === null ? '' : timeLabel(stop.start).slice(0, 5);
    const endValue = end === null ? '' : timeLabel(end).slice(0, 5);
    if (arrival.value !== startValue) arrival.value = startValue;
    if (departure.value !== endValue) departure.value = endValue;
    arrival.setCustomValidity('');
    departure.setCustomValidity('');
    setError('');
  }, [stop.start, end]);
  function timeError(message: string) {
    arrivalRef.current!.setCustomValidity(message);
    departureRef.current!.setCustomValidity(message);
    setError(message);
  }
  function setTime() {
    const arrival = arrivalRef.current!;
    const departureInput = departureRef.current!;
    if (arrival.validity.badInput || departureInput.validity.badInput) { timeError('Complete the time, including AM or PM, or clear it.'); return; }
    const start = arrival.value ? parseTime(arrival.value) : null;
    const departure = departureInput.value ? parseTime(departureInput.value) : null;
    if (start !== null && departure !== null && departure <= start) { timeError('Departure must be later than arrival. Your edits are not saved until both times are valid.'); return; }
    timeError(''); onEdit(stop.id, { start, end: departure, duration: null });
  }
  return <li ref={setNodeRef} className={`builder-stop ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }} data-stop={stop.id}>
    <div className="builder-stop-heading"><span className="stop-number">{index + 1}</span><CategoryArt category={activity.category} size={26} /><div><h3>{activity.name}</h3><p className="muted small">{activity.category}</p></div><button className="drag-handle" {...attributes} {...listeners} aria-label={`Reorder ${activity.name}`} title={`Reorder ${activity.name}`}><GripVertical size={20} /></button></div>
    <div className="stop-time-fields"><label className="field">Arrival<input ref={arrivalRef} aria-label={`Arrival for ${activity.name}`} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} type="time" defaultValue={stop.start === null ? '' : timeLabel(stop.start).slice(0, 5)} onChange={setTime} onBlur={setTime} /></label><label className="field">Departure<input ref={departureRef} aria-label={`Departure for ${activity.name}`} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} type="time" defaultValue={end === null ? '' : timeLabel(end).slice(0, 5)} onChange={setTime} onBlur={setTime} /></label><div className="row"><IconButton label={`Move ${activity.name} earlier`} disabled={!index} onClick={() => onMove(stop.id, -1)}><ArrowUp size={17} /></IconButton><IconButton label={`Move ${activity.name} later`} disabled={index === total - 1} onClick={() => onMove(stop.id, 1)}><ArrowDown size={17} /></IconButton><IconButton label={`Remove ${activity.name} from day`} onClick={() => onRemove(stop.id)}><Trash2 size={17} /></IconButton></div></div>
    {error && <p id={errorId} role="alert">{error}</p>}
    <label className="field">Activity notes<textarea aria-label={`Notes for ${activity.name}`} rows={2} maxLength={2000} value={stop.notes ?? ''} onChange={event => onEdit(stop.id, { notes: event.target.value })} /></label>
    <p className="muted small">{activity.address || 'Location not supplied'} <a href={activity.url} target="_blank" rel="noreferrer">{sourceLabel(activity.url)}<span className="sr-only"> for {activity.name}</span></a></p>
    <UnknownDetails items={activityUnknowns(activity).filter(item => !(item === 'hours for your date' && warnings.some(warning => warning.startsWith('Hours not confirmed'))))} href={activity.url} subject={activity.name} />
    {warnings.map(warning => <p className="warning" key={warning}>{warning}</p>)}
  </li>;
}

export function DayBuilder(props: Props) {
  const { stops, date, name, notes, tags, ideas, setDate, setName, setNotes, setTags, onAdd, onIdea, onSave, onNew, onSelect, mode, lens } = props;
  const builderRef = useRef<HTMLElement>(null);
  function validTimes() {
    const invalid = builderRef.current?.querySelector<HTMLInputElement>('.stop-time-fields input:invalid');
    if (!invalid) return true;
    invalid.reportValidity();
    invalid.focus();
    return false;
  }
  const [review, setReview] = useState(false);
  const [picker, setPicker] = useState<'saved' | 'discover'>('saved');
  const [kind, setKind] = useState<DiscoveryKind>('places');
  const [query, setQuery] = useState('');
  const warnings = scheduleWarnings(stops, date);
  const stats = dayStats(stops);
  const pool = (picker === 'saved' ? ideas : places.filter(place => !place.eventDate || place.eventDate === date).map(placeActivity)).filter(activity => `${activity.name} ${activity.category} ${activity.address}`.toLowerCase().includes(query.toLowerCase()));
  const addButton = (activity: Activity) => <button className="filter-button" aria-label={`${stops.some(stop => stop.id === activity.id) ? 'In this day' : 'Add to day'}: ${activity.name}`} disabled={stops.some(stop => stop.id === activity.id)} onClick={() => onAdd(activity)}>{stops.some(stop => stop.id === activity.id) ? <Check size={17} /> : <Plus size={17} />}{stops.some(stop => stop.id === activity.id) ? 'In this day' : 'Add to day'}</button>;
  return <section ref={builderRef} className="day-builder" aria-labelledby="day-heading">
    <div className="builder-heading"><div><p className="eyebrow">Seattle / Your own pace</p><h1 id="day-heading" tabIndex={-1}>{review ? name || 'See my day' : 'Create a Day'}</h1></div><div className="row"><IconButton label="Share your day" disabled={!date || !stops.length} onClick={() => { if (validTimes()) props.onShare(); }}><Share2 size={18} /></IconButton><button className="filter-button" onClick={() => { setReview(false); onNew(); }}><Plus size={17} />New day</button><button className="button" disabled={!date || !stops.length} onClick={() => { if (validTimes()) onSave(); }}><Save size={17} />{props.editing ? 'Save changes' : 'Save day'}</button></div></div>
    <div className="workspace-switch" role="group" aria-label="Day workspace"><button aria-pressed={!review} onClick={() => setReview(false)}><CalendarDays size={17} />Organize</button><button aria-pressed={review} disabled={!date} onClick={() => { if (validTimes()) setReview(true); }}><Map size={17} />See my day</button></div>
    {review ? <><p className="muted">{date} / Pacific time / {stops.length} activities</p><div className="day-totals"><div><span>Known activity + travel time</span><strong>{stats.occupied} min{stats.complete ? '' : ' + open time'}</strong></div><div><span>Total scheduled span</span><strong>{stats.total === null ? 'Not yet determined' : `${stats.total} min`}</strong></div><div><span>Hours remaining until midnight</span><strong>{stats.remaining === null ? 'Open-ended' : `${(stats.remaining / 60).toFixed(1)} hours`}</strong></div></div>{!stats.complete && <p role="status" className="muted">{stats.conflicted ? 'Activity times conflict with their order or estimated travel.' : 'Some times or travel distances are unknown.'} Remaining time is intentionally undetermined.</p>}{notes && <p className="day-notes">{notes}</p>}<div className="tag-list">{tags.split(',').filter(tag => tag.trim()).map((tag, index) => <span key={index}>{tag.trim()}</span>)}</div><Suspense fallback={<p className="route-loading" role="status">Loading map...</p>}><MapView stops={stops} selected={null} onSelect={onSelect} mode={mode} lens={lens} /></Suspense><ol className="review-stops">{stops.map(stop => <li key={stop.id}><strong>{activityFor(stop).name}</strong><span>{timeLabel(stop.start)} / {stopEnd(stop) === null ? 'Departure open' : timeLabel(stopEnd(stop))}</span>{stop.notes && <p>{stop.notes}</p>}{(warnings.get(stop.id) ?? []).map(warning => <p className="warning" key={warning}>{warning}</p>)}</li>)}</ol></> : <>
      <div className="builder-layout"><section className="builder-main"><div className="builder-date"><h2><CalendarDays size={20} />{date ? format(parseISO(date), 'EEEE, MMMM d, yyyy') : 'Choose a date'}</h2><details open={!date}><summary>{date ? 'Change date' : 'Calendar'}</summary><DayPicker mode="single" selected={date ? parseISO(date) : undefined} defaultMonth={date ? parseISO(date) : undefined} onSelect={value => { if (value) setDate(format(value, 'yyyy-MM-dd')); }} /><label className="field">Date of your day<input aria-label="Date of your day" type="date" value={date} onChange={event => setDate(event.target.value)} /></label></details></div>
      {date && <><label className="field">Day title<input placeholder="Untitled day" maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label><div className="day-metadata"><label className="field">Custom tags<input aria-label="Custom tags" placeholder="Friends, coffee, outdoors" maxLength={490} value={tags} onChange={event => setTags(event.target.value)} /></label><label className="field">Day notes<textarea aria-label="Day notes" rows={3} maxLength={4000} value={notes} onChange={event => setNotes(event.target.value)} /></label></div><h2 className="itinerary-title">Activities <span className="count">{stops.length}</span></h2><SortableContext items={stops.map(stop => `stop-${stop.id}`)} strategy={verticalListSortingStrategy}><ol className="builder-stops">{stops.map((stop, index) => <ActivityStop key={stop.id} stop={stop} index={index} total={stops.length} warnings={warnings.get(stop.id) ?? []} onEdit={props.onEdit} onMove={props.onMove} onRemove={props.onRemove} />)}</ol></SortableContext>{!stops.length && <div className="empty-day"><Compass size={32} /><h3>A day still unwritten.</h3></div>}</>}
      </section><aside className="activity-picker" aria-label="Activity options"><h2>Items for your day</h2><div className="workspace-switch" role="group" aria-label="Activity source"><button aria-pressed={picker === 'saved'} onClick={() => setPicker('saved')}><Bookmark size={16} />Saved items</button><button aria-pressed={picker === 'discover'} onClick={() => setPicker('discover')}><Compass size={16} />Discover more</button></div>
      {picker === 'saved' ? <SavedItemPicker ideas={ideas} stops={stops} date={date} onAdd={onAdd} /> : <>
        <DiscoveryFilter value={kind} onChange={setKind} />
        {kind === 'places' ? <><label className="search-field"><Search size={18} /><span className="sr-only">Search activity options</span><input type="search" enterKeyHint="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search activities" /></label><ul className="picker-list">{pool.map(activity => <li key={activity.id}><h3>{activity.name}</h3><p className="muted small">{activity.category} / {activity.date ? `${activityDates(activity)} (Pacific)` : activity.address}</p><div className="row">{addButton(activity)}<IconButton label={`${ideas.some(idea => idea.id === activity.id) ? 'Unsave' : 'Save'} ${activity.name}`} aria-pressed={ideas.some(idea => idea.id === activity.id)} onClick={() => onIdea(activity)}><Bookmark size={17} /></IconButton></div></li>)}</ul>{!pool.length && <p className="muted">No activities in this list.</p>}</> : kind === 'staples' ? <SeattleStaples renderAction={activity => <div className="row">{addButton(activity)}<IconButton label={`Save ${activity.name}`} onClick={() => onIdea(activity)}><Bookmark size={17} /></IconButton></div>} /> : kind === 'music' ? <MusicDiscovery renderAction={activity => <div className="row">{addButton(activity)}<IconButton label={`Save ${activity.name}`} onClick={() => onIdea(activity)}><Bookmark size={17} /></IconButton></div>} /> : <LiveEvents activity={kind === 'events' ? undefined : kind} renderAction={activity => <div className="row">{addButton(activity)}<IconButton label={`Save ${activity.name}`} onClick={() => onIdea(activity)}><Bookmark size={17} /></IconButton></div>} />}
      </>}</aside></div>
    </>}
  </section>;
}