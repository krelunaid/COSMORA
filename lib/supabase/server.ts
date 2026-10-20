import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireAuthenticatedUser(request: Request, allowDeleting = false) {
  const admin = getSupabaseAdmin();
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!admin || !token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.app_metadata?.deletion_pending && !allowDeleting) return null;
  if (!allowDeleting) {
    const moderation = await admin.from('user_moderation').select('user_id').eq('user_id', data.user.id).eq('suspended', true).maybeSingle();
    // Fail closed if the required moderation migration is not installed.
    if (moderation.error || moderation.data) return null;
  }
  return { admin, user: data.user };
}
