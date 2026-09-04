import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per gestire i blocchi.' }, { status: 401 });
  const parsed = z.object({ userId: z.uuid(), blocked: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.userId === auth.user.id) return NextResponse.json({ error: 'Utente non valido.' }, { status: 400 });
  const result = parsed.data.blocked
    ? await auth.admin.from('user_blocks').upsert({ blocker_id: auth.user.id, blocked_id: parsed.data.userId })
    : await auth.admin.from('user_blocks').delete().eq('blocker_id', auth.user.id).eq('blocked_id', parsed.data.userId);
  if (result.error) return NextResponse.json({ error: 'Operazione non riuscita.' }, { status: 503 });
  return NextResponse.json({ saved: true });
}
