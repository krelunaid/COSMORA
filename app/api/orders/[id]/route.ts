import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { reconcileCheckout, reconcileRefund } from '@/lib/stripe/reconcile';
import { getTestOrderRefundSnapshot } from '@/lib/stripe/refunds';
import { readActiveRefundRequest } from '@/lib/stripe/refund-ledger';

const privateHeaders = { 'Cache-Control': 'private, no-store' };
// Selecting the new ledger amount explicitly also detects an unapplied migration.
const orderColumns = 'id,buyer_id,seller_id,item_title,status,amount_cents,shipping_cost_cents,platform_fee_cents,seller_net_cents,refunded_cents,currency,is_test,created_at,fulfillment_status,fulfillment_version,carrier,tracking_number,issue_reason,issue_opened_at,stripe_account_id,stripe_checkout_session_id,stripe_payment_intent_id';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth)
    return NextResponse.json(
      { error: 'Accedi per vedere l’ordine.' },
      { status: 401, headers: privateHeaders },
    );
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Ordine non valido.' }, { status: 400, headers: privateHeaders });
  const readOrder = () => auth.admin
    .from('marketplace_orders')
    .select(orderColumns)
    .eq('id', id)
    .or('buyer_id.eq.' + auth.user.id + ',seller_id.eq.' + auth.user.id)
    .maybeSingle();
  const result = await readOrder();
  if (result.error)
    return NextResponse.json(
      { error: 'Ordine non disponibile.' },
      { status: 503, headers: privateHeaders },
    );
  let order = result.data;
  if (!order)
    return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404, headers: privateHeaders });

  const readPaymentState = async () => {
    const [refundRequest, disputes] = await Promise.all([
      readActiveRefundRequest(auth.admin, id),
      auth.admin.from('marketplace_payment_disputes')
        .select('status,amount_cents,currency,is_test,updated_at')
        .eq('order_id', id).order('updated_at', { ascending: false }).limit(101),
    ]);
    if (disputes.error || disputes.data.length > 100) throw new Error('Dispute ledger unavailable');
    for (const dispute of disputes.data) {
      if (dispute.is_test !== order!.is_test || typeof dispute.status !== 'string' || !dispute.status ||
          typeof dispute.currency !== 'string' || dispute.currency.toLowerCase() !== order!.currency.toLowerCase() ||
          !Number.isSafeInteger(dispute.amount_cents) || dispute.amount_cents <= 0) {
        throw new Error('Dispute/order mismatch');
      }
    }
    // Surface an open dispute ahead of a newer closed one; otherwise show the latest outcome.
    const dispute = disputes.data.find((entry) => !['won', 'lost', 'warning_closed', 'prevented'].includes(entry.status)) ?? disputes.data[0];
    return { refundRequest, dispute: dispute ? { status: dispute.status, amountCents: dispute.amount_cents } : null };
  };

  let paymentState: Awaited<ReturnType<typeof readPaymentState>>;
  let providerRemaining: number | null = null;
  try {
    // Check both schema dependencies before any provider read or reconciliation.
    paymentState = await readPaymentState();
    if (order.is_test) {
      const needsCheckout = order.status === 'pending' && Boolean(order.stripe_checkout_session_id);
      const needsRefundSnapshot = ['paid', 'partially_refunded', 'refunded'].includes(order.status);
      const stripe = needsCheckout || needsRefundSnapshot ? getStripe() : null;
      if ((needsCheckout || needsRefundSnapshot) && (!stripe || !order.stripe_account_id)) {
        throw new Error('Test Stripe verification unavailable');
      }
      if (stripe && needsCheckout) {
        const session = await stripe.checkout.sessions.retrieve(
          order.stripe_checkout_session_id,
          {},
          { stripeAccount: order.stripe_account_id },
        );
        await reconcileCheckout(session, order.stripe_account_id);
        const current = await readOrder();
        if (current.error || !current.data) throw new Error('Order reconciliation unavailable');
        order = current.data;
      }
      if (stripe && ['paid', 'partially_refunded', 'refunded'].includes(order.status)) {
        const snapshot = await getTestOrderRefundSnapshot(stripe, order);
        // No Stripe mutation occurs here: reconcile only the already-observed result.
        await reconcileRefund(snapshot.charge, order.stripe_account_id, snapshot.refunds);
        providerRemaining = snapshot.remainingCents;
        const current = await readOrder();
        if (current.error || !current.data) throw new Error('Refund reconciliation unavailable');
        order = current.data;
      }
      paymentState = await readPaymentState();
    }
    const values = [order.amount_cents, order.shipping_cost_cents, order.platform_fee_cents,
      order.seller_net_cents, order.refunded_cents];
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0) ||
        order.shipping_cost_cents > order.amount_cents || order.platform_fee_cents > order.amount_cents ||
        order.seller_net_cents > order.amount_cents || order.refunded_cents > order.amount_cents) {
      throw new Error('Invalid persisted order amounts');
    }
  } catch {
    return NextResponse.json({ error: 'Verifica ordine e rimborsi temporaneamente non disponibile. Riprova la verifica; non ripetere il pagamento né creare un nuovo rimborso.',
      code: 'ORDER_VERIFICATION_UNAVAILABLE',
    }, { status: 503, headers: privateHeaders });
  }
  const remainingCents = providerRemaining === null
    ? (order.is_test && ['paid', 'partially_refunded', 'refunded'].includes(order.status) ? Math.max(0, order.amount_cents - order.refunded_cents) : 0)
    : Math.min(providerRemaining, Math.max(0, order.amount_cents - order.refunded_cents));
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
        amounts: {
          itemCents: order.amount_cents - order.shipping_cost_cents,
          shippingCents: order.shipping_cost_cents,
          platformFeeCents: order.platform_fee_cents,
          sellerBeforeProcessingFeesCents: order.seller_net_cents,
          refundedCents: order.refunded_cents,
          remainingCents,
        },
        refundRequest: order.seller_id === auth.user.id ? paymentState.refundRequest : null,
        dispute: paymentState.dispute,
      },
    },
    { headers: privateHeaders },
  );
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ship'), version: z.int().nonnegative().max(2_147_483_646), carrier: z.string().trim().min(2).max(80), trackingNumber: z.string().trim().min(3).max(120) }).strict(),
  z.object({ action: z.literal('received'), version: z.int().nonnegative().max(2_147_483_646) }).strict(),
  z.object({ action: z.literal('report'), version: z.int().nonnegative().max(2_147_483_646), reason: z.string().trim().min(10).max(2000) }).strict(),
]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401, headers: privateHeaders });
  const { id } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return NextResponse.json({ error: 'Controlla i dati inseriti.' }, { status: 400, headers: privateHeaders });
  const action = parsed.data;
  const errors: Record<string, { status: number; message: string }> = {
    ORDER_ACTION_INVALID: { status: 400, message: 'Controlla i dati inseriti.' },
    ORDER_ACTION_NOT_FOUND: { status: 404, message: 'Ordine non trovato.' },
    ORDER_ACTION_FORBIDDEN: { status: 403, message: 'Questa operazione non è disponibile per il tuo ruolo nell’ordine.' },
    ORDER_ACTION_TEST_ONLY: { status: 403, message: 'Gestione ordini reali non ancora abilitata.' },
    ORDER_ACTION_UNPAID: { status: 409, message: 'Il pagamento deve essere confermato prima di gestire la consegna.' },
    ORDER_ACTION_VERSION_CONFLICT: { status: 409, message: 'L’ordine è cambiato: aggiorna lo stato prima di riprovare.' },
    ORDER_ACTION_DISPUTED: { status: 409, message: 'La gestione della consegna è sospesa per una contestazione aperta o conclusa con perdita dei fondi.' },
    ORDER_ACTION_REFUND_PENDING: { status: 409, message: 'La gestione della consegna è sospesa finché l’esito del rimborso in corso non è verificato.' },
    ORDER_ACTION_SHIP_UNAVAILABLE: { status: 409, message: 'La spedizione non può essere modificata in questo stato.' },
    ORDER_ACTION_NOT_SHIPPED: { status: 409, message: 'Non risulta ancora una spedizione.' },
    ORDER_ACTION_ALREADY_REPORTED: { status: 409, message: 'È già presente una segnalazione per questo ordine.' },
  };
  try {
    // The RPC locks the order, as does dispute reconciliation, and rechecks role,
    // test mode, payment, version, transition and active disputes before updating.
    // Missing RPC/schema has no fallback to the previous non-atomic update.
    const saved = await auth.admin.rpc('cosmora_apply_test_order_action', {
      p_order_id: id, p_actor_id: auth.user.id, p_version: action.version, p_action: action.action,
      p_carrier: action.action === 'ship' ? action.carrier : null,
      p_tracking_number: action.action === 'ship' ? action.trackingNumber : null,
      p_reason: action.action === 'report' ? action.reason : null,
    });
    if (saved.error) {
      const known = errors[saved.error.message];
      if (known) return NextResponse.json({ error: known.message, code: saved.error.message },
        { status: known.status, headers: privateHeaders });
      throw new Error('Order action unavailable');
    }
    if (saved.data !== action.version + 1) throw new Error('Order action result unavailable');
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Aggiornamento non verificato. Aggiorna lo stato dell’ordine prima di riprovare.',
      code: 'ORDER_ACTION_UNAVAILABLE',
    }, { status: 503, headers: privateHeaders });
  }
}
