import { placeById, unverifiedQuiet, type Place } from './data.ts';

export type Activity = { id: string; name: string; category: string; address: string; url: string; date?: string; endDate?: string; lat?: number; lng?: number; notes?: string; tags?: string[] };
export function filterActivities(activities: Activity[], query: string, category = '', tag = '', availableDate = ''): Activity[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return activities.filter(activity => {
    const text = [activity.name, activity.category, activity.address, activity.notes ?? '', ...(activity.tags ?? [])].join(' ').toLocaleLowerCase();
    return terms.every(term => text.includes(term)) && (!category || activity.category === category)
      && (!tag || activity.tags?.includes(tag)) && (!availableDate || activityAvailableOn(activity, availableDate));
  });
}
export function activityDates(activity: Activity): string {
  return activity.date ? activity.endDate && activity.endDate !== activity.date ? `${activity.date} to ${activity.endDate}` : activity.date : '';
}
export function activityAvailableOn(activity: Activity, date: string): boolean {
  return !activity.date || activity.date <= date && date <= (activity.endDate ?? activity.date);
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function placeActivity(place: Place): Activity {
  return { id: place.id, name: place.name, category: place.category, address: place.address, url: place.website, lat: place.lat, lng: place.lng, ...(place.eventDate ? { date: place.eventDate } : {}) };
}
export function activityFor(stop: { id: string; activity?: Activity }): Activity {
  const place = placeById.get(stop.id);
  return place ? placeActivity(place) : stop.activity!;
}
export function hasLocation(activity: Activity): activity is Activity & { lat: number; lng: number } {
  return Number.isFinite(activity.lat) && Number.isFinite(activity.lng);
}
export function placeUnknowns(place: Place, { quiet = true } = {}): string[] {
  return [...(place.hoursKnown ? [] : ['hours for your date']), ...(place.accessible === null ? ['step-free access'] : []), ...(quiet && place.quiet === unverifiedQuiet ? ['quieter times'] : [])];
}
export function activityUnknowns(activity: Activity): string[] {
  const place = placeById.get(activity.id);
  if (place) return placeUnknowns(place, { quiet: false });
  return [...(!activity.address || /confirm exact location|not supplied/i.test(activity.address) ? ['exact address'] : []), ...(hasLocation(activity) ? [] : ['map location'])];
}
export function sourceLabel(url: string): string {
  const host = new URL(url).hostname;
  return host.endsWith('duckduckgo.com') ? 'Search the web' : host.endsWith('openstreetmap.org') ? 'Find on OpenStreetMap' : host.endsWith('ticketmaster.com') ? 'Check the Ticketmaster listing' : 'Check the official site';
}
export function validActivity(value: unknown): value is Activity {
  if (!value || typeof value !== 'object') return false;
  const activity = value as Activity;
  if (!['id', 'name', 'category', 'address', 'url'].every(key => typeof activity[key as keyof Activity] === 'string')) return false;
  if (!activity.id || activity.id.length > 200 || !activity.name.trim() || activity.name.length > 300 || activity.address.length > 2000 || activity.category.length > 200 || activity.url.length > 4000) return false;
  try { const url = new URL(activity.url); if (url.protocol !== 'https:' || url.username || url.password) return false; } catch { return false; }
  return (activity.date === undefined || validDate(activity.date))
    && (activity.notes === undefined || typeof activity.notes === 'string' && activity.notes.length <= 2000)
    && (activity.tags === undefined || Array.isArray(activity.tags) && activity.tags.length <= 12 && activity.tags.every(tag => typeof tag === 'string' && !!tag.trim() && tag.length <= 40))
    && (activity.endDate === undefined || validDate(activity.endDate) && activity.date !== undefined && activity.endDate >= activity.date)
    && (activity.lat === undefined && activity.lng === undefined || hasLocation(activity) && Math.abs(activity.lat) <= 90 && Math.abs(activity.lng) <= 180);
}
export function validActivities(value: unknown): value is Activity[] {
  return Array.isArray(value) && value.length <= 200 && value.every(validActivity) && new Set(value.map(activity => activity.id)).size === value.length;
}