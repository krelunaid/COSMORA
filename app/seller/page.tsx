'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  MessageCircle,
  PackageCheck,
  Settings,
  ShoppingBag,
} from 'lucide-react';

import {
  MobileNav,
  MobileShell,
  ScreenHeader,
} from '@/components/mobile-shell';
import { calculateMarketplaceQuote, cents } from '@/lib/monetization';

type DashboardTab = 'Overview' | 'Orders' | 'Listings' | 'Analytics';

const orders = [
  {
    id: '#10248',
    item: 'Custom Wig',
    buyer: 'Ana · Spain',
    price: '€120.00',
    status: 'Processing',
    image: '/category-artist.png',
  },
  {
    id: '#10247',
    item: 'Cosplay Costume',
    buyer: 'Lucas · Brazil',
    price: '€180.00',
    status: 'Shipped',
    image: '/hd-category-cosplay.png',
  },
  {
    id: '#10246',
    item: 'Foam Katana Prop',
    buyer: 'Yuki · Japan',
    price: '€95.00',
    status: 'Completed',
    image: '/hd-category-figures.png',
  },
];

const listings = [
  {
    name: 'Custom Yae Miko Wig',
    price: '€120',
    stock: 'Made to order',
    image: '/category-artist.png',
  },
  {
    name: 'Raiden Cosplay Costume',
    price: '€249',
    stock: '1 available',
    image: '/hd-category-cosplay.png',
  },
  {
    name: 'Foam Katana Prop',
    price: '€95',
    stock: '3 available',
    image: '/hd-category-figures.png',
  },
];

const messages = [
  {
    avatar: '/category-artist.png',
    name: 'Ana (Spain)',
    original: 'Hola! Quiero encargar una espada…',
    translation: 'Hi! I would like to commission a sword…',
    time: '2m',
  },
  {
    avatar: '/hd-category-cosplay.png',
    name: 'Lucas (Brazil)',
    original: 'Quando você pode enviar?',
    translation: 'When can you ship?',
    time: '15m',
  },
  {
    avatar: '/hd-category-figures.png',
    name: 'Yuki (Japan)',
    original: 'この衣装のサイズはありますか？',
    translation: 'Is this costume available in my size?',
    time: '1h',
  },
];

export default function SellerDashboard() {
  const [tab, setTab] = useState<DashboardTab>('Overview');

  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader
        title="Seller Dashboard"
        back="/profile/stardust-atelier"
        action={
          <div className="flex items-center gap-3">
            <Link href="/seller/onboarding" aria-label="Seller settings">
              <Settings className="size-4 text-white/55" />
            </Link>
            <Link href="/sell" className="text-[10px] text-pink-300">
              + Listing
            </Link>
          </div>
        }
      />
      <div className="flex-1 px-4 pb-4">
        <div className="grid grid-cols-4 border-b border-white/10 text-center text-[9px]">
          {(['Overview', 'Orders', 'Listings', 'Analytics'] as const).map(
            (item) => (
              <button
                onClick={() => setTab(item)}
                key={item}
                className={`py-3 ${tab === item ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/50'}`}
              >
                {item}
              </button>
            ),
          )}
        </div>
        {tab === 'Overview' && <Overview />}
        {tab === 'Orders' && <Orders />}
        {tab === 'Listings' && <Listings />}
        {tab === 'Analytics' && <Analytics />}
      </div>
      <MobileNav active="sell" />
    </MobileShell>
  );
}

