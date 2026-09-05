import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

const schema = z.object({
  listingId: z.uuid(),
  kind: z.enum(['cart', 'favorite']),
});
export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per vedere i tuoi articoli salvati.' },
      { status: 401 },
    );
  const kind = new URL(request.url).searchParams.get('kind');
  if (kind !== 'cart' && kind !== 'favorite')
    return NextResponse.json({ error: 'Sezione non valida.' }, { status: 400 });
  const { data, error } = await auth.admin
    .from('saved_items')
    .select(
      'listing_id, listings(id,slug,title,status,sale_mode,sale_price_cents,listing_images(storage_path,position))',
    )
    .eq('user_id', auth.user.id)
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error)
    return NextResponse.json(
      { error: 'Articoli non disponibili. Riprova.' },
      { status: 503 },
    );
  const items = (data ?? []).map((row) => {
    const listing = (Array.isArray(row.listings)
      ? row.listings[0]
      : row.listings) as unknown as {
      id: string;
      slug: string;
      title: string;
      status: string;
      sale_mode: string;
      sale_price_cents: number | null;
      listing_images: { storage_path: string; position: number }[];
    };
    const path = listing?.listing_images?.sort(
      (a, b) => a.position - b.position,
    )[0]?.storage_path;
    return {
      ...listing,
      listing_images: undefined,
      image: path
        ? auth.admin.storage.from('listing-images').getPublicUrl(path).data
            .publicUrl
        : null,
    };
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
async function mutate(request: Request, remove: boolean) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per salvare gli articoli.' },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Articolo non valido.' },
      { status: 400 },
    );
  const { listingId, kind } = parsed.data;
  if (remove) {
    const { error } = await auth.admin
      .from('saved_items')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('listing_id', listingId)
      .eq('kind', kind);
    return NextResponse.json(
      error ? { error: 'Rimozione non riuscita.' } : { saved: false },
      { status: error ? 503 : 200 },
    );
  }
  const { data: listing } = await auth.admin
    .from('listings')
    .select('id,status,seller_id,sale_mode')
    .eq('id', listingId)
    .single();
  if (
    !listing ||
    listing.status !== 'active' ||
    (kind === 'cart' &&
      (listing.seller_id === auth.user.id || listing.sale_mode === 'rent'))
  )
    return NextResponse.json(
      { error: 'Articolo non disponibile per il carrello.' },
      { status: 409 },
    );
  const { count, error: countError } = await auth.admin
    .from('saved_items')
    .select('listing_id', { head: true, count: 'exact' })
    .eq('user_id', auth.user.id)
    .eq('kind', kind);
  if (countError || (count ?? 0) >= 100)
    return NextResponse.json(
      {
        error: 'Rimuovi un articolo prima di aggiungerne altri (massimo 100).',
      },
      { status: 409 },
    );
  const { error } = await auth.admin
    .from('saved_items')
    .upsert(
      { user_id: auth.user.id, listing_id: listingId, kind },
      { onConflict: 'user_id,listing_id,kind', ignoreDuplicates: true },
    );
  return NextResponse.json(
    error ? { error: 'Salvataggio non riuscito.' } : { saved: true },
    { status: error ? 503 : 200 },
  );
}
export const POST = (request: Request) => mutate(request, false);
export const DELETE = (request: Request) => mutate(request, true);
