import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { staples, type Staple } from '../src/staples.ts';

// Checks list entries against Seattle Parks public data first, then OpenStreetMap (Nominatim, max 1 request/second).
type Verification = { status: 'verified' | 'matched' | 'multiple' | 'unmatched'; source?: 'seattle-parks' | 'openstreetmap'; address?: string; lat?: number; lng?: number; website?: string; openingHours?: string; osm?: string; pmaid?: string; branches?: number; checkedAt: string };
type Store = { generatedAt: string; entries: Record<string, Verification> };

const file = new URL('../src/staple-verifications.json', import.meta.url);
const refresh = process.argv.includes('--refresh');
const maxAgeDays = 30;
const today = new Date().toISOString().slice(0, 10);
const store: Store = (() => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return { generatedAt: today, entries: {} }; } })();
const headers = { 'User-Agent': 'Elsewhere-Seattle/0.1 (local list verification, cached results)', 'Accept-Language': 'en' };
const stopwords = new Set(['the', 'and', 'of', 'at', 'a', 'seattle', 'co', 'company']);
const normalize = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (text: string) => normalize(text).split(' ').filter(token => token && !stopwords.has(token));
const locatable = (staple: Staple) => !staple.event && !staple.outside && staple.group !== 'Neighborhood' && staple.group !== 'Trail';
const fresh = (entry?: Verification) => entry && !refresh && (Date.parse(today) - Date.parse(entry.checkedAt)) / 86_400_000 < maxAgeDays;
const inSeattle = (lat: number, lng: number) => lat > 47.48 && lat < 47.74 && lng > -122.46 && lng < -122.22;

async function parks(): Promise<Map<string, { name: string; address: string; zip: string; lat: number; lng: number; pmaid: string }>> {
  const response = await fetch('https://data.seattle.gov/resource/v5tj-kqhc.json?$limit=5000', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Seattle Parks data HTTP ${response.status}`);
  const rows: { name: string; address?: string; zip_code?: string; pmaid: string; location_1?: { latitude: string; longitude: string } }[] = await response.json();
  return new Map(rows.filter(row => row.address && row.location_1).map(row => [normalize(row.name), { name: row.name, address: row.address!, zip: row.zip_code ?? '', lat: Number(row.location_1!.latitude), lng: Number(row.location_1!.longitude), pmaid: row.pmaid }]));
}

async function nominatim(name: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: `${name}, Seattle, Washington`, format: 'jsonv2', limit: '6', addressdetails: '1', extratags: '1', viewbox: '-122.46,47.74,-122.22,47.48', bounded: '1' }).toString();
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  return response.json() as Promise<{ name: string; lat: string; lon: string; osm_type: string; osm_id: number; address?: Record<string, string>; extratags?: Record<string, string> }[]>;
}

const parkIndex = await parks();
const candidates = staples.filter(locatable);
let queried = 0;
for (const staple of candidates) {
  if (fresh(store.entries[staple.id])) continue;
  const key = normalize(staple.name);
  const park = parkIndex.get(key) ?? parkIndex.get(`${key} park`);
  if (park) {
    store.entries[staple.id] = { status: 'verified', source: 'seattle-parks', address: `${park.address}, Seattle, WA ${park.zip}`.trim(), lat: park.lat, lng: park.lng, pmaid: park.pmaid, checkedAt: today };
    continue;
  }
  if (queried) await new Promise(resolve => setTimeout(resolve, 1100));
  queried += 1;
  try {
    const wanted = tokens(staple.name);
    const results = (await nominatim(staple.name)).filter(row => {
      const found = new Set(tokens(row.name ?? ''));
      return inSeattle(Number(row.lat), Number(row.lon)) && wanted.length > 0 && wanted.every(token => found.has(token));
    });
    if (results.length === 1) {
      const [row] = results;
      const street = row.address?.road ? [row.address.house_number, row.address.road].filter(Boolean).join(' ') : '';
      store.entries[staple.id] = { status: 'matched', source: 'openstreetmap', address: street ? `${street}, Seattle, WA${row.address?.postcode ? ` ${row.address.postcode}` : ''}` : undefined, lat: Number(row.lat), lng: Number(row.lon), website: row.extratags?.website ?? row.extratags?.['contact:website'], openingHours: row.extratags?.opening_hours, osm: `${row.osm_type}/${row.osm_id}`, checkedAt: today };
    } else if (results.length > 1) store.entries[staple.id] = { status: 'multiple', source: 'openstreetmap', branches: results.length, checkedAt: today };
    else store.entries[staple.id] = { status: 'unmatched', checkedAt: today };
  } catch (error) {
    console.warn(`${staple.name}: ${(error as Error).message}`);
  }
  if (queried % 25 === 0) { writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`); console.log(`checked ${queried} via OpenStreetMap...`); }
}
for (const id of Object.keys(store.entries)) if (!staples.some(staple => staple.id === id)) delete store.entries[id];
store.generatedAt = today;
writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`);
const counts: Record<string, number> = {};
for (const entry of Object.values(store.entries)) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
console.log(`Checked ${candidates.length} locatable entries (${queried} OpenStreetMap lookups):`, counts);
