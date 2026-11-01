import type { getSupabaseAdmin } from '../supabase/server.ts';

export const communityInteractionTables = {
  like: 'community_post_likes',
  save: 'community_post_saves',
} as const;

/** Read only the verified viewer's state for the already-visible page of posts. */
export async function readCommunityPostInteractions(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  viewerId: string | undefined,
  postIds: string[],
) {
  if (!viewerId || !postIds.length)
    return {
      likedIds: new Set<string>(),
      savedIds: new Set<string>(),
      error: null,
    };

  const [likes, saves] = await Promise.all([
    admin
      .from(communityInteractionTables.like)
      .select('post_id')
      .eq('user_id', viewerId)
      .in('post_id', postIds),
    admin
      .from(communityInteractionTables.save)
      .select('post_id')
      .eq('user_id', viewerId)
      .in('post_id', postIds),
  ]);
  return {
    likedIds: new Set<string>((likes.data ?? []).map((row) => row.post_id)),
    savedIds: new Set<string>((saves.data ?? []).map((row) => row.post_id)),
    error: likes.error || saves.error,
  };
}
