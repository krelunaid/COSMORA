import { findSimilarSquad, moderateText, validatePublicLocation } from '@/lib/community-moderation';
import { communityPolicy } from '@/lib/server/community-policy';

const attempts = new Map<string, number[]>();

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const now = Date.now();
  const recent = (attempts.get(userId) ?? []).filter((time) => now - time < 3_600_000);
  if (recent.length >= communityPolicy.standard.creationsPerHour) return Response.json({ error: 'Creation rate limit reached.' }, { status: 429 });
  attempts.set(userId, [...recent, now]);

  const body = await request.json() as { kind: 'post' | 'squad'; title?: string; description?: string; event?: string; location?: string; date?: string };
  if (body.kind === 'squad' && body.location && !validatePublicLocation(body.location)) return Response.json({ error: 'Private addresses are not allowed.' }, { status: 422 });
  if (body.kind === 'squad' && body.date && new Date(`${body.date}T23:59:59`) < new Date()) return Response.json({ error: 'Date must be in the future.' }, { status: 422 });
  const duplicate = body.kind === 'squad' ? findSimilarSquad(body.title ?? '', body.event ?? '') : undefined;
  const moderation = moderateText(body.title ?? 'Community post', body.description ?? '');
  return Response.json({ ...moderation, duplicate: duplicate ? { slug: duplicate.slug, name: duplicate.name } : null });
}
