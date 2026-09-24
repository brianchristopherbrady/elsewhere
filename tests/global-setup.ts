import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Removes databases left by earlier browser-test runs; the current run's file is newer than the cutoff.
export default function globalSetup() {
  const directory = '.data';
  const cutoff = Date.now() - 60 * 60 * 1000;
  let names: string[] = [];
  try { names = readdirSync(directory); } catch { return; }
  for (const name of names) {
    if (!name.startsWith('e2e-')) continue;
    const path = join(directory, name);
    try { if (statSync(path).mtimeMs < cutoff) rmSync(path, { force: true }); } catch { /* in use or already gone */ }
  }
}
