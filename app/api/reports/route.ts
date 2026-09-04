import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
const schema = z.object({
  targetType: z.enum(['POST', 'SQUAD', 'USER']),
  targetId: z.uuid(),
  reason: z.enum([
    'SPAM',
    'SCAM',
    'HARASSMENT',
    'SEXUAL_CONTENT',
    'VIOLENCE',
    'HATE',
    'COPYRIGHT',
    'COUNTERFEIT',
    'OFF_TOPIC',
    'OTHER',
  ]),
  details: z.string().trim().max(2000).default(''),
});
export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per inviare una segnalazione.' },
      { status: 401 },
    );
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success)
    return NextResponse.json(
      { error: 'Segnalazione non valida.' },
      { status: 400 },
    );
  const data = result.data;
  const target = await auth.admin
    .from(
      data.targetType === 'POST'
        ? 'community_posts'
        : data.targetType === 'SQUAD'
          ? 'squads'
          : 'profiles',
    )
    .select('id')
    .eq('id', data.targetId)
    .maybeSingle();
  if (!target.data)
    return NextResponse.json(
      { error: 'Contenuto non disponibile.' },
      { status: 404 },
    );
  const recent = await auth.admin
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', auth.user.id)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());
  if (recent.error)
    return NextResponse.json(
      { error: 'Segnalazione non disponibile.' },
      { status: 503 },
    );
  if ((recent.count ?? 0) >= 10)
    return NextResponse.json(
      { error: 'Hai inviato diverse segnalazioni. Riprova più tardi.' },
      { status: 429 },
    );
  const { error } = await auth.admin
    .from('reports')
    .insert({
      reporter_id: auth.user.id,
      target_type: data.targetType,
      target_id: data.targetId,
      reason: data.reason,
      details: data.details,
    });
  return error
    ? NextResponse.json({ error: 'Invio non riuscito.' }, { status: 503 })
    : NextResponse.json({ saved: true }, { status: 201 });
}
