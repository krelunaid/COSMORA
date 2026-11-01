import type { CommunityPost } from './community-feed';

/** Never carry personalised feed data across account changes or failed block checks. */
export function homeCommunityPhotos(
  posts: readonly CommunityPost[],
  access: {
    ready: boolean;
    viewerId: string;
    loadedViewerId: string | null;
    blockedIds: ReadonlySet<string>;
  },
): CommunityPost[] {
  if (!access.ready || access.loadedViewerId !== access.viewerId) return [];
  return posts
    .filter(
      (post) =>
        !access.blockedIds.has(post.author_id) &&
        post.media.some((media) => media.type === 'IMAGE' && !!media.url),
    )
    .slice(0, 8);
}
