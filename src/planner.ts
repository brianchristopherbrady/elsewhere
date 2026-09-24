import { places, placeById, type Mood, type Place } from './data.ts';
import { activityAvailableOn, activityDates, activityFor, hasLocation, validActivity, type Activity } from './activities.ts';

export type Stop = { id: string; start: number | null; duration: number | null; end?: number | null; notes?: string; activity?: Activity };
export function stopEnd(stop: Stop): number | null { return stop.end !== undefined ? stop.end : stop.start !== null && stop.duration !== null ? stop.start + stop.duration : null; }
export function stopDuration(stop: Stop): number | null { const end = stopEnd(stop); return stop.start !== null && end !== null ? end - stop.start : stop.duration; }
export type Filters = { query: string; moods: Mood[]; maxPrice: number; maxDistance: number; accessible: boolean; openOnly: boolean; savedOnly: boolean; sort: 'curated' | 'distance' | 'price' };
export const defaultFilters: Filters = { query: '', moods: [], maxPrice: 30, maxDistance: 20, accessible: false, openOnly: false, savedOnly: false, sort: 'curated' };
export const seedStops: Stop[] = [{ id: 'vita-kexp', start: 570, duration: 60 }, { id: 'sub-pop-kexp', start: 660, duration: 45 }, { id: 'olympic-sculpture-park', start: 750, duration: 75 }];

