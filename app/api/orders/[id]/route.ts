import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { reconcileCheckout } from '@/lib/stripe/reconcile';
import { orderActionPatch } from '@/lib/order-actions';
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
        // Read persisted state: a concurrent refund must not be shown as paid.
        const current = await auth.admin.from('marketplace_orders')
          .select('status').eq('id', order.id).single();
        if (current.error) throw current.error;
        order.status = current.data.status;
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
        fulfillment_status: order.fulfillment_status,
        fulfillment_version: order.fulfillment_version,
        carrier: order.carrier,
        tracking_number: order.tracking_number,
        issue_reason: order.issue_reason,
        issue_opened_at: order.issue_opened_at,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ship'), version: z.int().nonnegative(), carrier: z.string().trim().min(2).max(80), trackingNumber: z.string().trim().min(3).max(120) }).strict(),
  z.object({ action: z.literal('received'), version: z.int().nonnegative() }).strict(),
  z.object({ action: z.literal('report'), version: z.int().nonnegative(), reason: z.string().trim().min(10).max(2000) }).strict(),
]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  const { id } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return NextResponse.json({ error: 'Controlla i dati inseriti.' }, { status: 400 });
  const result = await auth.admin.from('marketplace_orders').select('*').eq('id', id)
    .or('buyer_id.eq.' + auth.user.id + ',seller_id.eq.' + auth.user.id).maybeSingle();
  if (result.error) return NextResponse.json({ error: 'Ordine non disponibile.' }, { status: 503 });
  if (!result.data) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
  const order = result.data;
  // Fulfillment is test-only until real sales and customer protection are ready.
  if (!order.is_test) return NextResponse.json({ error: 'Gestione ordini reali non ancora abilitata.' }, { status: 403 });
  let patch;
  try { patch = orderActionPatch(order, auth.user.id, parsed.data, new Date().toISOString()); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 409 }); }
  const saved = await auth.admin.from('marketplace_orders').update({ ...patch,
    fulfillment_version: parsed.data.version + 1, updated_at: new Date().toISOString(),
  }).eq('id', id).eq('status', 'paid').eq('fulfillment_version', parsed.data.version).select('id').maybeSingle();
  if (saved.error) return NextResponse.json({ error: 'Aggiornamento non riuscito. Riprova.' }, { status: 503 });
  if (!saved.data) return NextResponse.json({ error: 'L’ordine è cambiato: aggiorna lo stato prima di riprovare.' }, { status: 409 });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