function Overview() {
  const monthlyQuote = calculateMarketplaceQuote({
    kind: 'sale',
    amountCents: 425000,
  });
  return (
    <>
      <select className="mt-3 rounded-lg border border-white/10 bg-[#111225] px-3 py-2 text-[9px]">
        <option>This Month</option>
        <option>Last 3 Months</option>
        <option>This Year</option>
      </select>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ['Orders', '128', '+18%'],
          ['Sales gross', cents(monthlyQuote.amountCents), '+24%'],
          ['COSMORA fees', `−${cents(monthlyQuote.platformFeeCents)}`, '10%'],
          ['Net payout', cents(monthlyQuote.sellerNetCents), 'after fee'],
        ].map(([label, value, growth]) => (
          <div
            key={label}
            className="rounded-xl border border-white/8 bg-[#171329] p-3"
          >
            <p className="text-[9px] text-white/45">{label}</p>
            <p className="mt-1 text-xl font-medium">
              {value}{' '}
              <span className="text-[8px] text-emerald-300">{growth}</span>
            </p>
          </div>
        ))}
      </div>
      <section className="mt-4 rounded-2xl border border-white/8 bg-[#0d0e1d] p-3">
        <div className="flex justify-between">
          <h2 className="text-xs font-semibold">Recent Orders</h2>
          <span className="text-[9px] text-pink-300">View all</span>
        </div>
        {orders.map((order) => (
          <OrderRow key={order.id} {...order} />
        ))}
      </section>
      <section className="mt-4 rounded-2xl border border-white/8 bg-[#0d0e1d] p-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-violet-300" />
          <h2 className="text-xs font-semibold">Messages</h2>
          <span className="ml-auto rounded bg-emerald-500/10 px-2 py-1 text-[8px] text-emerald-300">
            AI Translate: ON
          </span>
        </div>
        {messages.map((message) => (
          <div key={message.name} className="mt-3 flex gap-2">
            <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
              <Image
                src={message.avatar}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between">
                <p className="text-[9px] font-medium">{message.name}</p>
                <span className="text-[8px] text-white/35">{message.time}</span>
              </div>
              <p className="truncate text-[8px] text-white/55">
                {message.original}
              </p>
              <p className="truncate text-[8px] text-violet-300">
                [{message.translation}]
              </p>
            </div>
          </div>
        ))}
        <Link
          href="/inbox"
          className="mt-4 flex items-center justify-center text-[9px] text-pink-300"
        >
          View all messages <ArrowUpRight className="ml-1 size-3" />
        </Link>
      </section>
    </>
  );
}

function Orders() {
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Orders</h2>
          <p className="text-[9px] text-white/45">
            Manage purchases, rentals and deliveries.
          </p>
        </div>
        <PackageCheck className="size-5 text-violet-300" />
      </div>
      <div className="mt-4 space-y-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-white/8 bg-[#0d0e1d] p-3"
          >
            <OrderRow {...order} />
            <div className="mt-3 flex justify-between border-t border-white/8 pt-3">
              <button className="text-[9px] text-white/55">
                Contact buyer
              </button>
              <button className="rounded-lg bg-violet-500/15 px-3 py-1.5 text-[9px] text-violet-200">
                Update status
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Listings() {
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Listings</h2>
          <p className="text-[9px] text-white/45">
            Products and services currently offered.
          </p>
        </div>
        <ShoppingBag className="size-5 text-pink-300" />
      </div>
      <Link
        href="/sell"
        className="mt-4 grid h-10 place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-xs"
      >
        Create new listing
      </Link>
      <div className="mt-3 space-y-2">
        {listings.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#0d0e1d] p-3"
          >
            <span className="relative size-14 overflow-hidden rounded-xl">
              <Image
                src={item.image}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
            <div className="flex-1">
              <p className="text-[10px] font-medium">{item.name}</p>
              <p className="mt-1 text-[9px] text-emerald-300">{item.stock}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-pink-300">{item.price}</p>
              <button className="mt-2 text-[8px] text-white/45">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Analytics() {
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Analytics</h2>
          <p className="text-[9px] text-white/45">
            Your shop performance this month.
          </p>
        </div>
        <BarChart3 className="size-5 text-violet-300" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ['Revenue', '€4,250'],
          ['Orders', '128'],
          ['Average order', '€33.20'],
          ['Returning buyers', '38%'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-[#171329] p-4"
          >
            <p className="text-[9px] text-white/45">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
            <p className="mt-2 flex items-center gap-1 text-[8px] text-emerald-300">
              <CheckCircle2 className="size-3" />
              Growing this month
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/8 bg-[#0d0e1d] p-4">
        <p className="text-xs font-medium">Traffic by day</p>
        <div className="mt-5 flex h-32 items-end gap-2">
          {[42, 65, 54, 88, 72, 96, 78].map((height, index) => (
            <div
              key={index}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span
                style={{ height: `${height}%` }}
                className="w-full rounded-t bg-gradient-to-t from-violet-600 to-pink-400"
              />
              <span className="text-[8px] text-white/35">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OrderRow({
  id,
  item,
  buyer,
  price,
  status,
  image,
}: (typeof orders)[number]) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="relative size-9 overflow-hidden rounded-lg">
        <Image src={image} alt="" fill sizes="36px" className="object-cover" />
      </span>
      <div className="flex-1">
        <p className="text-[9px]">
          {id} · {item}
        </p>
        <p className="text-[8px] text-white/40">
          {buyer} ·{' '}
          <span
            className={
              status === 'Processing' ? 'text-amber-300' : 'text-emerald-300'
            }
          >
            {status}
          </span>
        </p>
      </div>
      <span className="text-[9px]">{price}</span>
    </div>
  );
}
