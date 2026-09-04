import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSupabaseAdmin,
  requireAuthenticatedUser,
} from '@/lib/supabase/server';
import {
  moderateText,
  validatePublicLocation,
} from '@/lib/community-moderation';
const schema = z.object({
  name: z.string().trim().min(4).max(100),
  description: z.string().trim().min(12).max(3000),
  type: z.enum([
    'COSPLAY_SQUAD',
    'EVENT_MEETUP',
    'PHOTO_MEETUP',
    'COSPLAY_CONTEST_TEAM',
    'TRAVEL_GROUP_FOR_EVENT',
  ]),
  city: z.string().trim().min(2).max(100),
  startsAt: z.iso.datetime(),
  location: z.string().trim().min(3).max(200),
  maxMembers: z.number().int().min(2).max(500),
  approval: z.boolean(),
  rules: z.string().trim().min(5).max(2000),
  fandom: z.string().max(100).default(''),
});
export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: 'Crew non disponibili.' },
      { status: 503 },
    );
  const auth = await requireAuthenticatedUser(request);
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (id && !z.uuid().safeParse(id).success)
    return NextResponse.json({ squads: [] });
  let query = admin
    .from('squads')
    .select(
      'id,owner_id,name,squad_type,description,city,starts_at,approximate_location,max_members,approval_required,rules,fandom,status',
    );
  if (id) query = query.eq('id', id);
  else query = query.gte('starts_at', new Date().toISOString());
  // Private crews are not listed or exposed through guessed IDs.
  query = query.eq('is_private', false);
  if (auth) query = query.or('status.eq.ACTIVE,owner_id.eq.' + auth.user.id);
  else query = query.eq('status', 'ACTIVE');
  const { data, error } = await query.order('starts_at').limit(50);
  if (error)
    return NextResponse.json(
      { error: 'Crew non disponibili.' },
      { status: 503 },
    );
  const squads = await Promise.all(
    (data ?? []).map(async (s) => {
      const members = await admin
        .from('squad_members')
        .select('user_id,membership_status')
        .eq('squad_id', s.id);
      const own = members.data?.find((m) => m.user_id === auth?.user.id);
      return {
        ...s,
        memberCount:
          members.data?.filter((m) => m.membership_status === 'ACTIVE')
            .length || 0,
        myStatus: own?.membership_status || null,
        requests:
          s.owner_id === auth?.user.id
            ? members.data?.filter((m) => m.membership_status === 'PENDING')
            : undefined,
      };
    }),
  );
  return NextResponse.json(
    { squads, userId: auth?.user.id },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per creare una crew.' },
      { status: 401 },
    );
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success)
    return NextResponse.json(
      { error: 'Controlla nome, descrizione, data, luogo e regole.' },
      { status: 400 },
    );
  const d = result.data;
  if (new Date(d.startsAt) <= new Date() || !validatePublicLocation(d.location))
    return NextResponse.json(
      { error: 'Scegli una data futura e un luogo pubblico.' },
      { status: 400 },
    );
  const recent = await auth.admin
    .from('squads')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());
  if (recent.error)
    return NextResponse.json(
      { error: 'Creazione non disponibile.' },
      { status: 503 },
    );
  if ((recent.count ?? 0) >= 4)
    return NextResponse.json(
      { error: 'Hai già creato diverse crew. Riprova tra un’ora.' },
      { status: 429 },
    );
  const moderation = moderateText(d.name, d.description);
  const { data, error } = await auth.admin
    .from('squads')
    .insert({
      owner_id: auth.user.id,
      name: d.name,
      squad_type: d.type,
      description: d.description,
      city: d.city,
      starts_at: d.startsAt,
      approximate_location: d.location,
      max_members: d.maxMembers,
      approval_required: d.approval,
      rules: d.rules,
      fandom: d.fandom,
      status: moderation.status,
      is_private: false,
    })
    .select('id,status')
    .single();
  if (error)
    return NextResponse.json(
      { error: 'Creazione non riuscita.' },
      { status: 503 },
    );
  const member = await auth.admin
    .from('squad_members')
    .insert({
      squad_id: data.id,
      user_id: auth.user.id,
      role: 'OWNER',
      membership_status: 'ACTIVE',
    });
  if (member.error) {
    await auth.admin.from('squads').delete().eq('id', data.id);
    return NextResponse.json(
      { error: 'Creazione non riuscita.' },
      { status: 503 },
    );
  }
  return NextResponse.json({ squad: data }, { status: 201 });
}
export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per partecipare.' },
      { status: 401 },
    );
  const parsed = z
    .object({
      id: z.uuid(),
      action: z.enum(['join', 'leave', 'approve', 'decline']),
      memberId: z.uuid().optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Richiesta non valida.' },
      { status: 400 },
    );
  const crew = await auth.admin
    .from('squads')
    .select('owner_id,is_private')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (crew.error || !crew.data || crew.data.is_private)
    return NextResponse.json(
      { error: 'Crew non disponibile.' },
      { status: 404 },
    );
  const blocks = await auth.admin
    .from('user_blocks')
    .select('blocker_id')
    .or(
      'and(blocker_id.eq.' +
        auth.user.id +
        ',blocked_id.eq.' +
        crew.data.owner_id +
        '),and(blocker_id.eq.' +
        crew.data.owner_id +
        ',blocked_id.eq.' +
        auth.user.id +
        ')',
    )
    .limit(1);
  if (blocks.error || blocks.data?.length)
    return NextResponse.json(
      { error: 'Non puoi partecipare a questa crew.' },
      { status: 403 },
    );
  const { data, error } = await auth.admin.rpc('cosmora_membership', {
    p_actor: auth.user.id,
    p_squad: parsed.data.id,
    p_action: parsed.data.action,
    p_member: parsed.data.memberId || null,
  });
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes('CREW_FULL')
          ? 'La crew ha raggiunto il numero massimo di partecipanti.'
          : 'Operazione non disponibile: verifica i permessi e che la crew sia ancora aperta.',
      },
      { status: 409 },
    );
  return NextResponse.json({ status: data });
}
