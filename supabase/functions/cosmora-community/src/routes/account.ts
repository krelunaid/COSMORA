import type { Env } from '../lib/supabase/server.ts';
import { normalizePublicName, validPublicName, isPublicNameConflict, PUBLIC_NAME_TAKEN } from '../lib/public-name.ts';
import { publicNameAvailable } from '../lib/server/public-name.ts';

import { z } from 'zod';
import { requireAuthenticatedUser } from '../lib/supabase/server.ts';

const schema = z.object({
  displayName: z.string().max(160).transform(normalizePublicName).refine(validPublicName),
  country: z.string().trim().max(80),
});

export async function GET(request: Request, env: Env) {
  // Restricted accounts must retain access to their own status, support and deletion.
  // Profile updates below still use the full mutation guard.
  const auth = await requireAuthenticatedUser(request, env, true);
  if (!auth) return Response.json({ error: 'Accedi per vedere il tuo account.' }, { status: 401 });
  const { data, error } = await auth.admin.from('profiles').select('display_name, country').eq('id', auth.user.id).maybeSingle();
  if (error) return Response.json({ error: 'Profilo non disponibile. Riprova.' }, { status: 503 });
  const moderation = await auth.admin.from('user_moderation').select('suspended').eq('user_id', auth.user.id).maybeSingle();
  if (moderation.error) return Response.json({ error: 'Stato account non disponibile. Riprova.' }, { status: 503 });
  return Response.json({ email: auth.user.email, displayName: data?.display_name ?? '', country: data?.country ?? '', suspended: moderation.data?.suspended === true, deletionPending: auth.user.app_metadata?.deletion_pending === true }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PUT(request: Request, env: Env) {
  const auth = await requireAuthenticatedUser(request, env);
  if (!auth) return Response.json({ error: 'Accedi per modificare il profilo.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Inserisci un nome da 2 a 80 caratteri e un paese valido.' }, { status: 400 });
  const name = await publicNameAvailable(auth.admin, parsed.data.displayName, auth.user.id);
  if (name.error) return Response.json({ error: 'Salvataggio non riuscito. Riprova.' }, { status: 503 });
  if (!name.available) return Response.json({ error: PUBLIC_NAME_TAKEN, code: 'PUBLIC_NAME_TAKEN' }, { status: 409 });
  const { error } = await auth.admin.from('profiles').upsert({ id: auth.user.id, display_name: parsed.data.displayName, country: parsed.data.country, updated_at: new Date().toISOString() });
  if (isPublicNameConflict(error)) return Response.json({ error: PUBLIC_NAME_TAKEN, code: 'PUBLIC_NAME_TAKEN' }, { status: 409 });
  if (error) return Response.json({ error: 'Salvataggio non riuscito. Riprova.' }, { status: 503 });
  return Response.json({ saved: true, displayName: parsed.data.displayName });
}
