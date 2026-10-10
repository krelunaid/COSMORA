import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { applyReviewFixtureVisibility } from '@/lib/server/review-fixture-visibility';
import { applyPublicProfileVisibility } from '@/lib/server/public-profile-visibility';
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
      ? await applyReviewFixtureVisibility(
          a.admin.from('listings')
            .select('id,title')
            .eq('seller_id', a.user.id)
            .eq('status', 'active'),
          'seller_id',
          a,
        ).limit(100)
      : type === 'creator'
        ? await applyPublicProfileVisibility(applyReviewFixtureVisibility(
            a.admin.from('profiles').select('id,display_name').eq('moderation_hidden', false),
            'id',
            a,
          )).limit(100)
        : type === 'crew'
          ? await applyReviewFixtureVisibility(
              a.admin.from('squads')
                .select('id,name')
                .eq('status', 'ACTIVE')
                .eq('is_private', false)
                .gte('starts_at', new Date().toISOString()),
              'owner_id',
              a,
            ).limit(100)
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
