import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ArrowUpRight, Bookmark, Check, Clock3, GripVertical, Plus, Trash2, X, Footprints, TriangleAlert, Sunrise, Sun, Sunset, Moon, Share2, ChevronDown } from 'lucide-react';
import { placeById, type Place } from './data';
import { artFor, CategoryArt } from './category-art';
import { placeUnknowns, sourceLabel } from './activities';
import { dayStats, distanceKm, origin, parseTime, period, scheduleWarnings, timeLabel, walkingMinutes, type Stop } from './planner';

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type="button" {...props} className={`icon-button ${className}`.trim()} aria-label={label} title={label}>{children}</button>;
}

export function Modal({ title, open, onClose, children, className = '' }: { title: string; open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(open ? document.activeElement : null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) {
      if (!opener.current?.isConnected) opener.current = document.activeElement;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
      if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus();
      opener.current = null;
    };
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} className={className} onCancel={onClose} onClose={event => { if (!event.currentTarget.open) onClose(); }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><IconButton label={`Close ${title}`} onClick={onClose} autoFocus><X size={20} /></IconButton></div>
    {children}
  </dialog>;
}

export function UnknownDetails({ items, href, subject, label }: { items: string[]; href: string; subject: string; label?: string }) {
  if (!items.length) return null;
  return <p className="unknown-details small"><TriangleAlert size={14} aria-hidden="true" /><span><strong>Unknown:</strong> {items.join(', ')}. <a href={href} target="_blank" rel="noreferrer">{label ?? sourceLabel(href)}<span className="sr-only"> for {subject}</span><ArrowUpRight size={13} aria-hidden="true" /></a></span></p>;
}

export function PlaceCard({ place, index, saved, planned, onSave, onAdd, onSelect, collectOnly = false }: { place: Place; index: number; saved: boolean; planned: boolean; onSave: () => void; onAdd: () => void; onSelect: () => void; collectOnly?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `place-${place.id}`, data: { placeId: place.id }, disabled: planned });
  const { Icon, family } = artFor(place.category);
  return <article ref={setNodeRef} className={`place-card ${planned ? 'is-planned' : ''} ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Translate.toString(transform), animationDelay: `${index * 45}ms` }} data-component="PlaceCard" data-place={place.id}>
    <div className="card-image category-art" data-family={family}><button className="photo-button" onClick={onSelect} aria-label={`Explore ${place.name}`}><Icon size={52} strokeWidth={1} aria-hidden="true" /></button><span className="image-category">{place.category}</span><IconButton label={`${saved ? 'Unsave' : 'Save'} ${place.name}`} aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></IconButton></div>
    <div className="card-body"><div className="eyebrow card-location">{place.neighborhood}<span>{distanceKm(origin, place).toFixed(1)} km</span></div>
      <h3><button onClick={onSelect}>{place.name}<ArrowUpRight size={17} /></button></h3>
      <p className="card-note">{place.note}</p>
      <UnknownDetails items={placeUnknowns(place, { quiet: false })} href={place.website} subject={place.name} />
      <div className="card-bottom"><div className="card-meta"><span className="mood-dot" />{place.moods[0]}<span className="meta-divider">/</span><span>{place.price ? `$${place.price} est.` : 'Free visit'}</span></div>
        {!collectOnly && <div className="row"><button className="drag-handle" {...attributes} {...listeners} aria-label={`Drag ${place.name} to your day`} title={`Drag ${place.name} to your day`} disabled={planned}><GripVertical size={16} /></button><IconButton label={planned ? `${place.name} is in your day` : `Add ${place.name} to day`} disabled={planned} onClick={onAdd}>{planned ? <Check size={18} /> : <Plus size={19} />}</IconButton></div>}
      </div>
    </div>
  </article>;
}

type PlannerProps = { stops: Stop[]; date: string; setDate: (date: string) => void; onMove: (id: string, direction: number) => void; onRemove: (id: string) => void; onEdit: (id: string, changes: Partial<Stop>) => void; onSelect: (id: string) => void; onShare: () => void; onSave: () => void; onDiscover: () => void };

function StopItem({ stop, previous, index, total, warnings, onMove, onRemove, onEdit, onSelect }: { stop: Stop; previous?: Stop; index: number; total: number; warnings: string[] } & Pick<PlannerProps, 'onMove' | 'onRemove' | 'onEdit' | 'onSelect'>) {
  const place = placeById.get(stop.id)!;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `stop-${stop.id}` });
  return <li ref={setNodeRef} className={`stop ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }} data-stop={stop.id}>
    {previous && <p className="stop-walk"><Footprints size={13} />{walkingMinutes(placeById.get(previous.id)!, place)} min walk from {placeById.get(previous.id)!.name}</p>}
    <div className="stop-top"><span className="stop-number">{String(index + 1).padStart(2, '0')}</span><span className="mono">{timeLabel(stop.start)}</span><span className="stop-period">{period(stop.start)}</span><button className="drag-handle" {...attributes} {...listeners} aria-label={`Reorder ${place.name}`} title={`Reorder ${place.name}`}><GripVertical size={17} /></button></div>
    <div className="stop-main"><CategoryArt category={place.category} size={24} /><div><button className="stop-title" onClick={() => onSelect(place.id)}>{place.name}</button><span className="muted small">{place.category}</span><span className="small mono">{stop.duration} min <span className="muted">/</span> {place.price ? `USD ${place.price}` : 'Free'}</span></div></div>
    <div className="stop-actions"><details><summary>Adjust <ChevronDown size={13} /></summary><div className="stop-edit"><label>Start time<input type="time" aria-label={`Start time for ${place.name}`} value={stop.start === null ? '' : timeLabel(stop.start).slice(0, 5)} onChange={event => onEdit(stop.id, { start: event.target.value ? parseTime(event.target.value) : null })} /></label><label>Duration<select aria-label={`Duration for ${place.name}`} value={stop.duration ?? ''} onChange={event => onEdit(stop.id, { duration: event.target.value ? +event.target.value : null })}><option value="">Open duration</option>{[15, 30, 45, 60, 75, 90, 120, 180, 240].map(duration => <option key={duration} value={duration}>{duration} min</option>)}</select></label></div></details>
      <div className="row"><IconButton label={`Move ${place.name} earlier`} disabled={index === 0} onClick={() => onMove(stop.id, -1)}><ArrowUp size={14} /></IconButton><IconButton label={`Move ${place.name} later`} disabled={index === total - 1} onClick={() => onMove(stop.id, 1)}><ArrowDown size={14} /></IconButton><IconButton label={`Remove ${place.name} from day`} onClick={() => onRemove(stop.id)}><Trash2 size={14} /></IconButton></div>
    </div>
    {warnings.map(warning => <p className="warning" key={warning}><TriangleAlert size={14} />{warning}</p>)}
  </li>;
}

