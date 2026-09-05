import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { reconcileCheckout } from '@/lib/stripe/reconcile';
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
    if (event.type === 'account.updated') {
      const account = event.data.object;
      if (event.account && event.account !== account.id)
        return NextResponse.json(
          { error: 'Account non valido.' },
          { status: 400 },
        );
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
        'checkout.session.expired',
      ].includes(event.type) &&
      event.account
    )
      await reconcileCheckout(
        event.data.object as Stripe.Checkout.Session,
        event.account,
      );
  } catch {
    return NextResponse.json(
      { error: 'Aggiornamento non completato. Riprovare.' },
      { status: 503 },
    );
  }
  return NextResponse.json({ received: true });
}
