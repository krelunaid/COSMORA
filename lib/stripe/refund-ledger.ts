import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACTIVE_REFUND_REQUEST_STATES = ['reserved', 'processing', 'pending', 'requires_action', 'unknown', 'manual_review'];

type LedgerOrder = {
  id: string;
  is_test: boolean;
  amount_cents: number;
  currency: string;
  stripe_account_id: string | null;
  stripe_payment_intent_id: string | null;
};

type LedgerRow = {
  id: string;
  request_id: string;
  stripe_account_id: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  amount_cents: number | null;
};

function idOf(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

/** Reconcile existing requests from an authoritative, complete Stripe snapshot.
 * This never reserves a request, calls Stripe, or creates a refund.
 */
export async function syncTestRefundLedger(
  admin: SupabaseClient,
  order: LedgerOrder,
  charge: Stripe.Charge,
  refunds: Stripe.Refund[],
) {
  if (!order.is_test || charge.livemode || !charge.paid || !charge.captured ||
      !order.stripe_account_id || !order.stripe_payment_intent_id ||
      idOf(charge.payment_intent) !== order.stripe_payment_intent_id ||
      charge.amount !== order.amount_cents || charge.currency !== order.currency.toLowerCase()) {
    throw new Error('Refund ledger charge/order mismatch');
  }
  if (new Set(refunds.map((refund) => refund.id)).size !== refunds.length) {
    throw new Error('Duplicate refund snapshot entries');
  }
  for (const refund of refunds) {
    if (idOf(refund.charge) !== charge.id || idOf(refund.payment_intent) !== order.stripe_payment_intent_id ||
        refund.currency !== charge.currency || !Number.isSafeInteger(refund.amount) || refund.amount <= 0) {
      throw new Error('Refund ledger snapshot mismatch');
    }
  }
  const result = await admin.from('marketplace_refund_requests')
    .select('id,request_id,stripe_account_id,stripe_payment_intent_id,stripe_charge_id,stripe_refund_id,amount_cents')
    .eq('order_id', order.id).in('status', ACTIVE_REFUND_REQUEST_STATES);
  if (result.error) throw new Error('Refund ledger unavailable');
  const entries = result.data as LedgerRow[];
  if (entries.length > 1) throw new Error('Multiple active refund requests');
  for (const entry of entries) {
    if (entry.stripe_account_id !== order.stripe_account_id || entry.stripe_payment_intent_id !== order.stripe_payment_intent_id) {
      throw new Error('Refund ledger account mismatch');
    }
    const matches = refunds.filter((refund) => refund.id === entry.stripe_refund_id ||
      (refund.metadata?.cosmora_order_id === order.id && refund.metadata?.cosmora_refund_request_id === entry.request_id));
    if (matches.length > 1) throw new Error('Multiple refunds match one request');
    if (!matches.length) continue; // A missing/uncertain result keeps its reservation.
    const refund = matches[0];
    if (entry.stripe_charge_id !== charge.id || entry.amount_cents !== refund.amount ||
        (entry.stripe_refund_id && entry.stripe_refund_id !== refund.id) ||
        refund.metadata?.cosmora_order_id !== order.id || refund.metadata?.cosmora_refund_request_id !== entry.request_id) {
      throw new Error('Refund ledger result mismatch');
    }
    const status = ['succeeded', 'failed', 'canceled', 'pending', 'requires_action'].includes(refund.status ?? '')
      ? refund.status! : 'unknown';
    const saved = await admin.from('marketplace_refund_requests').update({ stripe_refund_id: refund.id, status,
      last_error_code: null, updated_at: new Date().toISOString(),
    }).eq('id', entry.id).in('status', ACTIVE_REFUND_REQUEST_STATES);
    if (saved.error) throw new Error('Refund ledger update failed');
  }
}

export async function readActiveRefundRequest(admin: SupabaseClient, orderId: string) {
  const result = await admin.from('marketplace_refund_requests')
    .select('request_id,mode,requested_amount_cents,status')
    .eq('order_id', orderId).in('status', ACTIVE_REFUND_REQUEST_STATES).limit(2);
  if (result.error || result.data.length > 1) throw new Error('Refund ledger unavailable');
  const entry = result.data[0];
  if (!entry) return null;
  if ((entry.mode !== 'partial' && entry.mode !== 'remaining') ||
      (entry.mode === 'partial' && (!Number.isSafeInteger(entry.requested_amount_cents) || entry.requested_amount_cents <= 0)) ||
      (entry.mode === 'remaining' && entry.requested_amount_cents !== null) ||
      typeof entry.request_id !== 'string') {
    throw new Error('Invalid refund ledger request');
  }
  return { requestId: entry.request_id, mode: entry.mode as 'partial' | 'remaining',
    requestedAmountCents: entry.requested_amount_cents as number | null, status: entry.status as string };
}

/** Only this persisted terminal state proves that retrying under a new ID is safe.
 * A failed read deliberately provides no proof, regardless of the original error.
 */
export async function isRejectedRefundRequest(
  admin: SupabaseClient,
  orderId: string,
  requestId: string,
  actorId: string,
) {
  try {
    const result = await admin.from('marketplace_refund_requests').select('status')
      .eq('order_id', orderId).eq('request_id', requestId).eq('actor_id', actorId)
      .eq('status', 'rejected').maybeSingle();
    return !result.error && result.data?.status === 'rejected';
  } catch {
    return false;
  }
}
