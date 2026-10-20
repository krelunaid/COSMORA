'use client';
import { apiFetch } from '@/lib/api-fetch';
import { paymentsEnabled } from '@/lib/release-features';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from '@/components/app-link';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { accountHttp, AccountRequestError } from '@/lib/account-http';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { openHostedStripePage, usesNativeStripeBrowser } from '@/lib/stripe-browser';
import { useI18n } from '@/components/i18n-provider';
import { useMemo } from 'react';
import {
  checkoutText,
  checkoutErrorText,
  type CheckoutKey,
} from '@/lib/i18n/checkout';
import { orderStatusLabel } from '@/lib/order-status';
function useCheckoutText() {
  const { locale } = useI18n();
  return useMemo(
    () => ({
      locale,
      t: (key: CheckoutKey) => checkoutText(locale, key),
      cents: (value: number, currency = 'EUR') =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        }).format(value / 100),
    }),
    [locale],
  );
}
type Listing = {
  id: string;
  title: string;
  sale_price_cents: number | null;
  sale_mode: string;
  shipping_mode: string | null;
  shipping_method: string | null;
  shipping_cost_cents: number | null;
  shipping_time: string | null;
};
type Order = {
  id: string;
  item_title: string;
  status: string;
  is_test: boolean;
  amount_cents: number;
  currency: string;
  role: 'buyer' | 'seller';
  fulfillment_status: string;
  fulfillment_version: number;
  carrier: string | null;
  tracking_number: string | null;
  issue_reason: string | null;
  issue_opened_at: string | null;
  amounts?: {
    itemCents: number; shippingCents: number; platformFeeCents: number;
    sellerBeforeProcessingFeesCents: number; refundedCents: number; remainingCents: number;
  };
  refundRequest?: { requestId: string; mode: 'partial' | 'remaining'; requestedAmountCents: number | null; status: string } | null;
  dispute?: { status: string; amountCents: number } | null;
};

