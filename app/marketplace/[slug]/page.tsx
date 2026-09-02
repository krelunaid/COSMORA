import Image from 'next/image';
import Link from '@/components/app-link';
import {
  CalendarDays,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Share2,
  Star,
} from 'lucide-react';

import { MobileShell, SellerChip } from '@/components/mobile-shell';
import { products, euro } from '@/lib/marketplace-data';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug) ?? products[0];
  return (
    <MobileShell>
      <div className="relative h-[430px] bg-[#111225]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority
          sizes="430px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/marketplace"
            className="grid size-9 place-items-center rounded-full bg-black/35 text-2xl"
          >
            ‹
          </Link>
          <div className="flex gap-2">
            <button className="grid size-9 place-items-center rounded-full bg-black/35">
              <Heart className="size-5" />
            </button>
            <button className="grid size-9 place-items-center rounded-full bg-black/35">
              <Share2 className="size-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="-mt-3 rounded-t-[22px] bg-[#080918] px-4 pb-5 pt-4">
        <span className="rounded bg-violet-500/25 px-2 py-1 text-[9px] text-violet-200">
          {product.buyPrice && product.rentPrice
            ? 'BUY + RENT'
            : (product.mode ?? 'Buy')}
        </span>
        <h1 className="mt-2 text-xl font-semibold leading-6">{product.name}</h1>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {product.buyPrice && (
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
              <p className="text-[9px] text-white/45">BUY</p>
              <p className="mt-1 text-lg font-semibold text-pink-400">
                {euro(product.buyPrice)}
              </p>
            </div>
          )}
          {product.rentPrice && (
            <div className="rounded-xl border border-violet-400/25 bg-violet-500/8 p-3">
              <p className="text-[9px] text-violet-200">RENT</p>
              <p className="mt-1 text-lg font-semibold text-pink-400">
                {euro(product.rentPrice)}
              </p>
              <p className="text-[8px] text-white/45">
                {product.rentDays} days · deposit {euro(product.deposit ?? 0)}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-y border-white/10 py-3">
          <SellerChip />
          <span className="flex items-center text-[10px] text-amber-300">
            <Star className="mr-1 size-3 fill-current" />
            {product.rating}
          </span>
        </div>
        <p className="mt-4 text-[10px] leading-4 text-white/65">
          {product.description}
        </p>
        <dl className="mt-3 grid grid-cols-[92px_1fr] gap-y-2 text-[10px]">
          <dt className="text-white/45">Condition</dt>
          <dd>{product.condition}</dd>
          <dt className="text-white/45">Brand</dt>
          <dd>{product.brand}</dd>
          <dt className="text-white/45">Category</dt>
          <dd>{product.category}</dd>
          {product.size && (
            <>
              <dt className="text-white/45">Size</dt>
              <dd>{product.size}</dd>
            </>
          )}
          {product.measurements && (
            <>
              <dt className="text-white/45">Measurements</dt>
              <dd>{product.measurements}</dd>
            </>
          )}
          <dt className="text-white/45">Ships from</dt>
          <dd>{product.country}</dd>
          <dt className="text-white/45">Shipping</dt>
          <dd>{product.shipping}</dd>
          <dt className="text-white/45">Estimated</dt>
          <dd>{product.estimatedDelivery}</dd>
          <dt className="text-white/45">Local pickup</dt>
          <dd>
            {product.localPickup
              ? 'Available — public meeting point only'
              : 'Not available'}
          </dd>
        </dl>
        {product.rentPrice && (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/8 p-3">
              <CalendarDays className="size-5 text-violet-300" />
              <div>
                <p className="text-[10px] font-medium">
                  Check rental availability
                </p>
                <p className="text-[8px] text-white/45">
                  Select dates before completing the rental.
                </p>
              </div>
              <input
                aria-label="Rental start date"
                type="date"
                className="ml-auto w-[118px] rounded-lg border border-white/10 bg-[#111225] p-2 text-[9px]"
              />
            </div>
            <div className="mt-2 flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
              <MapPin className="size-5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-[10px] font-medium">
                  Local public handover only
                </p>
                <p className="mt-1 text-[8px] leading-3 text-white/50">
                  For launch, rentals are collected and returned at an agreed
                  public venue. The rental contract is directly between owner
                  and renter; COSMORA acts as marketplace intermediary.
                </p>
                <Link
                  href="/rental-safety"
                  className="mt-2 inline-block text-[8px] text-emerald-300"
                >
                  How protected rentals work →
                </Link>
              </div>
            </div>
          </>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/8 bg-white/[.03] p-3 text-[9px]">
            <ShieldCheck className="mb-2 size-5 text-violet-300" />
            <b>Buyer Protection</b>
            <p className="mt-1 text-white/45">
              Get your item as described or your money back.
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[.03] p-3 text-[9px]">
            <Star className="mb-2 size-5 text-violet-300" />
            <b>Verified Seller</b>
            <p className="mt-1 text-white/45">
              Trusted community ratings and reviews.
            </p>
          </div>
        </div>
        <Link
          href="/inbox"
          className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] text-xs"
        >
          <MessageCircle className="size-4" />
          Chat with seller
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href={product.rentPrice ? '/checkout?rental=local' : '/cart'}
            className="grid h-11 place-items-center rounded-xl border border-pink-400 text-center text-xs text-pink-300"
          >
            {product.rentPrice ? 'Reserve Local Rental' : 'Add to Cart'}
          </Link>
          <Link
            href="/checkout"
            className="grid h-11 place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium"
          >
            {product.buyPrice ? 'Buy Now' : 'Continue'}
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4 text-[9px]">
          <button className="flex items-center gap-1 text-white/40">
            <Flag className="size-3" />
            Report listing
          </button>
          <Link href="/profile/stardust-atelier" className="text-pink-300">
            Read seller reviews →
          </Link>
        </div>
      </div>
    </MobileShell>
  );
}
