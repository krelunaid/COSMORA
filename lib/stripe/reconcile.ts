import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { bindTestInventorySession, finalizeTestInventory } from '@/lib/stripe/inventory';
import { getTestOrderRefundSnapshot } from '@/lib/stripe/refunds';
import { syncTestRefundLedger } from '@/lib/stripe/refund-ledger';
import { getStripe } from '@/lib/stripe/server';

function idOf(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}
export async function reconcileCheckout(
  session: Stripe.Checkout.Session,
  accountId: string,
  failed = false,
) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Database unavailable');
  if (session.livemode || !session.metadata?.cosmora_order_id) return;
  const { data: order, error } = await admin
    .from('marketplace_orders')
    .select(
      'id,amount_cents,platform_fee_cents,currency,stripe_account_id,stripe_checkout_session_id,is_test',
    )
    .eq('id', session.metadata.cosmora_order_id)
    .maybeSingle();
  if (error) throw error;
  if (!order) return;
  if (
    !order.is_test ||
    order.stripe_account_id !== accountId ||
    (order.stripe_checkout_session_id !== null && order.stripe_checkout_session_id !== session.id) ||
    order.amount_cents !== session.amount_total ||
    order.currency.toLowerCase() !== session.currency
  )
    throw new Error('Payment/order mismatch');
  if (!order.stripe_checkout_session_id) {
    // Recover a known provider object after a lost create response/binding failure.
    // This creates no session and uses the reservation's immutable binding guard.
    if (session.client_reference_id !== order.id) throw new Error('Unbound session reference mismatch');
    await bindTestInventorySession(admin, order.id, { sessionId: session.id, expiresAt: session.expires_at });
  }
  const status =
    session.payment_status === 'paid'
      ? 'paid'
      : session.status === 'expired'
        ? 'expired'
        : failed
          ? 'failed'
          : null;
  if (!status) return;
  const paymentIntentId = idOf(session.payment_intent);
  if (status === 'paid') {
    const stripe = getStripe();
    if (!stripe || !paymentIntentId) throw new Error('Paid intent unavailable');
    const payment = await stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: accountId });
    if (payment.livemode || payment.status !== 'succeeded' || payment.amount_received !== order.amount_cents ||
        payment.currency !== order.currency.toLowerCase() || payment.metadata.cosmora_order_id !== order.id ||
        (payment.application_fee_amount ?? 0) !== order.platform_fee_cents)
      throw new Error('Payment intent/order mismatch');
  }
  const inventory = await finalizeTestInventory(admin, order.id, {
    outcome: status, sessionId: session.id, paymentIntentId,
    accountId, amountCents: order.amount_cents, currency: order.currency,
  });
  if (inventory.managed) return;
  const result = await admin
    .from('marketplace_orders')
    .update({
      status,
      stripe_payment_intent_id:
        paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', 'pending');
  if (result.error) throw result.error;
  // Legacy orders have no reservation; reconciliation never touches real stock.
}

// Direct-charge refunds belong to the seller's connected account, never the platform.
// Terminal full refunds cannot be rolled back by delayed partial-refund or checkout events.
export async function reconcileRefund(charge: Stripe.Charge, accountId: string, refunds?: Stripe.Refund[]) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Database unavailable');
  const paymentIntentId = idOf(charge.payment_intent);
  if (charge.livemode || !paymentIntentId) return;
  const { data: order, error } = await admin.from('marketplace_orders')
    .select('id,seller_id,status,amount_cents,platform_fee_cents,currency,is_test,stripe_account_id,stripe_payment_intent_id')
    .eq('stripe_payment_intent_id', paymentIntentId).maybeSingle();
  if (error) throw error;
  if (!order) {
    if (charge.metadata?.cosmora_order_id) throw new Error('Refund order not reconciled yet');
    return; // Charges outside COSMORA are not ours to manage.
  }
  if (!order.is_test || order.stripe_account_id !== accountId ||
      order.amount_cents !== charge.amount || order.currency.toLowerCase() !== charge.currency ||
      !charge.paid || !Number.isSafeInteger(charge.amount_refunded) ||
      charge.amount_refunded < 0 || charge.amount_refunded > charge.amount) {
    throw new Error('Refund/order mismatch');
  }
  if (!refunds) {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe unavailable');
    const snapshot = await getTestOrderRefundSnapshot(stripe, order);
    charge = snapshot.charge;
    refunds = snapshot.refunds;
  }
  // A pending request consumes the refund budget but is not a completed refund.
  const confirmedCents = refunds.reduce((sum, refund) => sum + (refund.status === 'succeeded' ? refund.amount : 0), 0);
  if (!Number.isSafeInteger(confirmedCents) || confirmedCents < 0 || confirmedCents > charge.amount ||
      confirmedCents > charge.amount_refunded) throw new Error('Refund snapshot inconsistent');
  // Validate the complete snapshot before writing the monotonic order amount.
  await syncTestRefundLedger(admin, order, charge, refunds);
  const result = await admin.rpc('cosmora_reconcile_test_refund', {
    p_order_id: order.id, p_account_id: accountId, p_payment_intent_id: paymentIntentId,
    p_amount_cents: order.amount_cents, p_currency: order.currency, p_refunded_cents: confirmedCents,
  });
  if (result.error) throw result.error;
}

/** Called with a fresh TEST Stripe dispute and its fresh connected-account charge. */
export async function reconcileDispute(dispute: Stripe.Dispute, charge: Stripe.Charge, accountId: string) {
  if (dispute.livemode || charge.livemode) throw new Error('Live dispute not supported');
  const intent = idOf(charge.payment_intent);
  if (idOf(dispute.charge) !== charge.id) throw new Error('Dispute/charge mismatch');
  if (!intent) {
    if (charge.metadata?.cosmora_order_id) throw new Error('COSMORA dispute missing PaymentIntent');
    return; // Legacy charges outside COSMORA do not have an order to reconcile.
  }
  if (idOf(dispute.payment_intent) !== intent)
    throw new Error('Dispute/charge mismatch');
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Database unavailable');
  const { data: order, error } = await admin.from('marketplace_orders')
    .select('id,is_test,amount_cents,currency,stripe_account_id')
    .eq('stripe_payment_intent_id', intent).maybeSingle();
  if (error) throw error;
  if (!order) {
    if (charge.metadata?.cosmora_order_id) throw new Error('Dispute order not reconciled yet');
    return;
  }
  if (!order.is_test || order.stripe_account_id !== accountId || charge.amount !== order.amount_cents ||
      charge.currency !== order.currency.toLowerCase() || dispute.currency !== charge.currency ||
      !Number.isSafeInteger(dispute.amount) || dispute.amount <= 0) throw new Error('Dispute/order mismatch');
  const result = await admin.rpc('cosmora_reconcile_test_dispute', {
    p_order_id: order.id, p_dispute_id: dispute.id, p_account_id: accountId,
    p_charge_id: charge.id, p_status: dispute.status, p_amount_cents: dispute.amount, p_currency: dispute.currency,
  });
  if (result.error) throw result.error;
}
