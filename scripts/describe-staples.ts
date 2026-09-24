import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { staples, type Staple } from '../src/staples.ts';

// Short descriptions from Wikipedia intros (CC BY-SA 4.0, attributed in the UI). Only exact-name Seattle articles are kept.
type Description = { title?: string; url?: string; extract?: string; checkedAt: string };
type Store = { generatedAt: string; entries: Record<string, Description> };

const file = new URL('../src/staple-descriptions.json', import.meta.url);
const refresh = process.argv.includes('--refresh');
const maxAgeDays = 90;
const today = new Date().toISOString().slice(0, 10);
const store: Store = (() => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return { generatedAt: today, entries: {} }; } })();
const headers = { 'User-Agent': 'Elsewhere-Seattle/0.1 (local list descriptions, cached results)' };
const stopwords = new Set(['the', 'and', 'of', 'at', 'a', 'seattle', 'washington', 'co', 'company']);
const normalize = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (text: string) => normalize(text).split(' ').filter(token => token && !stopwords.has(token));
const fresh = (entry?: Description) => entry && !refresh && (Date.parse(today) - Date.parse(entry.checkedAt)) / 86_400_000 < maxAgeDays;
// Drops pronunciation/foreign-script asides and empty brackets left by plain-text extraction.
const clean = (text: string) => text.replace(/\s*\([^()]*[:;][^()]*\)|\s*\(\s*[,;]?\s*\)/g, '').replace(/\s+([,.;])/g, '$1').replace(/\s{2,}/g, ' ').trim();
const otherThings = new Set(['bridge', 'station', 'school', 'church', 'building', 'hotel', 'band', 'album', 'song', 'film', 'ferry', 'dam', 'lighthouse']);
const placeGroups = new Set(['Park', 'Neighborhood park', 'Garden', 'Viewpoint & waterfront', 'Trail']);

type Page = { index: number; title: string; fullurl: string; extract?: string };
async function search(staple: Staple): Promise<Page[]> {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: `${staple.name} Seattle`, gsrlimit: '3', prop: 'extracts|info', inprop: 'url', exintro: '1', explaintext: '1', exsentences: '2', redirects: '1' }).toString();
  for (let attempt = 0; ; attempt += 1) {
    let status = 0;
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      const body = await response.text();
      status = response.status;
      if (response.ok && body.startsWith('{')) return ((JSON.parse(body).query?.pages ?? []) as Page[]).sort((first, second) => first.index - second.index);
    } catch (error) {
      if (attempt >= 4) throw error;
    }
    if (attempt >= 4) throw new Error(`Wikipedia HTTP ${status}`);
    await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
  }
}

function pick(staple: Staple, pages: Page[]): Page | undefined {
  const wanted = tokens(staple.name);
  if (!wanted.length) return undefined;
  return pages.find(page => {
    const title = new Set(tokens(page.title.replace(/\([^)]*\)/g, '')));
    const extract = page.extract ?? '';
    const extra = [...title].filter(token => !wanted.includes(token));
    return wanted.every(token => title.has(token)) && extra.length <= 1 && !extra.some(token => otherThings.has(token))
      && !(placeGroups.has(staple.group) && /^[^.]*\bis an? (neighborhood|community)\b/i.test(extract))
      && !/may refer to|^List of/i.test(`${page.title} ${extract}`)
      && /Seattle|Washington|Puget Sound|King County/.test(extract);
  });
}

let queried = 0;
for (const staple of staples) {
  if (fresh(store.entries[staple.id])) continue;
  if (queried) await new Promise(resolve => setTimeout(resolve, 1000));
  queried += 1;
  try {
    const page = pick(staple, await search(staple));
    store.entries[staple.id] = page?.extract ? { title: page.title, url: page.fullurl, extract: clean(page.extract), checkedAt: today } : { checkedAt: today };
  } catch (error) {
    console.warn(`${staple.name}: ${(error as Error).message}`);
  }
  if (queried % 50 === 0) { writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`); console.log(`described ${queried}...`); }
}
for (const id of Object.keys(store.entries)) if (!staples.some(staple => staple.id === id)) delete store.entries[id];
store.generatedAt = today;
writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`);
const found = Object.values(store.entries).filter(entry => entry.extract).length;
console.log(`Descriptions: ${found} of ${staples.length} entries have a matching Wikipedia article (${queried} lookups).`);
