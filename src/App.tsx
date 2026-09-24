import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, Clock3, Code2, Compass, Download, Footprints, Leaf, List, Map, MapPin, Moon, PanelLeft, Plus, Search, Share2, SlidersHorizontal, Sparkles, Sun, WandSparkles, WifiOff, X, Accessibility, Copy, RefreshCw } from 'lucide-react';
import { lensNames, moods, places, placeById, unverifiedAccess, unverifiedQuiet, type Lens, type Mode, type Mood } from './data';
import { appendStop, dayStats, defaultFilters, distanceKm, filterPlaces, generateDay, origin, readStored, seedStops, shareText, timeLabel, validStops, type Filters, type Stop } from './planner';
import { IconButton, Modal, PlaceCard, Planner, UnknownDetails } from './components';
import { CategoryArt } from './category-art';
import { SettingsDialog } from './SettingsDialog';
import { SavedItems } from './SavedItems';
import { Settings, CalendarDays, CalendarPlus } from 'lucide-react';
import { LiveEvents } from './LiveEvents';
import { MusicDiscovery } from './MusicDiscovery';
import { DiscoveryFilter, type DiscoveryKind } from './DiscoveryFilter';
import { SeattleStaples } from './SeattleStaples';
import { DiscoverMore } from './DiscoverMore';
import { StapleCard, StapleDialog } from './StapleCard';
import { discoverStaples } from './staple-discovery';
import { filterStaples, type Staple } from './staples';
import { pacificToday } from './occurrences';
import { SavedLibrary } from './SavedLibrary';
import { savedDaysKey, snapshotDay, validSavedDays, type SavedDay } from './saved-days';
import { AuthDialog } from './AuthDialog';
import { authClient } from './auth-client';
import { useAccountDays } from './useAccountDays';
import { staticSite } from './static-mode';
import { activityAvailableOn, activityDates, activityFor, placeActivity, placeUnknowns, validActivities, type Activity } from './activities';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import './styles.css';
import './workspace.css';
import './mobile.css';

const MapView = lazy(() => import('./MapView').then(module => ({ default: module.MapView })));
const DayBuilder = lazy(() => import('./DayBuilder').then(module => ({ default: module.DayBuilder })));
const SavedCalendar = lazy(() => import('./SavedCalendar').then(module => ({ default: module.SavedCalendar })));

function sharedPlan(): { stops: Stop[]; date: string } | null {
  try { const value = JSON.parse(new URLSearchParams(location.search).get('day') ?? 'null'); return value && validStops(value.stops) && /^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value : null; } catch { return null; }
}

