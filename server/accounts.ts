import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { maximumPasswordLength, minimumPasswordLength, passwordRequirements, validNewPassword } from '../src/password-policy.ts';
import { validSavedDays, type SavedDay } from '../src/saved-days.ts';
import { createAccountMailer, type SendAccountMail } from './account-mail.ts';

type Options = { baseURL: string; databasePath?: string; secret?: string; production?: boolean; sendMail?: SendAccountMail };

function reply(status: number, body: unknown) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256_000) { await reader.cancel(); throw new Error('Body too large'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

export async function createAccountService({ baseURL, databasePath = process.env.DATABASE_PATH || '.data/elsewhere.sqlite', secret = process.env.BETTER_AUTH_SECRET, production = false, sendMail = createAccountMailer() }: Options) {
  const origin = new URL(baseURL).origin;
  if (production && (!secret || secret.length < 32 || !origin.startsWith('https://'))) {
    throw new Error('Production accounts require HTTPS BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.');
  }
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  if (!secret) {
    const secretPath = resolve(dirname(databasePath), 'auth-secret');
    try { secret = readFileSync(secretPath, 'utf8'); }
    catch {
      const generated = randomBytes(48).toString('base64url');
      try { writeFileSync(secretPath, generated, { flag: 'wx', mode: 0o600 }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      secret = readFileSync(secretPath, 'utf8');
    }
  }
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  const options = {
    database, secret, baseURL: origin, trustedOrigins: [origin],
    hooks: {
      before: createAuthMiddleware(async context => {
        const field = context.path === '/sign-up/email' || context.path === '/set-password' ? 'password'
          : context.path === '/reset-password' || context.path === '/change-password' ? 'newPassword' : null;
        if (field && !validNewPassword(context.body?.[field])) {
          throw new APIError('BAD_REQUEST', { code: 'INVALID_PASSWORD', message: passwordRequirements });
        }
      }),
    },
    emailAndPassword: {
      enabled: true, minPasswordLength: minimumPasswordLength, maxPasswordLength: maximumPasswordLength, autoSignIn: false,
      requireEmailVerification: !!sendMail, resetPasswordTokenExpiresIn: 3600, revokeSessionsOnPasswordReset: true,
      sendResetPassword: sendMail ? async ({ user, url }) => {
        await sendMail({ to: user.email, subject: 'Reset your Elsewhere password', text: `Reset your password using this link within one hour:\n${url}\n\nIf you did not request this, ignore this email.` });
      } : undefined,
    },
    emailVerification: {
      sendOnSignUp: !!sendMail, sendOnSignIn: false, autoSignInAfterVerification: false, expiresIn: 3600,
      sendVerificationEmail: sendMail ? async ({ user, url }) => {
        await sendMail({ to: user.email, subject: 'Verify your Elsewhere email', text: `Verify your email using this link within one hour:\n${url}\n\nIf you did not create an account, ignore this email.` });
      } : undefined,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: production, cookiePrefix: 'elsewhere', ipAddress: { ipAddressHeaders: ['x-elsewhere-client-ip'] } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 100,
      customRules: { '/sign-in/email': { window: 60, max: 10 }, '/sign-up/email': { window: 60, max: 5 }, '/request-password-reset': { window: 60, max: 3 }, '/send-verification-email': { window: 60, max: 3 }, '/reset-password': { window: 60, max: 5 } } },
  } satisfies BetterAuthOptions;
  const { runMigrations } = await getMigrations(options);
  await runMigrations();
  const auth = betterAuth(options);
  database.exec('CREATE TABLE IF NOT EXISTS saved_day (user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, id TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (user_id, id))');
  const list = (userId: string) => (database.prepare('SELECT payload FROM saved_day WHERE user_id = ? ORDER BY created_at DESC, rowid DESC').all(userId) as { payload: string }[]).map(row => JSON.parse(row.payload) as SavedDay);
  const insert = database.prepare('INSERT OR IGNORE INTO saved_day (user_id, id, payload, created_at) VALUES (?, ?, ?, ?)');
  const save = database.transaction((userId: string, days: SavedDay[]) => {
    const existing = new Set(list(userId).map(day => day.id));
    if (existing.size + days.filter(day => !existing.has(day.id)).length > 200) return false;
    for (const day of days) {
      const clean: SavedDay = { id: day.id, name: day.name.trim(), date: day.date, stops: day.stops, ...(day.notes !== undefined ? { notes: day.notes } : {}), ...(day.tags ? { tags: day.tags } : {}) };
      insert.run(userId, clean.id, JSON.stringify(clean), Date.now());
    }
    return true;
  });
  async function handler(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api/auth/capabilities' && request.method === 'GET') return reply(200, { emailDelivery: !!sendMail });
    if (!sendMail && ['/api/auth/request-password-reset', '/api/auth/send-verification-email'].includes(path)) return reply(503, { message: 'Account email is not configured. Please try again later.' });
    if (path.startsWith('/api/auth/')) return auth.handler(request);
    if (path !== '/api/days' && !path.startsWith('/api/days/')) return reply(404, { message: 'Not found.' });
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) return reply(405, { message: 'Method not allowed.' });
    if (request.method !== 'GET' && request.headers.get('origin') !== origin) return reply(403, { message: 'Request origin is not allowed.' });
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return reply(401, { message: 'Sign in to access your saved days.' });
    const userId = session.user.id;
    if (path === '/api/days' && request.method === 'GET') return reply(200, { days: list(userId) });
    if (path.startsWith('/api/days/') && request.method === 'PUT') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { message: 'JSON is required.' });
      let body: unknown; let id: string;
      try { body = await readBody(request); id = decodeURIComponent(path.slice('/api/days/'.length)); } catch { return reply(400, { message: 'Invalid update.' }); }
      const days = (body as { days?: unknown } | null)?.days;
      if (!validSavedDays(days) || days.length !== 1 || days[0].id !== id) return reply(400, { message: 'Invalid saved day.' });
      const day = days[0];
      const clean: SavedDay = { id: day.id, name: day.name.trim(), date: day.date, stops: day.stops, ...(day.notes !== undefined ? { notes: day.notes } : {}), ...(day.tags ? { tags: day.tags } : {}) };
      const result = database.prepare('UPDATE saved_day SET payload = ? WHERE user_id = ? AND id = ?').run(JSON.stringify(clean), userId, id);
      return result.changes ? reply(200, { days: list(userId) }) : reply(404, { message: 'Saved day not found.' });
    }
    if (path === '/api/days' && request.method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { message: 'JSON is required.' });
      let body: unknown;
      try { body = await readBody(request); } catch { return reply(400, { message: 'Invalid or oversized request.' }); }
      const days = (body as { days?: unknown } | null)?.days;
      if (!validSavedDays(days) || !days.length || days.length > 200) return reply(400, { message: 'Invalid saved days.' });
      if (!save(userId, days)) return reply(409, { message: 'Your account can hold up to 200 saved days.' });
      return reply(200, { days: list(userId) });
    }
    if (path.startsWith('/api/days/') && request.method === 'DELETE') {
      let id: string;
      try { id = decodeURIComponent(path.slice('/api/days/'.length)); } catch { return reply(400, { message: 'Invalid day.' }); }
      const result = database.prepare('DELETE FROM saved_day WHERE user_id = ? AND id = ?').run(userId, id);
      return result.changes ? reply(200, { days: list(userId) }) : reply(404, { message: 'Saved day not found.' });
    }
    return reply(405, { message: 'Method not allowed.' });
  }
  return { handler, close: () => database.close() };
}