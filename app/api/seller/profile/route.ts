import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedUser } from '@/lib/supabase/server';

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  sellerType: z.enum(['private', 'shop']),
  country: z.string().trim().min(2).max(80),
});

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Accedi prima di creare il profilo venditore.' },
      { status: 401 },
    );
  }
  const parsed = profileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi.' },
      { status: 400 },
    );
  }

  const { admin, user } = authenticated;
  const saved = await admin.from('profiles').upsert({
    id: user.id,
    display_name: parsed.data.displayName,
    role: parsed.data.sellerType === 'shop' ? 'pro_shop' : 'seller',
    country: parsed.data.country,
    updated_at: new Date().toISOString(),
  });
  if (saved.error) {
    return NextResponse.json(
      { error: 'Impossibile salvare il profilo venditore.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
