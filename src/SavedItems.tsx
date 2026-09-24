import { useState } from 'react';
import { Bookmark, Pencil, Search, Trash2 } from 'lucide-react';
import { activityDates, activityUnknowns, filterActivities, sourceLabel, type Activity } from './activities';
import { IconButton, Modal, UnknownDetails } from './components';

export function ActivityFilters({ ideas, query, category, tag, setQuery, setCategory, setTag }: {
  ideas: Activity[]; query: string; category: string; tag: string;
  setQuery: (value: string) => void; setCategory: (value: string) => void; setTag: (value: string) => void;
}) {
  return <div className="item-filters">
    <label className="search-field"><Search size={18} /><span className="sr-only">Search saved items</span><input type="search" enterKeyHint="search" placeholder="Search items, tags or notes" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="item-filter-selects"><label className="field">Category<select aria-label="Saved item category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{[...new Set(ideas.map(idea => idea.category))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="field">Tag<select aria-label="Saved item tag" value={tag} onChange={event => setTag(event.target.value)}><option value="">All tags</option>{[...new Set(ideas.flatMap(idea => idea.tags ?? []))].sort().map(value => <option key={value}>{value}</option>)}</select></label></div>
    {(query || category || tag) && <button className="text-button" onClick={() => { setQuery(''); setCategory(''); setTag(''); }}>Clear saved item filters</button>}
  </div>;
}

export function SavedItems({ ideas, onUpdate, onRemove }: { ideas: Activity[]; onUpdate: (activity: Activity) => void; onRemove: (activity: Activity) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [editing, setEditing] = useState<Activity | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<Activity | null>(null);
  const filtered = filterActivities(ideas, query, category, tag);
  return <section className="saved-items-page" aria-labelledby="items-heading">
    <div className="builder-heading"><div><p className="eyebrow">Someday, somewhere</p><h1 id="items-heading">Saved items <span className="count">{ideas.length}</span></h1></div><a className="filter-button" href="#discover"><Search size={17} />Discover</a></div>
    <p className="muted small">Saved on this browser</p>
    <ActivityFilters ideas={ideas} query={query} category={category} tag={tag} setQuery={setQuery} setCategory={setCategory} setTag={setTag} />
    <p className="muted small" role="status">{filtered.length} saved items</p>
    <ul className="saved-item-list">{filtered.map(activity => <li key={activity.id} className="saved-item-row">
      <div><h2>{activity.name}</h2><p className="muted small">{activity.category} / {activity.address}</p>{activity.date && <p className="small">{activityDates(activity)} (Pacific)</p>}<div className="tag-list">{activity.tags?.map(value => <span key={value}>{value}</span>)}</div>{activity.notes && <p className="item-notes">{activity.notes}</p>}<UnknownDetails items={activityUnknowns(activity)} href={activity.url} subject={activity.name} /><a className="small" href={activity.url} target="_blank" rel="noreferrer">{sourceLabel(activity.url)}<span className="sr-only"> for {activity.name}</span></a></div>
      <div className="row"><IconButton label={`Edit saved item ${activity.name}`} onClick={() => { setEditing(activity); setNotes(activity.notes ?? ''); setTags((activity.tags ?? []).join(', ')); setError(''); }}><Pencil size={18} /></IconButton><IconButton label={`Remove saved item ${activity.name}`} onClick={() => setRemoving(activity)}><Trash2 size={18} /></IconButton></div>
    </li>)}</ul>
    {!filtered.length && <div className="empty-day"><Bookmark size={30} /><h2>{ideas.length ? 'No matching items.' : 'Nothing saved yet.'}</h2></div>}
    <Modal title="Edit saved item" open={!!editing} onClose={() => setEditing(null)}>{editing && <form onSubmit={event => {
      event.preventDefault(); const values = [...new Set(tags.split(',').map(value => value.trim()).filter(Boolean))];
      if (values.length > 12 || values.some(value => value.length > 40)) { setError('Use up to 12 tags, with at most 40 characters each.'); return; }
      onUpdate({ ...editing, notes, tags: values }); setEditing(null);
    }}><h3>{editing.name}</h3><label className="field">Item tags<input aria-label="Item tags" value={tags} maxLength={490} onChange={event => setTags(event.target.value)} placeholder="Friends, outdoors" /></label><label className="field">Item notes<textarea aria-label="Item notes" rows={5} value={notes} maxLength={2000} onChange={event => setNotes(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="filter-button" onClick={() => setEditing(null)}>Cancel</button><button className="button" type="submit">Save item</button></div></form>}</Modal>
    <Modal title="Remove saved item?" open={!!removing} onClose={() => setRemoving(null)}>{removing && <><p>{removing.name}</p><p className="muted">Planned activities and saved days will stay unchanged.</p><div className="dialog-actions"><button className="filter-button" onClick={() => setRemoving(null)}>Cancel</button><button className="button" onClick={() => { onRemove(removing); setRemoving(null); }}>Remove item</button></div></>}</Modal>
  </section>;
}