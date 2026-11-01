import { GET as thumbnailGet } from './routes/thumbnail.ts';
import { GET } from './routes/feed.ts';
import { PUT } from './routes/interaction.ts';
import { GET as accountGet, PUT as accountPut } from './routes/account.ts';
import { GET as nameGet } from './routes/name-availability.ts';
import { GET as sellerGet, POST as sellerPost } from './routes/seller-profile.ts';
import { POST as createPost } from './routes/create-post.ts';
import { requireAuthenticatedUser } from './lib/supabase/server.ts';
import type { Env } from './lib/supabase/server.ts';

const feedPath = '/api/community/posts';
const interactionPath = '/api/community/posts/interaction';
const allowedOrigins = new Set([
  'https://cosmora.kreluna.it',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
]);
const maximumBodyBytes = 4096;
const uploadBodyBytes = 34 * 1024 * 1024;
const routes: Record<string, Record<string, (request: Request, env: Env) => Promise<Response>>> = {
  [feedPath]: { GET, POST: createPost },
  [interactionPath]: { PUT },
  '/api/community/thumbnail': { GET: thumbnailGet },
  '/api/account': { GET: accountGet, PUT: accountPut },
  '/api/account/name-availability': { GET: nameGet },
  '/api/seller/profile': { GET: sellerGet, POST: sellerPost },
};

// Supabase gateway/local edge runtimes may present either exact mount prefix.
// Never strip an arbitrary leading path or accept a different function name.
export function normalizeMountedPath(path: string): string | null {
  for (const prefix of ['/functions/v1/cosmora-community', '/cosmora-community']) {
    for (const route of Object.keys(routes)) if (path === prefix + route) return route;
  }
  return null;
}

function finish(response: Response, origin: string | null) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Vary', 'Origin');
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Accept-Language, Cache-Control');
  }
  return new Response(response.body, {
    status: response.status, statusText: response.statusText, headers,
  });
}

// Bound the JSON mutation body before parsing; never log it or its bearer token.
async function smallRequest(request: Request, maximumBytes = maximumBodyBytes): Promise<Request | null> {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && Number(contentLength) > maximumBytes) return null;
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  const headers = new Headers(request.headers);
  headers.delete('Content-Length');
  return new Request(request.url, { method: request.method, headers, body });
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const response = (body: unknown, status: number, headers?: HeadersInit) =>
    finish(Response.json(body, { status, headers }), origin);
  const path = normalizeMountedPath(new URL(request.url).pathname);
  if (!path || !routes[path])
    return response({ error: 'Risorsa non disponibile.' }, 404);
  if (origin && !allowedOrigins.has(origin))
    return response({ error: 'Origine non consentita.' }, 403);
  if (request.method === 'OPTIONS')
    return finish(new Response(null, { status: 204 }), origin);
  const handler = routes[path][request.method];
  if (!handler) return response({ error: 'Metodo non consentito.' }, 405, { Allow: Object.keys(routes[path]).join(', ') + ', OPTIONS' });
  const upload = path === feedPath && request.method === 'POST';
  try {
    if (request.method === 'GET') return finish(await handler(request, env), origin);
    // Authenticate before buffering an upload; the route also verifies ownership.
    if (upload && !await requireAuthenticatedUser(request, env)) return response({ error: 'Accedi per pubblicare.' }, 401);
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith(upload ? 'multipart/form-data;' : 'application/json'))
      return response({ error: 'Formato non valido.' }, 415);
    const bounded = await smallRequest(request, upload ? uploadBodyBytes : maximumBodyBytes);
    if (!bounded) return response({ error: upload ? 'Carica al massimo 32 MB complessivi per post. Riduci i file o dividili in più post.' : 'Richiesta troppo grande.' }, 413);
    return finish(await handler(bounded, env), origin);
  } catch {
    return response({ error: 'Servizio temporaneamente non disponibile. Riprova.' }, 503);
  }
}

export default { fetch: handleRequest };
