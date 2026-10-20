'use client';
import { useCommerce } from '@/components/use-commerce';
import { paymentsEnabled } from '@/lib/release-features';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import Image from 'next/image';
import { accountRequest } from '@/lib/account-client';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
import { withListingAuthors, withoutBlockedAuthors } from '@/lib/blocked-content';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { accountHttp, AccountRequestError } from '@/lib/account-http';
export function SaveItem({
  id,
  kind,
}: {
  id: string;
  kind: 'cart' | 'favorite';
}) {
  const { t } = useCommerce();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<
      'savedCart' | 'savedFavorite' | 'loginRequired' | 'error' | ''
    >('');
  return (
    <div>
      <button
        disabled={busy}
        className="min-h-12 w-full rounded-xl border border-pink-300/40 p-3 text-base text-pink-200 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setMessage('');
          try {
            await accountRequest('/api/saved-items', {
              method: 'POST',
              body: JSON.stringify({ listingId: id, kind }),
            });
            setMessage(kind === 'cart' ? 'savedCart' : 'savedFavorite');
          } catch (e) {
            setMessage(
              e instanceof Error && e.message.startsWith('Accedi')
                ? 'loginRequired'
                : 'error',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? t('saving') : kind === 'cart' ? t('addCart') : t('addFavorite')}
      </button>
      {message && (
        <output className="mt-2 block text-sm">
          {t(message)}{' '}
          <Link
            className="text-pink-300 underline"
            href={
              message === 'loginRequired'
                ? '/auth/login'
                : kind === 'cart'
                  ? '/cart'
                  : '/favorites'
            }
          >
            {t('open')}
          </Link>
        </output>
      )}
    </div>
  );
}
type Item = {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  image: string | null;
  status: string;
  sale_mode: string;
  sale_price_cents: number | null;
};
export function SavedItems({ kind }: { kind: 'cart' | 'favorite' }) {
  return <SavedItemsContent key={kind} kind={kind} />;
}

function SavedItemsContent({ kind }: { kind: 'cart' | 'favorite' }) {
  const { t, euro } = useCommerce();
  const [items, setItems] = useState<Item[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [busy, setBusy] = useState('');
  const [itemsViewer, setItemsViewer] = useState('');
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks, viewerId } = useBlockedContent();
  const visibleItems = blocksReady && viewerId && itemsViewer === viewerId ? withoutBlockedAuthors(items, blockedIds, (item) => item.seller_id) : [];
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Articoli non disponibili.');
      const session = await client.auth.getSession();
      if (!active) return;
      if (session.error) throw session.error;
      if (!session.data.session) throw new AccountRequestError('Accedi per continuare.', 401, 'AUTH_REQUIRED');
      const actor = session.data.session.user.id;
      const value = await accountHttp<{ items: Item[] }>('/api/saved-items?kind=' + kind, {
        signal: controller.signal, cache: 'no-store',
        headers: { Authorization: 'Bearer ' + session.data.session.access_token },
      });
      const resolved = await withListingAuthors(client, value.items, controller.signal);
      if (active) {
        setItems(resolved);
        setItemsViewer(actor);
        setError('');
      }
    })()
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [kind, reload, blocksRevision, viewerId]);
  return (
    <div className="space-y-5 p-5">
      <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} />
      {blocksReady && loading && <output>{t('loading')}</output>}
      {error && (
        <div role="alert">
          <p>{error.startsWith('Accedi') ? t('loginRequired') : t('error')}</p>
          <Link
            className="inline-block min-h-11 py-3 text-pink-300"
            href="/auth/login"
          >
            {t('login')}
          </Link>
          <button
            className="ml-5 min-h-11 text-pink-300"
            onClick={() => {
              setError('');
              setLoading(true);
              setReload(reload + 1);
            }}
          >
            {t('retry')}
          </button>
        </div>
      )}
      {blocksReady && !loading && !error && !visibleItems.length && (
        <div className="rounded-2xl border border-white/15 p-6 text-center">
          <h2 className="text-xl font-semibold">
            {kind === 'cart' ? t('emptyCart') : t('emptyFavorites')}
          </h2>
          <p className="mt-3 text-white/70">{t('savedHint')}</p>
          <Link
            className="mt-5 inline-block rounded-xl bg-violet-600 p-3"
            href="/marketplace"
          >
            {t('explore')}
          </Link>
        </div>
      )}
      {visibleItems.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-white/15 bg-[#111225] p-4"
        >
          <Link href={item.status === 'active' ? '/marketplace/' + item.slug : '/marketplace'} className="flex gap-4">
            {item.image && (
              <Image
                src={item.image}
                alt=""
                width={88}
                height={100}
                unoptimized
                className="h-24 w-20 rounded-xl object-contain"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{item.status === 'active' ? item.title : t('notAvailable')}</h2>
              {item.status === 'active' && <p className="mt-2 text-pink-300">
                {item.sale_price_cents !== null
                  ? euro(item.sale_price_cents)
                  : t('rentOnly')}
              </p>}
              <p className="mt-1 text-sm text-white/70">
                {item.status === 'active' ? t('available') : t('notAvailable')}
              </p>
            </div>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {paymentsEnabled &&
              kind === 'cart' &&
              item.status === 'active' &&
              item.sale_mode !== 'rent' && (
                <Link
                  href={'/checkout?listing=' + item.slug}
                  className="rounded-xl bg-violet-600 p-3 text-base"
                >
                  {t('testCheckout')}
                </Link>
              )}
            <button
              disabled={Boolean(busy)}
              className="min-h-12 px-3 text-white/75"
              onClick={async () => {
                setBusy(item.id);
                try {
                  await accountRequest('/api/saved-items', {
                    method: 'DELETE',
                    body: JSON.stringify({ listingId: item.id, kind }),
                  });
                  setItems((current) =>
                    current.filter((x) => x.id !== item.id),
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Riprova.');
                } finally {
                  setBusy('');
                }
              }}
            >
              {t('remove')}
            </button>
          </div>
        </article>
      ))}
      {paymentsEnabled && kind === 'cart' && visibleItems.length > 0 && (
        <p className="rounded-xl border border-amber-300/20 p-4 text-base text-amber-100">
          {t('cartNotice')}
        </p>
      )}
    </div>
  );
}
