import type { GuardianRecord, GuardianStore } from './handler.ts';

type Rpc = (name: string, parameters: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

/** The caller must supply a server-only service-role client, never a browser client. */
export function createGuardianStore(rpc: Rpc): GuardianStore {
  async function call<T>(name: string, parameters: Record<string, unknown>): Promise<T> {
    const result = await rpc(name, parameters);
    if (result.error) throw new Error('Guardian persistence unavailable');
    return result.data as T;
  }
  return {
    takeRateLimit: (key, windowSeconds, limit) => call<boolean>('cosmora_guardian_rate_limit', {
      p_key: key, p_window_seconds: windowSeconds, p_limit: limit,
    }),
    status: userId => call<GuardianRecord | null>('cosmora_guardian_status', { p_user_id: userId }),
    request: value => call<GuardianRecord>('cosmora_guardian_request', { p_value: value }),
    verifyEmail: (tokenHash, consentHash, expiresAt) => call<GuardianRecord | null>('cosmora_guardian_verify', {
      p_token_hash: tokenHash, p_consent_hash: consentHash, p_expires_at: expiresAt,
    }),
    consent: (consentHash, noticeVersion) => call<GuardianRecord | null>('cosmora_guardian_consent', {
      p_consent_hash: consentHash, p_notice_version: noticeVersion,
    }),
    review: value => call<GuardianRecord | null>('cosmora_guardian_review', { p_value: value }),
  };
}
