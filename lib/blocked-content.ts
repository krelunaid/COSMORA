import type { SupabaseClient } from '@supabase/supabase-js';

export const BLOCKS_CHANGED_EVENT = 'cosmora:blocks-changed';

export type BlockChange = { userId: string; blocked: boolean; viewerId?: string };
export type BlockRelation = { blocker_id: string; blocked_id: string };

/** Blocking is mutual for content visibility; an owner's own content stays visible. */
export function blockedAuthorIds(rows: BlockRelation[], viewerId: string): string[] {
  return [...new Set(rows.flatMap((row) => {
    const other = row.blocker_id === viewerId
      ? row.blocked_id
      : row.blocked_id === viewerId ? row.blocker_id : null;
    return other && other !== viewerId ? [other] : [];
  }))];
}

export function applyBlockChange(ids: ReadonlySet<string>, change: BlockChange): Set<string> {
  const next = new Set(ids);
  if (change.blocked) next.add(change.userId);
  else next.delete(change.userId);
  return next;
}

export function withoutBlockedAuthors<T>(
  items: T[],
  ids: ReadonlySet<string>,
  authorId: (item: T) => string,
): T[] {
  return items.filter((item) => !ids.has(authorId(item)));
}

/** The existing RLS permits only the signed-in user's outgoing blocks. */
export async function readOwnBlockedAuthors(
  client: SupabaseClient,
  viewerId: string,
  signal: AbortSignal,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; offset < 10000; offset += 500) {
    const { data, error } = await client.from('user_blocks')
      .select('blocked_id').eq('blocker_id', viewerId)
      .order('blocked_id').range(offset, offset + 499).abortSignal(signal);
    if (signal.aborted || error) throw new Error('Blocked content lookup unavailable.');
    for (const row of data ?? []) if (row.blocked_id !== viewerId) ids.add(row.blocked_id);
    if ((data?.length ?? 0) < 500) return ids;
  }
  // Never treat an incomplete block list as a complete one.
  throw new Error('Blocked content lookup limit reached.');
}

/** Legacy saved-items responses omit seller_id; resolve only already-visible active listings. */
export async function withListingAuthors<T extends { id: string; status: string; seller_id?: string }>(
  client: SupabaseClient,
  items: T[],
  signal: AbortSignal,
): Promise<Array<T & { seller_id: string }>> {
  const missing = items.filter((item) => item.status === 'active' && !item.seller_id).map((item) => item.id);
  if (missing.length > 100) throw new Error('Saved item lookup limit reached.');
  const authors = new Map<string, string>();
  if (missing.length) {
    const { data, error } = await client.from('listings').select('id,seller_id')
      .eq('status', 'active').in('id', missing).abortSignal(signal);
    if (signal.aborted || error) throw new Error('Saved item authors unavailable.');
    for (const row of data ?? []) authors.set(row.id, row.seller_id);
  }
  return items.map((item) => ({ ...item, seller_id: item.seller_id || authors.get(item.id) || '' }))
    .filter((item) => item.status !== 'active' || Boolean(item.seller_id));
}

/** Emit only after the block API has confirmed the mutation. */
export function notifyBlockChange(userId: string, blocked: boolean, viewerId?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BlockChange>(BLOCKS_CHANGED_EVENT, {
    detail: { userId, blocked, ...(viewerId ? { viewerId } : {}) },
  }));
}

export function subscribeToBlockChanges(listener: (change: BlockChange) => void) {
  if (typeof window === 'undefined') return () => {};
  const handle = (event: Event) => {
    const change = (event as CustomEvent<unknown>).detail;
    if (!change || typeof change !== 'object' ||
        !('userId' in change) || typeof change.userId !== 'string' ||
        !('blocked' in change) || typeof change.blocked !== 'boolean') return;
    listener({ userId: change.userId, blocked: change.blocked,
      ...('viewerId' in change && typeof change.viewerId === 'string' ? { viewerId: change.viewerId } : {}),
    });
  };
  window.addEventListener(BLOCKS_CHANGED_EVENT, handle);
  return () => window.removeEventListener(BLOCKS_CHANGED_EVENT, handle);
}
