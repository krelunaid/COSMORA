import { NextResponse } from 'next/server';
import { z } from 'zod';

import { calculateMarketplaceQuote } from '@/lib/monetization';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getAppUrl, getStripe } from '@/lib/stripe/server';

const schema = z.object({
  listingId: z.uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function POST(request: Request) {
  const stripe = getStripe();
  const authenticated = await requireAuthenticatedUser(request);
  if (!stripe || !authenticated) {
    return NextResponse.json(
      { error: 'Pagamenti o autenticazione non configurati.' },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Prodotto non valido.' },
      { status: 400 },
    );
  }

  const { admin, user } = authenticated;
  const listingResult = await admin
    .from('listings')
    .select('id, seller_id, title, sale_price_cents, status')
    .eq('id', parsed.data.listingId)
    .eq('status', 'active')
    .single();
  const listing = listingResult.data;
  if (!listing?.sale_price_cents || listing.seller_id === user.id) {
    return NextResponse.json(
      { error: 'Prodotto non acquistabile.' },
      { status: 409 },
    );
  }

  const paymentAccount = await admin
    .from('seller_payment_accounts')
    .select('stripe_account_id, charges_enabled')
    .eq('user_id', listing.seller_id)
    .single();
  if (
    !paymentAccount.data?.stripe_account_id ||
    !paymentAccount.data.charges_enabled
  ) {
    return NextResponse.json(
      { error: 'Il venditore non ha ancora completato i pagamenti.' },
      { status: 409 },
    );
  }

  const amountCents = listing.sale_price_cents * parsed.data.quantity;
  const quote = calculateMarketplaceQuote({ kind: 'sale', amountCents });
  const order = await admin
    .from('marketplace_orders')
    .insert({
      buyer_id: user.id,
      seller_id: listing.seller_id,
      transaction_kind: 'sale',
      amount_cents: amountCents,
      fee_rate_bps: quote.rateBps,
      platform_fee_cents: quote.platformFeeCents,
      seller_net_cents: quote.sellerNetCents,
      status: 'pending',
    })
    .select('id')
    .single();
  if (!order.data) {
    return NextResponse.json(
      { error: 'Impossibile creare l’ordine.' },
      { status: 500 },
    );
  }

  const appUrl = getAppUrl(request);
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          quantity: parsed.data.quantity,
          price_data: {
            currency: 'eur',
            unit_amount: listing.sale_price_cents,
            product_data: { name: listing.title },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: quote.platformFeeCents,
        metadata: { cosmora_order_id: order.data.id },
      },
      metadata: { cosmora_order_id: order.data.id },
      success_url: `${appUrl}/checkout?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?payment=cancelled`,
    },
    { stripeAccount: paymentAccount.data.stripe_account_id },
  );

  await admin
    .from('marketplace_orders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', order.data.id);

  return NextResponse.json({ url: session.url });
}
