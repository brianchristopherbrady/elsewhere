import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { createEventHandler } from './live-events.ts';
import { createAccountHandler } from './account-handler.ts';
import { createMusicHandler } from './music.ts';

const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || '127.0.0.1';
const trustProxy = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY ?? '');
if (!process.env.BETTER_AUTH_URL?.startsWith('https://') || !process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error('Set HTTPS BETTER_AUTH_URL and a high-entropy BETTER_AUTH_SECRET (at least 32 characters) before starting production.');
}

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

const events = createEventHandler();
const music = createMusicHandler();
const accounts = createAccountHandler(() => process.env.BETTER_AUTH_URL, true, trustProxy);
const assets = sirv(fileURLToPath(new URL('../dist', import.meta.url)), {
  single: true, etag: true, brotli: true, gzip: true,
  setHeaders: (response, pathname) => response.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'),
});

const server = createServer(async (request, response) => {
  for (const [name, value] of Object.entries(securityHeaders)) response.setHeader(name, value);
  const path = request.url?.split('?')[0] ?? '/';
  try {
    if (path === '/healthz') { response.setHeader('Cache-Control', 'no-store'); response.end('ok'); return; }
    if (await accounts(request, response) || await events(request, response) || await music(request, response)) return;
    if (path.startsWith('/api/')) { response.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify({ message: 'Not found.' })); return; }
    assets(request, response);
  } catch (error) {
    console.error('[server] request failed', error);
    if (!response.headersSent) { response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify({ message: 'Something went wrong. Please try again.' })); }
    else response.destroy();
  }
});
// Longer than common load balancer idle timeouts, so the proxy closes idle connections first.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.listen(port, host, () => console.log(`Elsewhere running at http://${host}:${port}${trustProxy ? ' (trusting X-Forwarded-For)' : ''}`));

function shutdown(signal) {
  console.log(`${signal} received, closing server.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', error => console.error('[server] unhandled rejection', error));
