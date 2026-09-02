'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Heart, Search, Settings2, ShoppingCart, Star } from 'lucide-react';

import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { products, euro } from '@/lib/marketplace-data';

const categories = ['Cosplay', 'Comics', 'Figures', 'Cards', 'Gaming', 'All'];

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get('category');
  const [category, setCategory] = useState(
    requestedCategory && categories.includes(requestedCategory)
      ? requestedCategory
      : 'Cosplay',
  );
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'buy' | 'rent'>('buy');
  const [country, setCountry] = useState('All');
  const [condition, setCondition] = useState('Any condition');
  const [maxPrice, setMaxPrice] = useState('');
  const [minimumRating, setMinimumRating] = useState('0');
  const [freeShipping, setFreeShipping] = useState(false);
  const [localPickupOnly, setLocalPickupOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visible = useMemo(
    () =>
      products.filter((product) => {
        const supportsMode =
          mode === 'buy'
            ? Boolean(product.buyPrice)
            : Boolean(product.rentPrice);
        const activePrice =
          mode === 'buy' ? product.buyPrice : product.rentPrice;
        return (
          supportsMode &&
          (category === 'All' || product.category === category) &&
          (country === 'All' || product.country === country) &&
          (condition === 'Any condition' || product.condition === condition) &&
          (!maxPrice || (activePrice ?? 0) <= Number(maxPrice)) &&
          Number.parseFloat(product.rating) >= Number(minimumRating) &&
          (!freeShipping || product.shipping === 'Free shipping') &&
          (!localPickupOnly || product.localPickup) &&
          (!verifiedOnly || product.verified) &&
          product.name.toLowerCase().includes(query.toLowerCase())
        );
      }),
    [
      category,
      condition,
      country,
      freeShipping,
      localPickupOnly,
      maxPrice,
      minimumRating,
      mode,
      query,
      verifiedOnly,
    ],
  );
  return (
    <MobileShell className="flex flex-col">
      <div className="flex-1 px-4 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Marketplace</h1>
          <Link href="/cart" aria-label="Cart" className="relative">
            <ShoppingCart />
            <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-fuchsia-500 text-[9px]">
              4
            </span>
          </Link>
        </div>
        <div className="mt-4 flex gap-2">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search items, brands, or sellers"
              className="h-10 w-full rounded-xl border border-white/10 bg-[#17172b] pl-9 pr-3 text-xs outline-none focus:border-fuchsia-400/50"
            />
          </label>
          <button
            onClick={() => setFiltersOpen((value) => !value)}
            aria-label="Filters"
            className={`grid size-10 place-items-center rounded-xl border ${filtersOpen ? 'border-pink-400 bg-pink-400/10 text-pink-300' : 'border-white/10 bg-[#17172b]'}`}
          >
            <Settings2 className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 border-b border-white/10 text-center text-xs">
          <button
            onClick={() => setMode('buy')}
            className={`pb-2 ${mode === 'buy' ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/60'}`}
          >
            Buy
          </button>
          <Link href="/sell" className="pb-2 text-white/60">
            Sell
          </Link>
          <button
            onClick={() => setMode('rent')}
            className={`pb-2 ${mode === 'rent' ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/60'}`}
          >
            Rent
          </button>
        </div>
        {filtersOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-[#111225] p-3">
            <label className="text-[9px] text-white/45">
              Country
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#17172b] px-2 text-[10px] text-white"
              >
                <option>All</option>
                {['Italy', 'France', 'Germany', 'Spain', 'Belgium'].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
              </select>
            </label>
            <label className="text-[9px] text-white/45">
              Condition
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#17172b] px-2 text-[10px] text-white"
              >
                <option>Any condition</option>
                <option>New</option>
                <option>Like New</option>
                <option>Used</option>
              </select>
            </label>
            <label className="text-[9px] text-white/45">
              Maximum price
              <input
                inputMode="decimal"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="No limit"
                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#17172b] px-2 text-[10px] text-white"
              />
            </label>
            <label className="text-[9px] text-white/45">
              Minimum rating
              <select
                value={minimumRating}
                onChange={(event) => setMinimumRating(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#17172b] px-2 text-[10px] text-white"
              >
                <option value="0">Any rating</option>
                <option value="4">4.0+</option>
                <option value="4.5">4.5+</option>
                <option value="4.8">4.8+</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-[9px]">
              <input
                checked={freeShipping}
                onChange={(event) => setFreeShipping(event.target.checked)}
                type="checkbox"
              />{' '}
              Free shipping
            </label>
            <label className="flex items-center gap-2 text-[9px]">
              <input
                checked={localPickupOnly}
                onChange={(event) => setLocalPickupOnly(event.target.checked)}
                type="checkbox"
              />{' '}
              Local pickup
            </label>
            <label className="flex items-center gap-2 text-[9px]">
              <input
                checked={verifiedOnly}
                onChange={(event) => setVerifiedOnly(event.target.checked)}
                type="checkbox"
              />{' '}
              Verified seller
            </label>
            <button
              onClick={() => {
                setCountry('All');
                setCondition('Any condition');
                setMaxPrice('');
                setMinimumRating('0');
                setFreeShipping(false);
                setLocalPickupOnly(false);
                setVerifiedOnly(false);
              }}
              className="text-right text-[9px] text-pink-300"
            >
              Reset filters
            </button>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold">Categories</h2>
          <span className="text-[8px] text-white/35">Choose one</span>
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] ${category === item ? 'border-pink-300/30 bg-gradient-to-r from-pink-500 to-violet-500 text-white' : 'border-white/12 bg-white/[.025] text-white/70'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2 pb-4">
          {visible.map((product) => (
            <ProductRow key={product.slug} product={product} mode={mode} />
          ))}
          {!visible.length && (
            <p className="py-16 text-center text-sm text-white/50">
              No products found.
            </p>
          )}
        </div>
      </div>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

function ProductRow({
  product,
  mode,
}: {
  product: (typeof products)[number];
  mode: 'buy' | 'rent';
}) {
  return (
    <Link
      href={`/marketplace/${product.slug}`}
      className="grid min-h-[116px] grid-cols-[128px_1fr] overflow-hidden rounded-2xl border border-white/8 bg-[#111225]"
    >
      <div className="relative">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="128px"
          className="object-cover"
        />
      </div>
      <div className="relative p-3">
        <Heart className="absolute right-3 top-3 size-4 text-white/70" />
        <span className="absolute right-3 bottom-3 text-[9px] text-emerald-300">
          {mode === 'rent' ? 'Public handover only' : product.shipping}
        </span>
        <h2 className="max-w-[145px] text-xs font-medium leading-4">
          {product.name}
        </h2>
        <p className="mt-2 text-[9px] text-white/55">
          {product.seller}{' '}
          <span className="ml-2 inline-flex items-center text-amber-300">
            <Star className="mr-0.5 size-2.5 fill-current" />
            {product.rating}
          </span>
        </p>
        <p className="mt-2 text-base font-semibold text-pink-400">
          {mode === 'rent'
            ? `${euro(product.rentPrice ?? product.price)} / ${product.rentDays} days`
            : euro(product.buyPrice ?? product.price)}
        </p>
        {mode === 'buy' && product.rentPrice && (
          <p className="text-[8px] text-white/40">
            Rent from {euro(product.rentPrice)} / {product.rentDays} days
          </p>
        )}
        {product.buyPrice && product.rentPrice && (
          <span className="absolute right-3 top-9 rounded bg-violet-500/30 px-1.5 py-0.5 text-[8px] text-violet-200">
            Buy + Rent
          </span>
        )}
      </div>
    </Link>
  );
}
