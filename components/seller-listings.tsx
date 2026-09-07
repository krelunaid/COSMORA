'use client';
import { useI18n } from '@/components/i18n-provider';
import { saleText, type SaleKey } from '@/lib/i18n/sale';
import { rentalsEnabled } from '@/lib/release-features';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { Button } from '@/components/ui/button';
import { accountRequest } from '@/lib/account-client';

type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  sale_mode: string;
  sale_price_cents: number | null;
  rental_price_cents: number | null;
  updated_at: string;
  shipping_mode: string | null;
  shipping_method: string | null;
  shipping_cost_cents: number | null;
  shipping_time: string | null;
};
type Page = { listings: Listing[]; hasMore: boolean };
const statusLabels: Record<string, SaleKey> = {
  active: 'active',
  paused: 'paused',
  draft: 'draft',
  sold: 'sold',
};
const field =
  'mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3 text-base';

function ListingEditor({
  listing,
  onSaved,
}: {
  listing: Listing;
  onSaved: (value: Listing) => void;
}) {
  const { locale } = useI18n();
  const t = (key: SaleKey) => saleText(locale, key);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const price = (key: string) =>
        form.has(key) ? Math.round(Number(form.get(key)) * 100) : null;
      const result = await accountRequest<{ listing: Listing }>(
        '/api/seller/listings',
        {
          method: 'PATCH',
          body: JSON.stringify({
            id: listing.id,
            updatedAt: listing.updated_at,
            title: form.get('title'),
            description: form.get('description'),
            status: form.get('paused') ? 'paused' : 'active',
            salePriceCents: price('salePrice'),
            rentalPriceCents: price('rentalPrice'),
            shipping: {
              shippingMode: form.get('shippingMode'),
              shippingMethod: form.get('shippingMethod'),
              shippingCost: form.get('shippingCost'),
              shippingTime: form.get('shippingTime'),
            },
          }),
        },
      );
      onSaved(result.listing);
      setEditing(false);
      setNotice(t('saved'));
    } catch {
      setError('failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.025] p-4">
      <p className="text-sm text-pink-300">
        {t(statusLabels[listing.status] || 'draft')}
      </p>
      <h2 className="text-lg font-semibold">{listing.title}</h2>
      {notice && (
        <output className="block text-base text-emerald-300">{notice}</output>
      )}
      {editing ? (
        <form
          onInvalid={(event) => {
            event.preventDefault();
            setError('invalid');
          }}
          onSubmit={save}
          className="space-y-4"
        >
          <label className="block">
            {t('name')}
            <input
              name="title"
              defaultValue={listing.title}
              required
              minLength={3}
              maxLength={120}
              className={field}
            />
          </label>
          <label className="block">
            {t('bio')}
            <textarea
              name="description"
              defaultValue={listing.description}
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              className={field}
            />
          </label>
          <fieldset className="space-y-3 rounded-xl border border-white/15 p-3">
            <legend>{t('delivery')}</legend>
            <label className="block">
              {t('method')}
              <select
                name="shippingMode"
                defaultValue={listing.shipping_mode ?? 'courier'}
                className={field}
              >
                <option value="courier">{t('courier')}</option>
                <option value="pickup">{t('pickup')}</option>
              </select>
            </label>
            <label className="block">
              {t('carrier')}
              <input
                name="shippingMethod"
                defaultValue={listing.shipping_method ?? ''}
                required
                minLength={2}
                maxLength={120}
                className={field}
              />
            </label>
            <label className="block">
              {t('cost')}
              <input
                name="shippingCost"
                type="number"
                defaultValue={
                  listing.shipping_cost_cents === null
                    ? ''
                    : listing.shipping_cost_cents / 100
                }
                required
                min="0"
                max="10000"
                step="0.01"
                className={field}
              />
            </label>
            <label className="block">
              {t('time')}
              <input
                name="shippingTime"
                defaultValue={listing.shipping_time ?? ''}
                required
                minLength={2}
                maxLength={200}
                className={field}
              />
            </label>
          </fieldset>
          {listing.sale_mode !== 'rent' && (
            <label className="block">
              {t('price')}
              <input
                name="salePrice"
                type="number"
                defaultValue={(listing.sale_price_cents ?? 0) / 100}
                min="0"
                max="1000000"
                step="0.01"
                required
                className={field}
              />
            </label>
          )}
          {listing.sale_mode !== 'buy' && (
            <label className="block">
              {t('rentalPrice')}
              <input
                name="rentalPrice"
                type="number"
                defaultValue={(listing.rental_price_cents ?? 0) / 100}
                min="0.01"
                max="1000000"
                step="0.01"
                required
                className={field}
              />
            </label>
          )}
          <label className="flex min-h-12 items-center gap-3">
            <input
              name="paused"
              type="checkbox"
              defaultChecked={listing.status === 'paused'}
              className="size-5 accent-pink-500"
            />
            {t('pause')}
          </label>
          <p className="text-sm text-white/70">{t('pauseHint')}</p>
          {error && (
            <p role="alert" className="text-base text-amber-200">
              {t(error === 'invalid' ? 'invalid' : 'error')}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={busy}
              className="min-h-12 px-5 text-base"
            >
              {busy ? t('wait') : t('save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="min-h-12 px-5 text-base"
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          {['active', 'paused'].includes(listing.status) && (
            <Button
              onClick={() => {
                setEditing(true);
                setError('');
                setNotice('');
              }}
              variant="outline"
              className="min-h-12 px-4 text-base"
            >
              {t('editListing')}
            </Button>
          )}
          {listing.status === 'active' && (
            <Link
              className="py-3 text-base text-pink-300"
              href={`/marketplace/${listing.slug}`}
            >
              {t('view')}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

export function SellerListings() {
  const { locale } = useI18n();
  const t = (key: SaleKey) => saleText(locale, key);

  const [page, setPage] = useState<Page>({ listings: [], hasMore: false });
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<Page>(`/api/seller/listings?offset=${offset}`, {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setPage(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('failed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [offset, retry]);
  function navigate(next: number) {
    setLoading(true);
    setError('');
    setOffset(next);
  }
  return (
    <section className="space-y-4 text-base" aria-label={t('dashboard')}>
      {loading ? (
        <output>{t('loading')}</output>
      ) : error ? (
        <div className="space-y-3">
          <p role="alert" className="text-amber-200">
            {error}
          </p>
          <Button
            onClick={() => {
              setLoading(true);
              setError('');
              setRetry((n) => n + 1);
            }}
            className="min-h-12 text-base"
          >
            {t('retry')}
          </Button>
          <Link href="/auth/login" className="block text-pink-300">
            {t('login')}
          </Link>
        </div>
      ) : (
        <>
          {!page.listings.length && (
            <p className="rounded-2xl border border-white/15 p-5 text-white/75">
              {t('empty')}
            </p>
          )}
          {page.listings.map((listing) =>
            !rentalsEnabled && listing.sale_mode !== 'buy' ? (
              <article
                key={listing.id}
                className="rounded-xl border border-white/15 p-4"
              >
                <h2 className="text-lg">{listing.title}</h2>
                <p className="mt-2 text-sm text-white/70">{t('rentalHold')}</p>
              </article>
            ) : (
              <ListingEditor
                key={listing.id}
                listing={listing}
                onSaved={(saved) =>
                  setPage((current) => ({
                    ...current,
                    listings: current.listings.map((item) =>
                      item.id === saved.id ? saved : item,
                    ),
                  }))
                }
              />
            ),
          )}
          <div className="flex justify-between gap-3">
            {offset > 0 && (
              <Button
                variant="outline"
                className="min-h-12 text-base"
                onClick={() => navigate(Math.max(0, offset - 20))}
              >
                {t('previous')}
              </Button>
            )}
            {page.hasMore && (
              <Button
                variant="outline"
                className="min-h-12 text-base"
                onClick={() => navigate(offset + 20)}
              >
                {t('next')}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
