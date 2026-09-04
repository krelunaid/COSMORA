import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

const input = z.object({ id: z.uuid(), recipientId: z.uuid(), body: z.string().trim().min(1).max(4000) });
const privateHeaders = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per leggere i messaggi.' }, { status: 401 });
  const peer = new URL(request.url).searchParams.get('peer');
  if (peer && !z.uuid().safeParse(peer).success) return NextResponse.json({ error: 'Destinatario non valido.' }, { status: 400 });
  const filter = peer ? `and(sender_id.eq.${auth.user.id},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${auth.user.id})` : `sender_id.eq.${auth.user.id},recipient_id.eq.${auth.user.id}`;
  const query = auth.admin.from('direct_messages').select('id, sender_id, recipient_id, body, created_at').or(filter);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Messaggi non disponibili. Riprova.' }, { status: 503 });
  const ids = [...new Set([...(data ?? []).flatMap((row) => [row.sender_id, row.recipient_id]), ...(peer ? [peer] : [])])];
  const profiles = ids.length ? await auth.admin.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
  return NextResponse.json({ userId: auth.user.id, messages: data ?? [], profiles: profiles.data ?? [] }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per inviare messaggi.' }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.recipientId === auth.user.id) return NextResponse.json({ error: 'Destinatario o messaggio non valido (massimo 4000 caratteri).' }, { status: 400 });
  const { recipientId, id, body } = parsed.data;
  const [recipient, blocks, recent] = await Promise.all([
    auth.admin.from('profiles').select('id').eq('id', recipientId).maybeSingle(),
    auth.admin.from('user_blocks').select('blocker_id').or(`and(blocker_id.eq.${auth.user.id},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${auth.user.id})`).limit(1),
    auth.admin.from('direct_messages').select('id', { count: 'exact', head: true }).eq('sender_id', auth.user.id).gte('created_at', new Date(Date.now() - 60000).toISOString()),
  ]);
  if (recipient.error || blocks.error || recent.error) return NextResponse.json({ error: 'Invio non disponibile. Riprova.' }, { status: 503 });
  if (!recipient.data || blocks.data?.length) return NextResponse.json({ error: 'Non puoi contattare questo utente.' }, { status: 403 });
  if ((recent.count ?? 0) >= 20) return NextResponse.json({ error: 'Troppi messaggi. Attendi un minuto.' }, { status: 429 });
  const { data, error } = await auth.admin.from('direct_messages').insert({ id, sender_id: auth.user.id, recipient_id: recipientId, body }).select('id').single();
  if (error?.code === '23505') {
    const existing = await auth.admin.from('direct_messages').select('id').eq('id', id).eq('sender_id', auth.user.id).eq('recipient_id', recipientId).eq('body', body).maybeSingle();
    if (existing.data) return NextResponse.json({ sent: true, id });
  }
  if (error) return NextResponse.json({ error: 'Messaggio non inviato. Riprova.' }, { status: 503 });
  return NextResponse.json({ sent: true, id: data.id }, { status: 201 });
}
