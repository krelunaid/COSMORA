import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createModerationBackend } from './backend.ts';
import { createModerationHandler } from './handler.ts';

// Deploy with verify_jwt=true. Fresh Auth and database checks remain mandatory.
Deno.serve(
  createModerationHandler(() => {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Missing server configuration');
    const admin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
      },
    });
    return createModerationBackend(admin);
  }),
);
