import { validStops, type Stop } from './planner.ts';

export type SavedDay = { id: string; name: string; date: string; stops: Stop[]; notes?: string; tags?: string[] };
export const savedDaysKey = 'elsewhere:seattle:savedDays';

export function validSavedDays(value: unknown): value is SavedDay[] {
  return Array.isArray(value) && new Set(value.map(day => day?.id)).size === value.length
    && value.every(day => day && typeof day.id === 'string' && day.id.length > 0 && day.id.length <= 100
      && typeof day.name === 'string' && day.name.trim().length > 0 && day.name.length <= 100
      && typeof day.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date)
      && Number.isFinite(Date.parse(day.date)) && new Date(day.date).toISOString().slice(0, 10) === day.date
      && (day.notes === undefined || typeof day.notes === 'string' && day.notes.length <= 4000)
      && (day.tags === undefined || Array.isArray(day.tags) && day.tags.length <= 12 && day.tags.every((tag: unknown) => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 40))
      && validStops(day.stops) && day.stops.length > 0);
}

export function snapshotDay(name: string, date: string, stops: Stop[]): SavedDay {
  return { id: crypto.randomUUID(), name: name.trim() || 'Untitled day', date, stops: structuredClone(stops) };
}