function hasOpenDispute(order: Order) {
  return Boolean(order.dispute && !['won', 'lost', 'warning_closed', 'prevented'].includes(order.dispute.status));
}
function paymentActionsSuspended(order: Order) {
  return hasOpenDispute(order) || order.dispute?.status === 'lost';
}
function hasVerifiedPaymentDetails(order: Order) {
  return Boolean(order.amounts) && order.refundRequest !== undefined && order.dispute !== undefined;
}
export default function CheckoutPage() {
  const { t } = useCheckoutText();
  const params = useSearchParams(),
    slug = params.get('listing'),
    orderId = params.get('order');
  if (!paymentsEnabled && !orderId)
    return (
      <MobileShell>
        <ScreenHeader title={t('disabled')} back="/marketplace" />
        <section className="space-y-4 p-5">
          <p>{t('disabledHint')}</p>
          <Link
            href="/marketplace"
            className="block rounded-xl bg-violet-600 p-3 text-center"
          >
            {t('back')}
          </Link>
        </section>
        <MobileNav active="explore" />
      </MobileShell>
    );
  return (
    <CheckoutContent key={slug + ':' + orderId} slug={slug} orderId={orderId} />
  );
}
function CheckoutContent({
  slug,
  orderId,
}: {
  slug: string | null;
  orderId: string | null;
}) {
  const { t, cents, locale } = useCheckoutText();
  const [listing, setListing] = useState<Listing | null>(null),
    [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState<Error | string>(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  function retryVerification() {
    setError('');
    setLoading(true);
    setRetry((value) => value + 1);
  }
  useEffect(() => {
    let active = true;
    const task = orderId
      ? accountRequest<{ order: Order }>('/api/orders/' + orderId).then((v) => {
          if (active) setOrder(v.order);
        })
      : slug
        ? apiFetch('/api/listings?slug=' + encodeURIComponent(slug)).then(
            async (r) => {
              const v = (await r.json()) as { listings?: Listing[] };
              if (!r.ok || !v.listings?.length)
                throw new Error('Annuncio non disponibile.');
              if (active) setListing(v.listings[0]);
            },
          )
        : Promise.resolve();
    task
      .catch((e) => {
        if (active) setError(e instanceof Error ? e : 'Riprova.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, orderId, retry]);
  return (
    <MobileShell>
      <ScreenHeader
        title={orderId ? t('orderStatus') : t('checkout')}
        back={paymentsEnabled ? '/cart' : '/marketplace'}
      />
      <div className="space-y-5 p-5">
        <p className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4 text-base leading-relaxed text-amber-100">
          {t(orderId ? 'historicalNotice' : 'notice')}
        </p>
        {loading && <output>{t('verifying')}</output>}
        {error && (
          <div role="alert">
            <p>{checkoutErrorText(locale, error)}</p>
            <button disabled={loading || busy}
              className="min-h-12 text-pink-300"
              onClick={retryVerification}
            >
              {t('retry')}
            </button>
            {error instanceof AccountRequestError && error.status === 401 && <Link className="ml-4 text-pink-300" href="/auth/login">{t('login')}</Link>}
          </div>
        )}
        {order && (
          <section className="space-y-3 rounded-2xl border border-white/15 p-5">
            <h2 className="text-xl font-semibold">
              {order.item_title || t('orderName')}
            </h2>
            <p>{t('originalTotal')}: {cents(order.amount_cents, order.currency)}</p>
            <p className="text-lg text-pink-200">
              {order.dispute?.status === 'lost' ? t('disputeLostStatus') : hasOpenDispute(order) ? t('disputedStatus') : orderStatusLabel(order.status, locale)}
              {order.is_test ? ' · TEST' : ''}
            </p>
            <p className="break-all text-sm text-white/60">
              {t('order')} {order.id}
            </p>
            {(loading || error) && <p role="status" className="rounded-xl border border-amber-300/30 p-3 text-amber-100">{t('staleOrder')}</p>}
            <OrderAmounts order={order} />
            {order.dispute && <aside className="space-y-2 rounded-xl border border-amber-300/40 p-3">
              <p>{t(hasOpenDispute(order) ? 'disputeOpen' : order.dispute.status === 'won' ? 'disputeWon' : order.dispute.status === 'lost' ? 'disputeLost' : 'disputeClosed')}</p>
              <p>{t('disputedAmount')}: {cents(order.dispute.amountCents, order.currency)}</p>
            </aside>}
            <OrderFulfillment order={order} refresh={retryVerification} disabled={loading || Boolean(error) || busy} onBusyChange={setBusy} />
            <a
              className="block min-h-12 py-3 text-pink-300 underline"
              href={
                'mailto:info@kreluna.it?subject=' +
                encodeURIComponent(
                  'COSMORA · ' + t('reportOrder') + ' · ' + order.id,
                )
              }
            >
              {t('reportOrder')}
            </a>
              <button
                disabled={loading || busy}
                className="min-h-12 rounded-xl border border-white/20 px-4 disabled:opacity-50"
                onClick={retryVerification}
              >
                {t('update')}
              </button>
              <Link
                className="block py-3 text-pink-300"
                href="/inbox?tab=orders"
              >
                {t('allOrders')}
              </Link>
          </section>
        )}
        {listing && (
          <section className="space-y-4 rounded-2xl border border-white/15 p-5">
            <h2 className="text-xl font-semibold">{listing.title}</h2>
            <p>{t('quantity')}</p>
            <p className="text-2xl text-pink-300">
              {listing.sale_price_cents !== null
                ? cents(
                    listing.sale_price_cents +
                      (listing.shipping_cost_cents ?? 0),
                  )
                : t('rental')}
            </p>
            <p className="text-base text-white/70">
              {listing.shipping_cost_cents !== null ? (
                <>
                  {t('delivery')} {cents(listing.shipping_cost_cents)} ·{' '}
                  {listing.shipping_method}. {listing.shipping_time}.{' '}
                  {t('deliveryHint')}
                </>
              ) : (
                t('noDelivery')
              )}
            </p>
            {listing.sale_mode !== 'rent' &&
              listing.shipping_cost_cents !== null &&
              listing.sale_price_cents !== null && (
                <CheckoutLaunch key={listing.id} listingId={listing.id} />
              )}
          </section>
        )}
        {!loading && !error && !listing && !order && (
          <p>
            {t('choose')}{' '}
            <Link className="text-pink-300 underline" href="/cart">
              {t('cart')}
            </Link>{' '}
            {t('chooseEnd')}
          </p>
        )}
      </div>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

function formText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

type CheckoutAttempt = { userId: string; storageKey: string; checkoutKey: string | null };

function CheckoutLaunch({ listingId }: { listingId: string }) {
  const { t, locale } = useCheckoutText();
  const router = useRouter();
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recheck, setRecheck] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [localError, setLocalError] = useState<CheckoutKey | null>(null);
  const viewer = useRef<string | null>(null);
  const posting = useRef(false);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    let active = true, revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    setAttempt(null);
    setError(null);
    setLocalError(null);
    async function recover() {
      const currentRevision = ++revision;
      try {
        if (!client) throw new Error('Accesso non disponibile. Riprova più tardi.');
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new AccountRequestError('Accedi per continuare.', 401, 'AUTH_REQUIRED');
        const session = data.session;
        const { data: identity, error: identityError } = await client.auth.getUser(session.access_token);
        if (identityError || !identity.user || identity.user.id !== session.user.id) throw new Error('Account non verificato.');
        if (!active || revision !== currentRevision) return;
        const storageKey = 'cosmora_test_checkout_' + identity.user.id + '_' + listingId;
        let checkoutKey: string | null;
        try {
          checkoutKey = window.localStorage.getItem(storageKey);
          if (checkoutKey && !uuidPattern.test(checkoutKey)) throw new Error('Invalid saved checkout attempt');
        } catch {
          setLocalError('checkoutStorageFailed');
          return;
        }
        viewer.current = identity.user.id;
        setAttempt({ userId: identity.user.id, storageKey, checkoutKey });
      } catch (reason) {
        if (active && revision === currentRevision) setError(reason instanceof Error ? reason : new Error('Account non verificato.'));
      } finally {
        if (active && revision === currentRevision) setReady(true);
      }
    }
    const subscription = client?.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (userId === viewer.current) return;
      viewer.current = userId;
      ++revision;
      setReady(false);
      setAttempt(null);
      setError(null);
      setLocalError(null);
      clearTimeout(timer);
      timer = setTimeout(() => { void recover(); }, 0);
    });
    void recover();
    return () => {
      active = false;
      ++revision;
      clearTimeout(timer);
      subscription?.data.subscription.unsubscribe();
    };
  }, [listingId, recheck]);

  async function openCheckout() {
    if (!paymentsEnabled || posting.current || busy || !ready || !attempt || localError) return;
    posting.current = true;
    setBusy(true);
    setError(null);
    setLocalError(null);
    let checkoutKey: string | null = null;
    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Accesso non disponibile. Riprova più tardi.');
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) throw new AccountRequestError('Accedi per continuare.', 401, 'AUTH_REQUIRED');
      if (data.session.user.id !== attempt.userId || viewer.current !== attempt.userId) {
        setLocalError('checkoutAccountChanged');
        return;
      }
      // Persist first. Every retry uses this user's same attempt and listing.
      try {
        const stored = window.localStorage.getItem(attempt.storageKey);
        if (attempt.checkoutKey && stored !== attempt.checkoutKey) throw new Error('Checkout attempt changed');
        if (stored && !uuidPattern.test(stored)) throw new Error('Invalid saved checkout attempt');
        checkoutKey = stored || crypto.randomUUID();
        window.localStorage.setItem(attempt.storageKey, checkoutKey);
        if (window.localStorage.getItem(attempt.storageKey) !== checkoutKey) throw new Error('Checkout storage unavailable');
        setAttempt({ ...attempt, checkoutKey });
      } catch {
        setLocalError('checkoutStorageFailed');
        return;
      }
      const result = await accountHttp<{ url: string; orderId: string; isTest: boolean }>('/api/stripe/checkout', {
        method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, checkoutKey }), cache: 'no-store',
      });
      if (result.isTest !== true || typeof result.orderId !== 'string' || !uuidPattern.test(result.orderId))
        throw new Error('Risposta checkout non valida.');
      const latest = await client.auth.getSession();
      if (latest.error || latest.data.session?.user.id !== attempt.userId || viewer.current !== attempt.userId) {
        setLocalError('checkoutAccountChanged');
        return;
      }
      await openHostedStripePage(result.url, 'checkout');
      if (usesNativeStripeBrowser()) router.replace('/checkout?order=' + result.orderId);
    } catch (reason) {
      const exception = reason instanceof Error ? reason : new Error('Checkout non verificato.');
      if (exception instanceof AccountRequestError && exception.code === 'CHECKOUT_ATTEMPT_TERMINAL' && checkoutKey) {
        try {
          if (window.localStorage.getItem(attempt.storageKey) !== checkoutKey) throw new Error('Checkout attempt changed');
          window.localStorage.removeItem(attempt.storageKey);
          if (window.localStorage.getItem(attempt.storageKey) !== null) throw new Error('Checkout storage unavailable');
          setAttempt((current) => current?.userId === attempt.userId ? { ...current, checkoutKey: null } : current);
        } catch {
          setLocalError('checkoutStorageCleanupFailed');
        }
      }
      setError(exception);
    } finally {
      posting.current = false;
      setBusy(false);
    }
  }

  return <div className="space-y-3">
    {attempt?.checkoutKey && <p className="text-sm text-amber-100">{t('checkoutResumeHint')}</p>}
    <button disabled={busy || !ready || !attempt || Boolean(localError)} onClick={() => void openCheckout()}
      className="min-h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 p-3 text-base font-semibold disabled:opacity-50">
      {busy ? t('opening') : !ready ? t('verifying') : t('stripe')}
    </button>
    {localError && <p role="alert" className="text-rose-300">{t(localError)}</p>}
    {error && <p role="alert" className="text-rose-300">{checkoutErrorText(locale, error)}</p>}
    {(localError || error) && <div className="flex flex-wrap gap-4">
      <button disabled={busy} className="min-h-12 text-pink-300 disabled:opacity-50" onClick={() => setRecheck((value) => value + 1)}>{t('retry')}</button>
      {error instanceof AccountRequestError && error.status === 401 && <Link className="py-3 text-pink-300" href="/auth/login">{t('login')}</Link>}
      <Link className="py-3 text-pink-300" href="/inbox?tab=orders">{t('allOrders')}</Link>
    </div>}
  </div>;
}

