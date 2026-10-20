// These existing profiles are hidden only from public profile discovery.
// Their accounts and real posts, listings, crews and messages remain unchanged.
const hiddenPublicProfileIds = [
  '39ed3f97-f290-41f2-9cb0-c0fb0ad6ac53',
  '5127b626-1077-48ee-a266-de2948e49b66',
  '1606e1bd-1635-4760-a1ac-51561b43accc',
] as const;
const hiddenPublicProfilesFilter = '(' + hiddenPublicProfileIds.join(',') + ')';

/** Apply only to public profile queries, before IDs, search or pagination. */
export function applyPublicProfileVisibility<
  T extends { not(column: string, operator: string, value: string): T },
>(query: T): T {
  return query.not('id', 'in', hiddenPublicProfilesFilter);
}
