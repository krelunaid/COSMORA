'use client';
import { ReportButton } from '@/components/report-button';
import { apiFetch } from '@/lib/api-fetch';
import { useCommerce } from '@/components/use-commerce';
import { paymentsEnabled, rentalsEnabled } from '@/lib/release-features';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { ShareButton } from '@/components/share-button';
import { SaveItem } from '@/components/saved-items';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
import { withoutBlockedAuthors } from '@/lib/blocked-content';
type Listing = {
  id: string;
  slug: string;
  seller_id: string;
  seller_type: string | null;
  title: string;
  description: string;
  category: string;
  condition: string;
  sale_mode: string;
  images: string[];
  sale_price_cents: number | null;
  rental_price_cents: number | null;
  rental_days: number | null;
  deposit_cents: number;
  shipping_mode: string | null;
  shipping_method: string | null;
  shipping_cost_cents: number | null;
  shipping_time: string | null;
};
export function LiveListings({
  slug,
  demo: requestedDemo = false,
  category = 'All',
  mode = '',
  query = '',
  condition = '',
  max = '',
  seller = '',
}: {
  slug?: string;
  demo?: boolean;
  category?: string;
  mode?: string;
  query?: string;
  condition?: string;
  max?: string;
  seller?: string;
}) {
  const demo = process.env.NODE_ENV === 'development' && requestedDemo;
  const { t, euro, categoryLabel } = useCommerce();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks, viewerId } = useBlockedContent();
  const visibleListings = blocksReady ? withoutBlockedAuthors(listings, blockedIds, (listing) => listing.seller_id) : [];
  const filterKey = JSON.stringify([
    slug,
    category,
    mode,
    query,
    condition,
    max,
    seller,
    blocksRevision,
  ]);
  const [applied, setApplied] = useState(filterKey);
  if (applied !== filterKey) {
    setApplied(filterKey);
    setOffset(0);
    setListings([]);
    setLoading(true);
    setError('');
  }
  useEffect(() => {
    const controller = new AbortController();
    if (demo) {
      const sample: Listing[] = [
        {
          id: 'demo-manga',
          slug: 'demo-collezione-manga',
          seller_id: '00000000-0000-4000-8000-000000000001',
          seller_type: 'private',
          title: 'Collezione manga – 10 volumi',
          description:
            'Set in buone condizioni, pagine integre e copertine ben conservate. Ideale per iniziare la serie o completare la tua libreria. Ritiro a mano o spedizione tracciata.',
          category: 'Comics',
          condition: 'Used',
          sale_mode: 'buy',
          images: ['/editorial/category-manga.svg'],
          sale_price_cents: 3500,
          rental_price_cents: null,
          rental_days: null,
          deposit_cents: 0,
          shipping_mode: 'courier',
          shipping_method: 'Poste Italiane',
          shipping_cost_cents: 590,
          shipping_time: '2–3 giorni lavorativi',
        },
        {
          id: 'demo-figure',
          slug: 'demo-figure-collezione',
          seller_id: '00000000-0000-4000-8000-000000000002',
          seller_type: 'shop',
          title: 'Figura da collezione – edizione speciale',
          description:
            'Figura espositiva con base inclusa. Conservata in vetrina, senza danni visibili. Imballo protetto per la spedizione; foto illustrative per questa anteprima.',
          category: 'Figures',
          condition: 'Like New',
          sale_mode: 'buy',
          images: ['/editorial/category-figures.svg'],
          sale_price_cents: 4800,
          rental_price_cents: null,
          rental_days: null,
          deposit_cents: 0,
          shipping_mode: 'courier',
          shipping_method: 'BRT',
          shipping_cost_cents: 750,
          shipping_time: '1–2 giorni lavorativi',
        },
        {
          id: 'demo-cosplay',
          slug: 'demo-accessorio-cosplay',
          seller_id: '00000000-0000-4000-8000-000000000003',
          seller_type: 'private',
          title: 'Accessorio cosplay artigianale',
          description:
            'Accessorio leggero realizzato a mano, adatto a cosplay e fiere. Non è un prodotto ufficiale; condizioni ottime. Dimensioni e dettagli da concordare prima dell’acquisto.',
          category: 'Cosplay',
          condition: 'Like New',
          sale_mode: 'buy',
          images: ['/editorial/category-cosplay.svg'],
          sale_price_cents: 2400,
          rental_price_cents: null,
          rental_days: null,
          deposit_cents: 0,
          shipping_mode: 'pickup',
          shipping_method: 'Ritiro a mano da concordare',
          shipping_cost_cents: 0,
          shipping_time: 'Da concordare',
        },
      ];
      const filtered = sample.filter((listing) =>
        (slug ? listing.slug === slug : true) &&
        (category === 'All' || listing.category === category) &&
        (!query ||
          listing.title
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())) &&
        (!condition || listing.condition === condition) &&
        (!max || listing.sale_price_cents! <= Number(max) * 100),
      );
      setListings(filtered);
      setMore(false);
      setError('');
      setLoading(false);
      return () => controller.abort();
    }
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          category,
          mode,
          q: query,
          condition,
          max,
          seller,
          offset: String(offset),
        });
        if (slug) params.set('slug', slug);
        void (async () => {
          const session = await getSupabaseBrowserClient()?.auth.getSession();
          if (session?.error) throw session.error;
          if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const token = session?.data.session?.access_token;
          return apiFetch('/api/listings?' + params, {
            signal: controller.signal,
            headers: token ? { Authorization: 'Bearer ' + token } : {},
          });
        })()
          .then(async (response) => {
            const value = (await response.json()) as {
              listings: Listing[];
              hasMore: boolean;
              userId?: string;
              error?: string;
            };
            if (!response.ok)
              throw new Error(value.error || 'Catalogo non disponibile.');
            if (controller.signal.aborted) return;
            setListings((previous) =>
              offset
                ? [
                    ...previous,
                    ...value.listings.filter(
                      (listing) =>
                        !previous.some((item) => item.id === listing.id),
                    ),
                  ]
                : value.listings,
            );
            setMore(value.hasMore);
          })
          .catch((reason) => {
            if (!controller.signal.aborted) setError(reason.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, demo, category, mode, query, condition, max, seller, offset, retry, blocksRevision]);
  return (
    <section
      className="space-y-4 py-5"
      aria-label={slug ? t('listingDetail') : t('listings')}
    >
      <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} />
      {demo && (
        <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
          Anteprima dimostrativa: annunci inventati e immagini illustrative, non in vendita.
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-amber-300/25 p-4">
          <p>{t('error')}</p>
          <button
            onClick={() => setRetry(retry + 1)}
            className="min-h-11 text-pink-300"
          >
            {t('retry')}
          </button>
        </div>
      )}
      {blocksReady && !loading && !error && !visibleListings.length && (
        <div className="rounded-2xl border border-white/10 p-6 text-center">
          <h2 className="text-lg font-semibold">
            {slug ? t('unavailable') : t('noListings')}
          </h2>
          <p className="mt-2 text-base text-white/65">
            {slug ? t('sold') : t('trySearch')}
          </p>
          <Link
            href={slug ? '/marketplace' : '/sell'}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-4"
          >
            {slug ? t('back') : t('publish')}
          </Link>
        </div>
      )}
      <div className={slug ? 'space-y-5' : 'grid grid-cols-2 gap-3'}>
        {visibleListings.map((listing) => (
          <article
            key={listing.id}
            className="min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#111225]"
          >
            <Link href={'/marketplace/' + listing.slug + (demo ? '?demo=1' : '')} className="block">
              <div className="relative aspect-square bg-white/5">
                {listing.images[0] && (
                  <Image
                    src={listing.images[0]}
                    alt={listing.title}
                    fill
                    unoptimized
                    sizes={slug ? '430px' : '210px'}
                    className="object-contain"
                  />
                )}
              </div>
              <div className="p-3">
                <h2
                  className={
                    slug
                      ? 'text-2xl font-semibold'
                      : 'line-clamp-2 text-base font-medium'
                  }
                >
                  {listing.title}
                </h2>
                <p className="mt-2 text-sm text-white/65">
                  {categoryLabel(listing.category)} ·{' '}
                  {categoryLabel(listing.condition)}
                </p>
                {slug && listing.seller_type && (
                  <div className="mt-2 space-y-1 text-sm text-white/65">
                    <p>
                      {t('sellerType')}:{' '}
                      {t(
                        listing.seller_type === 'shop'
                          ? 'shopSeller'
                          : 'privateSeller',
                      )}
                    </p>
                    <p>{t('sellerTypeNotice')}</p>
                  </div>
                )}
                {mode !== 'rent' && listing.sale_price_cents !== null && (
                  <p className="mt-2 text-lg font-semibold text-pink-300">
                    {euro(listing.sale_price_cents)}
                  </p>
                )}
                {rentalsEnabled && listing.rental_price_cents !== null && (
                  <p className="mt-1 text-sm text-violet-200">
                    {t('rental')} {euro(listing.rental_price_cents)} /{' '}
                    {listing.rental_days} {t('days')}
                  </p>
                )}
              </div>
            </Link>
            {slug && (
              <div className="space-y-4 p-4 pt-0">
                <div className="flex flex-wrap gap-3">
                  {listing.images.slice(1).map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t('openPhoto') + ' ' + (index + 2)}
                      className="relative size-20 overflow-hidden rounded-xl"
                    >
                      <Image
                        src={url}
                        alt={t('photo') + ' ' + (index + 2)}
                        fill
                        unoptimized
                        sizes="80px"
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-white/80">
                  {listing.description}
                </p>
                {demo ? (
                  <p className="rounded-xl bg-white/5 p-3 text-sm text-white/65">Scheda di esempio: contatti e acquisto non attivi.</p>
                ) : (
                  <>
                    <Link
                      href={'/profile/' + listing.seller_id}
                      className="block min-h-11 py-2 text-pink-300"
                    >
                      {t('seller')}
                    </Link>
                    <Link
                      href={'/inbox/' + listing.seller_id}
                      className="block rounded-xl bg-violet-600 p-3 text-center text-base font-semibold"
                    >
                      {t('contact')}
                    </Link>
                    <ShareButton title={listing.title} />
                    <ReportButton targetType="LISTING" targetId={listing.id} authorId={listing.seller_id} viewerId={viewerId} />
                  </>
                )}
                <section className="space-y-2 rounded-xl border border-white/15 p-3 text-base">
                  <h3 className="font-semibold">{t('delivery')}</h3>
                  {listing.shipping_mode &&
                  listing.shipping_cost_cents !== null ? (
                    <>
                      <p>
                        {listing.shipping_mode === 'pickup'
                          ? t('pickup')
                          : t('shipping')}{' '}
                        · {euro(listing.shipping_cost_cents)}
                      </p>
                      <p>{listing.shipping_method}</p>
                      <p>{listing.shipping_time}</p>
                      {listing.sale_price_cents !== null && (
                        <p className="font-semibold text-pink-200">
                          {t('total')}{' '}
                          {euro(
                            listing.sale_price_cents +
                              listing.shipping_cost_cents,
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>{t('askDelivery')}</p>
                  )}
                </section>
                {!demo && <SaveItem id={listing.id} kind="favorite" />}
                {!demo && paymentsEnabled && listing.sale_mode !== 'rent' && (
                  <SaveItem id={listing.id} kind="cart" />
                )}
                <p className="text-sm text-white/60">
                  {paymentsEnabled ? t('testNotice') : t('disabled')}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
      {blocksReady && loading && (
        <output className="block py-4 text-base text-white/70">
          {t('loadingListings')}
        </output>
      )}
      {blocksReady && more && !loading && !error && (
        <button
          onClick={() => setOffset(offset + 24)}
          className="min-h-12 w-full rounded-xl border border-white/20 text-base"
        >
          {t('more')}
        </button>
      )}
    </section>
  );
}
