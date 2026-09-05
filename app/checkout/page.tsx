'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from '@/components/app-link';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { cents } from '@/lib/monetization';
type Listing = {
  id: string;
  title: string;
  sale_price_cents: number | null;
  sale_mode: string;
};
type Order = {
  id: string;
  item_title: string;
  status: string;
  is_test: boolean;
  amount_cents: number;
};
export default function CheckoutPage() {
  const params = useSearchParams(),
    slug = params.get('listing'),
    orderId = params.get('order');
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
  const [listing, setListing] = useState<Listing | null>(null),
    [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const key = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const task = orderId
      ? accountRequest<{ order: Order }>('/api/orders/' + orderId).then((v) => {
          if (active) setOrder(v.order);
        })
      : slug
        ? fetch('/api/listings?slug=' + encodeURIComponent(slug)).then(
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
        title={orderId ? 'Stato ordine' : 'Checkout di test'}
        back="/cart"
      />
      <div className="space-y-5 p-5">
        <p className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4 text-base leading-relaxed text-amber-100">
          Modalità di prova: nessun acquisto reale. Gli articoli non sono
          riservati né spediti. I dati di pagamento si inseriscono
          esclusivamente su Stripe, usando carte di test.
        </p>
        {loading && <output>Verifica in corso…</output>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              className="min-h-12 text-pink-300"
              onClick={() => setRetry(retry + 1)}
            >
              Riprova la verifica
            </button>
            <Link className="ml-4 text-pink-300" href="/auth/login">
              Accedi
            </Link>
          </div>
        )}
        {order && (
          <section className="space-y-3 rounded-2xl border border-white/15 p-5">
            <h2 className="text-xl font-semibold">
              {order.item_title || 'Ordine COSMORA'}
            </h2>
            <p>{cents(order.amount_cents)}</p>
            <p className="text-lg text-pink-200">
              {order.status === 'paid'
                ? 'Pagamento di test confermato'
                : order.status === 'expired'
                  ? 'Sessione scaduta'
                  : 'Pagamento non ancora confermato'}
            </p>
            <p className="break-all text-sm text-white/60">Ordine {order.id}</p>
            {order.status === 'pending' && (
              <button
                className="min-h-12 rounded-xl border border-white/20 px-4"
                onClick={() => setRetry(retry + 1)}
              >
                Aggiorna stato
              </button>
            )}
            <Link className="block py-3 text-pink-300" href="/inbox?tab=orders">
              Tutti i miei ordini →
            </Link>
          </section>
        )}
        {listing && (
          <section className="space-y-4 rounded-2xl border border-white/15 p-5">
            <h2 className="text-xl font-semibold">{listing.title}</h2>
            <p>Quantità: 1</p>
            <p className="text-2xl text-pink-300">
              {listing.sale_price_cents !== null
                ? cents(listing.sale_price_cents)
                : 'Solo noleggio'}
            </p>
            <p className="text-base text-white/70">
              Il noleggio non è incluso in questo checkout. Nessun costo di
              spedizione viene richiesto nella prova.
            </p>
            {listing.sale_mode !== 'rent' &&
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
                  {busy
                    ? 'Apertura Stripe…'
                    : 'Continua su Stripe · solo test'}{' '}
                </button>
              )}
          </section>
        )}
        {!loading && !error && !listing && !order && (
          <p>
            Seleziona un articolo dal{' '}
            <Link className="text-pink-300 underline" href="/cart">
              carrello
            </Link>{' '}
            per provare il checkout.
          </p>
        )}
      </div>
      <MobileNav active="explore" />
    </MobileShell>
  );
}
