import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createEventService } from '../server/live-events.ts';
import { createMusicService } from '../server/music.ts';

// Static-site build step: writes the live feeds into dist/data so GitHub Pages can serve them without a server.
const out = new URL('../dist/data/', import.meta.url);
mkdirSync(out, { recursive: true });

async function attempt<T>(label: string, load: () => Promise<T>): Promise<T> {
  for (let tries = 1; ; tries += 1) {
    try { return await load(); }
    catch (error) {
      if (tries >= 3) throw new Error(`${label} snapshot failed: ${(error as Error).message}`);
      console.warn(`${label} snapshot attempt ${tries} failed; retrying.`);
      await new Promise(resolve => setTimeout(resolve, 10_000));
    }
  }
}

const events = await attempt('Events', createEventService());
writeFileSync(new URL('events.json', out), JSON.stringify(events));
const music = await attempt('Music', createMusicService());
writeFileSync(new URL('music.json', out), JSON.stringify(music));
// Unknown paths on GitHub Pages fall back to the app instead of a GitHub 404.
copyFileSync(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url));
console.log(`Snapshot: ${events.events.length} events${events.unavailable?.length ? ` (unavailable: ${events.unavailable.join(', ')})` : ''}, ${music.shows.length} shows (music ${music.configured ? 'configured' : 'not configured'}).`);
