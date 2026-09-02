'use client';

import {
  Bell,
  ChevronRight,
  Compass,
  Home,
  Inbox,
  Menu,
  Search,
  Settings2,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const categories = [
  {
    label: 'Cosplay',
    meta: '2.8K items',
    image: '/hd-category-cosplay.png',
    reference: false,
  },
  {
    label: 'Manga & Comics',
    meta: '3.6K items',
    image: '/hd-category-manga.png',
    reference: false,
  },
  {
    label: 'Figures',
    meta: '4.1K items',
    image: '/hd-category-figures.png',
    reference: false,
  },
  {
    label: 'Cards',
    meta: '2.2K items',
    image: '/hd-category-cards.png',
    reference: false,
  },
  {
    label: 'Gaming',
    meta: '3.0K items',
    image: '/hd-category-gaming.png',
    reference: false,
  },
  {
    label: 'Artist Alley',
    meta: '1.5K items',
    image: '/category-artist.png',
    reference: false,
  },
];

export default function HomePage() {
  return (
    <main className="mobile-app-stage min-h-dvh bg-[#05060f] text-white">
      <div className="phone-shell relative mx-auto min-h-dvh w-full max-w-[390px] overflow-hidden border-white/10 bg-[#080918] sm:my-2 sm:min-h-[calc(100dvh-1rem)] sm:rounded-[34px] sm:border sm:shadow-[0_30px_100px_rgba(0,0,0,.58)]">
        <div className="pointer-events-none absolute -right-32 top-24 size-80 rounded-full bg-fuchsia-500/10 blur-[100px]" />

        <header className="relative z-20 px-4 pb-2 pt-3">
          <div className="flex h-10 items-center justify-between">
            <Link
              href="/community"
              aria-label="Open community"
              className="grid size-9 place-items-center text-white"
            >
              <Menu className="size-6" />
            </Link>
            <Link
              href="/"
              className="brand-wordmark text-[1.3rem]!"
              aria-label="COSMORA home"
            >
              COSMORA
            </Link>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative text-white"
              >
                <Bell />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-fuchsia-400" />
              </Button>
              <Link
                href="/cart"
                aria-label="Shopping cart"
                className="relative grid size-9 place-items-center text-white"
              >
                <ShoppingBag />
                <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-fuchsia-500 text-[9px] font-bold">
                  3
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#817c96]" />
              <Input
                aria-label="Search COSMORA"
                placeholder="Search for items, people, events…"
                className="h-10 rounded-xl border-white/8 bg-[#17172b] pl-9 text-[13px] shadow-inner placeholder:text-[#7f7a91]"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Search filters"
              className="size-10 rounded-xl border-white/8 bg-[#17172b] text-white"
            >
              <Settings2 />
            </Button>
          </div>
        </header>

        <section className="relative z-10 space-y-2 px-4">
          <article className="event-hero relative min-h-[225px] overflow-hidden rounded-[22px] border border-white/10">
            <Image
              src="/cosmora-hero.png"
              alt="Original COSMORA cosplayer at a European convention"
              fill
              priority
              sizes="(max-width: 640px) 100vw, 470px"
              className="object-cover object-[70%_center] brightness-[1.2] saturate-[1.18]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,17,.88)_0%,rgba(8,8,24,.54)_47%,rgba(5,5,15,.02)_100%)]" />
            <div className="relative z-10 flex min-h-[225px] max-w-[72%] flex-col justify-center p-4">
              <Badge className="mb-3 h-6 border border-pink-200/20 bg-gradient-to-r from-[#d938a5] to-[#813ee8] px-2.5 text-[10px] tracking-wide text-white">
                EVENT MODE
              </Badge>
              <h1 className="text-[40px] font-black leading-[.88] tracking-[-.04em] text-white">
                LUCCA
                <br />
                <span className="bg-gradient-to-r from-[#ff5cab] to-[#ff4f78] bg-clip-text text-transparent">
                  2026
                </span>
              </h1>
              <p className="mt-3 text-[11px] font-medium leading-4 text-white/90">
                28 OCT – 1 NOV 2026
                <br />
                Lucca Comics & Games
              </p>
              <p className="mt-2 max-w-[190px] text-[11px] leading-4 text-white/68">
                Be part of Europe&apos;s biggest pop culture event.
              </p>
              <Link
                href="/events/lucca-comics-2026"
                className="mt-4 flex h-9 w-fit items-center gap-1 rounded-xl bg-gradient-to-r from-[#ff4fa6] to-[#bd45ef] px-4 text-xs"
              >
                Explore Event <ChevronRight className="size-4" />
              </Link>
            </div>
          </article>

          <div
            className="flex justify-center gap-1.5"
            aria-label="Featured slide 1 of 5"
          >
            <span className="h-1.5 w-4 rounded-full bg-white" />
            {[0, 1, 2, 3].map((dot) => (
              <span key={dot} className="size-1.5 rounded-full bg-white/25" />
            ))}
          </div>

          <section id="categories">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Browse Categories</h2>
              <Link
                href="/#categories"
                className="text-[11px] font-medium text-fuchsia-300"
              >
                See all
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(({ label, meta, image, reference }) => (
                <Link
                  href={
                    label === 'Artist Alley'
                      ? '/profile/stardust-atelier'
                      : `/marketplace?category=${encodeURIComponent(label === 'Manga & Comics' ? 'Comics' : label)}`
                  }
                  key={label}
                  aria-label={`${label}, ${meta}`}
                  className={`mobile-category ${reference ? 'reference-card' : 'artist-card'}`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                  {!reference && (
                    <div className="category-copy">
                      <p className="line-clamp-1 text-[11px] font-semibold">
                        {label}
                      </p>
                      <p className="mt-0.5 text-[9px] text-white/70">{meta}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <Link
            id="events"
            href="/events"
            aria-label="Events — Find conventions and meetups"
            className="events-strip relative block aspect-[358/77] overflow-hidden rounded-[14px]"
          >
            <Image
              src="/reference-events.png"
              alt=""
              fill
              sizes="378px"
              className="object-cover"
            />
          </Link>
        </section>

        <nav
          className="relative z-50 mt-3 grid h-[58px] grid-cols-5 border-t border-white/10 bg-[#080918] px-2"
          aria-label="Mobile navigation"
        >
          <MobileLink icon={Home} label="Home" href="/" active />
          <MobileLink icon={Compass} label="Explore" href="/explore" />
          <Link
            href="/sell"
            className="flex flex-col items-center justify-center gap-0.5 text-[8px] text-white"
          >
            <span className="grid size-8 place-items-center rounded-full border border-white/15 bg-[#121327]">
              <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-[#ff4ca6] to-[#824ff6]">
                <ShoppingBag className="size-3" />
              </span>
            </span>
            Sell
          </Link>
          <MobileLink icon={Inbox} label="Inbox" href="/inbox" />
          <MobileLink
            icon={UserRound}
            label="Profile"
            href="/profile/stardust-atelier"
          />
        </nav>
      </div>
    </main>
  );
}

function MobileLink({
  icon: Icon,
  label,
  active,
  href,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 text-[8px] ${active ? 'text-fuchsia-300' : 'text-[#8d899c]'}`}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </Link>
  );
}
