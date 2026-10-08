'use client';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from '@/components/app-link';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { accountHttp, AccountRequestError } from '@/lib/account-http';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { orderStatusLabel } from '@/lib/order-status';
import { paymentsEnabled } from '@/lib/release-features';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
type Item = { id: string; label: string; detail: string };
type InboxResponse = {
  userId?: string;
  profiles: Array<{ id: string; display_name: string }>;
  messages: Array<{ sender_id: string; recipient_id: string; body: string }>;
  orders: Array<{ id: string; status: string; amount_cents: number; currency: string; item_title?: string; is_test?: boolean }>;
};
export default function RealInbox() {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const params = useSearchParams();
  const [tab, setTab] = useState(
    paymentsEnabled && params.get('tab') === 'orders' ? 'orders' : 'messages',
  );
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [itemsViewer, setItemsViewer] = useState('');
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks, viewerId } = useBlockedContent();
  const locationTab =
    paymentsEnabled && params.get('tab') === 'orders' ? 'orders' : 'messages';
  const [lastLocationTab, setLastLocationTab] = useState(locationTab);
  if (locationTab !== lastLocationTab) {
    setLastLocationTab(locationTab);
    setTab(locationTab);
    setQuery('');
    setLoading(true);
    setError('');
  }
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      const session = await getSupabaseBrowserClient()?.auth.getSession();
      if (session?.error) throw session.error;
      if (!session?.data.session) throw new AccountRequestError('Accedi per continuare.', 401, 'AUTH_REQUIRED');
      const actor = session.data.session.user.id;
      const value = await accountHttp<InboxResponse>(`/api/${tab}`, {
        signal: controller.signal,
        headers: { Authorization: 'Bearer ' + session.data.session.access_token },
      });
      return { value, actor };
    })()
      .then(({ value, actor }) => {
        if (!active) return;
        setItemsViewer(actor);
        setError('');
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
                label:
                  order.item_title || `${t('Ordine')} ${order.id.slice(0, 8)}`,
                detail: `${order.is_test ? 'TEST · ' : ''}${orderStatusLabel(order.status, locale)} · ${new Intl.NumberFormat(locale, { style: 'currency', currency: order.currency }).format(order.amount_cents / 100)}`,
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
                  )?.display_name || t('Utente COSMORA'),
                detail: message.body,
              });
          }
          setItems([...peers.values()]);
        }
      })
      .catch((reason) => {
        if (active)
          setError(communityError(locale, reason, 'Caricamento non riuscito.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [tab, reload, locale, t, blocksRevision, viewerId]);
  // Keep a route to Unblock without retaining the blocked author's name or message preview.
  const visible = (!viewerId || itemsViewer !== viewerId ? [] : tab === 'messages' ? (blocksReady ? items.map((item) =>
    blockedIds.has(item.id) ? { ...item, label: t('Conversazione'), detail: t('Utente bloccato: non potete scambiarvi messaggi.') } : item,
  ) : []) : items).filter((item) =>
    `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <MobileShell className="flex !h-dvh !min-h-0 flex-col overflow-hidden">
      <header className="px-5 py-5">
        <h1 className="text-2xl font-semibold">
          {paymentsEnabled ? t('Messaggi e ordini') : t('Messaggi')}
        </h1>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-24">
        <label className="block text-sm">
          {t('Cerca')}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3 text-base"
          />
        </label>
        {paymentsEnabled && (
          <div className="my-4 grid grid-cols-2">
            {[
              ['messages', t('Messaggi')],
              ['orders', t('Ordini')],
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
        )}
        {tab === 'messages' && <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} />}
        {tab === 'messages' && !blocksReady ? null : loading ? (
          <p>{t('Caricamento…')}</p>
        ) : error ? (
          <div className="space-y-4">
            <output className="block text-amber-200">{error}</output>
            <Link href="/auth/login" className="block text-pink-300">
              {t('Accedi o registrati')}
            </Link>
            <button
              onClick={() => {
                setLoading(true);
                setError('');
                setReload(reload + 1);
              }}
              className="min-h-12 rounded-xl border border-white/20 px-4"
            >
              {t('Riprova')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {visible.length === 0 && (
              <p className="py-6 text-base text-white/70">
                {query
                  ? t('Nessun risultato.')
                  : tab === 'orders'
                    ? t('Non ci sono ordini associati al tuo account.')
                    : t('Non hai ancora conversazioni.')}
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
