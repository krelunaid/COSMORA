import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export type TestRefundInput = {
  requestId: string;
  mode: 'partial' | 'remaining';
  amountCents?: number;
};

export type RefundOrder = {
  id: string;
  seller_id: string;
  is_test: boolean;
  status: string;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  stripe_account_id: string | null;
  stripe_payment_intent_id: string | null;
};

type RefundRequest = {
  id: string;
  order_id: string;
  request_id: string;
  mode: TestRefundInput['mode'];
  requested_amount_cents: number | null;
  amount_cents: number | null;
  stripe_account_id: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  refund_application_fee: boolean;
  status: string;
  first_attempt_at: string | null;
  last_error_code: string | null;
};

export class TestRefundError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 409) {
    super(message);
  }
}

const activeStates = ['reserved', 'processing', 'pending', 'requires_action', 'unknown', 'manual_review'];
const stripeTerminalStates = ['succeeded', 'failed', 'canceled'];
// Stripe can prune idempotency keys after 24 hours. Leave an hour of margin.
const retryWindowMs = 23 * 60 * 60 * 1000;
const table = 'marketplace_refund_requests';

function idOf(value: string | { id: string } | null): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function assertTestOrder(order: RefundOrder) {
  if (!order.is_test) throw new TestRefundError('REFUND_TEST_ONLY', 'Rimborsi reali non ancora abilitati.', 403);
  if (!order.stripe_account_id || !order.stripe_payment_intent_id ||
      !Number.isSafeInteger(order.amount_cents) || order.amount_cents <= 0 ||
      !Number.isSafeInteger(order.platform_fee_cents) || order.platform_fee_cents < 0 ||
      order.platform_fee_cents > order.amount_cents) {
    throw new TestRefundError('REFUND_ORDER_UNAVAILABLE', 'Ordine non rimborsabile. Contatta l’assistenza.');
  }
}

function assertCharge(order: RefundOrder, charge: Stripe.Charge) {
  if (charge.livemode || !charge.paid || !charge.captured ||
      idOf(charge.payment_intent) !== order.stripe_payment_intent_id ||
      charge.amount !== order.amount_cents || charge.amount_captured !== order.amount_cents ||
      charge.currency !== order.currency.toLowerCase() ||
      (charge.application_fee_amount ?? 0) !== order.platform_fee_cents ||
      !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < 0 ||
      charge.amount_refunded > charge.amount) {
    throw new TestRefundError('REFUND_PAYMENT_MISMATCH', 'Pagamento non corrispondente: verifica necessaria.');
  }
}

async function readCharge(stripe: Stripe, order: RefundOrder) {
  assertTestOrder(order);
  const options = { stripeAccount: order.stripe_account_id! };
  const payment = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id!, {}, options);
  if (payment.livemode || payment.status !== 'succeeded' || payment.amount_received !== order.amount_cents ||
      payment.currency !== order.currency.toLowerCase() || payment.metadata.cosmora_order_id !== order.id ||
      (payment.application_fee_amount ?? 0) !== order.platform_fee_cents || !idOf(payment.latest_charge)) {
    throw new TestRefundError('REFUND_PAYMENT_MISMATCH', 'Pagamento non corrispondente: verifica necessaria.');
  }
  const charge = await stripe.charges.retrieve(idOf(payment.latest_charge)!, {}, options);
  assertCharge(order, charge);
  return charge;
}

async function listChargeRefunds(stripe: Stripe, accountId: string, charge: Stripe.Charge) {
  const refunds: Stripe.Refund[] = [];
  let after: string | undefined;
  // Never calculate a residual from a silently truncated history.
  for (let page = 0; page < 10; page++) {
    const result = await stripe.refunds.list({ charge: charge.id, limit: 100,
      ...(after ? { starting_after: after } : {}),
    }, { stripeAccount: accountId });
    for (const refund of result.data) {
      if (idOf(refund.charge) !== charge.id || refund.currency !== charge.currency ||
          !Number.isSafeInteger(refund.amount) || refund.amount <= 0) {
        throw new TestRefundError('REFUND_HISTORY_MISMATCH', 'Storico rimborsi da verificare.');
      }
      refunds.push(refund);
    }
    if (!result.has_more) return refunds;
    after = result.data.at(-1)?.id;
    if (!after) break;
  }
  throw new TestRefundError('REFUND_HISTORY_LIMIT', 'Storico rimborsi esteso: contatta l’assistenza.');
}

function remainingBalance(charge: Stripe.Charge, refunds: Stripe.Refund[]) {
  // Pending/requires_action and unfamiliar nonterminal statuses consume the budget.
  // Failed/canceled refunds release it. The charge total is an additional lower bound.
  const committed = refunds.reduce((sum, refund) =>
    sum + (refund.status === 'failed' || refund.status === 'canceled' ? 0 : refund.amount), 0);
  if (!Number.isSafeInteger(committed) || committed > charge.amount) {
    throw new TestRefundError('REFUND_HISTORY_MISMATCH', 'Storico rimborsi da verificare.');
  }
  return Math.max(0, charge.amount - Math.max(charge.amount_refunded, committed));
}