export function Balance({ stops }: { stops: Stop[] }) {
  const stats = dayStats(stops);
  const measures = [['Quiet', 'Energetic', stats.energy], ['Spontaneous', 'Planned', stats.planned], ['Familiar', 'Unusual', stats.unusual], ['Indoor', 'Outdoor', stats.outdoor], ['Cheap', 'Extravagant', stats.extravagant]] as const;
  return <section className="balance" aria-labelledby="balance-heading" data-component="DayBalance"><div className="section-label"><h3 id="balance-heading">The shape of your day</h3><span aria-hidden="true">↗</span></div>{stops.length ? measures.map(([low, high, value]) => <div className="balance-row" key={low}><div><span>{low}</span><span>{high}</span></div><meter min="0" max="100" value={value} aria-label={`${low} to ${high}`}>{value}%</meter></div>) : <p className="muted small">Your day is an open book.</p>}</section>;
}

export function Planner({ stops, date, setDate, onMove, onRemove, onEdit, onSelect, onShare, onSave, onDiscover }: PlannerProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'day-drop' });
  const stats = dayStats(stops);
  const warnings = scheduleWarnings(stops, date);
  const [collapsed, setCollapsed] = useState(false);
  return <aside id="my-day" className={`planner ${isOver ? 'drop-active' : ''}`} ref={setNodeRef} aria-labelledby="day-heading" data-component="DayPlanner">
    <div className="planner-heading"><div><div className="eyebrow">A little room for serendipity</div><h2 id="day-heading" tabIndex={-1}>Your kind of day<span className="count">{stops.length}</span></h2></div><IconButton label="Share your day" onClick={onShare} disabled={!stops.length}><Share2 size={19} /></IconButton></div>
    <label className="day-date"><Sunrise size={17} /><span className="sr-only">Date of your day</span><input aria-label="Date of your day" type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>
    <button className="button planner-save" onClick={onSave} disabled={!stops.length}><Bookmark size={17} />Save day</button>
    <div className="day-summary"><span><Footprints size={15} />{stats.walking} min walking</span><span>USD {stats.cost} est.</span><button className="text-button" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed}>{collapsed ? 'Expand' : 'Condense'}</button></div>
    <SortableContext items={stops.map(stop => `stop-${stop.id}`)} strategy={rectSortingStrategy}>
      <ol className={`timeline ${collapsed ? 'condensed' : ''}`}>
        {stops.map((stop, index) => <StopItem key={stop.id} stop={stop} previous={stops[index - 1]} index={index} total={stops.length} warnings={warnings.get(stop.id) ?? []} onMove={onMove} onRemove={onRemove} onEdit={onEdit} onSelect={onSelect} />)}
      </ol>
    </SortableContext>
    {!stops.length && <div className="empty-day"><Sun size={32} /><h3>Nothing set in stone.</h3><p>Where will the day take you?</p></div>}
    <button className="add-stop" onClick={onDiscover}><Plus size={17} />Leave room for one more</button>
    <div className="day-seasons"><Sunrise size={15} /><span>Morning</span><Sun size={15} /><span>Afternoon</span><Sunset size={15} /><span>Evening</span><Moon size={15} /><span>Late-night</span></div>
    <Balance stops={stops} />
    <p className="day-footnote">Walking times and costs are illustrative estimates.</p>
  </aside>;
}