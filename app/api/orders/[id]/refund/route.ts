import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { reconcileRefund } from '@/lib/stripe/reconcile';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !z.object({ confirmFullRefund: z.literal(true) }).strict().safeParse(await request.json().catch(() => null)).success)
    return NextResponse.json({ error: 'Conferma il rimborso completo.' }, { status: 400 });
  const { data: order, error } = await auth.admin.from('marketplace_orders').select('*').eq('id', id)
    .or('buyer_id.eq.' + auth.user.id + ',seller_id.eq.' + auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Ordine non disponibile.' }, { status: 503 });
  if (!order) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
  if (order.seller_id !== auth.user.id) return NextResponse.json({ error: 'Solo il venditore può autorizzare il rimborso.' }, { status: 403 });
  if (!order.is_test) return NextResponse.json({ error: 'Rimborsi reali non ancora abilitati.' }, { status: 403 });
  if (order.status === 'refunded') return NextResponse.json({ ok: true, status: 'succeeded', isTest: true });
  if (order.status !== 'paid' || !order.stripe_payment_intent_id || !order.stripe_account_id)
    return NextResponse.json({ error: 'Ordine non rimborsabile da questo pulsante. Contatta l’assistenza.' }, { status: 409 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe di prova non disponibile.' }, { status: 503 });
  try {
    const options = { stripeAccount: order.stripe_account_id };
    const payment = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {}, options);
    if (payment.livemode || payment.status !== 'succeeded' || payment.amount_received !== order.amount_cents ||
        payment.currency !== order.currency.toLowerCase() || payment.metadata.cosmora_order_id !== order.id)
      return NextResponse.json({ error: 'Pagamento non corrispondente: verifica necessaria.' }, { status: 409 });
    // Same order, same refund on retries and concurrent clicks. Never accept a client amount.
    const refund = await stripe.refunds.create({ payment_intent: payment.id, amount: order.amount_cents,
      refund_application_fee: order.platform_fee_cents > 0,
      metadata: { cosmora_order_id: order.id },
    }, { ...options, idempotencyKey: 'cosmora-test-full-refund-' + order.id });
    if (refund.status === 'succeeded' && typeof refund.charge === 'string') {
      const charge = await stripe.charges.retrieve(refund.charge, {}, options);
      await reconcileRefund(charge, order.stripe_account_id);
    }
    return NextResponse.json({ ok: true, status: refund.status, isTest: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Esito del rimborso non verificato. Riprova lo stesso ordine: non verrà creato un secondo rimborso.' }, { status: 503 });
  }
}
