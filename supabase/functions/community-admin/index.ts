import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createDashboardHandler } from './handler.ts';

// Deploy with verify_jwt=true. The gateway check is supplemented by a fresh
// Auth lookup below, so removed grants do not survive in an old access token.
Deno.serve(createDashboardHandler(() => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new Error('Missing server configuration');
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
    },
  });
  return {
    async getUser(token: string) {
      const { data, error } = await admin.auth.getUser(token);
      return { user: data.user, error };
    },
    async isSuspended(userId: string) {
      const { data, error } = await admin.from('user_moderation')
        .select('suspended').eq('user_id', userId).maybeSingle();
      if (error) throw new Error('Account verification unavailable');
      return data?.suspended === true;
    },
    async getDashboard(search: string, page: number) {
      const { data, error } = await admin.rpc('cosmora_admin_dashboard', { p_search: search, p_page: page });
      if (error || !data) throw new Error('Dashboard unavailable');
      return data;
    },
  };
}));
