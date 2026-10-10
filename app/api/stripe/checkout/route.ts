import { NextResponse } from 'next/server';
import { paymentsEnabled } from '@/lib/release-features';
import { z } from 'zod';
import { calculateMarketplaceQuote, SALE_FEE_POLICY_VERSION } from '@/lib/monetization';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getAppUrl, getStripe } from '@/lib/stripe/server';
import { bindTestInventorySession, reserveTestInventory, TestInventoryError } from '@/lib/stripe/inventory';
import { reconcileCheckout } from '@/lib/stripe/reconcile';
import { assertTestV2ConnectPaymentReady, EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID, CONNECT_ACCOUNT_TYPE } from '@/lib/stripe/connect-config';
import { readTestConnectAccount, validateTestConnectReturnUrl } from '@/lib/stripe/connect-onboarding';
const schema = z
  .object({ listingId: z.uuid(), checkoutKey: z.uuid() })
  .strict();
export async function POST(request: Request) {
  if (!paymentsEnabled) return NextResponse.json({ error: 'I pagamenti non sono disponibili in questa versione di COSMORA.' }, { status: 403 });
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
    const platform = await stripe.accounts.retrieve(null);
    if (platform.id !== EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID) throw new Error('Stripe platform mismatch');
    const previous = await admin
      .from('marketplace_orders')
      .select('*')
      .eq('buyer_id', user.id)
      .eq('checkout_key', parsed.data.checkoutKey)
      .maybeSingle();
    if (previous.error) throw previous.error;
    let order = previous.data;
    if (!order) {
      const { data: listing } = await admin
        .from('listings')
        .select('id,seller_id,title,sale_price_cents,status,sale_mode,shipping_mode,shipping_method,shipping_cost_cents,shipping_time')
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
      if (!listing.shipping_mode || listing.shipping_cost_cents === null || !listing.shipping_method || !listing.shipping_time)
        return NextResponse.json({ error: 'Il venditore deve indicare modalità, costo e tempi della consegna prima del checkout.' }, { status: 409 });
      const { data: account } = await admin
        .from('seller_payment_accounts')
        .select('stripe_account_id,account_type')
        .eq('user_id', listing.seller_id)
        .single();
      if (!account?.stripe_account_id)
        return NextResponse.json(
          { error: 'Il venditore deve completare Stripe di test.' },
          { status: 409 },
        );
      const connected = account.account_type === CONNECT_ACCOUNT_TYPE
        ? await readTestConnectAccount(admin, stripe, listing.seller_id) : null;
      if (!connected || connected.id !== account.stripe_account_id)
        return NextResponse.json(
          {
            error:
              'I pagamenti di test del venditore non sono ancora abilitati.',
          },
          { status: 409 },
        );
      assertTestV2ConnectPaymentReady(connected);
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
          amount_cents: listing.sale_price_cents + listing.shipping_cost_cents,
          shipping_cost_cents: listing.shipping_cost_cents,
          shipping_mode: listing.shipping_mode,
          shipping_method: listing.shipping_method,
          shipping_time: listing.shipping_time,
          fee_rate_bps: quote.rateBps,
          fee_policy_version: SALE_FEE_POLICY_VERSION,
          platform_fee_cents: quote.platformFeeCents,
          // Before Stripe processing fees; shipping is not part of the COSMORA fee base.
          seller_net_cents: quote.sellerAmountBeforeProcessingFeesCents + listing.shipping_cost_cents,
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
    if (!order || order.listing_id !== parsed.data.listingId || !order.is_test)
      return NextResponse.json(
        { error: 'Richiesta di acquisto non valida.' },
        { status: 409 },
      );
    if (order.status !== 'pending')
      return NextResponse.json({ error: 'Questo tentativo è già concluso. Controlla i tuoi ordini.',
        code: 'CHECKOUT_ATTEMPT_TERMINAL', orderId: order.id, status: order.status,
      }, { status: 409 });
    if (!process.env.APP_URL) throw new Error('Payment return origin missing');
    const appUrl = getAppUrl();
    validateTestConnectReturnUrl(appUrl);
    const options = { stripeAccount: order.stripe_account_id };
    // Re-check the current account on retries as well as new attempts.
    const currentAccount = await readTestConnectAccount(admin, stripe, order.seller_id);
    if (!currentAccount || currentAccount.id !== order.stripe_account_id) throw new Error('Seller account mismatch');
    assertTestV2ConnectPaymentReady(currentAccount);
    const reservation = await reserveTestInventory(admin, order.id);
    if (reservation.state !== 'reserved' || reservation.orderStatus !== 'pending')
      return NextResponse.json({ error: 'Questo tentativo è già concluso. Controlla i tuoi ordini.',
        code: 'CHECKOUT_ATTEMPT_TERMINAL', orderId: order.id, status: reservation.orderStatus,
      }, { status: 409 });
    // Reuse the stored policy on retries, including orders made before the 5% policy.
    const orderMetadata = {
      cosmora_order_id: order.id,
      cosmora_fee_policy_version: order.fee_policy_version,
    };
    // The reservation is read under the order lock and can contain a binding
    // recovered by a webhook after the earlier order SELECT. Never create from
    // that stale snapshot when a current session binding already exists.
    if (reservation.sessionId && order.stripe_checkout_session_id &&
        reservation.sessionId !== order.stripe_checkout_session_id) throw new Error('Session binding conflict');
    const sessionId = reservation.sessionId ?? order.stripe_checkout_session_id;
    const session = sessionId
      ? await stripe.checkout.sessions.retrieve(
          sessionId,
          {},
          options,
        )
      : await stripe.checkout.sessions.create(
          {
            mode: 'payment',
            // Stable across retries: Stripe compares the complete idempotent request.
            integration_identifier: 'cosmora_checkout_' + order.id.replace(/-/g, '').slice(0, 8)
              .split('').map((digit: string) => String.fromCharCode(97 + parseInt(digit, 16))).join(''),
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
              metadata: orderMetadata,
            },
            metadata: orderMetadata,
            custom_text: {
              submit: {
                message:
                  'Solo test. Non usare una carta reale. La prenotazione riguarda soltanto l’inventario di prova; nessuna merce reale sarà riservata o spedita.',
              },
            },
            success_url: appUrl + '/checkout?order=' + order.id,
            cancel_url: appUrl + '/checkout?order=' + order.id + '&cancelled=1',
          },
          { ...options, idempotencyKey: 'cosmora-test-' + order.id },
        );
    if (session.livemode || session.metadata?.cosmora_order_id !== order.id ||
        session.amount_total !== order.amount_cents || session.currency !== order.currency.toLowerCase())
      throw new Error('Session/order mismatch');
    await bindTestInventorySession(admin, order.id, { sessionId: session.id, expiresAt: session.expires_at });
    if (!session.url || session.status !== 'open') {
      await reconcileCheckout(session, order.stripe_account_id);
      const current = await admin.from('marketplace_orders').select('status')
        .eq('id', order.id).eq('buyer_id', user.id).eq('checkout_key', parsed.data.checkoutKey).single();
      if (current.error) throw current.error;
      return NextResponse.json(
        { error: 'Sessione terminata. Controlla lo stato negli ordini.', orderId: order.id,
          code: current.data.status !== 'pending' ? 'CHECKOUT_ATTEMPT_TERMINAL' : 'CHECKOUT_AWAITING_RESULT',
          status: current.data.status },
        { status: 409 },
      );
    }
    return NextResponse.json({
      url: session.url,
      orderId: order.id,
      isTest: true,
    });
  } catch (error) {
    if (error instanceof TestInventoryError) {
      const unavailable = error.code === 'UNAVAILABLE';
      const recovery = error.code === 'RECOVERY_REQUIRED';
      return NextResponse.json({
        code: 'CHECKOUT_' + error.code,
        error: unavailable ? 'Articolo già impegnato in un altro ordine di prova.'
          : recovery ? 'Tentativo da recuperare con l’assistenza. Non avviare un nuovo pagamento.'
          : 'Prenotazione di prova non verificata. Nessun nuovo checkout aperto.',
      }, { status: unavailable || recovery ? 409 : 503 });
    }
    return NextResponse.json(
      {
        error:
          'Stripe non è disponibile. Riprova: lo stesso tentativo non crea un secondo ordine.',
      },
      { status: 503 },
    );
  }
}
