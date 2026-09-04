'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { ChevronRight, MessageCircle, PackageCheck, Search, Truck } from 'lucide-react';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { conversations } from '@/lib/conversations';

type InboxTab = 'messages' | 'orders';

const orders = [
  { id: 'CM-2048', title: 'Raiden Shogun Cosplay Costume', seller: 'Stardust Atelier', status: 'In preparazione', detail: 'Consegna stimata 8–10 settembre', price: '249,00 €', image: '/mobile-category-cosplay.jpg', href: '/marketplace/raiden-shogun-cosplay', icon: PackageCheck },
  { id: 'CM-1982', title: 'One Piece Manga Box Set', seller: 'MangaVault', status: 'Spedito', detail: 'Tracciamento disponibile nella chat', price: '85,00 €', image: '/mobile-category-manga.jpg', href: '/inbox/mangavault', icon: Truck },
] as const;

export default function InboxPage() {
  const [tab, setTab] = useState<InboxTab>('messages');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('it');
  const visibleConversations = conversations.slice(0, 4).filter((chat) =>
    `${chat.name} ${chat.preview}`.toLocaleLowerCase('it').includes(normalizedQuery),
  );
  const visibleOrders = orders.filter((order) =>
    `${order.id} ${order.title} ${order.seller} ${order.status}`.toLocaleLowerCase('it').includes(normalizedQuery),
  );

  return (
    <MobileShell className="flex !h-dvh !min-h-0 flex-col overflow-hidden">
      <header className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <h1 className="text-[24px] font-semibold">Inbox</h1>
        <button type="button" aria-label="Cerca messaggi e ordini" aria-expanded={searchOpen} aria-controls="inbox-search" onClick={() => { setSearchOpen(!searchOpen); setQuery(''); }} className="grid size-11 place-items-center rounded-full active:bg-white/8"><Search className="size-6" /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
        {searchOpen && <div id="inbox-search" className="pb-3"><label htmlFor="inbox-query" className="mb-2 block text-sm">Cerca messaggi e ordini</label><input id="inbox-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, prodotto o numero ordine" className="w-full rounded-xl border border-white/20 bg-[#111225] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-pink-400" /></div>}
        <p className="rounded-xl border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-sm text-violet-200">Anteprima dimostrativa: questi messaggi e ordini sono esempi, non attività del tuo account.</p>
        <div className="grid grid-cols-2 border-b border-white/10 text-center text-[14px] font-medium" role="tablist" aria-label="Inbox">
          <button type="button" role="tab" aria-selected={tab === 'messages'} onClick={() => setTab('messages')} className={`min-h-14 border-b-2 py-4 ${tab === 'messages' ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/55'}`}>Messaggi</button>
          <button type="button" role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')} className={`min-h-14 border-b-2 py-4 ${tab === 'orders' ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/55'}`}>Ordini</button>
        </div>

        {tab === 'messages' ? (
          <div className="divide-y divide-white/8" role="tabpanel">
            {visibleConversations.length === 0 && <output className="block py-8 text-base text-white/70">Nessun messaggio trovato. Prova un altro nome o testo.</output>}
            {visibleConversations.map((chat) => (
              <Link href={`/inbox/${chat.id}`} key={chat.id} className="flex min-h-[96px] touch-manipulation items-center gap-4 py-5 active:bg-white/[.035]">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-full"><Image src={chat.image} alt="" fill sizes="56px" className="object-cover" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{chat.name}</p>
                  <p className="mt-1 truncate text-[14px] text-white/55">{chat.preview}</p>
                  <p className="mt-1.5 text-[14px] font-medium text-violet-300">Conversazione di esempio</p>
                </div>
                <span className="text-[12px] text-white/40">{chat.time}</span>
                <ChevronRight className="size-4 shrink-0 text-white/25" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-4" role="tabpanel">
            <p className="text-[13px] text-white/45">Acquisti, noleggi e stato delle spedizioni.</p>
            {visibleOrders.length === 0 && <output className="block py-8 text-base text-white/70">Nessun ordine trovato. Prova un altro prodotto o numero ordine.</output>}
            {visibleOrders.map((order) => {
              const Icon = order.icon;
              return (
                <Link key={order.id} href={order.href} className="block rounded-2xl border border-white/10 bg-[#111225] p-3 active:bg-white/8">
                  <div className="flex gap-3">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-xl"><Image src={order.image} alt="" fill sizes="64px" className="object-cover" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><p className="text-[14px] font-semibold leading-5">{order.title}</p><ChevronRight className="mt-0.5 size-4 shrink-0 text-white/30" /></div>
                      <p className="mt-1 text-[11px] text-white/45">{order.id} · {order.seller}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-emerald-300"><Icon className="size-4" />{order.status}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3"><span className="text-[11px] text-white/50">{order.detail}</span><strong className="text-[13px] text-pink-300">{order.price}</strong></div>
                </Link>
              );
            })}
            <Link href="/inbox/mangavault" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-400/25 text-[14px] text-violet-200"><MessageCircle className="size-4" />Apri la conversazione di esempio</Link>
          </div>
        )}
      </div>

      <MobileNav active="inbox" />
    </MobileShell>
  );
}
