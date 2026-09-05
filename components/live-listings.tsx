'use client';
import { paymentsEnabled, rentalsEnabled } from '@/lib/release-features';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { ShareButton } from '@/components/share-button';
import { SaveItem } from '@/components/saved-items';
type Listing = {
  id: string;
  slug: string;
  seller_id: string;
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
};
const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
    value / 100,
  );
export function LiveListings({
  slug,
  category = 'All',
  mode = '',
  query = '',
  condition = '',
  max = '',
  seller = '',
}: {
  slug?: string;
  category?: string;
  mode?: string;
  query?: string;
  condition?: string;
  max?: string;
  seller?: string;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const filterKey = JSON.stringify([
    slug,
    category,
    mode,
    query,
    condition,
    max,
    seller,
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
        fetch('/api/listings?' + params, { signal: controller.signal })
          .then(async (response) => {
            const value = (await response.json()) as {
              listings: Listing[];
              hasMore: boolean;
              error?: string;
            };
            if (!response.ok)
              throw new Error(value.error || 'Catalogo non disponibile.');
            setListings((previous) =>
              offset ? [...previous, ...value.listings] : value.listings,
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
  }, [slug, category, mode, query, condition, max, seller, offset, retry]);
  return (
    <section
      className="space-y-4 py-5"
      aria-label={slug ? 'Dettaglio annuncio' : 'Annunci'}
    >
      {error && (
        <div role="alert" className="rounded-xl border border-amber-300/25 p-4">
          <p>{error}</p>
          <button
            onClick={() => setRetry(retry + 1)}
            className="min-h-11 text-pink-300"
          >
            Riprova
          </button>
        </div>
      )}
      {!loading && !error && !listings.length && (
        <div className="rounded-2xl border border-white/10 p-6 text-center">
          <h2 className="text-lg font-semibold">
            {slug ? 'Annuncio non disponibile' : 'Nessun annuncio trovato'}
          </h2>
          <p className="mt-2 text-base text-white/65">
            {slug
              ? 'Potrebbe essere stato venduto o sospeso.'
              : 'Prova un’altra ricerca oppure pubblica il tuo primo annuncio.'}
          </p>
          <Link
            href={slug ? '/marketplace' : '/sell'}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-4"
          >
            {slug ? 'Torna al marketplace' : 'Pubblica un annuncio'}
          </Link>
        </div>
      )}
      <div className={slug ? 'space-y-5' : 'grid grid-cols-2 gap-3'}>
        {listings.map((listing) => (
          <article
            key={listing.id}
            className="min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#111225]"
          >
            <Link href={'/marketplace/' + listing.slug} className="block">
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
                  {listing.category} · {listing.condition}
                </p>
                {mode !== 'rent' && listing.sale_price_cents !== null && (
                  <p className="mt-2 text-lg font-semibold text-pink-300">
                    {euro(listing.sale_price_cents)}
                  </p>
                )}
                {rentalsEnabled && listing.rental_price_cents !== null && (
                  <p className="mt-1 text-sm text-violet-200">
                    Noleggio {euro(listing.rental_price_cents)} /{' '}
                    {listing.rental_days} giorni
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
                      aria-label={'Apri foto ' + (index + 2)}
                      className="relative size-20 overflow-hidden rounded-xl"
                    >
                      <Image
                        src={url}
                        alt={'Foto ' + (index + 2)}
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
                <Link
                  href={'/profile/' + listing.seller_id}
                  className="block min-h-11 py-2 text-pink-300"
                >
                  Profilo del venditore →
                </Link>
                <Link
                  href={'/inbox/' + listing.seller_id}
                  className="block rounded-xl bg-violet-600 p-3 text-center text-base font-semibold"
                >
                  Contatta il venditore
                </Link>
                <ShareButton title={listing.title} />
                <SaveItem id={listing.id} kind="favorite" />
                {paymentsEnabled && listing.sale_mode !== 'rent' && (
                  <SaveItem id={listing.id} kind="cart" />
                )}
                <p className="text-sm text-white/60">
                  Pagamenti e noleggi non sono disponibili in questa versione.
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
      {loading && (
        <output className="block py-4 text-base text-white/70">
          Caricamento annunci…
        </output>
      )}
      {more && !loading && !error && (
        <button
          onClick={() => setOffset(offset + 24)}
          className="min-h-12 w-full rounded-xl border border-white/20 text-base"
        >
          Mostra altri annunci
        </button>
      )}
    </section>
  );
}
