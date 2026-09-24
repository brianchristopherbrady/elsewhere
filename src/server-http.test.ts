import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { expect, it } from 'vitest';
import { sendJson } from '../server/http.ts';

function capture(acceptEncoding?: string) {
  const headers: Record<string, string | number> = {};
  let body = Buffer.alloc(0);
  const response = { statusCode: 0, setHeader: (name: string, value: string | number) => { headers[name.toLowerCase()] = value; }, end: (chunk: Buffer) => { body = chunk; } } as unknown as ServerResponse;
  const request = { headers: acceptEncoding ? { 'accept-encoding': acceptEncoding } : {} } as IncomingMessage;
  return { request, response, headers, body: () => body };
}

const feed = { events: Array.from({ length: 200 }, (_, index) => ({ id: index, title: `Seattle event ${index}` })) };

it('compresses large JSON with brotli or gzip and leaves small or unsupported responses plain', () => {
  const br = capture('gzip, deflate, br');
  sendJson(br.request, br.response, 200, feed);
  expect(br.headers['content-encoding']).toBe('br');
  expect(JSON.parse(brotliDecompressSync(br.body()).toString())).toEqual(feed);
  expect(br.headers['content-length']).toBe(br.body().length);

  const gzip = capture('gzip');
  sendJson(gzip.request, gzip.response, 200, feed);
  expect(gzip.headers['content-encoding']).toBe('gzip');
  expect(JSON.parse(gunzipSync(gzip.body()).toString())).toEqual(feed);

  const plain = capture();
  sendJson(plain.request, plain.response, 503, { error: 'Unavailable' });
  expect(plain.response.statusCode).toBe(503);
  expect(plain.headers['content-encoding']).toBeUndefined();
  expect(JSON.parse(plain.body().toString())).toEqual({ error: 'Unavailable' });
  expect(plain.headers.vary).toBe('Accept-Encoding');
});

it('reuses the compressed payload for the same feed object', () => {
  const first = capture('br'); const second = capture('br');
  sendJson(first.request, first.response, 200, feed);
  sendJson(second.request, second.response, 200, feed);
  expect(second.body()).toBe(first.body());
});
