import { afterEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountService } from '../server/accounts';
import { seedStops } from './planner';

const origin = 'http://localhost:5173';
const secret = randomBytes(48).toString('hex');
const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(close => close()); });

describe('account saved days', () => {
  it('enforces the password policy on direct registration requests', async () => {
    const service = await createAccountService({ baseURL: origin, databasePath: ':memory:', secret });
    cleanup.push(() => service.close());
    for (const [index, password] of ['abcdefgh!', 'abcdefghij', 'abcdefghij ', 'abcdefghi<'].entries()) {
      const response = await service.handler(new Request(`${origin}/api/auth/sign-up/email`, {
        method: 'POST', headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Traveler', email: `policy-${index}@example.com`, password }),
      }));
      expect(response.status).toBe(index === 3 ? 200 : 400);
    }
  });

  it('verifies email, resets passwords once, revokes sessions and preserves saved days', async () => {
    const mail: { to: string; text: string }[] = [];
    const service = await createAccountService({ baseURL: origin, databasePath: ':memory:', secret, sendMail: async message => { mail.push(message); } });
    cleanup.push(() => service.close());
    const request = (path: string, body?: unknown, cookie = '') => service.handler(new Request(`${origin}${path}`, {
      method: body ? 'POST' : 'GET', headers: { origin, cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    }));
    const credentials = { email: 'verified@example.com', password: 'Original password 12345!' };
    expect((await request('/api/auth/sign-up/email', { ...credentials, name: 'Traveler', callbackURL: `${origin}/?account=verified` })).status).toBe(200);
    expect(mail).toHaveLength(1);
    expect((await request('/api/auth/sign-in/email', credentials)).status).toBe(403);
    const verification = new URL(mail[0].text.split('\n')[1]);
    expect((await service.handler(new Request(verification))).status).toBe(302);
    const login = await request('/api/auth/sign-in/email', credentials);
    expect(login.status).toBe(200);
    const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const day = { id: 'recovery-day', name: 'Keep my Seattle day', date: '2026-09-21', stops: seedStops };
    expect((await request('/api/days', { days: [day] }, cookie)).status).toBe(200);
    expect((await request('/api/auth/request-password-reset', { email: credentials.email, redirectTo: `${origin}/?account=reset` })).status).toBe(200);
    expect(await (await request('/api/days', undefined, cookie)).json()).toEqual({ days: [day] });
    const resetLink = new URL(mail[1].text.split('\n')[1]);
    const redirect = await service.handler(new Request(resetLink));
    const token = new URL(redirect.headers.get('location')!).searchParams.get('token');
    expect((await request('/api/auth/reset-password', { token, newPassword: 'abcdefghij' })).status).toBe(400);
    const reset = { token, newPassword: 'abcdefghi!' };
    expect((await request('/api/auth/reset-password', reset)).status).toBe(200);
    expect((await request('/api/auth/reset-password', reset)).ok).toBe(false);
    expect((await request('/api/days', undefined, cookie)).status).toBe(401);
    expect((await request('/api/auth/sign-in/email', credentials)).status).toBe(401);
    const newLogin = await request('/api/auth/sign-in/email', { ...credentials, password: reset.newPassword });
    expect(newLogin.status).toBe(200);
    const newCookie = newLogin.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const recoveredDays = await request('/api/days', undefined, newCookie);
    expect(recoveredDays.status).toBe(200);
    expect(await recoveredDays.json()).toEqual({ days: [day] });
    const absent = await request('/api/auth/request-password-reset', { email: 'absent@example.com', redirectTo: origin });
    expect(absent.status).toBe(200);
    expect(mail).toHaveLength(2);
  });

  it('limits repeated sign-in attempts and rejects insecure production configuration', async () => {
    await expect(createAccountService({ baseURL: origin, production: true, secret })).rejects.toThrow('Production accounts require HTTPS');
    const service = await createAccountService({ baseURL: origin, databasePath: ':memory:', secret });
    cleanup.push(() => service.close());
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await service.handler(new Request(`${origin}/api/auth/sign-in/email`, {
        method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-elsewhere-client-ip': '192.0.2.10' },
        body: JSON.stringify({ email: 'absent@example.com', password: 'Incorrect test password 9123!' }),
      }));
      expect(response.status).toBe(attempt < 10 ? 401 : 429);
    }
  });

  it('registers, signs in, isolates users, persists after restart and revokes signed-out sessions', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'elsewhere-accounts-'));
    cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
    const options = { baseURL: origin, databasePath: join(directory, 'test.sqlite'), secret };
    let service = await createAccountService(options);
    cleanup.push(() => service.close());
    const request = (path: string, method = 'GET', body?: unknown, cookie = '', requestOrigin = origin) => service.handler(new Request(`${origin}${path}`, {
      method, headers: { origin: requestOrigin, cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    }));
    const register = async (email: string) => {
      const body = { name: 'Test User', email, password: 'Unique test password 9123!' };
      expect((await request('/api/auth/sign-up/email', 'POST', body)).status).toBe(200);
      const response = await request('/api/auth/sign-in/email', 'POST', body);
      expect(response.status).toBe(200);
      expect(response.headers.get('set-cookie')).toContain('HttpOnly');
      return response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    };
    const first = await register('first@example.com');
    const second = await register('second@example.com');
    const day = { id: 'test-day', name: 'Seattle day', date: '2026-09-19', stops: seedStops };
    expect((await request('/api/days')).status).toBe(401);
    expect((await request('/api/days', 'POST', { days: [day] }, first, 'https://untrusted.example')).status).toBe(403);
    expect((await request('/api/days', 'POST', { days: [{ ...day, date: '2026-02-30' }] }, first)).status).toBe(400);
    expect((await request('/api/days', 'POST', { days: [day] }, first)).status).toBe(200);
    expect((await (await request('/api/days', 'POST', { days: [day] }, first)).json()).days).toHaveLength(1);
    expect((await (await request('/api/days', 'GET', undefined, second)).json()).days).toEqual([]);
    expect((await request('/api/days/test-day', 'DELETE', undefined, second)).status).toBe(404);
    const edited = { ...day, date: '2026-09-20', tags: ['Friends'], notes: 'A flexible Sunday', stops: [{ ...seedStops[0], start: null, duration: null, notes: 'Meet at the entrance' }] };
    expect((await request('/api/days/test-day', 'PUT', { days: [edited] }, second)).status).toBe(404);
    expect((await request('/api/days/test-day', 'PUT', { days: [edited] }, first, 'https://untrusted.example')).status).toBe(403);
    expect((await request('/api/days/test-day', 'PUT', { days: [edited] }, first)).status).toBe(200);
    expect((await (await request('/api/days', 'GET', undefined, first)).json()).days).toEqual([edited]);
    expect((await request('/api/days/test-day', 'PUT', { days: [day] }, first)).status).toBe(200);
    service.close();
    service = await createAccountService(options);
    expect((await (await request('/api/days', 'GET', undefined, first)).json()).days).toEqual([day]);
    expect((await request('/api/days/test-day', 'DELETE', undefined, first)).status).toBe(200);
    expect((await request('/api/auth/sign-out', 'POST', {}, first)).status).toBe(200);
    expect((await request('/api/days', 'GET', undefined, first)).status).toBe(401);
    expect((await request('/api/auth/sign-in/email', 'POST', { email: 'first@example.com', password: 'Wrong password 123!' })).status).toBe(401);
  });
});