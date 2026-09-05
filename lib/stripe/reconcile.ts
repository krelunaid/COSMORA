import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
export async function reconcileCheckout(
  session: Stripe.Checkout.Session,
  accountId: string,
) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Database unavailable');
  if (session.livemode || !session.metadata?.cosmora_order_id) return;
  const { data: order, error } = await admin
    .from('marketplace_orders')
    .select(
      'id,amount_cents,currency,stripe_account_id,stripe_checkout_session_id,is_test',
    )
    .eq('id', session.metadata.cosmora_order_id)
    .maybeSingle();
  if (error) throw error;
  if (!order) return;
  if (
    !order.is_test ||
    order.stripe_account_id !== accountId ||
    order.stripe_checkout_session_id !== session.id ||
    order.amount_cents !== session.amount_total ||
    order.currency.toLowerCase() !== session.currency
  )
    throw new Error('Payment/order mismatch');
  const status =
    session.payment_status === 'paid'
      ? 'paid'
      : session.status === 'expired'
        ? 'expired'
        : null;
  if (!status) return;
  const result = await admin
    .from('marketplace_orders')
    .update({
      status,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', 'pending');
  if (result.error) throw result.error;
  // Test payments deliberately do not reserve inventory, dispatch goods, or remove the cart.
}
