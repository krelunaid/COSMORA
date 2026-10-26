export const PUSH_CAMPAIGN = 'community-thanks-v1';
export const PUSH_STORAGE = 'cosmora-push-v1';
export const PUSH_ROUTE = '/thanks';
export type PushIdentity = { id: string; secret: string; userId?: string; enabled: boolean; pendingDisable?: boolean };
export function isPushIdentity(value: unknown): value is PushIdentity {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && /^[0-9a-f-]{36}$/.test(v.id) && typeof v.secret === 'string' && /^[0-9a-f]{64}$/.test(v.secret) && typeof v.enabled === 'boolean';
}
export function canRestorePush(identity: PushIdentity, userId: string | undefined, anonymous: boolean, permission: string) {
  return !!userId && !anonymous && identity.userId === userId && identity.enabled && !identity.pendingDisable && permission === 'granted';
}
export function notificationRoute(data: unknown): string | null {
  return data && typeof data === 'object' && (data as Record<string, unknown>).campaign === PUSH_CAMPAIGN ? PUSH_ROUTE : null;
}
