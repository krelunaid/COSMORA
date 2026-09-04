import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per vedere i tuoi ordini.' }, { status: 401 });
  const { data, error } = await auth.admin.from('marketplace_orders').select('id, transaction_kind, amount_cents, currency, status, created_at').or(`buyer_id.eq.${auth.user.id},seller_id.eq.${auth.user.id}`).order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Ordini non disponibili. Riprova.' }, { status: 503 });
  return NextResponse.json({ orders: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
