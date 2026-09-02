'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LockKeyhole, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { euro, products } from '@/lib/marketplace-data';
import { PLATFORM_FEE_RULES } from '@/lib/monetization';

export default function CartPage() {
  const [quantities, setQuantities] = useState([1, 1, 1, 1]);
  const items = products.slice(0, 4);
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item, index) => sum + item.price * quantities[index],
        0,
      ),
    [items, quantities],
  );
  const change = (index: number, amount: number) =>
    setQuantities((current) =>
      current.map((value, itemIndex) =>
        itemIndex === index ? Math.max(1, value + amount) : value,
      ),
    );
  return (
    <MobileShell>
      <ScreenHeader
        title="Your Cart"
        back="/marketplace"
        action={<button className="text-xs text-pink-300">Edit</button>}
      />
      <div className="px-4 pb-5">
        <div className="divide-y divide-white/10">
          {items.map((item, index) => (
            <div
              key={item.slug}
              className="grid grid-cols-[82px_1fr] gap-3 py-3"
            >
              <div className="relative h-[96px] overflow-hidden rounded-xl">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="82px"
                  className="object-cover"
                />
              </div>
              <div className="relative">
                <Trash2 className="absolute right-0 top-1 size-3.5 text-white/45" />
                <h2 className="max-w-[205px] text-[11px] leading-4">
                  {item.name}
                </h2>
                <p className="mt-1 text-[9px] text-white/45">
                  {item.mode === 'Rent' ? 'Rent / 3 days' : item.category}
                </p>
                <p className="mt-1 text-xs font-semibold text-pink-400">
                  {euro(item.price)}
                </p>
                <div className="mt-2 flex w-fit items-center rounded-lg border border-white/12">
                  <button
                    onClick={() => change(index, -1)}
                    className="grid size-6 place-items-center"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center text-[10px]">
                    {quantities[index]}
                  </span>
                  <button
                    onClick={() => change(index, 1)}
                    className="grid size-6 place-items-center"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2 border-y border-white/10 py-4 text-xs">
          <div className="flex justify-between">
            <span className="text-white/60">Subtotal</span>
            <span>{euro(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Shipping</span>
            <span className="text-emerald-300">FREE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Buyer protection</span>
            <span>Included</span>
          </div>
        </div>
        <div className="flex items-center justify-between py-4">
          <b>Total</b>
          <b className="text-xl text-pink-400">{euro(subtotal)}</b>
        </div>
        <Link
          href="/checkout"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium"
        >
          <LockKeyhole className="size-4" />
          Checkout Securely
        </Link>
        <p className="mt-3 text-center text-[9px] text-white/40">
          We accept VISA · Mastercard · PayPal · Apple Pay
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[.025] p-3 text-[9px] text-white/60">
          <ShieldCheck className="size-4 text-violet-300" />
          Buyer Protection included on all orders.
        </div>
        <p className="mt-2 text-center text-[8px] leading-3 text-white/35">
          No buyer service fee. COSMORA retains{' '}
          {PLATFORM_FEE_RULES.sale.rateBps / 100}% from the seller only after a
          completed sale.
        </p>
      </div>
    </MobileShell>
  );
}
