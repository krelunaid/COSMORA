import type { Env } from '../lib/supabase/server.ts';
import { normalizePublicName, validPublicName, isPublicNameConflict, PUBLIC_NAME_TAKEN } from '../lib/public-name.ts';
import { publicNameAvailable } from '../lib/server/public-name.ts';

import { z } from 'zod';
import { requireAuthenticatedUser } from '../lib/supabase/server.ts';
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
  updatePublicName: z.boolean().default(false),
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
export async function GET(request: Request, env: Env) {
  const a = await requireAuthenticatedUser(request, env);
  if (!a)
    return Response.json(
      { error: 'Accedi per continuare.' },
      { status: 401 },
    );
  const { data, error } = await a.admin
    .from('seller_details')
    .select('seller_type,country_code,details')
    .eq('user_id', a.user.id)
    .maybeSingle();
  if (error)
    return Response.json(
      { error: 'Profilo non disponibile.' },
      { status: 503 },
    );
  const publicProfile = await a.admin.from('profiles').select('display_name').eq('id', a.user.id).maybeSingle();
  if (publicProfile.error) return Response.json({ error: 'Profilo non disponibile.' }, { status: 503 });
  const accountDisplayName = publicProfile.data?.display_name || registeredAccountName(a.user.user_metadata);
  return Response.json(
    { profile: data, accountDisplayName },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
export async function POST(request: Request, env: Env) {
  const a = await requireAuthenticatedUser(request, env);
  if (!a)
    return Response.json(
      { error: 'Accedi prima di creare il profilo venditore.' },
      { status: 401 },
    );
  const p = schema.safeParse(await request.json().catch(() => null));
  if (!p.success)
    return Response.json(
      { error: 'Controlla nome, paese e indirizzo email.' },
      { status: 400 },
    );
  const d = p.data;
  const publicProfile = await a.admin.from('profiles').select('display_name').eq('id', a.user.id).maybeSingle();
  if (publicProfile.error) return Response.json({ error: 'Profilo non disponibile.' }, { status: 503 });
  const registeredDisplayName = publicProfile.data?.display_name || registeredAccountName(a.user.user_metadata);
  if (d.sellerType === 'private' && registeredDisplayName.length < 2)
    return Response.json(
      { error: 'Completa prima il nome del tuo account COSMORA.' },
      { status: 400 },
    );
  const publicDisplayName = normalizePublicName(d.sellerType === 'shop' && d.updatePublicName ? d.displayName : publicProfile.data?.display_name || (d.sellerType === 'shop' ? d.legalName : registeredDisplayName));
  if (!validPublicName(publicDisplayName)) return Response.json({ error: 'Inserisci un nome pubblico valido da 2 a 80 caratteri.' }, { status: 400 });
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
    return Response.json(
      { error: 'Completa i dati aziendali e le condizioni di vendita.' },
      { status: 400 },
    );
  const availability = await publicNameAvailable(a.admin, publicDisplayName, a.user.id);
  if (availability.error) return Response.json({ error: 'Profilo non disponibile.' }, { status: 503 });
  if (!availability.available) return Response.json({ error: PUBLIC_NAME_TAKEN, code: 'PUBLIC_NAME_TAKEN' }, { status: 409 });
  if (d.sellerType === 'shop' && d.updatePublicName) {
    const { error } = await a.admin.rpc('cosmora_save_shop_public_name', {
      p_user_id: a.user.id, p_public_name: publicDisplayName, p_country: d.country,
      p_details: { ...d, displayName: publicDisplayName },
    });
    if (isPublicNameConflict(error)) return Response.json({ error: PUBLIC_NAME_TAKEN, code: 'PUBLIC_NAME_TAKEN' }, { status: 409 });
    if (error) return Response.json({ error: 'Impossibile salvare i dati venditore.' }, { status: 503 });
    return Response.json({ ok: true, displayName: publicDisplayName });
  }
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
    return Response.json(
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
  if (isPublicNameConflict(saved.error)) return Response.json({ error: PUBLIC_NAME_TAKEN, code: 'PUBLIC_NAME_TAKEN' }, { status: 409 });
  if (saved.error)
    return Response.json(
      {
        error:
          'Dati salvati, ma il profilo pubblico non è stato aggiornato. Riprova.',
      },
      { status: 503 },
    );
  return Response.json({ ok: true, displayName: publicDisplayName });
}

function registeredAccountName(metadata: Record<string, unknown> | undefined) {
  for (const key of ['display_name', 'full_name', 'name']) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim().length >= 2)
      return value.trim();
  }
  return '';
}