function OrderAmounts({ order }: { order: Order }) {
  const { t, cents } = useCheckoutText();
  const amounts = order.amounts;
  if (!amounts) return <p className="text-sm text-amber-100">{t('amountsUnavailable')}</p>;
  const rows: Array<[CheckoutKey, number]> = [
    ['itemAmount', amounts.itemCents], ['shippingAmount', amounts.shippingCents],
    ['originalTotal', order.amount_cents], ['refundedAmount', amounts.refundedCents],
  ];
  if (order.is_test) rows.push(['remainingAmount', amounts.remainingCents]);
  if (order.role === 'seller') rows.splice(3, 0,
    ['platformFee', amounts.platformFeeCents], ['sellerBeforeFees', amounts.sellerBeforeProcessingFeesCents]);
  return <section className="space-y-3 border-t border-white/15 pt-4">
    <h3 className="font-semibold">{t('amountsTitle')}</h3>
    <dl className="space-y-2">{rows.map(([label, amount]) => <div key={label} className="flex items-start justify-between gap-4">
      <dt>{t(label)}</dt><dd className="shrink-0">{cents(amount, order.currency)}</dd>
    </div>)}</dl>
    {order.role === 'seller' && <p className="text-sm text-white/65">{t('sellerFeeHint')}</p>}
    {order.is_test && <p className="text-sm text-white/65">{t('remainingHint')}</p>}
  </section>;
}

