import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { reconcileCheckout, reconcileRefund, reconcileDispute } from '@/lib/stripe/reconcile';
import { EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID } from '@/lib/stripe/connect-config';
export async function POST(request: Request) {
  const stripe = getStripe(),
    admin = getSupabaseAdmin();
  const secret = process.env.STRIPE_WEBHOOK_SECRET,
    signature = request.headers.get('stripe-signature');
  if (!stripe || !admin || !secret)
    return NextResponse.json(
      { error: 'Webhook non configurato.' },
      { status: 503 },
    );
  if (!signature)
    return NextResponse.json({ error: 'Firma mancante.' }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return NextResponse.json({ error: 'Firma non valida.' }, { status: 400 });
  }
  if (event.livemode)
    return NextResponse.json(
      { error: 'Modalità live non abilitata.' },
      { status: 400 },
    );
  try {
    const platform = await stripe.accounts.retrieve(null);
    if (platform.id !== EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID) throw new Error('Stripe platform mismatch');
    const processed = await admin.from('marketplace_processed_stripe_events').select('id')
      .eq('id', event.id).maybeSingle();
    if (processed.error) throw processed.error;
    if (processed.data) return NextResponse.json({ received: true });
    if (event.type === 'account.updated') {
      const snapshot = event.data.object;
      if (event.account && event.account !== snapshot.id)
        return NextResponse.json(
          { error: 'Account non valido.' },
          { status: 400 },
        );
      const account = await stripe.accounts.retrieve(snapshot.id);
      const result = await admin
        .from('seller_payment_accounts')
        .update({
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_account_id', account.id);
      if (result.error) throw result.error;
    }
    if (
      [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.async_payment_failed',
        'checkout.session.expired',
      ].includes(event.type) &&
      event.account
    ) {
      // Webhook snapshots can arrive out of order. Read the current scoped object.
      const snapshot = event.data.object as Stripe.Checkout.Session;
      const session = await stripe.checkout.sessions.retrieve(snapshot.id, {}, { stripeAccount: event.account });
      let definitivelyFailed = false;
      if (event.type === 'checkout.session.async_payment_failed' && session.payment_status !== 'paid' &&
          session.status === 'complete' && session.payment_intent) {
        const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
        const intent = await stripe.paymentIntents.retrieve(intentId, {}, { stripeAccount: event.account });
        if (intent.livemode) throw new Error('Live intent not supported');
        definitivelyFailed = ['canceled', 'requires_payment_method'].includes(intent.status);
        if (!definitivelyFailed) throw new Error('Async failure not confirmed');
      }
      await reconcileCheckout(session, event.account, definitivelyFailed);
    }
    if (event.type === 'charge.refunded' && event.account) {
      const charge = await stripe.charges.retrieve(event.data.object.id, {}, { stripeAccount: event.account });
      await reconcileRefund(charge, event.account);
    }
    if (['refund.created', 'refund.updated', 'refund.failed'].includes(event.type) && event.account) {
      const refund = event.data.object as Stripe.Refund;
      const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
      if (!chargeId) throw new Error('Refund charge missing');
      const charge = await stripe.charges.retrieve(chargeId, {}, { stripeAccount: event.account });
      await reconcileRefund(charge, event.account);
    }
    if (event.type.startsWith('charge.dispute.') && event.account) {
      const snapshot = event.data.object as Stripe.Dispute;
      const dispute = await stripe.disputes.retrieve(snapshot.id, {}, { stripeAccount: event.account });
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
      const charge = await stripe.charges.retrieve(chargeId, {}, { stripeAccount: event.account });
      await reconcileDispute(dispute, charge, event.account);
    }
    // Write the receipt after durable reconciliation, so failed attempts remain retryable.
    // Parallel duplicates are safe because the reducers use transactions and monotonic states.
    const receipt = await admin.from('marketplace_processed_stripe_events').upsert({
      id: event.id, stripe_account_id: event.account ?? null, event_type: event.type,
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (receipt.error) throw receipt.error;
  } catch {
    return NextResponse.json(
      { error: 'Aggiornamento non completato. Riprovare.' },
      { status: 503 },
    );
  }
  return NextResponse.json({ received: true });
}
