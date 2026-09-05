'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from '@/components/app-link';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
type Item = { id: string; label: string; detail: string };
export default function RealInbox() {
  const params = useSearchParams();
  const [tab, setTab] = useState(
    params.get('tab') === 'orders' ? 'orders' : 'messages',
  );
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    accountRequest(`/api/${tab}`)
      .then((value) => {
        if (!active) return;
        if (tab === 'orders') {
          setItems(
            value.orders.map(
              (order: {
                id: string;
                status: string;
                amount_cents: number;
                currency: string;
                item_title?: string;
                is_test?: boolean;
              }) => ({
                id: order.id,
                label: order.item_title || `Ordine ${order.id.slice(0, 8)}`,
                detail: `${order.is_test ? 'TEST · ' : ''}${order.status === 'paid' ? 'Pagato' : order.status === 'expired' ? 'Scaduto' : 'In attesa'} · ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: order.currency }).format(order.amount_cents / 100)}`,
              }),
            ),
          );
        } else {
          const peers = new Map<string, Item>();
          for (const message of value.messages) {
            const id =
              message.sender_id === value.userId
                ? message.recipient_id
                : message.sender_id;
            if (!peers.has(id))
              peers.set(id, {
                id,
                label:
                  value.profiles.find(
                    (profile: { id: string }) => profile.id === id,
                  )?.display_name || 'Utente COSMORA',
                detail: message.body,
              });
          }
          setItems([...peers.values()]);
        }
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, reload]);
  const visible = items.filter((item) =>
    `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <MobileShell className="flex !h-dvh !min-h-0 flex-col overflow-hidden">
      <header className="px-5 py-5">
        <h1 className="text-2xl font-semibold">Messaggi e ordini</h1>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-24">
        <label className="block text-sm">
          Cerca
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3 text-base"
          />
        </label>
        <div className="my-4 grid grid-cols-2">
          {[
            ['messages', 'Messaggi'],
            ['orders', 'Ordini'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                if (key === tab) return;
                setLoading(true);
                setError('');
                setTab(key);
                setQuery('');
              }}
              aria-pressed={tab === key}
              className={`min-h-12 border-b-2 text-base ${tab === key ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/70'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <p>Caricamento…</p>
        ) : error ? (
          <div className="space-y-4">
            <output className="block text-amber-200">{error}</output>
            <Link href="/auth/login" className="block text-pink-300">
              Accedi o registrati
            </Link>
            <button
              onClick={() => {
                setLoading(true);
                setError('');
                setReload(reload + 1);
              }}
              className="min-h-12 rounded-xl border border-white/20 px-4"
            >
              Riprova
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {visible.length === 0 && (
              <p className="py-6 text-base text-white/70">
                {query
                  ? 'Nessun risultato.'
                  : tab === 'orders'
                    ? 'Non ci sono ordini associati al tuo account.'
                    : 'Non hai ancora conversazioni.'}
              </p>
            )}
            {visible.map((item) =>
              tab === 'messages' ? (
                <Link
                  key={item.id}
                  href={`/inbox/${item.id}`}
                  className="block py-5"
                >
                  <h2 className="text-base font-semibold">{item.label}</h2>
                  <p className="mt-2 truncate text-base text-white/70">
                    {item.detail}
                  </p>
                </Link>
              ) : (
                <Link
                  href={'/checkout?order=' + item.id}
                  key={item.id}
                  className="block py-5"
                >
                  <h2 className="break-all text-sm">{item.label}</h2>
                  <p className="mt-2 text-base">{item.detail}</p>
                </Link>
              ),
            )}
          </div>
        )}
      </section>
      <MobileNav active="inbox" />
    </MobileShell>
  );
}
