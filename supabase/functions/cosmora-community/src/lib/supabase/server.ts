import { createClient } from '@supabase/supabase-js';

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const projectUrl = 'https://pwdpwgonvnuwmgfiidut.supabase.co';

// Bindings are passed per request. Never mutate process.env or keep one
// account's Authorization header in a client shared between requests.
export function getSupabaseAdmin(env: Env) {
  if (env.SUPABASE_URL !== projectUrl || !env.SUPABASE_SERVICE_ROLE_KEY)
    return null;
  return createClient(projectUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        signal: AbortSignal.timeout(15_000),
      }),
    },
  });
}

export async function requireAuthenticatedUser(request: Request, env: Env, allowDeleting = false) {
  const admin = getSupabaseAdmin(env);
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!admin || !token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user || (data.user.app_metadata?.deletion_pending && !allowDeleting)) return null;
  if (allowDeleting) return { admin, user: data.user };
  const moderation = await admin.from('user_moderation').select('user_id')
    .eq('user_id', data.user.id).eq('suspended', true).maybeSingle();
  if (moderation.error || moderation.data) return null;
  return { admin, user: data.user };
}
