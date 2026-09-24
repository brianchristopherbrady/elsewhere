import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

// Precompresses built text assets so the production server can send .br/.gz without compressing per request.
const root = fileURLToPath(new URL('../dist', import.meta.url));
const compressible = /\.(js|css|html|svg|json|txt|xml)$/;
let count = 0;
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) { walk(path); continue; }
    if (!compressible.test(name) || statSync(path).size < 1024) continue;
    const source = readFileSync(path);
    writeFileSync(`${path}.br`, brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
    writeFileSync(`${path}.gz`, gzipSync(source, { level: 9 }));
    count += 1;
  }
}
walk(root);
console.log(`Precompressed ${count} assets.`);
