import { handleRequest } from './src/index.ts';

// The platform injects the existing project's server credential. It is never
// copied into source, client packages, response bodies or logs.
Deno.serve((request: Request) => handleRequest(request, {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
}));
