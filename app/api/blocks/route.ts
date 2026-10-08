import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';

const blockInput = z.object({
  userId: z.uuid(),
  blocked: z.boolean(),
  contextTargetType: z.enum(['POST', 'SQUAD', 'LISTING', 'USER']).optional(),
  contextTargetId: z.uuid().optional(),
}).refine((value) => Boolean(value.contextTargetType) === Boolean(value.contextTargetId));
const contentTargets = {
  POST: { table: 'community_posts', author: 'author_id' },
  SQUAD: { table: 'squads', author: 'owner_id' },
  LISTING: { table: 'listings', author: 'seller_id' },
} as const;

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per gestire i blocchi.' }, { status: 401 });
  const parsed = blockInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.userId === auth.user.id) return NextResponse.json({ error: 'Utente non valido.' }, { status: 400 });
  const { userId, blocked, contextTargetType, contextTargetId } = parsed.data;
  if (blocked && contextTargetType && contextTargetId) {
    if (contextTargetType === 'USER') {
      if (contextTargetId !== userId) return NextResponse.json({ error: 'Contesto del blocco non valido.' }, { status: 400 });
    } else {
      const target = contentTargets[contextTargetType];
      const context = await auth.admin.from(target.table).select('id').eq('id', contextTargetId).eq(target.author, userId).maybeSingle();
      if (context.error) return NextResponse.json({ error: 'Impossibile verificare il contenuto. Riprova.' }, { status: 503 });
      if (!context.data) return NextResponse.json({ error: 'Contenuto non disponibile per questo autore.' }, { status: 404 });
    }
  }
  const result = blocked
    ? await auth.admin.from('user_blocks').upsert({
      blocker_id: auth.user.id, blocked_id: userId,
      ...(contextTargetType ? { context_target_type: contextTargetType, context_target_id: contextTargetId } : {}),
    }, { onConflict: 'blocker_id,blocked_id' })
    : await auth.admin.from('user_blocks').delete().eq('blocker_id', auth.user.id).eq('blocked_id', userId);
  if (result.error) return NextResponse.json({ error: 'Operazione non riuscita.' }, { status: 503 });
  // The database trigger persists the moderator notice in this same transaction.
  return NextResponse.json({ saved: true });
}
