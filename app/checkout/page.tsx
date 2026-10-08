'use client';
import { apiFetch } from '@/lib/api-fetch';
import { paymentsEnabled } from '@/lib/release-features';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from '@/components/app-link';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
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
      cents: (value: number) =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'EUR',
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
  role: 'buyer' | 'seller';
  fulfillment_status: string;
  fulfillment_version: number;
  carrier: string | null;
  tracking_number: string | null;
  issue_reason: string | null;
  issue_opened_at: string | null;
};
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
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const key = useRef<string | null>(null);
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
        if (active) setError(e.message);
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
          {t('notice')}
        </p>
        {loading && <output>{t('verifying')}</output>}
        {error && (
          <div role="alert">
            <p>{checkoutErrorText(locale, error)}</p>
            <button
              className="min-h-12 text-pink-300"
              onClick={retryVerification}
            >
              {t('retry')}
            </button>
            <Link className="ml-4 text-pink-300" href="/auth/login">
              {t('login')}
            </Link>
          </div>
        )}
        {order && (
          <section className="space-y-3 rounded-2xl border border-white/15 p-5">
            <h2 className="text-xl font-semibold">
              {order.item_title || t('orderName')}
            </h2>
            <p>{cents(order.amount_cents)}</p>
            <p className="text-lg text-pink-200">
              {orderStatusLabel(order.status, locale)}
              {order.is_test ? ' · TEST' : ''}
            </p>
            <p className="break-all text-sm text-white/60">
              {t('order')} {order.id}
            </p>
            <OrderFulfillment order={order} refresh={retryVerification} />
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
            {order.status === 'pending' && (
              <button
                className="min-h-12 rounded-xl border border-white/20 px-4"
                onClick={retryVerification}
              >
                {t('update')}
              </button>
            )}
            {paymentsEnabled && (
              <Link
                className="block py-3 text-pink-300"
                href="/inbox?tab=orders"
              >
                {t('allOrders')}
              </Link>
            )}
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
                <button
                  disabled={busy}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 p-3 text-base font-semibold disabled:opacity-50"
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    key.current ??= crypto.randomUUID();
                    try {
                      const result = await accountRequest<{ url: string }>(
                        '/api/stripe/checkout',
                        {
                          method: 'POST',
                          body: JSON.stringify({
                            listingId: listing.id,
                            checkoutKey: key.current,
                          }),
                        },
                      );
                      const target = new URL(result.url);
                      if (
                        target.protocol !== 'https:' ||
                        target.hostname !== 'checkout.stripe.com'
                      )
                        throw new Error('Destinazione Stripe non valida.');
                      window.location.assign(target.href);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Riprova.');
                      setBusy(false);
                    }
                  }}
                >
                  {' '}
                  {busy ? t('opening') : t('stripe')}{' '}
                </button>
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
function OrderFulfillment({
  order,
  refresh,
}: {
  order: Order;
  refresh: () => void;
}) {
  const { t, locale } = useCheckoutText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function act(action: Record<string, string>) {
    setBusy(true);
    setError('');
    try {
      await accountRequest('/api/orders/' + order.id, {
        method: 'PATCH',
        body: JSON.stringify({ ...action, version: order.fulfillment_version }),
      });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  }
  if (!order.is_test || order.status !== 'paid') return null;
  return (
    <div className="space-y-4 border-t border-white/15 pt-4 text-base">
      <h3 className="text-lg font-semibold">{t('testDelivery')}</h3>
      <p>
        {order.fulfillment_status === 'delivered'
          ? t('delivered')
          : order.fulfillment_status === 'shipped'
            ? t('shipped')
            : t('awaiting')}
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
      {order.role === 'seller' &&
        order.fulfillment_status === 'awaiting_shipment' &&
        !order.issue_opened_at && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
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
                required
                minLength={3}
                maxLength={120}
                className="mt-1 block min-h-12 w-full rounded-xl border border-white/20 bg-white/5 p-3"
              />
            </label>
            <button
              disabled={busy}
              className="min-h-12 rounded-xl bg-violet-600 px-4 disabled:opacity-50"
            >
              {t('ship')}
            </button>
          </form>
        )}
      {order.role === 'buyer' && order.fulfillment_status === 'shipped' && (
        <button
          disabled={busy}
          onClick={() => void act({ action: 'received' })}
          className="min-h-12 rounded-xl bg-violet-600 px-4 disabled:opacity-50"
        >
          {t('receive')}
        </button>
      )}
      {order.role === 'buyer' && !order.issue_opened_at && (
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
            disabled={busy}
            className="min-h-12 rounded-xl border border-pink-300/50 px-4 text-pink-200 disabled:opacity-50"
          >
            {t('sendReport')}
          </button>
        </form>
      )}
      {order.role === 'seller' && (
        <form
          className="space-y-3 rounded-xl border border-white/20 p-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            setNotice('');
            try {
              const result = await accountRequest<{ status: string }>(
                '/api/orders/' + order.id + '/refund',
                {
                  method: 'POST',
                  body: JSON.stringify({ confirmFullRefund: true }),
                },
              );
              setNotice(
                result.status === 'succeeded'
                  ? t('refunded')
                  : t('refundPending'),
              );
              refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : 'Rimborso non riuscito.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="flex items-start gap-3">
            <input type="checkbox" required className="mt-1 size-5 shrink-0" />
            {t('refundConfirm')}
          </label>
          <button
            disabled={busy}
            className="min-h-12 rounded-xl border border-pink-300/50 px-4 text-pink-200 disabled:opacity-50"
          >
            {t('refund')}
          </button>
        </form>
      )}
      {notice && <output>{notice}</output>}
      {busy && <output>{t('saving')}</output>}
      {error && (
        <p role="alert" className="text-rose-300">
          {checkoutErrorText(locale, error)}
        </p>
      )}
    </div>
  );
}
