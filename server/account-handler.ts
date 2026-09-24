import type { IncomingMessage, ServerResponse } from 'node:http';
import { toNodeHandler } from 'better-auth/node';
import { createAccountService } from './accounts.ts';

export function createAccountHandler(baseURL: () => string, production = false, trustProxy = false) {
  let ready: ReturnType<typeof createAccountService> | undefined;
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const path = request.url?.split('?')[0] ?? '';
    if (!path.startsWith('/api/auth/') && path !== '/api/days' && !path.startsWith('/api/days/')) return false;
    try {
      // Always overwritten so clients cannot choose their own rate-limit bucket.
      const forwarded = trustProxy ? String(request.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '';
      request.headers['x-elsewhere-client-ip'] = forwarded || request.socket.remoteAddress || '127.0.0.1';
      ready ??= createAccountService({ baseURL: baseURL(), production });
      const service = await ready;
      await toNodeHandler(service.handler)(request, response);
    } catch {
      response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ message: 'Account service is unavailable. Please try again.' }));
    }
    return true;
  };
}