async function readRequest(admin: SupabaseClient, id: string): Promise<RefundRequest> {
  const result = await admin.from(table).select('*').eq('id', id).single();
  if (result.error || !result.data) throw new TestRefundError('REFUND_STORAGE_UNAVAILABLE', 'Registro rimborsi non disponibile. Riprova la stessa richiesta.', 503);
  return result.data as RefundRequest;
}

async function markRequest(admin: SupabaseClient, request: RefundRequest, status: string, code: string) {
  const result = await admin.from(table).update({ status, last_error_code: code, updated_at: new Date().toISOString() })
    .eq('id', request.id).in('status', activeStates);
  if (result.error) throw new TestRefundError('REFUND_STORAGE_UNAVAILABLE', 'Registro rimborsi non disponibile. Riprova la stessa richiesta.', 503);
}

async function saveRefund(admin: SupabaseClient, request: RefundRequest, refund: Stripe.Refund) {
  if (idOf(refund.charge) !== request.stripe_charge_id ||
      idOf(refund.payment_intent) !== request.stripe_payment_intent_id ||
      refund.amount !== request.amount_cents ||
      refund.metadata?.cosmora_order_id !== request.order_id ||
      refund.metadata?.cosmora_refund_request_id !== request.request_id) {
    throw new TestRefundError('REFUND_RESULT_MISMATCH', 'Esito del rimborso da verificare. Non creare una nuova richiesta.');
  }
  const status = stripeTerminalStates.includes(refund.status ?? '') ||
    refund.status === 'pending' || refund.status === 'requires_action' ? refund.status! : 'unknown';
  const result = await admin.from(table).update({ stripe_refund_id: refund.id, status,
    last_error_code: null, updated_at: new Date().toISOString(),
  }).eq('id', request.id).in('status', activeStates);
  if (result.error) throw new TestRefundError('REFUND_STORAGE_UNAVAILABLE', 'Esito Stripe ricevuto; salvataggio non verificato. Riprova la stessa richiesta.', 503);
  // A concurrent terminal result wins over a late pending response.
  return readRequest(admin, request.id);
}

export async function getTestOrderRefundSnapshot(stripe: Stripe, order: RefundOrder) {
  const charge = await readCharge(stripe, order);
  const refunds = await listChargeRefunds(stripe, order.stripe_account_id!, charge);
  return { charge, refunds, remainingCents: remainingBalance(charge, refunds) };
}