function OrderFulfillment({
  order,
  refresh,
  disabled,
  onBusyChange,
}: {
  order: Order;
  refresh: () => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t, locale } = useCheckoutText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | string>('');
  const canAct = order.is_test && order.status === 'paid' && hasVerifiedPaymentDetails(order) && !paymentActionsSuspended(order) && !order.refundRequest;
  const actionsDisabled = disabled || busy || !canAct;
  async function act(action: Record<string, string>) {
    if (actionsDisabled) return;
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      await accountRequest('/api/orders/' + order.id, {
        method: 'PATCH',
        body: JSON.stringify({ ...action, version: order.fulfillment_version }),
      });
    } catch (e) {
      setError(e instanceof Error ? e : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
      onBusyChange(false);
      refresh();
    }
  }
  return (
    <div className="space-y-4 border-t border-white/15 pt-4 text-base">
      <h3 className="text-lg font-semibold">{t(order.is_test ? 'testDelivery' : 'deliveryDetails')}</h3>
      <p>
        {order.fulfillment_status === 'delivered'
          ? t('delivered')
          : order.fulfillment_status === 'shipped'
            ? t('shipped')
            : order.fulfillment_status === 'awaiting_shipment' ? t('awaiting') : t('notShipped')}
      </p>
      {order.tracking_number && (
        <p className="break-words">
          {order.carrier} · {order.tracking_number}
        </p>
      )}
      {order.issue_opened_at && (
        <div className="rounded-xl border border-amber-300/40 p-3">
          <p className="font-semibold">{t('reported')}</p>
          <p className="whitespace-pre-wrap break-words">
            {order.issue_reason}
          </p>
          <p className="mt-2">{t('reportHint')}</p>
        </div>
      )}
      {canAct && order.role === 'seller' &&
        order.fulfillment_status === 'awaiting_shipment' &&
        !order.issue_opened_at && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (actionsDisabled) return;
              void act({
                action: 'ship',
                carrier: formText(form, 'carrier'),
                trackingNumber: formText(form, 'tracking'),
              });
            }}
          >
            <label className="block">
              {t('carrier')}
              <input
                name="carrier"
                disabled={actionsDisabled}
                required
                minLength={2}
                maxLength={80}
                className="mt-1 block min-h-12 w-full rounded-xl border border-white/20 bg-white/5 p-3"
              />
            </label>
            <label className="block">
              {t('tracking')}
              <input
                name="tracking"
                disabled={actionsDisabled}
                required
                minLength={3}
                maxLength={120}
                className="mt-1 block min-h-12 w-full rounded-xl border border-white/20 bg-white/5 p-3"
              />
            </label>
            <button
              disabled={actionsDisabled}
              className="min-h-12 rounded-xl bg-violet-600 px-4 disabled:opacity-50"
            >
              {t('ship')}
            </button>
          </form>
        )}
      {canAct && order.role === 'buyer' && order.fulfillment_status === 'shipped' && (
        <button
          disabled={actionsDisabled}
          onClick={() => void act({ action: 'received' })}
          className="min-h-12 rounded-xl bg-violet-600 px-4 disabled:opacity-50"
        >
          {t('receive')}
        </button>
      )}
      {canAct && order.role === 'buyer' && !order.issue_opened_at && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void act({ action: 'report', reason: formText(form, 'reason') });
          }}
        >
          <label className="block">
            {t('report')}
            <textarea
              disabled={actionsDisabled}
              name="reason"
              required
              minLength={10}
              maxLength={2000}
              rows={3}
              placeholder={t('describe')}
              className="mt-1 block w-full rounded-xl border border-white/20 bg-white/5 p-3"
            />
          </label>
          <button
            disabled={actionsDisabled}
            className="min-h-12 rounded-xl border border-pink-300/50 px-4 text-pink-200 disabled:opacity-50"
          >
            {t('sendReport')}
          </button>
        </form>
      )}
      {order.is_test && order.role === 'seller' && <TestRefundForm key={order.id} order={order} refresh={refresh} disabled={disabled || busy} onBusyChange={onBusyChange} />}
      {busy && <output>{t('saving')}</output>}
      {error && (
        <p role="alert" className="text-rose-300">
          {checkoutErrorText(locale, error)}
        </p>
      )}
    </div>
  );
}

