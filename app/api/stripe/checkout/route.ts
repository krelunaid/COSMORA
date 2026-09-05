import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateMarketplaceQuote } from '@/lib/monetization';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getAppUrl, getStripe } from '@/lib/stripe/server';
const schema = z
  .object({ listingId: z.uuid(), checkoutKey: z.uuid() })
  .strict();
export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per continuare.' },
      { status: 401 },
    );
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json(
      {
        error:
          'Checkout di test non ancora configurato. Nessun addebito effettuato.',
      },
      { status: 503 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Richiesta di acquisto non valida.' },
      { status: 400 },
    );
  const { admin, user } = auth;
  try {
    let { data: order } = await admin
      .from('marketplace_orders')
      .select('*')
      .eq('buyer_id', user.id)
      .eq('checkout_key', parsed.data.checkoutKey)
      .maybeSingle();
    if (!order) {
      const { data: listing } = await admin
        .from('listings')
        .select('id,seller_id,title,sale_price_cents,status,sale_mode')
        .eq('id', parsed.data.listingId)
        .single();
      if (
        !listing ||
        listing.status !== 'active' ||
        listing.sale_mode === 'rent' ||
        !listing.sale_price_cents ||
        listing.seller_id === user.id
      )
        return NextResponse.json(
          { error: 'Articolo non acquistabile.' },
          { status: 409 },
        );
      const { data: account } = await admin
        .from('seller_payment_accounts')
        .select('stripe_account_id')
        .eq('user_id', listing.seller_id)
        .single();
      if (!account?.stripe_account_id)
        return NextResponse.json(
          { error: 'Il venditore deve completare Stripe di test.' },
          { status: 409 },
        );
      const connected = await stripe.accounts.retrieve(
        account.stripe_account_id,
      );
      if (!connected.charges_enabled)
        return NextResponse.json(
          {
            error:
              'I pagamenti di test del venditore non sono ancora abilitati.',
          },
          { status: 409 },
        );
      const quote = calculateMarketplaceQuote({
        kind: 'sale',
        amountCents: listing.sale_price_cents,
      });
      const inserted = await admin
        .from('marketplace_orders')
        .insert({
          buyer_id: user.id,
          seller_id: listing.seller_id,
          listing_id: listing.id,
          item_title: listing.title,
          transaction_kind: 'sale',
          amount_cents: listing.sale_price_cents,
          fee_rate_bps: quote.rateBps,
          platform_fee_cents: quote.platformFeeCents,
          seller_net_cents: quote.sellerNetCents,
          is_test: true,
          checkout_key: parsed.data.checkoutKey,
          stripe_account_id: account.stripe_account_id,
          status: 'pending',
        })
        .select('*')
        .single();
      if (inserted.error?.code === '23505') {
        const existing = await admin
          .from('marketplace_orders')
          .select('*')
          .eq('buyer_id', user.id)
          .eq('checkout_key', parsed.data.checkoutKey)
          .single();
        order = existing.data;
      } else if (inserted.error) throw new Error('order insert');
      else order = inserted.data;
    }
    if (
      !order ||
      order.listing_id !== parsed.data.listingId ||
      !order.is_test ||
      order.status !== 'pending'
    )
      return NextResponse.json(
        { error: 'Questo tentativo è già concluso. Controlla i tuoi ordini.' },
        { status: 409 },
      );
    const appUrl = getAppUrl(request);
    const options = { stripeAccount: order.stripe_account_id };
    const session = order.stripe_checkout_session_id
      ? await stripe.checkout.sessions.retrieve(
          order.stripe_checkout_session_id,
          {},
          options,
        )
      : await stripe.checkout.sessions.create(
          {
            mode: 'payment',
            payment_method_types: ['card'],
            client_reference_id: order.id,
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: 'eur',
                  unit_amount: order.amount_cents,
                  product_data: {
                    name: order.item_title,
                    description:
                      'TEST COSMORA: nessun acquisto o spedizione reale.',
                  },
                },
              },
            ],
            payment_intent_data: {
              application_fee_amount: order.platform_fee_cents,
              metadata: { cosmora_order_id: order.id },
            },
            metadata: { cosmora_order_id: order.id },
            custom_text: {
              submit: {
                message:
                  'Solo test. Non usare una carta reale. Nessun articolo sarà riservato o spedito.',
              },
            },
            success_url: appUrl + '/checkout?order=' + order.id,
            cancel_url: appUrl + '/checkout?order=' + order.id + '&cancelled=1',
          },
          { ...options, idempotencyKey: 'cosmora-test-' + order.id },
        );
    if (session.livemode || !session.url || session.status !== 'open')
      return NextResponse.json(
        { error: 'Sessione terminata. Controlla lo stato negli ordini.' },
        { status: 409 },
      );
    const saved = await admin
      .from('marketplace_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id);
    if (saved.error) throw new Error('session save');
    return NextResponse.json({
      url: session.url,
      orderId: order.id,
      isTest: true,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Stripe non è disponibile. Riprova: lo stesso tentativo non crea un secondo ordine.',
      },
      { status: 503 },
    );
  }
}
