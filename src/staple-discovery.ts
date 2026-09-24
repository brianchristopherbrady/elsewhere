import data from './staple-verifications.json' with { type: 'json' };
import descriptions from './staple-descriptions.json' with { type: 'json' };
import type { Activity } from './activities.ts';
import type { Mood } from './data.ts';
import { distanceKm, defaultFilters, origin, type Filters } from './planner.ts';
import { stapleActivity, stapleMapLink, stapleSource, stapleUnknowns, type Staple } from './staples.ts';

export type Verification = { status: 'verified' | 'matched' | 'multiple' | 'unmatched'; source?: 'seattle-parks' | 'openstreetmap'; address?: string; lat?: number; lng?: number; website?: string; openingHours?: string; osm?: string; pmaid?: string; branches?: number; checkedAt: string };
const entries = (data as { generatedAt: string; entries: Record<string, Verification> }).entries;
export const verificationDate = (data as { generatedAt: string }).generatedAt;

export function verificationFor(staple: Staple): Verification | undefined { return entries[staple.id]; }
export function hasPoint(verification?: Verification): verification is Verification & { lat: number; lng: number } {
  return Number.isFinite(verification?.lat) && Number.isFinite(verification?.lng);
}

export type Description = { title?: string; url?: string; extract?: string; checkedAt: string };
const descriptionEntries = (descriptions as { entries: Record<string, Description> }).entries;
export function descriptionFor(staple: Staple): (Description & { extract: string; url: string }) | undefined {
  const entry = descriptionEntries[staple.id];
  return entry?.extract && entry.url?.startsWith('https://') ? entry as Description & { extract: string; url: string } : undefined;
}

/** Only flags entries whose location could not be confirmed; located entries need no badge. */
export function locationFlag(staple: Staple, verification = verificationFor(staple)): string | undefined {
  if (staple.event) return undefined;
  if (verification?.status === 'unmatched') return 'Address not found';
  if (verification?.status === 'multiple') return `${verification.branches} possible locations`;
  return undefined;
}

// Editorial mood grouping by category, consistent with the curated places' editorial moods.
const moodGroups: Record<Mood, string[]> = {
  Quiet: ['Garden', 'Museum', 'Books & records', 'Coffee', 'Cultural space'],
  Strange: ['Landmark', 'Shop & games', 'Annual tradition', 'Cultural space'],
  Outdoors: ['Park', 'Garden', 'Viewpoint & waterfront', 'Neighborhood park', 'Trail'],
  Cheap: ['Park', 'Neighborhood park', 'Trail', 'Viewpoint & waterfront', 'Neighborhood'],
  Romantic: ['Viewpoint & waterfront', 'Garden'],
  Social: ['Food institution', 'Bar & brewery', 'Music venue', 'Seasonal festival', 'Annual tradition', 'Seattle Center Festál', 'Recurring', 'Sports venue', 'Theater & film'],
  'Late-night': ['Bar & brewery', 'Music venue'],
};
export const stapleMoods = (staple: Staple): Mood[] => (Object.keys(moodGroups) as Mood[]).filter(mood => moodGroups[mood].includes(staple.group));

const rank = { verified: 0, matched: 0, multiple: 1, unmatched: 2 };
/** Applies Discover filters to list entries. Unknown price, access and hours never satisfy a narrowed filter. */
export function discoverStaples(list: Staple[], filters: Filters): Staple[] {
  const narrowed = filters.maxPrice < defaultFilters.maxPrice || filters.accessible || filters.openOnly || filters.savedOnly;
  if (narrowed) return [];
  const matches = list.filter(staple => {
    if (filters.moods.length && !filters.moods.some(mood => stapleMoods(staple).includes(mood))) return false;
    const verification = verificationFor(staple);
    if (filters.maxDistance < defaultFilters.maxDistance) return hasPoint(verification) && distanceKm(origin, verification) <= filters.maxDistance;
    return !hasPoint(verification) || distanceKm(origin, verification) <= filters.maxDistance;
  });
  if (filters.sort === 'distance') return matches.filter(staple => hasPoint(verificationFor(staple))).sort((first, second) => distanceKm(origin, verificationFor(first) as { lat: number; lng: number }) - distanceKm(origin, verificationFor(second) as { lat: number; lng: number }));
  // Located entries first; within each tier, alternate categories so one group doesn't fill the page.
  const tier = (staple: Staple) => staple.event ? 3 : rank[verificationFor(staple)?.status ?? 'unmatched'];
  const seen = new Map<string, number>();
  const turn = new Map<string, number>();
  const position = new Map(matches.map((staple, index) => [staple.id, index]));
  for (const staple of matches) {
    const key = `${tier(staple)}:${staple.group}`;
    turn.set(staple.id, seen.get(key) ?? 0);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return matches.sort((first, second) => tier(first) - tier(second) || turn.get(first.id)! - turn.get(second.id)! || position.get(first.id)! - position.get(second.id)!);
}

export function discoveryActivity(staple: Staple): Activity {
  const base = stapleActivity(staple);
  const verification = verificationFor(staple);
  if (!verification || verification.status === 'unmatched' || verification.status === 'multiple') return base;
  return { ...base, ...(verification.address ? { address: verification.address } : {}), ...(verification.website?.startsWith('https://') ? { url: verification.website } : {}), ...(hasPoint(verification) ? { lat: verification.lat, lng: verification.lng } : {}) };
}

export function stapleLinks(staple: Staple): { primary: { url: string; label: string }; map?: { url: string; label: string } } {
  const verification = verificationFor(staple);
  const website = verification?.website?.startsWith('https://') ? verification.website : undefined;
  const map = verification?.osm ? { url: `https://www.openstreetmap.org/${verification.osm}`, label: 'View on OpenStreetMap' } : staple.event ? undefined : { url: stapleMapLink(staple), label: 'Find on OpenStreetMap' };
  return { primary: website ? { url: website, label: 'Official website (from OpenStreetMap)' } : stapleSource(staple), map };
}

export function discoveryUnknowns(staple: Staple, confirmed?: { time?: string }): string[] {
  const verification = verificationFor(staple);
  const known = verification?.address && (verification.status === 'verified' || verification.status === 'matched');
  return stapleUnknowns(staple, confirmed).filter(item => !(known && item === 'exact address')).map(item => item === 'hours' ? 'confirmed hours' : item);
}
