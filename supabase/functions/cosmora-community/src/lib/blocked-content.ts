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
