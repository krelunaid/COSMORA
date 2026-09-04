import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

const schema = z.object({
  displayName: z.string().trim().min(2).max(80),
  country: z.string().trim().max(80),
});

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per vedere il tuo account.' }, { status: 401 });
  const { data, error } = await auth.admin.from('profiles').select('display_name, country').eq('id', auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Profilo non disponibile. Riprova.' }, { status: 503 });
  return NextResponse.json({ email: auth.user.email, displayName: data?.display_name ?? '', country: data?.country ?? '' }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PUT(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per modificare il profilo.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Inserisci un nome da 2 a 80 caratteri e un paese valido.' }, { status: 400 });
  const { error } = await auth.admin.from('profiles').upsert({ id: auth.user.id, display_name: parsed.data.displayName, country: parsed.data.country, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: 'Salvataggio non riuscito. Riprova.' }, { status: 503 });
  return NextResponse.json({ saved: true });
}
