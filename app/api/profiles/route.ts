import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin, requireAuthenticatedUser } from '@/lib/supabase/server';
import { getBlockedAuthorIds } from '@/lib/server/blocked-content';
import { applyReviewFixtureVisibility } from '@/lib/server/review-fixture-visibility';
export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: 'Profili non disponibili.' },
      { status: 503 },
    );
  const auth = await requireAuthenticatedUser(request);
  if (request.headers.has('authorization') && !auth)
    return NextResponse.json({ error: 'Accesso non disponibile.' }, { status: 401 });
  const blocks = await getBlockedAuthorIds(admin, auth?.user.id);
  if (blocks.error)
    return NextResponse.json({ error: 'Profili non disponibili.' }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (id && !z.uuid().safeParse(id).success)
    return NextResponse.json({ profiles: [] });
  let query = admin
    .from('profiles')
    .select('id,display_name,country,created_at')
    .eq('moderation_hidden', false);
  query = applyReviewFixtureVisibility(query, 'id', auth);
  if (blocks.ids.length)
    query = query.not('id', 'in', '(' + blocks.ids.join(',') + ')');
  if (id) query = query.eq('id', id);
  const q = params.get('q')?.trim().slice(0, 80);
  if (q)
    query = query.ilike('display_name', '%' + q.replace(/[%_]/g, '') + '%');
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(24);
  if (error)
    return NextResponse.json(
      { error: 'Profili non disponibili.' },
      { status: 503 },
    );
  return NextResponse.json(
    { profiles: data, userId: auth?.user.id },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
