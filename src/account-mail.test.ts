import { afterEach, expect, it, vi } from 'vitest';
import { createAccountMailer } from '../server/account-mail';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('requires both mail settings and keeps credentials in the provider request', async () => {
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubEnv('ACCOUNT_EMAIL_FROM', '');
  expect(createAccountMailer()).toBeUndefined();
  vi.stubEnv('RESEND_API_KEY', 'test-provider-key');
  expect(createAccountMailer()).toBeUndefined();
  vi.stubEnv('ACCOUNT_EMAIL_FROM', 'Elsewhere <accounts@example.com>');
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  const send = createAccountMailer()!;
  const message = { to: 'traveler@example.com', subject: 'Verify your email', text: 'Test verification link' };
  await send(message);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe('https://api.resend.com/emails');
  expect(init.headers.Authorization).toBe('Bearer test-provider-key');
  expect(JSON.parse(init.body)).toEqual({ ...message, to: [message.to], from: 'Elsewhere <accounts@example.com>' });
  fetcher.mockResolvedValue(new Response('provider secret detail', { status: 503 }));
  await expect(send(message)).rejects.toThrow('Account email delivery failed.');
});