import type { getSupabaseAdmin } from '../supabase/server.ts';
import { normalizePublicName } from '../public-name.ts';
/** Availability is preliminary; the unique database index decides concurrent saves. */
export async function publicNameAvailable(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, name: string, ownerId?: string) {
  const literal = normalizePublicName(name).replace(/[\\%_]/g, '\\$&');
  let query = admin.from('profiles').select('id').ilike('display_name', literal);
  if (ownerId) query = query.neq('id', ownerId);
  const result = await query.limit(1);
  return { available: !result.error && result.data?.length === 0, error: result.error };
}