/** Seller-only reservation is repeated atomically by the RPC; never enabled for live orders. */
export async function runTestOrderRefund({ admin, stripe, order, actorId, input }: {
  admin: SupabaseClient; stripe: Stripe; order: RefundOrder; actorId: string; input: TestRefundInput;
}) {
  assertTestOrder(order);
  if (actorId !== order.seller_id) throw new TestRefundError('REFUND_FORBIDDEN', 'Solo il venditore può autorizzare il rimborso.', 403);
  const reserved = await admin.rpc('cosmora_reserve_test_refund', {
    p_order_id: order.id, p_actor_id: actorId, p_request_id: input.requestId,
    p_mode: input.mode, p_requested_amount_cents: input.mode === 'partial' ? input.amountCents : null,
  });
  if (reserved.error) {
    const codes: Record<string, string> = {
      REFUND_IN_PROGRESS: 'Un rimborso è già in corso. Riprendi la richiesta esistente prima di crearne un’altra.',
      REFUND_REQUEST_CONFLICT: 'Questo identificativo è già associato a un altro importo o tipo di rimborso.',
      REFUND_ORDER_UNAVAILABLE: 'Ordine non rimborsabile. Aggiorna lo stato o contatta l’assistenza.',
      REFUND_FORBIDDEN: 'Solo il venditore può autorizzare il rimborso.',
      REFUND_TEST_ONLY: 'Rimborsi reali non ancora abilitati.',
      REFUND_INVALID_REQUEST: 'Controlla importo e tipo di rimborso.',
    };
    const code = Object.keys(codes).find((value) => reserved.error!.message.includes(value));
    throw new TestRefundError(code ?? 'REFUND_STORAGE_UNAVAILABLE', code ? codes[code] : 'Registro rimborsi non disponibile. Nessun nuovo rimborso inviato.', code ? 409 : 503);
  }
  let entry = reserved.data as RefundRequest;
  if (!entry?.id) throw new TestRefundError('REFUND_STORAGE_UNAVAILABLE', 'Registro rimborsi non disponibile.', 503);
  if (entry.status === 'rejected') throw new TestRefundError(entry.last_error_code ?? 'REFUND_REJECTED', 'Richiesta non eseguita: aggiorna lo stato e crea una nuova richiesta solo dopo averne verificato il motivo.');

  // Known refunds are only retrieved; their request ID can never issue another refund.
  if (entry.stripe_refund_id) {
    const refund = await stripe.refunds.retrieve(entry.stripe_refund_id, {}, { stripeAccount: entry.stripe_account_id });
    entry = await saveRefund(admin, entry, refund);
  } else {
    const snapshot = await getTestOrderRefundSnapshot(stripe, order);
    const matches = snapshot.refunds.filter((refund) => refund.metadata?.cosmora_refund_request_id === entry.request_id &&
      refund.metadata?.cosmora_order_id === order.id);
    if (matches.length > 1) throw new TestRefundError('REFUND_DUPLICATE_HISTORY', 'Più rimborsi associati alla richiesta: verifica necessaria.');
    if (matches.length === 1) {
      entry = await saveRefund(admin, entry, matches[0]);
    } else {
      if (stripeTerminalStates.includes(entry.status)) throw new TestRefundError('REFUND_RESULT_MISMATCH', 'Esito persistente da verificare. Non creare una nuova richiesta.');
      if (entry.status === 'reserved') {
        const amount = input.mode === 'partial' ? input.amountCents! : snapshot.remainingCents;
        if (!Number.isSafeInteger(amount) || amount <= 0 || amount > snapshot.remainingCents || snapshot.charge.disputed) {
          const rejected = await admin.from(table).update({ status: 'rejected', last_error_code: 'REFUND_AMOUNT_UNAVAILABLE', updated_at: new Date().toISOString() })
            .eq('id', entry.id).eq('status', 'reserved').select('id').maybeSingle();
          if (rejected.error) throw new TestRefundError('REFUND_STORAGE_UNAVAILABLE', 'Registro rimborsi non disponibile. Riprova la stessa richiesta.', 503);
          if (!rejected.data) throw new TestRefundError('REFUND_IN_PROGRESS', 'Richiesta in elaborazione. Riprova con lo stesso identificativo.');
          throw new TestRefundError('REFUND_AMOUNT_UNAVAILABLE', 'Importo superiore al residuo disponibile oppure pagamento contestato. Aggiorna lo stato.');
        }
        // Freeze the exact parameters and first-attempt clock before any Stripe POST.
        const prepared = await admin.from(table).update({ amount_cents: amount, stripe_charge_id: snapshot.charge.id,
          status: 'processing', first_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', entry.id).eq('status', 'reserved').select('*').maybeSingle();
        if (prepared.error) throw new TestRefundError('REFUND_STORAGE_UNAVAILABLE', 'Registro rimborsi non disponibile. Nessun nuovo rimborso inviato.', 503);
        if (!prepared.data) {
          // The competing worker owns the frozen plan; do not use this stale snapshot.
          throw new TestRefundError('REFUND_IN_PROGRESS', 'Richiesta in elaborazione. Riprova con lo stesso identificativo.');
        }
        entry = prepared.data as RefundRequest;
      }
      const age = Date.now() - Date.parse(entry.first_attempt_at ?? '');
      if (!Number.isFinite(age) || age < 0 || age >= retryWindowMs || entry.status === 'manual_review') {
        await markRequest(admin, entry, 'manual_review', 'REFUND_RETRY_WINDOW_EXPIRED');
        throw new TestRefundError('REFUND_RETRY_WINDOW_EXPIRED', 'Esito incerto oltre la finestra sicura: verifica con l’assistenza. Nessun nuovo rimborso inviato.');
      }
      if (!entry.amount_cents || !entry.stripe_charge_id || entry.stripe_charge_id !== snapshot.charge.id) {
        throw new TestRefundError('REFUND_PAYMENT_MISMATCH', 'Pagamento non corrispondente: verifica necessaria.');
      }
      // The connected account scopes both the charge and the idempotency key. Stripe
      // enforces the charge's remaining balance if an external refund raced this one.
      const refund = await stripe.refunds.create({ charge: entry.stripe_charge_id, amount: entry.amount_cents,
        refund_application_fee: entry.refund_application_fee,
        metadata: { cosmora_order_id: order.id, cosmora_refund_request_id: entry.request_id },
      }, { stripeAccount: entry.stripe_account_id, idempotencyKey: 'cosmora-test-refund-' + entry.id });
      entry = await saveRefund(admin, entry, refund);
    }
  }
  const current = await getTestOrderRefundSnapshot(stripe, order);
  return { requestId: entry.request_id, refundId: entry.stripe_refund_id, status: entry.status,
    amountCents: entry.amount_cents, remainingCents: current.remainingCents, isTest: true as const,
    charge: current.charge, refunds: current.refunds, accountId: entry.stripe_account_id };
}
