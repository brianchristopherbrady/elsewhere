import type { IncomingMessage, ServerResponse } from 'node:http';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

type Encoded = { payload: Buffer; encoding?: 'br' | 'gzip' };
const cache = new WeakMap<object, Map<string, Encoded>>();

function encode(body: object, accept: string): Encoded {
  const json = Buffer.from(JSON.stringify(body));
  if (json.length < 1024) return { payload: json };
  if (/\bbr\b/.test(accept)) return { payload: brotliCompressSync(json, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }), encoding: 'br' };
  if (/\bgzip\b/.test(accept)) return { payload: gzipSync(json), encoding: 'gzip' };
  return { payload: json };
}

/** Sends JSON, compressed when accepted. Bodies are memoized by identity so a cached feed compresses once. */
export function sendJson(request: IncomingMessage, response: ServerResponse, status: number, body: object) {
  const accept = String(request.headers['accept-encoding'] ?? '');
  const key = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : 'identity';
  let variants = cache.get(body);
  if (!variants) { variants = new Map(); cache.set(body, variants); }
  let result = variants.get(key);
  if (!result) { result = encode(body, accept); variants.set(key, result); }
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Vary', 'Accept-Encoding');
  if (result.encoding) response.setHeader('Content-Encoding', result.encoding);
  response.setHeader('Content-Length', result.payload.length);
  response.end(result.payload);
}
