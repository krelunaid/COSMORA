import { getSupabaseAdmin, type Env } from '../lib/supabase/server.ts';
import { validPreviewToken } from '../lib/preview-token.ts';
import { isHiddenReviewFixture } from '../lib/server/review-fixture-visibility.ts';
export async function GET(request: Request, env: Env) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id') || '';
  if (!await validPreviewToken(env.SUPABASE_SERVICE_ROLE_KEY, id, Number(params.get('expires')), params.get('signature') || '')) return new Response(null,{status:404});
  const admin = getSupabaseAdmin(env);
  if (!admin) return new Response(null,{status:503});
  const preview = await admin.rpc('cosmora_read_media_preview', {p_media_id:id}).maybeSingle();
  const row = preview.data as {author_id:string;jpeg_base64:string}|null;
  if (preview.error || !row || typeof row.author_id !== 'string' || isHiddenReviewFixture(row.author_id,null) || typeof row.jpeg_base64 !== 'string' || row.jpeg_base64.length > 131072 || !/^[A-Za-z0-9+/]+={0,2}$/.test(row.jpeg_base64)) return new Response(null,{status:404});
  const bytes = Uint8Array.from(atob(row.jpeg_base64), c => c.charCodeAt(0));
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) return new Response(null,{status:404});
  return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Content-Length':String(bytes.length),'Cache-Control':'private, no-store'}});
}
