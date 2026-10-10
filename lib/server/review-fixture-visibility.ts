import type { requireAuthenticatedUser } from '@/lib/supabase/server';

type VerifiedViewer = Awaited<ReturnType<typeof requireAuthenticatedUser>>;

// Verified, dedicated review/demo accounts. This list grants fixture visibility
// only; it does not grant administrative or moderation permissions.
const reviewFixtureUserIds = [
  '66b0c100-e397-4971-946a-a8e3416b5f5b',
  '89d20859-246f-4619-a363-285655bb8e0f',
  'a082786e-8ef2-42c6-80c5-95b7ca3e997b',
] as const;
const reviewFixtureUsers = new Set<string>(reviewFixtureUserIds);
const excludedUsersFilter = '(' + reviewFixtureUserIds.join(',') + ')';

export function canViewReviewFixtures(viewer: VerifiedViewer): boolean {
  return Boolean(viewer && reviewFixtureUsers.has(viewer.user.id));
}

export function isHiddenReviewFixture(userId: string, viewer: VerifiedViewer): boolean {
  return reviewFixtureUsers.has(userId) && !canViewReviewFixtures(viewer);
}

/** Apply before pagination and signing media URLs, including guessed-ID reads. */
export function applyReviewFixtureVisibility<
  T extends { not(column: string, operator: string, value: string): T },
>(query: T, authorColumn: string, viewer: VerifiedViewer): T {
  return canViewReviewFixtures(viewer)
    ? query
    : query.not(authorColumn, 'in', excludedUsersFilter);
}
