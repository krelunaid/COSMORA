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

  return (
    <MobileShell className="flex min-h-dvh flex-col">
      <header className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <h1 className="text-[24px] font-semibold">Inbox</h1>
        <button type="button" aria-label="Cerca nei messaggi" className="grid size-11 place-items-center rounded-full active:bg-white/8"><Search className="size-6" /></button>
      </header>

      <div className="min-h-0 flex-1 px-5">
        <div className="grid grid-cols-2 border-b border-white/10 text-center text-[14px] font-medium" role="tablist" aria-label="Inbox">
          <button type="button" role="tab" aria-selected={tab === 'messages'} onClick={() => setTab('messages')} className={`min-h-14 border-b-2 py-4 ${tab === 'messages' ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/55'}`}>Messaggi</button>
          <button type="button" role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')} className={`min-h-14 border-b-2 py-4 ${tab === 'orders' ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/55'}`}>Ordini</button>
        </div>

        {tab === 'messages' ? (
          <div className="divide-y divide-white/8" role="tabpanel">
            {conversations.slice(0, 4).map((chat) => (
              <Link href={`/inbox/${chat.id}`} key={chat.id} className="flex min-h-[96px] touch-manipulation items-center gap-4 py-5 active:bg-white/[.035]">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-full"><Image src={chat.image} alt="" fill sizes="56px" className="object-cover" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{chat.name}</p>
                  <p className="mt-1 truncate text-[14px] text-white/55">{chat.preview}</p>
                  <p className="mt-1.5 text-[12px] font-medium text-violet-300">Traduzione AI disponibile</p>
                </div>
                <span className="text-[12px] text-white/40">{chat.time}</span>
                <ChevronRight className="size-4 shrink-0 text-white/25" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-4" role="tabpanel">
            <p className="text-[13px] text-white/45">Acquisti, noleggi e stato delle spedizioni.</p>
            {orders.map((order) => {
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
            <Link href="/inbox/mangavault" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-400/25 text-[13px] text-violet-200"><MessageCircle className="size-4" />Contatta l’assistenza ordine</Link>
          </div>
        )}
      </div>

      <MobileNav active="inbox" />
    </MobileShell>
  );
}
