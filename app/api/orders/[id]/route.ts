import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { reconcileCheckout } from '@/lib/stripe/reconcile';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per vedere l’ordine.' },
      { status: 401 },
    );
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Ordine non valido.' }, { status: 400 });
  const result = await auth.admin
    .from('marketplace_orders')
    .select('*')
    .eq('id', id)
    .or('buyer_id.eq.' + auth.user.id + ',seller_id.eq.' + auth.user.id)
    .maybeSingle();
  if (result.error)
    return NextResponse.json(
      { error: 'Ordine non disponibile.' },
      { status: 503 },
    );
  const order = result.data;
  if (!order)
    return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
  if (
    order.is_test &&
    order.status === 'pending' &&
    order.stripe_checkout_session_id
  ) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          order.stripe_checkout_session_id,
          {},
          { stripeAccount: order.stripe_account_id },
        );
        await reconcileCheckout(session, order.stripe_account_id);
        if (session.payment_status === 'paid') order.status = 'paid';
        else if (session.status === 'expired') order.status = 'expired';
      } catch {
        return NextResponse.json(
          {
            error:
              'Verifica Stripe temporaneamente non disponibile. Non ripetere il pagamento: riprova la verifica.',
          },
          { status: 503 },
        );
      }
    }
  }
  return NextResponse.json(
    {
      order: {
        id: order.id,
        item_title: order.item_title,
        status: order.status,
        amount_cents: order.amount_cents,
        currency: order.currency,
        is_test: order.is_test,
        created_at: order.created_at,
        role: order.buyer_id === auth.user.id ? 'buyer' : 'seller',
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
