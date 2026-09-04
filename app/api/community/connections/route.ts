import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const a = await requireAuthenticatedUser(request);
  if (!a)
    return NextResponse.json(
      { error: 'Accedi per scegliere un collegamento.' },
      { status: 401 },
    );
  const type = new URL(request.url).searchParams.get('type');
  const result =
    type === 'product'
      ? await a.admin
          .from('listings')
          .select('id,title')
          .eq('seller_id', a.user.id)
          .eq('status', 'active')
          .limit(100)
      : type === 'creator'
        ? await a.admin.from('profiles').select('id,display_name').limit(100)
        : type === 'crew'
          ? await a.admin
              .from('squads')
              .select('id,name')
              .eq('status', 'ACTIVE')
              .eq('is_private', false)
              .gte('starts_at', new Date().toISOString())
              .limit(100)
          : null;
  if (!result || result.error)
    return NextResponse.json(
      { error: 'Collegamenti non disponibili.' },
      { status: 400 },
    );
  return NextResponse.json(
    {
      options: result.data.map((row) => ({
        value: row.id,
        label:
          'title' in row
            ? row.title
            : 'display_name' in row
              ? row.display_name
              : row.name,
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
