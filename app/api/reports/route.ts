import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
const schema = z.object({
  targetType: z.enum(['POST', 'SQUAD', 'USER', 'LISTING']),
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
  contextMessageId: z.uuid().optional(),
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
  const target = data.targetType === 'USER' ? await (async () => {
    const result = await auth.admin.auth.admin.getUserById(data.targetId);
    return { data: result.data.user ? { id: result.data.user.id } : null, error: result.error?.status === 404 ? null : result.error };
  })() : await auth.admin
    .from(
      data.targetType === 'POST'
        ? 'community_posts'
        : data.targetType === 'SQUAD'
          ? 'squads'
          : data.targetType === 'LISTING'
            ? 'listings'
          : 'profiles',
    )
    .select('id')
    .eq('id', data.targetId)
    .maybeSingle();
  if (target.error) return NextResponse.json({ error: 'Segnalazione non disponibile.' }, { status: 503 });
  if (!target.data)
    return NextResponse.json(
      { error: 'Contenuto non disponibile.' },
      { status: 404 },
    );
  // A private message may be disclosed to moderators only by a participant,
  // and only when reporting the other participant who sent that message.
  if (data.contextMessageId) {
    if (data.targetType !== 'USER') return NextResponse.json({ error: 'Contesto non valido.' }, { status: 400 });
    const context = await auth.admin.from('direct_messages').select('id').eq('id', data.contextMessageId).eq('sender_id', data.targetId).eq('recipient_id', auth.user.id).maybeSingle();
    if (context.error) return NextResponse.json({ error: 'Segnalazione non disponibile.' }, { status: 503 });
    if (!context.data) return NextResponse.json({ error: 'Messaggio non disponibile.' }, { status: 404 });
  }
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
      context_message_id: data.contextMessageId || null,
    });
  return error
    ? NextResponse.json({ error: 'Invio non riuscito.' }, { status: 503 })
    : NextResponse.json({ saved: true }, { status: 201 });
}
