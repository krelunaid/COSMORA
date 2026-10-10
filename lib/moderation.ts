export const moderationTargetTypes = ['POST', 'SQUAD', 'MEETUP', 'LISTING', 'USER'] as const;
export type ModerationTargetType = typeof moderationTargetTypes[number];
export const moderationActions = ['APPROVE', 'HIDE', 'REJECT', 'RESTORE', 'SUSPEND', 'DISMISS', 'RESOLVE'] as const;
export type ModerationAction = typeof moderationActions[number];

// Display hints only. The API and SQL function independently authorize every decision.
export function isModerationRole(value: unknown) {
  return value === 'admin' || value === 'moderator';
}

export type ModerationReport = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  source?: 'USER_REPORT' | 'USER_BLOCK';
  contextTargetType?: 'POST' | 'SQUAD' | 'LISTING' | 'USER' | null;
  contextTargetId?: string | null;
  contextMessage?: { body: string; created_at: string } | null;
};

// Compatibility display hint for an older API that omits `source`. It never
// authorizes a decision; explicit source values always take precedence.
export function isBlockModerationNotice(report: Pick<ModerationReport, 'source' | 'reason' | 'details'>) {
  if (report.source !== undefined) return report.source === 'USER_BLOCK';
  return report.reason === 'OTHER' && Boolean(report.details?.startsWith(
    'Un utente ha bloccato questo autore. Avviso automatico al gestore;',
  ));
}

export type ModerationItem = {
  targetType: ModerationTargetType;
  targetId: string;
  status: string;
  title: string;
  body: string;
  authorId?: string;
  media: Array<{ url: string; type: 'IMAGE' | 'VIDEO' }>;
  mediaUnavailable?: boolean;
  reports: ModerationReport[];
};
export type ModerationQueue = { items: ModerationItem[]; more: boolean };
