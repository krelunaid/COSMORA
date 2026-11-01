import type { Env } from '../lib/supabase/server.ts';

import { getSupabaseAdmin } from '../lib/supabase/server.ts';
import { validPublicName } from '../lib/public-name.ts';
import { publicNameAvailable } from '../lib/server/public-name.ts';
export async function GET(request: Request, env: Env) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const name = new URL(request.url).searchParams.get('name') || '';
  if (name.length > 160 || !validPublicName(name)) return Response.json({ error: 'Nome non valido.' }, { status: 400, headers });
  const admin = getSupabaseAdmin(env);
  if (!admin) return Response.json({ error: 'Servizio non disponibile.' }, { status: 503, headers });
  const result = await publicNameAvailable(admin, name);
  if (result.error) return Response.json({ error: 'Servizio non disponibile.' }, { status: 503, headers });
  // Never disclose the identity or status of the account holding the name.
  return Response.json({ available: result.available }, { headers });
}
