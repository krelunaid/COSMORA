import { z } from 'zod';
import { moderateText, validatePublicLocation } from '@/lib/community-moderation';
import { communityPolicy } from '@/lib/server/community-policy';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

const schema = z.object({
  kind: z.enum(['post', 'squad']), title: z.string().trim().max(100).default(''),
  description: z.string().trim().max(3000).default(''), event: z.string().max(150).optional(),
  location: z.string().trim().max(200).optional(), date: z.iso.date().optional(),
}).strict();

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return Response.json({ error: 'Accedi per continuare.' }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: 'Contenuto non valido.' }, { status: 400 });
  const body = input.data;
  const recent = await auth.admin.from(body.kind === 'post' ? 'community_posts' : 'squads')
    .select('id', { count: 'exact', head: true }).eq(body.kind === 'post' ? 'author_id' : 'owner_id', auth.user.id)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());
  if (recent.error) return Response.json({ error: 'Verifica non disponibile.' }, { status: 503 });
  if ((recent.count ?? 0) >= communityPolicy.standard.creationsPerHour) return Response.json({ error: 'Limite di creazione raggiunto. Riprova più tardi.' }, { status: 429 });
  if (body.kind === 'squad' && body.location && !validatePublicLocation(body.location)) return Response.json({ error: 'Gli indirizzi privati non sono consentiti.' }, { status: 422 });
  if (body.kind === 'squad' && body.date && new Date(body.date + 'T23:59:59') < new Date()) return Response.json({ error: 'Scegli una data futura.' }, { status: 422 });
  return Response.json({ ...moderateText(body.title || 'Community post', body.description), status: 'PENDING_REVIEW', duplicate: null }, { headers: { 'Cache-Control': 'private, no-store' } });
}
