import type { SupabaseClient } from '@supabase/supabase-js';

type InventoryAdmin = Pick<SupabaseClient, 'rpc'>;
export type TestInventoryOutcome = 'paid' | 'expired' | 'failed' | 'cancelled';
export type TestInventoryState = 'reserved' | 'consumed' | 'released';
export type TestInventoryReservation = {
  managed: boolean;
  orderId: string;
  listingId?: string;
  state: TestInventoryState | null;
  sessionId?: string | null;
  expiresAt?: string | null;
  orderStatus: string;
  releaseReason?: Exclude<TestInventoryOutcome, 'paid'> | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errorCodes = [
  'INVALID_ORDER', 'INVALID_LISTING', 'UNAVAILABLE', 'RESERVATION_REQUIRED',
  'SESSION_MISMATCH', 'INVALID_TRANSITION', 'RELEASED_PAYMENT_CONFLICT',
  'RECOVERY_REQUIRED',
] as const;
type InventoryErrorCode = typeof errorCodes[number] | 'UNAVAILABLE_SERVICE';

export class TestInventoryError extends Error {
  constructor(public readonly code: InventoryErrorCode) {
    super(`COSMORA_TEST_INVENTORY_${code}`);
    this.name = 'TestInventoryError';
  }
}

function validateOrderId(orderId: string) {
  if (!UUID.test(orderId)) throw new TestInventoryError('INVALID_ORDER');
}

async function inventoryRpc(
  admin: InventoryAdmin,
  name: string,
  args: Record<string, string | number | null>,
): Promise<TestInventoryReservation> {
  const { data, error } = await admin.rpc(name, args);
  if (error) {
    const known = errorCodes.find((code) => error.message?.includes(`COSMORA_TEST_INVENTORY_${code}`));
    // Missing migration/permissions and provider failures must fail closed.
    throw new TestInventoryError(known ?? 'UNAVAILABLE_SERVICE');
  }
  if (!data || typeof data !== 'object' || typeof data.managed !== 'boolean'
      || data.orderId !== args.p_order_id || typeof data.orderStatus !== 'string'
      || (data.managed && !['reserved', 'consumed', 'released'].includes(data.state))) {
    throw new TestInventoryError('UNAVAILABLE_SERVICE');
  }
  return data as TestInventoryReservation;
}

/** Server/service-role only. Must succeed before creating a test Checkout Session. */
export function reserveTestInventory(admin: InventoryAdmin, orderId: string) {
  validateOrderId(orderId);
  return inventoryRpc(admin, 'cosmora_test_inventory_reserve', { p_order_id: orderId });
}

/** Stores the immutable session binding on both reservation and test order atomically. */
export function bindTestInventorySession(
  admin: InventoryAdmin,
  orderId: string,
  session: { sessionId: string; expiresAt: number },
) {
  validateOrderId(orderId);
  if (!session.sessionId.startsWith('cs_test_') || !Number.isSafeInteger(session.expiresAt)
      || session.expiresAt <= 0 || session.expiresAt > 8_640_000_000_000) {
    throw new TestInventoryError('SESSION_MISMATCH');
  }
  return inventoryRpc(admin, 'cosmora_test_inventory_bind_session', {
    p_order_id: orderId, p_session_id: session.sessionId,
    p_expires_at: new Date(session.expiresAt * 1000).toISOString(),
  });
}

/**
 * Call only after verifying a TEST Stripe Session/event and its order/account association.
 * paid requires payment_status=paid; cancelled/expired require confirmed session expiry.
 * failed requires a definitive failed asynchronous payment event. A cancel_url is not evidence.
 * Managed orders are updated in the same transaction as inventory. Do not update them first.
 */
export function finalizeTestInventory(
  admin: InventoryAdmin,
  orderId: string,
  result: {
    outcome: TestInventoryOutcome;
    sessionId: string;
    paymentIntentId?: string | null;
    accountId: string;
    amountCents: number;
    currency: string;
  },
) {
  validateOrderId(orderId);
  if (!['paid', 'expired', 'failed', 'cancelled'].includes(result.outcome)
      || !result.sessionId.startsWith('cs_test_') || !result.accountId.startsWith('acct_')
      || !Number.isSafeInteger(result.amountCents) || result.amountCents < 0
      || !/^[a-z]{3}$/i.test(result.currency)
      || (result.paymentIntentId != null && !result.paymentIntentId.startsWith('pi_'))
      || (result.outcome === 'paid' && !result.paymentIntentId)) {
    throw new TestInventoryError('SESSION_MISMATCH');
  }
  return inventoryRpc(admin, 'cosmora_test_inventory_finalize', {
    p_order_id: orderId, p_outcome: result.outcome, p_session_id: result.sessionId,
    p_payment_intent_id: result.paymentIntentId ?? null, p_account_id: result.accountId,
    p_amount_cents: result.amountCents, p_currency: result.currency.toLowerCase(),
  });
}
