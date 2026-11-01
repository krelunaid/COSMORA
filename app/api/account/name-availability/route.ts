import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validPublicName } from '@/lib/public-name';
import { publicNameAvailable } from '@/lib/server/public-name';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const name = new URL(request.url).searchParams.get('name') || '';
  if (name.length > 160 || !validPublicName(name)) return NextResponse.json({ error: 'Nome non valido.' }, { status: 400, headers });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Servizio non disponibile.' }, { status: 503, headers });
  const result = await publicNameAvailable(admin, name);
  if (result.error) return NextResponse.json({ error: 'Servizio non disponibile.' }, { status: 503, headers });
  // Never disclose the identity or status of the account holding the name.
  return NextResponse.json({ available: result.available }, { headers });
}
