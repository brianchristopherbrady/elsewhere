import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocateFixed, MapPin, Minus, Plus } from 'lucide-react';
import { placeById, type Mode, type Lens } from './data';
import { travelBetween, type Stop } from './planner';
import { activityFor, hasLocation, sourceLabel } from './activities';
import { IconButton } from './components';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';

export function MapView({ stops, selected, onSelect, mode, lens }: { stops: Stop[]; selected: string | null; onSelect: (id: string) => void; mode: Mode; lens: Lens }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const routeBounds = useRef<L.LatLngTuple[]>([]);
  const selection = useRef(onSelect);
  selection.current = onSelect;
  const [tileError, setTileError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const map = L.map(container.current!, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView([47.6165, -122.3405], 14);
    mapRef.current = map;
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      if (routeBounds.current.length) map.fitBounds(routeBounds.current, { padding: [65, 65], maxZoom: 17, animate: false });
    });
    observer.observe(container.current!);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => {
    const map = mapRef.current!;
    setLoading(true);
    setTileError(false);
    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
    layer.on('load', () => setLoading(false));
    layer.on('tileerror', () => { setTileError(true); setLoading(false); });
    return () => { layer.remove(); };
  }, [mode, retry]);
  useEffect(() => {
    const map = mapRef.current!;
    const pin = matchMedia('(pointer: coarse)').matches ? 44 : 36;
    const group = L.layerGroup().addTo(map);
    const markers = L.markerClusterGroup({
      maxClusterRadius: 50, showCoverageOnHover: false, animate: false, spiderfyDistanceMultiplier: 1.6,
      iconCreateFunction: cluster => {
        const label = document.createElement('span');
        label.textContent = String(cluster.getChildCount());
        label.setAttribute('aria-label', `${cluster.getChildCount()} nearby places. Activate to expand.`);
        return L.divIcon({ html: label, className: 'place-cluster', iconSize: [pin + 4, pin + 4] });
      },
    }).addTo(map);
    const plannedPlaces = stops.map((stop, order) => ({ activity: activityFor(stop), order })).filter((entry): entry is { activity: ReturnType<typeof activityFor> & { lat: number; lng: number }; order: number } => hasLocation(entry.activity));
    const route = plannedPlaces.map(({ activity }) => [activity.lat, activity.lng] as L.LatLngTuple);
    routeBounds.current = route;
    stops.slice(1).forEach((stop, index) => {
      const leg = travelBetween(stops[index], stop);
      const from = activityFor(stops[index]); const to = activityFor(stop);
      if (!leg || !hasLocation(from) || !hasLocation(to)) return;
      const point: L.LatLngTuple = [to.lat, to.lng]; const previous: L.LatLngTuple = [from.lat, from.lng];
      const label = document.createElement('span');
      label.textContent = `${index + 1} to ${index + 2}: ~${leg.km.toFixed(1)} km / ${leg.minutes} min walk`;
      L.polyline([previous, point], { weight: 3, dashArray: '5 8', className: 'day-route' }).addTo(group);
      L.tooltip({ permanent: true, direction: 'left', offset: [-20, 0], className: 'travel-label' })
        .setLatLng([(previous[0] + point[0]) / 2, (previous[1] + point[1]) / 2]).setContent(label).addTo(group);
    });
    plannedPlaces.forEach(({ activity: place, order }) => {
      const element = document.createElement('span');
      element.textContent = order >= 0 ? String(order + 1) : '+';
      const marker = L.marker([place.lat, place.lng], { icon: L.divIcon({ html: element, className: 'place-pin planned-pin', iconSize: [pin, pin], iconAnchor: [pin / 2, pin / 2] }), keyboard: true, title: `Explore ${place.name}`, alt: place.name });
      marker.on('add', () => marker.getElement()?.setAttribute('aria-label', `Explore ${place.name} on map`));
      markerRefs.current.set(place.id, marker);
      markers.addLayer(marker);
      marker.on('click', () => selection.current(place.id));
      marker.on('keypress', event => {
        const keyboard = (event as L.LeafletKeyboardEvent).originalEvent;
        if (keyboard.key === 'Enter' || keyboard.key === ' ') {
          L.DomEvent.stop(keyboard);
          selection.current(place.id);
        }
      });
      marker.bindTooltip(`${order + 1}. ${place.name}`, { direction: 'top', offset: [0, -15] });
    });
    if (route.length) map.fitBounds(route, { padding: [65, 65], maxZoom: 17, animate: false });
    return () => { group.remove(); markers.remove(); markerRefs.current.clear(); };
  }, [stops]);
  useEffect(() => {
    markerRefs.current.forEach((marker, id) => marker.getElement()?.classList.toggle('selected-pin', id === selected));
  }, [selected, stops, mode, lens]);
  return <div className="day-map-content"><section className="map-panel" aria-label="Seattle day map" data-component="DiscoveryMap">
    <div className="map-canvas" ref={container} aria-label="Interactive Seattle map" />
    <div className="map-title"><MapPin size={14} /><span>Your day in Seattle</span></div>
    <div className="map-controls"><IconButton label="Zoom in on map" onClick={() => mapRef.current?.zoomIn()}><Plus size={18} /></IconButton><IconButton label="Zoom out on map" onClick={() => mapRef.current?.zoomOut()}><Minus size={18} /></IconButton><IconButton label="Fit planned stops on map" disabled={!stops.some(stop => hasLocation(activityFor(stop)))} onClick={() => { if (routeBounds.current.length) mapRef.current?.fitBounds(routeBounds.current, { padding: [65, 65], maxZoom: 17, animate: false }); }}><LocateFixed size={18} /></IconButton></div>
    <div className="map-key"><span className="key-dot" />Planned stops / estimated walks</div>
    {loading && !tileError && <div className="map-status" role="status">Finding our bearings...</div>}
    {tileError && <div className="map-status" role="status">Map imagery unavailable. Places are still available.<button className="text-button" onClick={() => setRetry(value => value + 1)}>Retry map</button></div>}
    <div className="map-caption"><span className="mono">47.6062 N / 122.3321 W</span><span>Take the scenic route.</span></div>
  </section><section className="travel-legs" aria-label="Travel between planned stops"><h2>Between stops</h2>
    <p className="muted small">Approximate walking times. Lines connect locations, not street routes; hills and access conditions are not included.</p>
    {!stops.length && <p>Your day is empty.</p>}
    {stops.filter(stop => !hasLocation(activityFor(stop))).map(stop => <p className="warning" key={stop.id}>{activityFor(stop).name}: coordinates unavailable. Not shown on the map; adjacent travel distances are unknown. <a href={activityFor(stop).url} target="_blank" rel="noreferrer">{sourceLabel(activityFor(stop).url)}<span className="sr-only"> for the location of {activityFor(stop).name}</span></a></p>)}
    {stops.length === 1 && <p>One stop planned. No travel between stops yet.</p>}
    <ol>{stops.slice(1).map((stop, index) => { const from = activityFor(stops[index]); const to = activityFor(stop); const leg = travelBetween(stops[index], stop); return <li key={`${from.id}-${to.id}`} data-leg={`${from.id}-${to.id}`}><span>{index + 1} to {index + 2}: {from.name} to {to.name}</span><strong>{leg ? `~${leg.km.toFixed(1)} km / ${leg.minutes} min walk` : 'Distance and travel time unknown'}</strong></li>; })}</ol>
  </section></div>;
}