export default function App() {
  const [lens, setLens] = useState<Lens>(() => readStored('elsewhere:lens', 'journal', (value): value is Lens => ['journal', 'nocturne', 'civic'].includes(value as string)));
  const [mode, setMode] = useState<Mode>(() => readStored('elsewhere:mode', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', (value): value is Mode => value === 'light' || value === 'dark'));
  const [stops, setStops] = useState<Stop[]>(() => sharedPlan()?.stops ?? readStored('elsewhere:seattle:stops', [], validStops));
  const [saved, setSaved] = useState<string[]>(() => readStored('elsewhere:seattle:saved', [], (value): value is string[] => Array.isArray(value) && value.every(id => typeof id === 'string' && placeById.has(id))));
  const [date, setDate] = useState(() => sharedPlan()?.date ?? readStored('elsewhere:seattle:date', '', (value): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)));
  const [ideas, setIdeas] = useState<Activity[]>(() => readStored('elsewhere:seattle:activities', saved.map(id => placeActivity(placeById.get(id)!)), validActivities));
  const [dayNotes, setDayNotes] = useState(() => readStored('elsewhere:seattle:dayNotes', '', (value): value is string => typeof value === 'string'));
  const [dayTags, setDayTags] = useState(() => readStored('elsewhere:seattle:dayTags', '', (value): value is string => typeof value === 'string'));
  const [editingRecord, setEditingRecord] = useState<{ id: string; owner: string } | null>(() => readStored('elsewhere:seattle:editingDay', null, (value): value is { id: string; owner: string } | null => value === null || typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string' && typeof (value as { owner?: unknown }).owner === 'string'));
  const [newDayOpen, setNewDayOpen] = useState(false);
  const [localDays, setLocalDays] = useState(() => readStored(savedDaysKey, [], validSavedDays));
  const account = useAccountDays();
  const editingOwner = account.session?.user.id ?? (staticSite ? 'this-browser' : undefined);
  const editingDay = editingRecord?.owner === editingOwner ? editingRecord?.id ?? null : null;
  function setEditingDay(id: string | null) { setEditingRecord(id && editingOwner ? { id, owner: editingOwner } : null); }
  const savedDays = account.session ? account.days : localDays;
  const [authOpen, setAuthOpen] = useState(() => !staticSite && ['reset', 'verified'].includes(new URLSearchParams(location.search).get('account') ?? ''));
  const [authMode, setAuthMode] = useState<'signin' | 'forgot'>('signin');
  const [saveAfterLogin, setSaveAfterLogin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [importError, setImportError] = useState('');
  const [saveDayOpen, setSaveDayOpen] = useState(false);
  const [dayName, setDayName] = useState(() => readStored('elsewhere:seattle:dayName', '', (value): value is string => typeof value === 'string'));
  const [saveDayError, setSaveDayError] = useState('');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [discoveryKind, setDiscoveryKind] = useState<DiscoveryKind>(() => location.hash === '#events' ? 'events' : 'places');
  const [view, setView] = useState<'explore' | 'day' | 'map'>(() => location.hash === '#my-day' ? 'day' : 'explore');
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 850px)').matches);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [openStaple, setOpenStaple] = useState<Staple | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reduced, setReduced] = useState(() => readStored('elsewhere:reduced', false, (value): value is boolean => typeof value === 'boolean'));
  const [contrast, setContrast] = useState(() => readStored('elsewhere:contrast', false, (value): value is boolean => typeof value === 'boolean'));
  const [online, setOnline] = useState(navigator.onLine);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState('');
  const [replacement, setReplacement] = useState('');
  const [undoStops, setUndoStops] = useState<Stop[] | null>(null);
  const [route, setRoute] = useState(location.hash || '#discover');
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(filters.query);
  const visible = filterPlaces({ ...filters, query: deferredQuery }, saved, 660);
  const listResults = useMemo(() => discoverStaples(filterStaples(deferredQuery), filters), [deferredQuery, filters]);
  const [listLimit, setListLimit] = useState(24);
  useEffect(() => setListLimit(24), [deferredQuery, filters]);
  const today = pacificToday();
  const selectedPlace = selected ? placeById.get(selected) : null;
  const suggestions = generateDay(visible, filters.moods);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, scrollBehavior: 'auto' }));

  useEffect(() => {
    const media = matchMedia('(max-width: 850px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.lens = lens;
    document.documentElement.dataset.mode = mode;
    document.documentElement.dataset.reduced = String(reduced);
    document.documentElement.dataset.contrast = String(contrast);
    document.documentElement.style.colorScheme = contrast ? 'light' : mode;
  }, [lens, mode, reduced, contrast]);
  useEffect(() => {
    try {
      Object.entries({ lens, mode, reduced, contrast }).forEach(([key, value]) => localStorage.setItem(`elsewhere:${key}`, JSON.stringify(value)));
      Object.entries({ stops, saved, date, activities: ideas, dayName, dayNotes, dayTags, editingDay: editingRecord }).forEach(([key, value]) => localStorage.setItem(`elsewhere:seattle:${key}`, JSON.stringify(value)));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [lens, mode, reduced, contrast, stops, saved, date, ideas, dayName, dayNotes, dayTags, editingRecord]);
  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine);
    let first = true;
    const updateRoute = () => {
      let next = location.hash || '#discover';
      if (next === '#events') { next = '#discover'; setDiscoveryKind('events'); history.replaceState(null, '', `${location.pathname}${location.search}#discover`); }
      setRoute(next); setView(next === '#my-day' ? 'day' : 'explore');
      if (!first) scrollTo({ top: 0 });
      first = false;
    };
    updateRoute();
    addEventListener('online', updateNetwork); addEventListener('offline', updateNetwork); addEventListener('hashchange', updateRoute);
    return () => { removeEventListener('online', updateNetwork); removeEventListener('offline', updateNetwork); removeEventListener('hashchange', updateRoute); };
  }, []);
  useEffect(() => { document.title = `${route === '#saved' ? 'My Calendar' : route === '#items' ? 'Saved items' : route === '#my-day' ? 'Create a Day' : 'Discover Seattle'} | Elsewhere`; }, [route]);

  useEffect(() => {
    if (account.session && saveAfterLogin) { setAuthOpen(false); setSaveAfterLogin(false); setSaveDayOpen(true); }
  }, [account.session, saveAfterLogin]);

  function startSaveDay() {
    setSaveDayError('');
    if (!account.session && !staticSite) { setAuthMode('signin'); setSaveAfterLogin(true); setAuthOpen(true); return; }
    setSaveDayOpen(true);
  }
  async function saveDay(asNew = false) {
    if (!stops.length || !date || account.busy) return;
    setSaveDayError('');
    const tags = [...new Set(dayTags.split(',').map(tag => tag.trim()).filter(Boolean))];
    if (tags.length > 12 || tags.some(tag => tag.length > 40)) { setSaveDayError('Use up to 12 tags, with at most 40 characters each.'); return; }
    const day = { ...snapshotDay(dayName, date, stops), notes: dayNotes, tags };
    const replacing = editingDay && !asNew;
    if (replacing) day.id = editingDay;
    if (staticSite) {
      const next = replacing ? localDays.map(value => value.id === day.id ? day : value) : [day, ...localDays];
      try { localStorage.setItem(savedDaysKey, JSON.stringify(next)); } catch { setSaveDayError('Browser storage is full or unavailable, so this day could not be saved.'); return; }
      setLocalDays(next); setEditingDay(day.id); setSaveDayOpen(false); setNotice(replacing ? 'Changes saved in this browser.' : 'Day saved in this browser.');
      return;
    }
    try { if (replacing) await account.update(day); else await account.save([day]); setEditingDay(day.id); setSaveDayOpen(false); setNotice(replacing ? 'Changes saved to your account.' : 'Day saved to your account.'); }
    catch (error) { setSaveDayError(error instanceof Error ? error.message : 'Could not save your day. Please try again.'); }
  }
  async function deleteDay(id: string) {
    if (account.session) { await account.remove(id); if (editingDay === id) setEditingDay(null); return; }
    const next = localDays.filter(day => day.id !== id);
    localStorage.setItem(savedDaysKey, JSON.stringify(next)); setLocalDays(next);
  }
  async function updateDay(day: SavedDay) {
    if (account.session) { await account.update(day); return; }
    const next = localDays.map(value => value.id === day.id ? day : value);
    localStorage.setItem(savedDaysKey, JSON.stringify(next)); setLocalDays(next);
  }
  async function importDays() {
    setImportError('');
    try {
      await account.save(localDays);
      try { localStorage.removeItem(savedDaysKey); setLocalDays([]); }
      catch { setImportError('Imported successfully. Browser storage could not remove the local copies.'); }
      setNotice('Browser days imported to your account.');
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Import failed. Your local copies are unchanged.'); }
  }
  async function signOut() {
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Could not sign out. Please try again.');
      setStops([]); setDayName(''); setDayNotes(''); setDayTags(''); setEditingDay(null); setUndoStops(null); setSaveDayOpen(false); setAuthOpen(false); setImportError('');
      const url = new URL(location.href); url.searchParams.delete('day'); history.replaceState(null, '', url);
      setNotice('Signed out. Your account days remain saved.');
    } catch { setNotice('Could not sign out. Please try again.'); }
    finally { setSigningOut(false); }
  }
  function openDay(day: SavedDay) {
    setStops(day.stops.map(stop => ({ ...stop }))); setDate(day.date); setUndoStops(null);
    setDayName(day.name); setDayNotes(day.notes ?? ''); setDayTags((day.tags ?? []).join(', ')); setEditingDay(account.session || staticSite ? day.id : null);
    const url = new URL(location.href); url.searchParams.delete('day'); url.hash = 'my-day';
    history.replaceState(null, '', url); setRoute('#my-day'); setView('day');
    setNotice(`${day.name} opened. The saved copy is unchanged.`);
    requestAnimationFrame(() => document.getElementById('day-heading')?.focus());
  }

  function selectPlace(id: string) { if (!placeById.has(id)) return; setSelected(id); setReplacement(''); setDetailOpen(true); }
  function toggleIdea(activity: Activity) {
    if (!ideas.some(value => value.id === activity.id) && ideas.length >= 200) { setNotice('Your activity list can hold up to 200 items.'); return; }
    setIdeas(current => current.some(value => value.id === activity.id) ? current.filter(value => value.id !== activity.id) : [...current, activity]);
    if (placeById.has(activity.id)) setSaved(current => current.includes(activity.id) ? current.filter(id => id !== activity.id) : [...current, activity.id]);
    setNotice(`${activity.name} ${ideas.some(value => value.id === activity.id) ? 'removed from' : 'added to'} saved activities.`);
  }
  function addActivity(activity: Activity) {
    if (!date) { setNotice('Choose a date first.'); return; }
    if (!activityAvailableOn(activity, date)) { setNotice(`${activity.name} is not available on ${date}. Event dates: ${activityDates(activity)} (Pacific time).`); return; }
    if (stops.some(stop => stop.id === activity.id)) return;
    if (stops.length >= 200) { setNotice('A day can hold up to 200 activities.'); return; }
    setUndoStops(stops); setStops(current => current.some(stop => stop.id === activity.id) ? current : [...current, { id: activity.id, start: null, duration: null, notes: activity.notes ?? '', activity: structuredClone(activity) }]);
    setNotice(`${activity.name} added to your day without a time slot.`);
  }
  const ideaAction = (activity: Activity) => <button className="filter-button" aria-pressed={ideas.some(value => value.id === activity.id)} onClick={() => toggleIdea(activity)}><Bookmark size={17} />{ideas.some(value => value.id === activity.id) ? 'Saved activity' : 'Save activity'}</button>;
  const isIdea = (id: string) => ideas.some(value => value.id === id);
  function addPlace(id: string) {
    const place = placeById.get(id)!;
    if (place.eventDate && place.eventDate !== date) { setNotice(`This event is on ${place.eventDate}. Change your day to that date to add it.`); return; }
    addActivity(placeActivity(place));
  }
  function savePlace(id: string) { toggleIdea(placeActivity(placeById.get(id)!)); }
  function updateMood(mood: Mood) { setFilters(current => ({ ...current, moods: current.moods.includes(mood) ? current.moods.filter(value => value !== mood) : [...current.moods, mood] })); }
  function reorder(id: string, destination: number) {
    const index = stops.findIndex(stop => stop.id === id);
    if (index < 0 || destination < 0 || destination >= stops.length) return;
    setUndoStops(stops); setStops(arrayMove(stops, index, destination)); setNotice(`${activityFor(stops[index]).name} moved to stop ${destination + 1}. Check the start times.`);
  }
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    if (activeId.startsWith('place-') && (String(over.id).startsWith('stop-') || over.id === 'day-drop')) addPlace(activeId.slice(6));
    else if (activeId.startsWith('stop-') && String(over.id).startsWith('stop-')) reorder(activeId.slice(5), stops.findIndex(stop => stop.id === String(over.id).slice(5)));
  }
  function discover() { location.hash = 'discover'; setView('explore'); setFilters(defaultFilters); setDiscoveryKind('places'); requestAnimationFrame(() => searchRef.current?.focus()); }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Copied. A good day is worth sharing.'); } catch { setNotice('Clipboard unavailable. Select the plan text or download it instead.'); } }
  function downloadDay() { const url = URL.createObjectURL(new Blob([shareText(stops, date)], { type: 'text/plain' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `elsewhere-${date}.txt`; anchor.click(); URL.revokeObjectURL(url); setNotice('Your day was downloaded.'); }
  function shareUrl() { const url = new URL(location.href); url.search = ''; url.searchParams.set('day', JSON.stringify({ stops, date })); url.hash = 'my-day'; return url.href; }

  return <DndContext sensors={sensors} collisionDetection={args => closestCenter({ ...args, droppableContainers: String(args.active.id).startsWith('stop-') ? args.droppableContainers.filter(container => String(container.id).startsWith('stop-')) : args.droppableContainers })} onDragEnd={onDragEnd}>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to main content</a>
    <header className="site-header"><a className="brand" href="#discover" aria-label="Elsewhere home"><Compass size={30} strokeWidth={1.4} /><span>elsewhere<span className="brand-period">.</span></span></a>
      <nav aria-label="Primary navigation">{([['#discover', 'Discover', Compass, null], ['#items', 'Saved items', Bookmark, ideas.length], ['#my-day', 'Create a Day', CalendarPlus, stops.length], ['#saved', 'My Calendar', CalendarDays, savedDays.length]] as const).map(([hash, label, Icon, count]) => <a key={hash} href={hash} aria-current={route === hash ? 'page' : undefined} onClick={() => { setView(hash === '#my-day' ? 'day' : 'explore'); if (route === hash) scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || reduced ? 'auto' : 'smooth' }); }}><Icon className="nav-icon" size={22} strokeWidth={1.6} aria-hidden="true" /><span className="nav-label">{label}</span>{count !== null && <span className="nav-count" data-empty={count === 0 || undefined}><span className="sr-only">, </span>{count}</span>}</a>)}</nav>
      <div className="header-right"><span className="city"><MapPin size={15} />Seattle, Washington</span><div className="account-controls">{account.session ? <span className="account-name" title={account.session.user.email}><UserRound size={16} />{account.session.user.name}</span> : !staticSite && <button className="filter-button" disabled={account.isPending} onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}><LogIn size={17} /><span className="header-sign-in-label">{account.isPending ? 'Checking account...' : 'Sign in'}</span></button>}</div><IconButton label="Settings" onClick={() => setSettingsOpen(true)}><Settings size={20} /></IconButton></div>
    </header>
    {!online && <div className="network-banner" role="status"><WifiOff size={16} />You are offline. Your loaded places and day are still here.</div>}
    {storageError && <div className="network-banner" role="alert">Browser storage is unavailable. Download your day before closing this tab.</div>}
    <main id="main" tabIndex={-1} className={`app-grid workspace view-${view} planning-workspace`}>
      <Suspense fallback={<p className="route-loading" role="status">Loading...</p>}>
      {route === '#items' ? <SavedItems ideas={ideas} onUpdate={activity => { setIdeas(current => current.map(value => value.id === activity.id ? activity : value)); setNotice('Saved item updated.'); }} onRemove={toggleIdea} /> : route === '#my-day' ? <DayBuilder stops={stops} date={date} name={dayName} notes={dayNotes} tags={dayTags} ideas={ideas} editing={!!editingDay} setDate={setDate} setName={setDayName} setNotes={setDayNotes} setTags={setDayTags} onAdd={addActivity} onIdea={toggleIdea} onSave={startSaveDay} onShare={() => setShareOpen(true)} onNew={() => setNewDayOpen(true)} onEdit={(id, changes) => setStops(current => current.map(stop => stop.id === id ? { ...stop, ...changes } : stop))} onRemove={id => { setUndoStops(stops); setStops(current => current.filter(stop => stop.id !== id)); setNotice('Activity removed from this day.'); }} onMove={(id, direction) => reorder(id, stops.findIndex(stop => stop.id === id) + direction)} onSelect={selectPlace} mode={mode} lens={lens} /> : route === '#saved' ? <SavedCalendar key={account.session?.user.id ?? 'guest'} days={savedDays} email={account.session?.user.email} loading={account.loading} error={account.error} busy={account.busy} onRetry={account.retry} localCount={account.session ? localDays.length : 0} onImport={() => void importDays()} importError={importError} onSignIn={() => { setAuthMode('signin'); setAuthOpen(true); }} onEdit={openDay} onDelete={deleteDay} onUpdate={updateDay} /> : <>
      <section className="discovery" aria-labelledby={view === 'map' ? 'day-map-heading' : discoveryKind === 'places' ? 'discovery-heading' : undefined}>
        <div className="explore-controls" hidden={view === 'map'}>
        <p className="muted small">{discoveryKind === 'places' ? 'Curated Seattle places / Expanded September 22, 2026.' : discoveryKind === 'staples' ? 'Your Seattle list / Leads to confirm before visiting.' : discoveryKind === 'music' ? 'Seattle music / Ticketmaster and official venue sources.' : 'Live Seattle activities / Published city calendar.'}</p>
        <div className="discovery-heading" hidden={discoveryKind !== 'places'}><div><div className="eyebrow issue-line"><span className="tiny-cross">+</span>A DAY IN SEATTLE <span className="issue-number">/ VOL. 001</span></div><h1 id="discovery-heading">{filters.savedOnly ? <>Good things,<br /><em>kept close.</em></> : <>A little less<br /><em>ordinary.</em></>}</h1><p>{filters.savedOnly ? 'Places worth coming back to.' : 'Follow a feeling. Find your somewhere.'}</p></div><div className="day-stamp" aria-hidden="true"><span>SEA</span><Compass size={30} strokeWidth={1} /><span>GET A LITTLE LOST</span></div></div>
        <div className="discovery-type-row"><DiscoveryFilter value={discoveryKind} onChange={setDiscoveryKind} /><button className={`filter-button ${discoveryKind !== 'places' || filters.accessible || filters.openOnly || filters.maxPrice < defaultFilters.maxPrice || filters.maxDistance < defaultFilters.maxDistance ? 'active' : ''}`} onClick={() => setFilterOpen(true)}><SlidersHorizontal size={17} />Filters</button></div>
        <div hidden={discoveryKind !== 'places'}>
        <div className="search-row"><div className="search-field"><Search size={18} /><label className="sr-only" htmlFor="place-search">Search places or atmosphere</label><input id="place-search" ref={searchRef} type="search" enterKeyHint="search" list="place-suggestions" placeholder="A neighborhood, a feeling, a very good coffee..." value={filters.query} onChange={event => setFilters(current => ({ ...current, query: event.target.value }))} /><datalist id="place-suggestions">{[...moods, ...places.map(place => place.name), ...new Set(places.map(place => place.neighborhood))].map(value => <option value={value} key={value} />)}</datalist></div></div>
        <div className="mood-row"><span className="mood-prompt">In the mood for</span><div className="moods" role="group" aria-label="Filter by mood">{moods.map(mood => <button key={mood} onClick={() => updateMood(mood)} aria-pressed={filters.moods.includes(mood)}>{mood === 'Quiet' && <Leaf size={13} />}{mood === 'Strange' && <Sparkles size={13} />}{mood}{filters.moods.includes(mood) && <Check size={12} />}</button>)}</div></div>
        <div className="results-toolbar"><div className="result-count" aria-live="polite">{visible.length + listResults.length} little discoveries{filters.savedOnly && ' saved'}{listResults.length > 0 && <span className="muted"> ({visible.length} curated, {listResults.length} from your Seattle list)</span>}</div><div className="result-tools"><label className="sort-label"><span className="sr-only">Sort places</span><select aria-label="Sort places" value={filters.sort} onChange={event => setFilters(current => ({ ...current, sort: event.target.value as Filters['sort'] }))}><option value="curated">Our picks</option><option value="distance">Nearest first</option><option value="price">Price: low to high</option></select></label></div></div>
        </div>
        </div>
        {view === 'map' && <div className="day-map-heading"><h1 id="day-map-heading">Your day, on the map.</h1><p className="muted">{stops.length} planned stops / Seattle</p></div>}
        {view !== 'map' && discoveryKind === 'staples' && <SeattleStaples initialQuery={filters.query} renderAction={ideaAction} />}
        {view !== 'map' && discoveryKind === 'music' && <MusicDiscovery renderAction={ideaAction} />}
        {view !== 'map' && (discoveryKind === 'events' || discoveryKind === 'guided-tour' || discoveryKind === 'meetup') && <LiveEvents activity={discoveryKind === 'events' ? undefined : discoveryKind} initialQuery={discoveryKind === 'events' ? filters.query : ''} renderAction={ideaAction} />}
        <div className="explore-layout" hidden={view !== 'map' && discoveryKind !== 'places'} aria-busy={filters.query !== deferredQuery}>
          <div className="results" hidden={view === 'map'}>{visible.length || listResults.length ? <><div className="cards">{visible.map((place, index) => <PlaceCard key={place.id} place={place} index={index} saved={saved.includes(place.id)} planned={false} collectOnly onSave={() => savePlace(place.id)} onAdd={() => savePlace(place.id)} onSelect={() => selectPlace(place.id)} />)}{listResults.slice(0, listLimit).map(staple => <StapleCard key={staple.id} staple={staple} today={today} isSaved={isIdea} onToggle={toggleIdea} onOpen={() => setOpenStaple(staple)} />)}</div>{listResults.length > listLimit && <button className="filter-button show-more-list" onClick={() => setListLimit(value => value + 24)}>Show more from your Seattle list ({listResults.length - listLimit} more)</button>}</> : <div className="empty-results"><Compass size={38} strokeWidth={1} /><h2>{filters.savedOnly ? 'Your collection starts here.' : 'A little too far off the map.'}</h2><p>{filters.savedOnly ? 'Something will catch your eye.' : 'No places match this combination.'}</p><button className="button" onClick={discover}>Back to discoveries<ArrowRight size={16} /></button></div>}{view !== 'map' && discoveryKind === 'places' && !filters.savedOnly && <DiscoverMore query={deferredQuery} renderAction={ideaAction} onShowEvents={() => { setDiscoveryKind('events'); scrollTo({ top: 0 }); }} />}</div>
          {view === 'map' && <div className="map-wrap"><Suspense fallback={<p className="route-loading" role="status">Loading map...</p>}><MapView stops={stops} selected={selected} onSelect={selectPlace} mode={mode} lens={lens} /></Suspense></div>}
        </div>
        <div className="discovery-end" hidden={view === 'map' || discoveryKind !== 'places'}><span>Not all who wander need a plan.</span><a className="text-button" href="#items">Saved items<ArrowRight size={16} /></a></div>
      </section>
      </>}
      </Suspense>
    </main>
    {authOpen && <AuthDialog initialMode={authMode} initialEmail={account.session?.user.email} onClose={() => { setAuthOpen(false); setSaveAfterLogin(false); }} onSignedIn={() => { setAuthOpen(false); void account.refetch(); }} />}
    <Modal title="Save your day" open={saveDayOpen && (!!account.session || staticSite)} onClose={() => { if (!account.busy) setSaveDayOpen(false); }}>
      <form onSubmit={event => { event.preventDefault(); void saveDay(); }} aria-busy={account.busy}>
        <label className="field">Day name<input value={dayName} placeholder="Untitled day" maxLength={100} onChange={event => setDayName(event.target.value)} /></label>
        <p className="muted small">{date} / {stops.length} stops. {staticSite ? 'Saved in this browser only.' : `Account: ${account.session?.user.email}`}</p>
        {editingDay && <p className="small">You opened “{savedDays.find(day => day.id === editingDay)?.name ?? 'a saved day'}”. Save changes replaces it on your calendar; Save as new day keeps both.</p>}
        <div className="dialog-actions"><button type="button" className="filter-button" disabled={account.busy} onClick={() => setSaveDayOpen(false)}>Cancel</button>{editingDay && <button type="button" className="filter-button" disabled={!stops.length || !date || account.busy} onClick={() => void saveDay(true)}><Plus size={17} />Save as new day</button>}<button className="button" type="submit" disabled={!stops.length || !date || account.busy}><Bookmark size={17} />{account.busy ? 'Saving...' : editingDay ? 'Save changes' : 'Save day'}</button></div>
        {saveDayError && <p role="alert">{saveDayError}</p>}
      </form>
    </Modal>
    <Modal title="Start a new day?" open={newDayOpen} onClose={() => setNewDayOpen(false)}><p>Your working draft will be cleared. Saved days and saved activities stay unchanged.</p><div className="dialog-actions"><button className="filter-button" onClick={() => setNewDayOpen(false)}>Cancel</button><button className="button" onClick={() => { setStops([]); setDate(''); setDayName(''); setDayNotes(''); setDayTags(''); setEditingDay(null); setUndoStops(null); setNewDayOpen(false); }}>Start new day</button></div></Modal>
    <footer className="site-footer"><span className="brand-small">elsewhere.</span><span>Real Seattle places. Confirm details with the venue.</span><span>Seattle edition / 2026</span></footer>
    <div className="toast-region" aria-live="polite" aria-atomic="true">{notice && <div className="toast"><Check size={17} /><span>{notice}</span>{undoStops && <button onClick={() => { setStops(undoStops); setUndoStops(null); setNotice('Previous itinerary restored.'); }}>Undo</button>}<IconButton label="Dismiss notification" onClick={() => { setNotice(''); setUndoStops(null); }}><X size={16} /></IconButton></div>}</div>

    <Modal title="A few preferences" open={filterOpen} onClose={() => setFilterOpen(false)} className="filter-dialog"><p className="muted">The right kind of detour.</p><DiscoveryFilter value={discoveryKind} onChange={setDiscoveryKind} /><div hidden={discoveryKind !== 'places'}><label className="field">Budget per stop <strong>{filters.maxPrice === 0 ? 'Free' : `Up to USD ${filters.maxPrice}`}</strong><input type="range" min="0" max={defaultFilters.maxPrice} step="5" value={filters.maxPrice} onChange={event => setFilters(current => ({ ...current, maxPrice: +event.target.value }))} /></label><label className="field">Distance from Pike Place Market <strong>{filters.maxDistance} km</strong><input type="range" min="0.3" max={defaultFilters.maxDistance} step="0.1" value={filters.maxDistance} onChange={event => setFilters(current => ({ ...current, maxDistance: +event.target.value }))} /></label><label className="check-label"><input type="checkbox" checked={filters.accessible} onChange={event => setFilters(current => ({ ...current, accessible: event.target.checked }))} />Step-free access</label><label className="check-label"><input type="checkbox" checked={filters.openOnly} onChange={event => setFilters(current => ({ ...current, openOnly: event.target.checked }))} />Open at 11:00</label><p className="muted small">Pacific time. Only source-listed hours and reported step-free entrances qualify; unknown details are excluded. Confirm holiday changes.</p></div>{discoveryKind === 'staples' && <p className="muted small">Your Seattle list. Place preferences do not apply; locations, hours and dates are not verified.</p>}{discoveryKind !== 'places' && discoveryKind !== 'staples' && <p className="muted small">Live city calendar listings. Distance, step-free access, and comparable ticket prices are not consistently supplied. Place preferences do not apply.</p>}<div className="dialog-actions"><button className="text-button" onClick={() => { setFilters(defaultFilters); setDiscoveryKind('places'); }}>Reset filters</button><button className="button" onClick={() => setFilterOpen(false)}>{discoveryKind === 'places' ? `Show ${visible.length} places` : 'Show activities'}<ArrowRight size={16} /></button></div></Modal>

    {openStaple && <StapleDialog staple={openStaple} today={today} onClose={() => setOpenStaple(null)} onAdd={route === '#my-day' ? addActivity : undefined} isSaved={isIdea} onToggle={toggleIdea} />}
    <Modal title={selectedPlace?.name ?? 'Place details'} open={detailOpen} onClose={() => setDetailOpen(false)} className="place-dialog">{selectedPlace && <><CategoryArt category={selectedPlace.category} className="detail-art" size={64} /><div className="detail-content">
      <div className="eyebrow">{selectedPlace.category} / {selectedPlace.neighborhood}</div><p className="detail-note">{selectedPlace.note}</p><p>{selectedPlace.description}</p>
      <p>{selectedPlace.address}</p><p><a href={selectedPlace.website} target="_blank" rel="noreferrer">Official {selectedPlace.eventDate ? 'event' : 'venue'} details <ArrowUpRight size={14} /></a><span className="muted small"> / Source reviewed {selectedPlace.checkedAt}</span></p>
      <div className="detail-facts"><div><Clock3 size={18} /><span>{selectedPlace.hoursKnown ? 'Source-listed hours' : 'Published schedule (hours for your date not confirmed)'}<strong>{selectedPlace.hours}</strong></span></div><div><Footprints size={18} /><span>From Pike Place Market<strong>{distanceKm(origin, selectedPlace).toFixed(1)} km</strong></span></div><div><span className="currency-symbol">USD</span><span>Planning estimate<strong>{selectedPlace.price ? `USD ${selectedPlace.price} est.` : 'Free to visit; purchases extra'}</strong></span></div></div>
      <UnknownDetails items={placeUnknowns(selectedPlace)} href={selectedPlace.website} subject={selectedPlace.name} />
      <h3>Why this fits your day</h3><p>{selectedPlace.moods.join(', ')}. {filters.moods.some(mood => selectedPlace.moods.includes(mood)) ? 'A match for the mood you picked.' : 'A different pace, and a little room to explore.'}</p><h3><Accessibility size={17} />Access information</h3>{selectedPlace.access === unverifiedAccess ? <p>Not verified. <a href={selectedPlace.website} target="_blank" rel="noreferrer">Ask the venue through its official site<span className="sr-only"> about access at {selectedPlace.name}</span></a> about your specific requirements.</p> : <p>{selectedPlace.access}</p>}<h3>Find a quieter moment</h3>{selectedPlace.quiet === unverifiedQuiet ? <p>No verified crowd data. <a href={selectedPlace.website} target="_blank" rel="noreferrer">Contact the venue<span className="sr-only"> about quieter times at {selectedPlace.name}</span></a> for quieter visiting times.</p> : <p>{selectedPlace.quiet}</p>}
      {selectedPlace.eventDate && selectedPlace.eventDate !== date && <p role="status">This event is on {selectedPlace.eventDate}, not your selected day.</p>}
      <div className="dialog-actions">{route === '#my-day' && <button className="button" disabled={stops.some(stop => stop.id === selectedPlace.id)} onClick={() => addActivity(placeActivity(selectedPlace))}>{stops.some(stop => stop.id === selectedPlace.id) ? <><Check size={17} />In your day</> : <><Plus size={17} />Add to day</>}</button>}<button className="filter-button" aria-pressed={saved.includes(selectedPlace.id)} onClick={() => savePlace(selectedPlace.id)}><Bookmark size={19} />{saved.includes(selectedPlace.id) ? 'Remove saved activity' : 'Save activity'}</button><IconButton label="Share this place" onClick={() => copy(`${selectedPlace.name} - ${selectedPlace.address}\n${selectedPlace.hours}\n${selectedPlace.website}\nSeattle guide from Elsewhere.`)}><Share2 size={18} /></IconButton></div>
      <p role="status" className="small">{notice}</p><h3>A little further along</h3><div className="related-places">{places.filter(place => place.id !== selectedPlace.id).sort((first, second) => distanceKm(first, selectedPlace) - distanceKm(second, selectedPlace)).slice(0, 2).map(place => <button key={place.id} onClick={() => selectPlace(place.id)}><CategoryArt category={place.category} size={22} /><span>{place.name}<small>{distanceKm(place, selectedPlace).toFixed(1)} km away</small></span><ArrowUpRight size={18} /></button>)}</div><p className="muted small">Spending, duration, moods, and walking times are editorial estimates; purchases, tax, and tips may cost more.</p></div></>}</Modal>

    <Modal title="A day worth sharing" open={shareOpen} onClose={() => setShareOpen(false)} className="share-dialog"><p className="muted">Seattle, at your own pace.</p><label className="field">Your plan<textarea readOnly rows={9} value={shareText(stops, date)} /></label><div className="dialog-actions"><button className="button" onClick={() => copy(shareUrl())}><Share2 size={17} />Copy day link</button><IconButton label="Copy plan text" onClick={() => copy(shareText(stops, date))}><Copy size={18} /></IconButton><IconButton label="Download day" onClick={downloadDay}><Download size={18} /></IconButton></div><p role="status" className="small">{notice}</p><p className="muted small">Links work wherever this application is hosted. Times are Pacific. Confirm venue details and event availability before travel.</p></Modal>

    <Modal title="Follow the feeling" open={generateOpen} onClose={() => setGenerateOpen(false)} className="generate-dialog"><p className="detail-note">A little structure.<br />A lot of possibility.</p><p className="muted">{filters.moods.length ? filters.moods.join(' + ') : 'A little of everything'}. {suggestions.length} stops from your current discoveries.</p><ol className="suggested-day">{suggestions.map(stop => <li key={stop.id}><span className="mono">{timeLabel(stop.start)}</span>{placeById.get(stop.id)!.name}</li>)}</ol><p className="small muted">Estimated spend: USD {dayStats(suggestions).cost}. {stops.length ? 'This replaces your current day; you can undo it.' : ''}</p><button className="button" disabled={!suggestions.length} onClick={() => { setUndoStops(stops); setStops(suggestions); setGenerateOpen(false); setNotice('A new day, full of possibilities.'); }}>Make it my day<ArrowRight size={17} /></button></Modal>
    {settingsOpen && <SettingsDialog key={account.session?.user.id ?? 'guest'} onClose={() => setSettingsOpen(false)} lens={lens} mode={mode} setLens={setLens} setMode={setMode} reduced={reduced} setReduced={setReduced} contrast={contrast} setContrast={setContrast} user={account.session?.user} busy={signingOut || account.busy} onProfile={() => { void account.refetch(); }} onSignIn={() => { setSettingsOpen(false); setAuthMode('signin'); setAuthOpen(true); }} onReset={() => { setSettingsOpen(false); setAuthMode('forgot'); setAuthOpen(true); }} onSignOut={() => { setSettingsOpen(false); void signOut(); }} />}
  </DndContext>;
}