export function distanceKm(first: Pick<Place, 'lat' | 'lng'>, second: Pick<Place, 'lat' | 'lng'>): number {
  const radians = Math.PI / 180;
  const latitude = (second.lat - first.lat) * radians;
  const longitude = (second.lng - first.lng) * radians;
  const arc = Math.sin(latitude / 2) ** 2 + Math.cos(first.lat * radians) * Math.cos(second.lat * radians) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

export const origin = { lat: 47.6094, lng: -122.3412 };
export function walkingMinutes(first: Pick<Place, 'lat' | 'lng'>, second: Pick<Place, 'lat' | 'lng'>): number { return Math.max(3, Math.round(distanceKm(first, second) * 1.3 / 4.5 * 60)); }
export function travelBetween(first: Stop, second: Stop): { minutes: number; km: number } | null {
  const from = activityFor(first); const to = activityFor(second);
  return hasLocation(from) && hasLocation(to) ? { minutes: walkingMinutes(from, to), km: distanceKm(from, to) * 1.3 } : null;
}
export function isOpen(place: Place, start: number, duration = 0, date?: string): boolean { return place.hoursKnown && (!place.eventDate || place.eventDate === date) && start >= place.open && start + duration <= place.close; }
export function timeLabel(minutes: number | null): string { return minutes === null ? 'Unscheduled' : `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}${minutes >= 1440 ? ' +1' : ''}`; }
export function parseTime(time: string): number { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; }
export function period(start: number | null): string { return start === null ? 'Open time' : start < 720 ? 'Morning' : start < 1080 ? 'Afternoon' : start < 1320 ? 'Evening' : 'Late-night'; }

export function filterPlaces(filters: Filters, saved: string[], at = 660, date?: string): Place[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const filtered = places.filter(place =>
    `${place.name} ${place.category} ${place.neighborhood} ${place.moods.join(' ')}`.toLocaleLowerCase().includes(query)
    && (!filters.moods.length || filters.moods.some(mood => place.moods.includes(mood)))
    && place.price <= filters.maxPrice
    && distanceKm(origin, place) <= filters.maxDistance
    && (!filters.accessible || place.accessible)
    && (!date || !place.eventDate || place.eventDate === date)
    && (!filters.openOnly || isOpen(place, at, 0, date))
    && (!filters.savedOnly || saved.includes(place.id)),
  );
  if (filters.sort === 'distance') filtered.sort((first, second) => distanceKm(origin, first) - distanceKm(origin, second));
  if (filters.sort === 'price') filtered.sort((first, second) => first.price - second.price);
  return filtered;
}

export function scheduleWarnings(stops: Stop[], date?: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  stops.forEach((stop, index) => {
    const place = placeById.get(stop.id);
    const warnings: string[] = [];
    if (!place) {
      const activity = activityFor(stop);
      if (activity.date && (!date || !activityAvailableOn(activity, date))) warnings.push(`Published event dates: ${activityDates(activity)}. Not available on this day.`);
      warnings.push('Confirm published times and location with the organizer.');
      result.set(stop.id, warnings); return;
    }
    if (!place.hoursKnown) warnings.push('Hours not confirmed for this date. Check the official source.');
    else if (place.eventDate && place.eventDate !== date) warnings.push(`Event only on ${place.eventDate} (Pacific time).`);
    else if (place.eventDate && stop.start !== null && (stop.start !== place.open || (stopDuration(stop) !== null && stopDuration(stop) !== place.duration))) warnings.push(`Event runs ${timeLabel(place.open)}-${timeLabel(place.close)} (Pacific time).`);
    else if (stop.start !== null && !isOpen(place, stop.start, stopDuration(stop) ?? 0, date)) warnings.push(`Outside opening hours (${timeLabel(place.open)}-${timeLabel(place.close)}).`);
    if (index > 0) {
      const previous = stops[index - 1];
      const end = stopEnd(previous);
      const travel = travelBetween(previous, stop);
      const earliest = end === null || !travel ? null : end + travel.minutes;
      if (stop.start !== null && earliest !== null && stop.start < earliest) warnings.push(`Allow time for the previous stop and walk. Earliest arrival ${timeLabel(earliest)}.`);
    }
    result.set(stop.id, warnings);
  });
  return result;
}

export function appendStop(stops: Stop[], id: string): Stop[] {
  if (stops.some(stop => stop.id === id)) return stops;
  const place = placeById.get(id);
  if (!place) return stops;
  const previous = stops.at(-1);
  const start = place.eventDate ? place.open : Math.max(place.open, previous ? (stopEnd(previous) ?? 570) + (travelBetween(previous, { id, start: null, duration: null })?.minutes ?? 0) : 570);
  return [...stops, { id, start, duration: place.duration }];
}

export function generateDay(pool: Place[], selectedMoods: Mood[]): Stop[] {
  const ranked = [...pool].sort((first, second) => second.moods.filter(mood => selectedMoods.includes(mood)).length - first.moods.filter(mood => selectedMoods.includes(mood)).length);
  const choices = ranked.slice(0, 4).sort((first, second) => first.open - second.open);
  return choices.reduce((stops, place) => appendStop(stops, place.id), [] as Stop[]);
}

export function dayStats(stops: Stop[]) {
  const selected = stops.map(stop => placeById.get(stop.id)!).filter(Boolean);
  const average = (key: 'energy' | 'unusual' | 'outdoor') => selected.length ? Math.round(selected.reduce((sum, place) => sum + place[key], 0) / selected.length) : 0;
  const cost = selected.reduce((sum, place) => sum + place.price, 0);
  const legs = stops.slice(1).map((stop, index) => travelBetween(stops[index], stop));
  const walking = legs.reduce((sum, leg) => sum + (leg?.minutes ?? 0), 0);
  const unknownTravel = legs.some(leg => leg === null);
  const occupied = stops.reduce((sum, stop) => sum + (stopDuration(stop) ?? 0), 0) + walking;
  const conflicted = stops.some((stop, index) => {
    if (index === 0 || stop.start === null) return false;
    const previousEnd = stopEnd(stops[index - 1]);
    return previousEnd !== null && stop.start < previousEnd + (legs[index - 1]?.minutes ?? 0);
  });
  const complete = stops.length > 0 && !unknownTravel && !conflicted && stops.every(stop => stop.start !== null && stopEnd(stop) !== null);
  const finish = complete ? Math.max(...stops.map(stop => stopEnd(stop)!)) : null;
  const total = complete ? finish! - Math.min(...stops.map(stop => stop.start!)) : null;
  const remaining = finish === null ? null : Math.max(0, 1440 - finish);
  return { cost, walking, unknownTravel, conflicted, occupied, complete, total, remaining, energy: average('energy'), unusual: average('unusual'), outdoor: average('outdoor'), extravagant: selected.length ? Math.min(100, Math.round(cost / selected.length / 30 * 100)) : 0, planned: Math.min(100, Math.round(occupied / 720 * 100)) };
}

export function shareText(stops: Stop[], date: string): string {
  return `Elsewhere | Seattle | ${date} | Pacific time\n${stops.map(stop => `${timeLabel(stop.start)} ${activityFor(stop).name} (${stopDuration(stop) === null ? 'Duration open' : `${stopDuration(stop)} min`})${stop.notes ? ` / ${stop.notes}` : ''}${activityFor(stop).date ? ` [Event dates: ${activityDates(activityFor(stop))}]` : ''}`).join('\n')}\nEstimated spend for curated places: USD ${dayStats(stops).cost}\nReal venues; confirm hours and events with official sources. Costs and walks are estimates.\n${[...scheduleWarnings(stops, date).values()].flat().join('\n')}`;
}

export function readStored<Value>(key: string, fallback: Value, validate: (value: unknown) => value is Value): Value {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null'); return validate(value) ? value : fallback; } catch { return fallback; }
}
export function validStops(value: unknown): value is Stop[] {
  return Array.isArray(value) && value.length <= 200 && new Set(value.map(stop => stop?.id)).size === value.length
    && value.every(stop => stop && (placeById.has(stop.id) || validActivity(stop.activity) && stop.activity.id === stop.id)
      && (stop.start === null || Number.isInteger(stop.start) && stop.start >= 0 && stop.start < 2880)
      && (stop.duration === null || Number.isInteger(stop.duration) && stop.duration >= 1 && stop.duration <= 2880)
      && (stop.end === undefined || stop.end === null || Number.isInteger(stop.end) && stop.end >= 0 && stop.end <= 2880 && (stop.start === null || stop.end > stop.start))
      && (stop.notes === undefined || typeof stop.notes === 'string' && stop.notes.length <= 2000));
}