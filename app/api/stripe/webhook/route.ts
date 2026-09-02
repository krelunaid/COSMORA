import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';

export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!stripe || !admin || !webhookSecret || !signature) {
    return NextResponse.json(
      { error: 'Webhook non configurato.' },
      { status: 503 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch {
    return NextResponse.json(
      { error: 'Firma webhook non valida.' },
      { status: 400 },
    );
  }

  if (event.type === 'account.updated') {
    const account = event.data.object;
    await admin
      .from('seller_payment_accounts')
      .update({
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.id);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.cosmora_order_id;
    if (orderId) {
      await admin
        .from('marketplace_orders')
        .update({
          status: 'paid',
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }
  }

  return NextResponse.json({ received: true });
}
