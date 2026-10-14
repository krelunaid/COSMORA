import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
const countries = [
  'IT',
  'FR',
  'DE',
  'ES',
  'BE',
  'NL',
  'AT',
  'PT',
  'IE',
  'GB',
  'PL',
  'SE',
  'DK',
  'FI',
  'GR',
  'CZ',
  'RO',
  'HU',
  'CH',
] as const;
const text = z.string().trim().max(2000).default('');
const schema = z.object({
  displayName: z.string().trim().min(2).max(100),
  sellerType: z.enum(['private', 'shop']),
  businessType: z.enum(['individual', 'company']).default('individual'),
  country: z.enum(countries),
  legalName: text,
  vatNumber: text,
  registrationNumber: text,
  registeredAddress: text,
  legalRepresentative: text,
  phone: text,
  email: z.email(),
  description: text,
  billingAddress: text,
  shippingPolicy: text,
  returnsPolicy: text,
});
export async function GET(request: Request) {
  const a = await requireAuthenticatedUser(request);
  if (!a)
    return NextResponse.json(
      { error: 'Accedi per continuare.' },
      { status: 401 },
    );
  const { data, error } = await a.admin
    .from('seller_details')
    .select('seller_type,country_code,details')
    .eq('user_id', a.user.id)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: 'Profilo non disponibile.' },
      { status: 503 },
    );
  const accountDisplayName = registeredAccountName(a.user.user_metadata);
  return NextResponse.json(
    { profile: data, accountDisplayName },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
export async function POST(request: Request) {
  const a = await requireAuthenticatedUser(request);
  if (!a)
    return NextResponse.json(
      { error: 'Accedi prima di creare il profilo venditore.' },
      { status: 401 },
    );
  const p = schema.safeParse(await request.json().catch(() => null));
  if (!p.success)
    return NextResponse.json(
      { error: 'Controlla nome, paese e indirizzo email.' },
      { status: 400 },
    );
  const d = p.data;
  const registeredDisplayName = registeredAccountName(a.user.user_metadata);
  if (d.sellerType === 'private' && registeredDisplayName.length < 2)
    return NextResponse.json(
      { error: 'Completa prima il nome del tuo account COSMORA.' },
      { status: 400 },
    );
  const publicDisplayName =
    d.sellerType === 'shop' ? d.legalName : registeredDisplayName;
  if (
    d.sellerType === 'shop' &&
    [
      d.legalName,
      d.vatNumber,
      d.registeredAddress,
      d.legalRepresentative,
      d.shippingPolicy,
      d.returnsPolicy,
    ].some((v) => !v)
  )
    return NextResponse.json(
      { error: 'Completa i dati aziendali e le condizioni di vendita.' },
      { status: 400 },
    );
  const details = await a.admin
    .from('seller_details')
    .upsert({
      user_id: a.user.id,
      seller_type: d.sellerType,
      country_code: d.country,
      details: { ...d, displayName: publicDisplayName },
      updated_at: new Date().toISOString(),
    });
  if (details.error)
    return NextResponse.json(
      { error: 'Impossibile salvare i dati venditore.' },
      { status: 503 },
    );
  const saved = await a.admin
    .from('profiles')
    .upsert({
      id: a.user.id,
      display_name: publicDisplayName,
      role: d.sellerType === 'shop' ? 'pro_shop' : 'seller',
      country: d.country,
      updated_at: new Date().toISOString(),
    });
  if (saved.error)
    return NextResponse.json(
      {
        error:
          'Dati salvati, ma il profilo pubblico non è stato aggiornato. Riprova.',
      },
      { status: 503 },
    );
  return NextResponse.json({ ok: true });
}

function registeredAccountName(metadata: Record<string, unknown> | undefined) {
  for (const key of ['display_name', 'full_name', 'name']) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim().length >= 2)
      return value.trim();
  }
  return '';
}
