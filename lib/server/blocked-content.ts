import type { getSupabaseAdmin } from '@/lib/supabase/server';
import { blockedAuthorIds } from '../blocked-content.ts';

export async function getBlockedAuthorIds(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  viewerId?: string,
) {
  if (!viewerId) return { ids: [], error: null };
  const ids = new Set<string>();
  for (let offset = 0; offset < 10000; offset += 500) {
    const { data, error } = await admin
      .from('user_blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`)
      .order('blocker_id').order('blocked_id').range(offset, offset + 499);
    if (error) return { ids: [], error };
    for (const id of blockedAuthorIds(data ?? [], viewerId)) ids.add(id);
    if ((data?.length ?? 0) < 500) return { ids: [...ids], error: null };
  }
  return { ids: [], error: new Error('Blocked content lookup limit reached.') };
}