type RefundDraft = { requestId: string; mode: 'partial' | 'remaining'; amountCents?: number };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validRefundDraft(value: unknown): value is RefundDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<RefundDraft>;
  return typeof draft.requestId === 'string' && uuidPattern.test(draft.requestId) &&
    (draft.mode === 'remaining' || (draft.mode === 'partial' && Number.isSafeInteger(draft.amountCents) && draft.amountCents! > 0));
}

function euroInputCents(value: string) {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function TestRefundForm({ order, refresh, disabled, onBusyChange }: {
  order: Order; refresh: () => void; disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const { t, locale, cents } = useCheckoutText();
  const [draft, setDraft] = useState<RefundDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [mode, setMode] = useState<'partial' | 'remaining'>('remaining');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [localError, setLocalError] = useState<CheckoutKey | null>(null);
  const [notice, setNotice] = useState<CheckoutKey | null>(null);
  const posting = useRef(false);
  const storageKey = 'cosmora_test_refund_' + order.id;
  const remote = order.refundRequest;
  // Recover the same immutable request after an app restart or uncertain response.
  useEffect(() => {
    try {
      const remoteDraft: RefundDraft | null = remote ? {
        requestId: remote.requestId, mode: remote.mode,
        ...(remote.mode === 'partial' ? { amountCents: remote.requestedAmountCents ?? undefined } : {}),
      } : null;
      const stored = remoteDraft ?? (() => {
        const value = window.localStorage.getItem(storageKey);
        return value ? JSON.parse(value) as unknown : null;
      })();
      if (stored && !validRefundDraft(stored)) throw new Error('Invalid saved refund request');
      if (remoteDraft) {
        window.localStorage.setItem(storageKey, JSON.stringify(remoteDraft));
        if (window.localStorage.getItem(storageKey) !== JSON.stringify(remoteDraft)) throw new Error('Refund storage unavailable');
      }
      setDraft(stored ? {
        requestId: (stored as RefundDraft).requestId,
        mode: (stored as RefundDraft).mode,
        ...((stored as RefundDraft).mode === 'partial' ? { amountCents: (stored as RefundDraft).amountCents } : {}),
      } : null);
      setStorageBlocked(false);
      setLocalError((current) => current === 'refundStorageFailed' ? null : current);
    } catch {
      setStorageBlocked(true);
      setLocalError('refundStorageFailed');
    } finally { setReady(true); }
  }, [storageKey, remote?.requestId, remote?.mode, remote?.requestedAmountCents]);

  const remaining = order.amounts?.remainingCents;
  const manualReview = remote?.status === 'manual_review' || remote?.status === 'requires_action';
  const euroOrder = order.currency.toUpperCase() === 'EUR';
  const unavailable = disabled || busy || !ready || storageBlocked || !hasVerifiedPaymentDetails(order) || !euroOrder || paymentActionsSuspended(order) || manualReview;
  const canStart = ['paid', 'partially_refunded'].includes(order.status) && typeof remaining === 'number' && remaining > 0;
  const canResume = Boolean(draft) && ['paid', 'partially_refunded', 'refunded'].includes(order.status);

  function clearConfirmedRequest() {
    try {
      window.localStorage.removeItem(storageKey);
      if (window.localStorage.getItem(storageKey)) throw new Error('Refund storage unavailable');
      setDraft(null);
    } catch {
      setStorageBlocked(true);
      setLocalError('refundStorageCleanupFailed');
    }
  }

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (posting.current || unavailable || (!canStart && !canResume)) return;
    setError(null);
    setLocalError(null);
    setNotice(null);
    let request = draft;
    if (!request) {
      if (new FormData(event.currentTarget).get('confirmRefund') !== 'on') {
        setLocalError('refundConfirmationRequired');
        return;
      }
      const amountCents = mode === 'partial' ? euroInputCents(amount) : null;
      if (mode === 'partial' && (amountCents === null || remaining === undefined || amountCents > remaining)) {
        setLocalError('refundAmountInvalid');
        return;
      }
      try {
        request = { requestId: crypto.randomUUID(), mode,
          ...(mode === 'partial' ? { amountCents: amountCents! } : {}),
        };
      } catch {
        setLocalError('error');
        return;
      }
    }
    // A failed persistence check stops before sending anything to the server.
    try {
      const serialized = JSON.stringify(request);
      window.localStorage.setItem(storageKey, serialized);
      if (window.localStorage.getItem(storageKey) !== serialized) throw new Error('Refund storage unavailable');
      setDraft(request);
    } catch {
      setStorageBlocked(true);
      setLocalError('refundStorageFailed');
      return;
    }
    posting.current = true;
    setBusy(true);
    onBusyChange(true);
    try {
      const result = await accountRequest<{ requestId: string; status: string }>('/api/orders/' + order.id + '/refund', {
        method: 'POST', body: JSON.stringify({ ...request, confirmRefund: true }),
      });
      if (result.requestId !== request.requestId) throw new Error('Refund response mismatch');
      if (['succeeded', 'failed', 'canceled', 'rejected'].includes(result.status)) {
        clearConfirmedRequest();
        setNotice(result.status === 'succeeded' ? 'refunded' : 'refundFailed');
      } else {
        setNotice('refundPending');
      }
    } catch (reason) {
      const exception = reason instanceof Error ? reason : new Error('Refund result unavailable');
      if (exception instanceof AccountRequestError && exception.code === 'REFUND_TERMINAL_REJECTED') {
        clearConfirmedRequest();
        setNotice('refundFailed');
      } else {
        setError(exception);
      }
    } finally {
      posting.current = false;
      setBusy(false);
      onBusyChange(false);
      refresh();
    }
  }

  return <section className="space-y-3 rounded-xl border border-white/20 p-3">
    <h3 className="font-semibold">{t('refundTitle')}</h3>
    {remote && <p role="status" className="text-amber-100">{t(manualReview ? 'refundNeedsReview' : 'refundWorking')}</p>}
    {draft && <p className="text-sm text-amber-100">{t('refundLocked')}</p>}
    {!hasVerifiedPaymentDetails(order) && <p className="text-sm text-amber-100">{t('amountsUnavailable')}</p>}
    {!euroOrder && <p className="text-sm text-amber-100">{t('refundUnavailable')}</p>}
    {(canStart || draft) && <form noValidate className="space-y-3" onSubmit={(event) => void submit(event)}>
      <label className="block">{t('refundMode')}
        <select value={draft?.mode ?? mode} disabled={unavailable || Boolean(draft)} onChange={(event) => setMode(event.target.value as 'partial' | 'remaining')} className="checkout-input mt-2">
          <option value="remaining">{t('refundRemaining')}</option>
          <option value="partial">{t('refundPartial')}</option>
        </select>
      </label>
      {(draft?.mode ?? mode) === 'partial' && <label className="block">{t('refundAmount')}
        <input type="text" inputMode="decimal" required value={draft?.amountCents !== undefined ? String(draft.amountCents / 100) : amount}
          disabled={unavailable || Boolean(draft)} onChange={(event) => setAmount(event.target.value)} className="checkout-input mt-2" />
      </label>}
      {draft?.mode === 'partial' && draft.amountCents !== undefined && <p>{t('refundAmount')}: {cents(draft.amountCents)}</p>}
      {!draft && <label className="flex items-start gap-3">
        <input type="checkbox" name="confirmRefund" required disabled={unavailable} className="mt-1 size-5 shrink-0" />{t('refundRequestConfirm')}
      </label>}
      <button disabled={unavailable || (!canStart && !canResume)} className="min-h-12 rounded-xl border border-pink-300/50 px-4 text-pink-200 disabled:opacity-50">
        {busy ? t('saving') : t(draft ? 'refundResume' : 'refund')}
      </button>
    </form>}
    {notice && <output>{t(notice)}</output>}
    {localError && <p role="alert" className="text-rose-300">{t(localError)}</p>}
    {error && <p role="alert" className="text-rose-300">{checkoutErrorText(locale, error)}</p>}
  </section>;
}
