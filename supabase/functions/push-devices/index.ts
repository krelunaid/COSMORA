import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, error?: string) => new Response(JSON.stringify(error ? { error } : { ok: true }), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply(405, 'method_not_allowed');
  try {
    if (Number(request.headers.get('content-length')) > 8192) return reply(413, 'payload_too_large');
    const text = await request.text();
    if (text.length > 8192) return reply(413, 'payload_too_large');
    const body = JSON.parse(text);
    const { installationId: id, installationSecret: secret, action } = body;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) || typeof secret !== 'string' || !/^[0-9a-f]{64}$/.test(secret)) return reply(400, 'invalid_installation');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))), (b) => b.toString(16).padStart(2, '0')).join('');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) } });
    if (action === 'disable') {
      // Possession of the random installation secret can only revoke that installation,
      // including after logout. It cannot enumerate, read, register or send notifications.
      const { error } = await admin.from('push_devices').delete().eq('installation_id', id).eq('secret_hash', hash);
      return error ? reply(503, 'unavailable') : reply(200);
    }
    if (action !== 'register') return reply(400, 'invalid_action');
    const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer) return reply(401, 'authentication_required');
    const { data, error } = await admin.auth.getUser(bearer);
    if (error || !data.user || data.user.is_anonymous || data.user.app_metadata?.deletion_pending) return reply(401, 'authentication_required');
    const moderation = await admin.from('user_moderation').select('user_id').eq('user_id', data.user.id).eq('suspended', true).maybeSingle();
    if (moderation.error || moderation.data) return reply(403, 'account_unavailable');
    const { token, platform, locale } = body;
    if (!['ios', 'android'].includes(platform) || !['it','en','de','fr','es'].includes(locale) || typeof token !== 'string' || token.length < 32 || token.length > 4096 || /\s/.test(token) || (platform === 'ios' && !/^[0-9a-f]+$/i.test(token))) return reply(400, 'invalid_device');
    const result = await admin.rpc('register_push_device', { p_id: id, p_secret: hash, p_user: data.user.id, p_platform: platform, p_token: token, p_locale: locale });
    return result.error ? reply(409, 'registration_failed') : reply(200);
  } catch { return reply(400, 'invalid_request'); }
});
