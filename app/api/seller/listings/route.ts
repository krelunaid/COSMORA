import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rentalsEnabled } from '@/lib/release-features';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

const fields = 'id,slug,title,description,status,sale_mode,sale_price_cents,rental_price_cents,updated_at';
const privateHeaders = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per gestire gli annunci.' }, { status: 401 });
  const offset = Number(new URL(request.url).searchParams.get('offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ error: 'Pagina non valida.' }, { status: 400 });
  const { data, error } = await auth.admin.from('listings').select(fields).eq('seller_id', auth.user.id).order('created_at', { ascending: false }).order('id').range(offset, offset + 20);
  if (error) return NextResponse.json({ error: 'Annunci non disponibili. Riprova.' }, { status: 503 });
  return NextResponse.json({ listings: data.slice(0, 20), hasMore: data.length > 20 }, { headers: privateHeaders });
}

const changeSchema = z.object({
  id: z.uuid(), updatedAt: z.iso.datetime({ offset: true }),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  status: z.enum(['active', 'paused']),
  salePriceCents: z.number().int().min(0).max(100000000).nullable(),
  rentalPriceCents: z.number().int().min(1).max(100000000).nullable(),
}).strict();

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per modificare un annuncio.' }, { status: 401 });
  const parsed = changeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Controlla titolo, descrizione e prezzi.' }, { status: 400 });
  const input = parsed.data;
  const current = await auth.admin.from('listings').select('sale_mode,status').eq('id', input.id).eq('seller_id', auth.user.id).maybeSingle();
  if (current.error) return NextResponse.json({ error: 'Servizio non disponibile.' }, { status: 503 });
  if (!current.data) return NextResponse.json({ error: 'Annuncio non trovato.' }, { status: 404 });
  if (!rentalsEnabled && current.data.sale_mode !== 'buy') return NextResponse.json({ error: 'La modifica degli annunci con noleggio è sospesa in questa versione. I dati sono conservati.' }, { status: 403 });
  if (!['active', 'paused'].includes(current.data.status)) return NextResponse.json({ error: 'Questo annuncio non può essere modificato.' }, { status: 409 });
  if ((current.data.sale_mode !== 'rent' && input.salePriceCents === null) || (current.data.sale_mode !== 'buy' && input.rentalPriceCents === null)) return NextResponse.json({ error: 'Inserisci il prezzo previsto per questo annuncio.' }, { status: 400 });
  const { data, error } = await auth.admin.from('listings').update({
    title: input.title, description: input.description, status: input.status,
    sale_price_cents: current.data.sale_mode === 'rent' ? null : input.salePriceCents,
    rental_price_cents: current.data.sale_mode === 'buy' ? null : input.rentalPriceCents,
    updated_at: new Date().toISOString(),
  }).eq('id', input.id).eq('seller_id', auth.user.id).eq('updated_at', input.updatedAt).in('status', ['active', 'paused']).select(fields).maybeSingle();
  if (error) return NextResponse.json({ error: 'Salvataggio non riuscito. Riprova.' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Annuncio modificato in un’altra sessione. Aggiorna la pagina prima di salvare.' }, { status: 409 });
  return NextResponse.json({ listing: data }, { headers: privateHeaders });
}
