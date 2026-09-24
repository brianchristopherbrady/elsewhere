import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { activityDates, filterActivities, type Activity } from './activities';
import { ActivityFilters } from './SavedItems';
import { IconButton } from './components';
import type { Stop } from './planner';

export function SavedItemPicker({ ideas, stops, date, onAdd }: { ideas: Activity[]; stops: Stop[]; date: string; onAdd: (activity: Activity) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const filtered = filterActivities(ideas, query, category, tag, availableOnly ? date : '');
  return <>
    <ActivityFilters ideas={ideas} query={query} category={category} tag={tag} setQuery={setQuery} setCategory={setCategory} setTag={setTag} />
    <label className="check-label"><input type="checkbox" checked={availableOnly} disabled={!date} onChange={event => setAvailableOnly(event.target.checked)} />Available on this date</label>
    <p className="muted small" role="status">{filtered.length} saved items</p>
    <ul className="compact-items">{filtered.map(activity => {
      const added = stops.some(stop => stop.id === activity.id);
      return <li key={activity.id}><div><h3>{activity.name}</h3><p className="muted small">{activity.category}{activity.date ? ` / ${activityDates(activity)} (Pacific)` : ''}</p><div className="tag-list">{activity.tags?.map(value => <span key={value}>{value}</span>)}</div>{activity.notes && <details><summary className="small">Item notes</summary><p className="item-notes small">{activity.notes}</p></details>}</div><IconButton label={`${added ? 'In this day' : 'Add to day'}: ${activity.name}`} disabled={added} onClick={() => onAdd(activity)}>{added ? <Check size={18} /> : <Plus size={18} />}</IconButton></li>;
    })}</ul>
    {!filtered.length && <p className="muted">{ideas.length ? 'No matching items.' : 'No saved items yet.'}</p>}
    <a className="text-button" href="#items">Manage saved items</a>
  </>;
}