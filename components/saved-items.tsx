'use client';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import Image from 'next/image';
import { accountRequest } from '@/lib/account-client';
import { cents } from '@/lib/monetization';
export function SaveItem({
  id,
  kind,
}: {
  id: string;
  kind: 'cart' | 'favorite';
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
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
            setMessage(
              kind === 'cart'
                ? 'Aggiunto al carrello.'
                : 'Salvato nei preferiti.',
            );
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Riprova.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? 'Salvataggio…'
          : kind === 'cart'
            ? 'Aggiungi al carrello'
            : '♡ Salva nei preferiti'}
      </button>
      {message && (
        <output className="mt-2 block text-sm">
          {message}{' '}
          <Link
            className="text-pink-300 underline"
            href={
              message.startsWith('Accedi')
                ? '/auth/login'
                : kind === 'cart'
                  ? '/cart'
                  : '/favorites'
            }
          >
            Apri
          </Link>
        </output>
      )}
    </div>
  );
}
type Item = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  status: string;
  sale_mode: string;
  sale_price_cents: number | null;
};
export function SavedItems({ kind }: { kind: 'cart' | 'favorite' }) {
  const [items, setItems] = useState<Item[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [busy, setBusy] = useState('');
  useEffect(() => {
    let active = true;
    accountRequest<{ items: Item[] }>('/api/saved-items?kind=' + kind)
      .then((v) => {
        if (active) setItems(v.items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, reload]);
  return (
    <div className="space-y-5 p-5">
      {loading && <output>Caricamento…</output>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Link
            className="inline-block min-h-11 py-3 text-pink-300"
            href="/auth/login"
          >
            Accedi
          </Link>
          <button
            className="ml-5 min-h-11 text-pink-300"
            onClick={() => {
              setError('');
              setLoading(true);
              setReload(reload + 1);
            }}
          >
            Riprova
          </button>
        </div>
      )}
      {!loading && !error && !items.length && (
        <div className="rounded-2xl border border-white/15 p-6 text-center">
          <h2 className="text-xl font-semibold">
            {kind === 'cart'
              ? 'Il carrello è vuoto'
              : 'Ancora nessun preferito'}
          </h2>
          <p className="mt-3 text-white/70">
            Salva gli articoli che ti interessano: li ritroverai anche su un
            altro dispositivo.
          </p>
          <Link
            className="mt-5 inline-block rounded-xl bg-violet-600 p-3"
            href="/marketplace"
          >
            Esplora il marketplace
          </Link>
        </div>
      )}
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-white/15 bg-[#111225] p-4"
        >
          <Link href={'/marketplace/' + item.slug} className="flex gap-4">
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
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-pink-300">
                {item.sale_price_cents !== null
                  ? cents(item.sale_price_cents)
                  : 'Solo noleggio'}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {item.status === 'active'
                  ? 'Disponibile'
                  : 'Non più disponibile'}
              </p>
            </div>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {kind === 'cart' &&
              item.status === 'active' &&
              item.sale_mode !== 'rent' && (
                <Link
                  href={'/checkout?listing=' + item.slug}
                  className="rounded-xl bg-violet-600 p-3 text-base"
                >
                  Prova checkout
                </Link>
              )}
            <button
              disabled={busy === item.id}
              className="min-h-12 px-3 text-white/75"
              onClick={async () => {
                setBusy(item.id);
                try {
                  await accountRequest('/api/saved-items', {
                    method: 'DELETE',
                    body: JSON.stringify({ listingId: item.id, kind }),
                  });
                  setItems(items.filter((x) => x.id !== item.id));
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Riprova.');
                } finally {
                  setBusy('');
                }
              }}
            >
              Rimuovi
            </button>
          </div>
        </article>
      ))}
      {kind === 'cart' && items.length > 0 && (
        <p className="rounded-xl border border-amber-300/20 p-4 text-base text-amber-100">
          Pagamenti solo di prova, un articolo per ordine. Nessun addebito
          reale, prenotazione o spedizione. Non usare carte reali.
        </p>
      )}
    </div>
  );
}
