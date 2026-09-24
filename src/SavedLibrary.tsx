import { useState } from 'react';
import { Bookmark, FolderOpen, Save, Trash2 } from 'lucide-react';
import { placeById } from './data';
import { IconButton, Modal, PlaceCard } from './components';
import { CategoryArt } from './category-art';
import { timeLabel, type Stop } from './planner';
import type { SavedDay } from './saved-days';

type Props = {
  days: SavedDay[]; saved: string[]; stops: Stop[];
  accountEmail?: string; loading: boolean; loadError: string; busy: boolean; localCount: number; importError: string;
  onRetry: () => void; onImport: () => void; onSignIn: () => void;
  onSaveDay: () => void; onOpenDay: (day: SavedDay) => void; onDeleteDay: (id: string) => Promise<void>;
  onSavePlace: (id: string) => void; onAddPlace: (id: string) => void; onSelectPlace: (id: string) => void;
};

export function SavedLibrary({ days, saved, stops, accountEmail, loading, loadError, busy, localCount, importError, onRetry, onImport, onSignIn, onSaveDay, onOpenDay, onDeleteDay, onSavePlace, onAddPlace, onSelectPlace }: Props) {
  const [collection, setCollection] = useState<'days' | 'places'>('days');
  const [action, setAction] = useState<{ day: SavedDay; kind: 'open' | 'delete' } | null>(null);
  const [error, setError] = useState('');
  return <section className="saved-library" aria-labelledby="saved-heading">
    <div className="saved-heading"><div><div className="eyebrow">Your Seattle collection</div><h1 id="saved-heading">Saved</h1></div><button className="button" disabled={!stops.length || loading || busy} onClick={onSaveDay}><Save size={17} />Save current day</button></div>
    <div className="workspace-switch" role="group" aria-label="Saved collection">
      <button aria-pressed={collection === 'days'} onClick={() => setCollection('days')}>Days ({days.length})</button>
      <button aria-pressed={collection === 'places'} onClick={() => setCollection('places')}>Places ({saved.length})</button>
    </div>
    {collection === 'days' ? <>
      <div className="collection-account"><p className="muted small">{accountEmail ? `Saved to ${accountEmail}` : 'Browser-only collection. Sign in to save days to your account.'}</p>{!accountEmail && <button className="text-button" onClick={onSignIn}>Sign in</button>}</div>
      {localCount > 0 && <div className="local-import"><p>{localCount} browser-saved {localCount === 1 ? 'day' : 'days'}</p><button className="filter-button" disabled={busy || loading} onClick={onImport}><Save size={17} />{busy ? 'Importing...' : 'Import to this account'}</button></div>}
      {importError && <p role="alert">{importError}</p>}
      {loading ? <p role="status">Loading saved days...</p> : loadError ? <div role="alert"><p>{loadError}</p><button className="filter-button" onClick={onRetry}>Try again</button></div> : days.length ? <div className="saved-day-grid">{days.map(day => <article className="saved-day" key={day.id} aria-label={day.name}>
        <CategoryArt category={day.stops[0].activity?.category ?? placeById.get(day.stops[0].id)?.category ?? 'Seattle'} size={40} />
        <div className="saved-day-body"><h2>{day.name}</h2><p className="muted small"><time dateTime={day.date}>{day.date}</time> / {day.stops.length} stops / Pacific time</p>
          <ol>{day.stops.map(stop => <li key={stop.id}><span className="mono">{timeLabel(stop.start)}</span><span>{placeById.get(stop.id)!.name}<small className="muted">{stop.duration} min</small></span></li>)}</ol>
          <div className="saved-day-actions"><button className="button" onClick={() => { setError(''); setAction({ day, kind: 'open' }); }}><FolderOpen size={17} />Open day</button><IconButton label={`Delete ${day.name}`} onClick={() => { setError(''); setAction({ day, kind: 'delete' }); }}><Trash2 size={17} /></IconButton></div>
        </div>
      </article>)}</div> : <div className="empty-results"><Bookmark size={32} /><h2>No saved days yet.</h2><p>{stops.length ? 'Your current day has not been saved to this collection.' : 'Your current day is empty.'}</p></div>}
    </> : <><p className="muted small">Place bookmarks are stored on this browser.</p>{saved.length ? <div className="cards">{saved.map((id, index) => <PlaceCard key={id} place={placeById.get(id)!} index={index} saved planned={stops.some(stop => stop.id === id)} onSave={() => onSavePlace(id)} onAdd={() => onAddPlace(id)} onSelect={() => onSelectPlace(id)} />)}</div> : <div className="empty-results"><Bookmark size={32} /><h2>No saved places yet.</h2></div>}</>}
    <Modal title={action?.kind === 'delete' ? 'Delete saved day?' : 'Open saved day?'} open={!!action} onClose={() => { if (!busy) setAction(null); }}>
      {action && <><p><strong>{action.day.name}</strong></p><p>{action.kind === 'open' ? 'This replaces My day, including its date and stop times. The saved copy stays unchanged.' : `This removes the saved copy from ${accountEmail ? 'your account' : 'this browser'}. My day will not change.`}</p>
        <div className="dialog-actions"><button className="filter-button" disabled={busy} onClick={() => setAction(null)}>Cancel</button><button className="button" disabled={busy} onClick={async () => {
          if (action.kind === 'delete') {
            try { await onDeleteDay(action.day.id); }
            catch (error) { setError(error instanceof Error ? error.message : 'Could not delete the saved day. Please try again.'); return; }
          } else onOpenDay(action.day);
          setAction(null);
        }}>{action.kind === 'delete' ? <><Trash2 size={17} />Delete saved day</> : <><FolderOpen size={17} />Replace My day</>}</button></div>
        {error && <p role="alert">{error}</p>}
      </>}
    </Modal>
  </section>;
}