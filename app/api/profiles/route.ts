import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: 'Profili non disponibili.' },
      { status: 503 },
    );
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (id && !z.uuid().safeParse(id).success)
    return NextResponse.json({ profiles: [] });
  let query = admin
    .from('profiles')
    .select('id,display_name,country,created_at');
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
    { profiles: data },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
