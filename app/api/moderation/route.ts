import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireModerator } from '@/lib/server/moderation-auth';
import { moderationActions, moderationTargetTypes, type ModerationItem, type ModerationTargetType } from '@/lib/moderation';

const tables = { POST: 'community_posts', SQUAD: 'squads', MEETUP: 'meetups', LISTING: 'listings', USER: 'profiles' } as const;
const fields = {
  POST: 'id,author_id,caption,status,post_media(storage_path,media_type,sort_order)',
  SQUAD: 'id,owner_id,name,description,rules,approximate_location,status',
  MEETUP: 'id,owner_id,title,description,rules,approximate_location,status',
  LISTING: 'id,seller_id,title,description,status,listing_images(storage_path,position)',
  USER: 'id,display_name',
} as const;
const headers = { 'Cache-Control': 'private, no-store' };
type Row = { id: string; status?: string; author_id?: string; owner_id?: string; seller_id?: string; caption?: string; name?: string; title?: string; description?: string; rules?: string; approximate_location?: string; display_name?: string; post_media?: Array<{ storage_path: string; media_type: 'IMAGE' | 'VIDEO'; sort_order: number }>; listing_images?: Array<{ storage_path: string; position: number }> };

export async function GET(request: Request) {
  const auth = await requireModerator(request);
  if (!auth) return NextResponse.json({ error: 'Accesso riservato ai moderatori autorizzati.' }, { status: 403, headers });
  const { admin } = auth;
  const view = new URL(request.url).searchParams.get('view') || 'pending';
  const offset = Number(new URL(request.url).searchParams.get('offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return NextResponse.json({ error: 'Pagina non valida.' }, { status: 400, headers });
  if (!['pending', 'hidden', 'history'].includes(view)) return NextResponse.json({ error: 'Vista non valida.' }, { status: 400, headers });
  if (view === 'history') {
    const { data, error } = await admin.from('moderation_actions').select('id,target_type,target_id,action,reason,previous_state,next_state,created_at').order('created_at', { ascending: false }).limit(100);
    return error ? NextResponse.json({ error: 'Registro non disponibile.' }, { status: 503, headers }) : NextResponse.json({ history: data }, { headers });
  }
  try {
    const reports = await admin.from('reports').select('id,target_type,target_id,reason,details,created_at,context_message_id,source,context_target_type,context_target_id').in('status', ['OPEN', 'REVIEWING']).order('created_at').order('id').range(view === 'pending' ? offset * 2 : 0, view === 'pending' ? offset * 2 + 99 : 99);
    if (reports.error) throw reports.error;
    const reportedUsers = [...new Set(reports.data.filter((r) => r.target_type === 'USER').map((r) => r.target_id as string))];
    const suspended = view === 'hidden'
      ? await admin.from('user_moderation').select('user_id').eq('suspended', true).order('updated_at').order('user_id').range(offset, offset + 49)
      : reportedUsers.length ? await admin.from('user_moderation').select('user_id').eq('suspended', true).in('user_id', reportedUsers) : { data: [], error: null };
    if (suspended.error) throw suspended.error;
    const suspendedIds = new Set((suspended.data ?? []).map((row) => row.user_id as string));
    let more = view === 'pending' ? reports.data.length === 100 : suspended.data.length === 50;
    const collected = new Map<string, { type: ModerationTargetType; row: Row }>();
    await Promise.all(moderationTargetTypes.map(async (type) => {
      let query = admin.from(tables[type]).select(fields[type]).order('created_at').order('id').range(offset, offset + 49);
      if (type === 'USER') {
        if (view !== 'hidden' || !suspendedIds.size) return;
        query = query.in('id', [...suspendedIds]).range(0, 49);
      } else {
        const statuses = type === 'LISTING'
          ? view === 'hidden' ? ['moderated'] : ['pending_review']
          : view === 'hidden' ? ['SUSPENDED', 'REMOVED'] : ['PENDING_REVIEW'];
        query = query.in('status', statuses);
      }
      const result = await query;
      if (result.error) throw result.error;
      if (result.data.length === 50) more = true;
      for (const row of result.data as unknown as Row[]) collected.set(type + ':' + row.id, { type, row });
      if (type === 'USER') for (const id of suspendedIds) if (!collected.has(type + ':' + id)) collected.set(type + ':' + id, { type, row: { id, display_name: 'Utente COSMORA' } });
    }));
    // Include reported active content even when the separate review queue is full.
    if (view === 'pending') await Promise.all(moderationTargetTypes.map(async (type) => {
      const ids = [...new Set(reports.data.filter((r) => r.target_type === type && !collected.has(type + ':' + r.target_id)).map((r) => r.target_id as string))];
      if (!ids.length) return;
      const result = await admin.from(tables[type]).select(fields[type]).in('id', ids);
      if (result.error) throw result.error;
      for (const row of result.data as unknown as Row[]) collected.set(type + ':' + row.id, { type, row });
      for (const id of ids) if (!collected.has(type + ':' + id)) {
        // auth.users is authoritative: a new sender may not have a public profile yet.
        const account = type === 'USER' ? await admin.auth.admin.getUserById(id) : null;
        if (account?.error && account.error.status !== 404) throw account.error;
        collected.set(type + ':' + id, { type, row: account?.data.user
          ? { id, display_name: 'Utente COSMORA' }
          : { id, status: 'MISSING', title: 'Contenuto non più disponibile' } });
      }
    }));
    const messageIds = [...new Set(reports.data.flatMap((r) => r.context_message_id ? [r.context_message_id as string] : []))];
    const messages = messageIds.length ? await admin.from('direct_messages').select('id,body,created_at').in('id', messageIds) : { data: [], error: null };
    if (messages.error) throw messages.error;
    const items: ModerationItem[] = await Promise.all([...collected.values()].map(async ({ type, row }) => {
      const media: ModerationItem['media'] = [];
      let mediaUnavailable = false;
      if (row.post_media?.length) {
        const sorted = [...row.post_media].sort((a, b) => a.sort_order - b.sort_order);
        const signed = await admin.storage.from('community-media').createSignedUrls(sorted.map((m) => m.storage_path), 900);
        mediaUnavailable = Boolean(signed.error || signed.data.some((m) => !m.signedUrl));
        if (!signed.error) media.push(...signed.data.flatMap((m, i) => m.signedUrl ? [{ url: m.signedUrl, type: sorted[i].media_type }] : []));
      }
      if (row.listing_images?.length) {
        const sorted = [...row.listing_images].sort((a, b) => a.position - b.position);
        const signed = await admin.storage.from('listing-images').createSignedUrls(sorted.map((m) => m.storage_path), 900);
        mediaUnavailable = mediaUnavailable || Boolean(signed.error || signed.data.some((m) => !m.signedUrl));
        if (!signed.error) media.push(...signed.data.flatMap((m) => m.signedUrl ? [{ url: m.signedUrl, type: 'IMAGE' as const }] : []));
      }
      return {
        targetType: type, targetId: row.id,
        status: row.status || (suspendedIds.has(row.id) ? 'SUSPENDED' : 'ACTIVE'),
        title: row.title || row.name || row.display_name || row.caption?.slice(0, 100) || 'Utente COSMORA',
        body: [row.caption, row.description, row.rules, row.approximate_location].filter(Boolean).join('\n\n'),
        authorId: row.author_id || row.owner_id || row.seller_id,
        media, mediaUnavailable,
        reports: reports.data.filter((r) => r.target_type === type && r.target_id === row.id).map((r) => ({
          id: r.id, reason: r.reason, details: r.details, created_at: r.created_at,
          source: r.source, contextTargetType: r.context_target_type, contextTargetId: r.context_target_id,
          contextMessage: messages.data?.find((m) => m.id === r.context_message_id) || null,
        })),
      };
    }));
    return NextResponse.json({ items, more }, { headers });
  } catch {
    return NextResponse.json({ error: 'Coda non disponibile. Verifica la migrazione di moderazione e riprova.' }, { status: 503, headers });
  }
}

const decision = z.object({
  targetType: z.enum(moderationTargetTypes), targetId: z.uuid(),
  action: z.enum(moderationActions), reason: z.string().trim().min(5).max(2000),
  expectedStatus: z.string().min(1).max(30),
  reportIds: z.array(z.uuid()).max(100).default([]),
}).refine((value) => !['DISMISS', 'RESOLVE'].includes(value.action) || value.reportIds.length > 0);
export async function POST(request: Request) {
  const auth = await requireModerator(request);
  if (!auth) return NextResponse.json({ error: 'Accesso riservato ai moderatori autorizzati.' }, { status: 403, headers });
  const input = decision.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Inserisci una decisione e una motivazione valida.' }, { status: 400, headers });
  const d = input.data;
  const { data, error } = await auth.admin.rpc('cosmora_moderation_decision', {
    p_actor: auth.user.id, p_target_type: d.targetType, p_target_id: d.targetId,
    p_action: d.action, p_reason: d.reason, p_expected_status: d.expectedStatus, p_report_ids: d.reportIds,
  });
  if (error) {
    const status = error.code === '40001' ? 409 : error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : 503;
    const message = status === 409 ? 'Il contenuto è cambiato. Aggiorna la coda prima di decidere.' : status === 403 ? 'Operazione non autorizzata.' : status === 404 ? 'Contenuto non disponibile.' : status === 400 ? 'Questa decisione non è valida per lo stato attuale.' : 'Decisione non salvata. Riprova.';
    return NextResponse.json({ error: message }, { status, headers });
  }
  return NextResponse.json({ saved: true, result: data }, { headers });
}
