import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { reconcileRefund } from '@/lib/stripe/reconcile';
import { runTestOrderRefund, TestRefundError, type TestRefundInput } from '@/lib/stripe/refunds';
import { isRejectedRefundRequest } from '@/lib/stripe/refund-ledger';

const refundSchema = z.union([
  z.object({ requestId: z.uuid(), mode: z.literal('partial'), amountCents: z.int().positive().max(2_147_483_647), confirmRefund: z.literal(true) }).strict(),
  z.object({ requestId: z.uuid(), mode: z.literal('remaining'), confirmRefund: z.literal(true) }).strict(),
  // Existing native clients still send this body. One stable legacy request per order.
  z.object({ requestId: z.uuid().optional(), confirmFullRefund: z.literal(true) }).strict(),
]);
const privateHeaders = { 'Cache-Control': 'private, no-store' };
const refundOrderColumns = 'id,buyer_id,seller_id,is_test,status,amount_cents,platform_fee_cents,refunded_cents,currency,stripe_account_id,stripe_payment_intent_id';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  const { id } = await params;
  const parsed = refundSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return NextResponse.json({ error: 'Conferma il rimborso e controlla importo e identificativo.' }, { status: 400, headers: privateHeaders });
  const { data: order, error } = await auth.admin.from('marketplace_orders').select(refundOrderColumns).eq('id', id)
    .or('buyer_id.eq.' + auth.user.id + ',seller_id.eq.' + auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Ordine non disponibile.' }, { status: 503 });
  if (!order) return NextResponse.json({ error: 'Ordine non trovato.' }, { status: 404 });
  if (order.seller_id !== auth.user.id) return NextResponse.json({ error: 'Solo il venditore può autorizzare il rimborso.' }, { status: 403 });
  if (!order.is_test) return NextResponse.json({ error: 'Rimborsi reali non ancora abilitati.' }, { status: 403 });
  if (!['paid', 'partially_refunded', 'refunded'].includes(order.status) || !order.stripe_payment_intent_id || !order.stripe_account_id)
    return NextResponse.json({ error: 'Ordine non rimborsabile da questo pulsante. Contatta l’assistenza.' }, { status: 409 });
  // Both reconciliation schema dependencies must exist before any refund request.
  // The reservation RPC separately verifies the refund-request ledger atomically.
  const disputes = await auth.admin.from('marketplace_payment_disputes')
    .select('id,status,amount_cents,currency,is_test,updated_at').eq('order_id', id).limit(1);
  if (disputes.error || !Number.isSafeInteger(order.refunded_cents) ||
      order.refunded_cents < 0 || order.refunded_cents > order.amount_cents) {
    return NextResponse.json({ error: 'Verifica rimborsi non disponibile. Nessun nuovo rimborso inviato.',
      code: 'REFUND_STORAGE_UNAVAILABLE',
    }, { status: 503, headers: privateHeaders });
  }
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe di prova non disponibile.' }, { status: 503 });
  const input: TestRefundInput = 'mode' in parsed.data
    ? parsed.data
    : { requestId: parsed.data.requestId ?? id, mode: 'remaining' };
  try {
    const { charge, refunds, accountId, ...result } = await runTestOrderRefund({ admin: auth.admin, stripe, order, actorId: auth.user.id, input });
    await reconcileRefund(charge, accountId, refunds);
    return NextResponse.json({ ok: true, ...result }, { headers: privateHeaders });
  } catch (error) {
    const rejected = await isRejectedRefundRequest(auth.admin, id, input.requestId, auth.user.id);
    const terminalProof = rejected ? { refundRequestStatus: 'rejected' as const, code: 'REFUND_TERMINAL_REJECTED' } : {};
    if (error instanceof TestRefundError) {
      return NextResponse.json({ error: error.message, code: error.code, requestId: input.requestId, isTest: true,
        ...terminalProof,
      }, { status: error.status, headers: privateHeaders });
    }
    return NextResponse.json({ error: rejected
      ? 'Richiesta non eseguita. Aggiorna lo stato prima di creare un nuovo rimborso.'
      : 'Esito del rimborso non verificato. Riprova con lo stesso identificativo e gli stessi dati; non creare una nuova richiesta.',
      code: 'REFUND_UNVERIFIED', requestId: input.requestId, isTest: true, ...terminalProof,
    }, { status: 503, headers: privateHeaders });
  }
}
