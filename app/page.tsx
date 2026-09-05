import { Bell, CalendarDays, ChevronRight, Menu, Search } from 'lucide-react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { MobileNav, MobileShell } from '@/components/mobile-shell';

const categories = [
  {
    label: 'Cosplay',
    category: 'Cosplay',
    image: '/mobile-category-cosplay.jpg',
  },
  {
    label: 'Manga e fumetti',
    category: 'Comics',
    image: '/mobile-category-manga.jpg',
  },
  {
    label: 'Figure',
    category: 'Figures',
    image: '/mobile-category-figures.jpg',
  },
  { label: 'Carte', category: 'Cards', image: '/mobile-category-cards.jpg' },
  { label: 'Gaming', category: 'Gaming', image: '/mobile-category-gaming.jpg' },
  {
    label: 'Creator',
    href: '/explore?section=Creator',
    image: '/mobile-category-artist.jpg',
  },
];

export default function HomePage() {
  return (
    <MobileShell className="home-shell flex flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <Link
          href="/community"
          aria-label="Apri community"
          className="grid size-11 place-items-center rounded-xl active:bg-white/10"
        >
          <Menu />
        </Link>
        <Link href="/" className="brand-wordmark" aria-label="COSMORA home">
          COSMORA
        </Link>
        <Link
          href="/inbox"
          aria-label="Messaggi e ordini"
          className="grid size-11 place-items-center rounded-xl active:bg-white/10"
        >
          <Bell />
        </Link>
      </header>
      <form
        action="/explore"
        method="get"
        className="mx-4 mb-3 flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-[#17172b] px-3"
      >
        <Search className="size-5 shrink-0 text-white/50" />
        <input
          name="q"
          aria-label="Cerca in COSMORA"
          placeholder="Prodotti, eventi, persone…"
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        <button
          aria-label="Cerca"
          className="grid size-11 shrink-0 place-items-center text-pink-300"
        >
          <ChevronRight />
        </button>
      </form>
      <div className="home-main-content px-4 pb-2">
        <article className="home-event-hero relative overflow-hidden rounded-3xl border border-white/15">
          <Image
            src="/cosmora-hero-mobile.jpg"
            alt="Cosplayer fantasy, illustrazione COSMORA"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 430px"
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080918]/95 via-[#080918]/70 to-transparent" />
          <div className="relative flex h-full flex-col items-start justify-center gap-2 p-4">
            <span className="rounded-full bg-fuchsia-500/25 px-3 py-1 text-xs font-semibold text-pink-200">
              IN EVIDENZA
            </span>
            <h1 className="text-4xl font-bold leading-none">
              LUCCA <span className="block text-pink-400">2026</span>
            </h1>
            <p className="max-w-[65%] text-sm leading-relaxed text-white/85">
              28 ottobre – 1 novembre
              <br />
              Lucca Comics &amp; Games
            </p>
            <Link
              href="/events/lucca-comics-2026"
              className="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-sm font-semibold"
            >
              Scopri l’evento <ChevronRight className="size-4" />
            </Link>
          </div>
        </article>
        <section className="home-categories-section">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Le tue passioni</h2>
            <Link
              href="/marketplace"
              className="flex min-h-11 items-center text-sm text-pink-300"
            >
              Tutti gli annunci
            </Link>
          </div>
          <div className="home-categories-grid grid grid-cols-3 gap-2">
            {categories.map((item) => (
              <Link
                key={item.label}
                href={item.href || `/marketplace?category=${item.category}`}
                className="mobile-category home-category"
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="140px"
                  className="object-cover"
                />
                <div className="category-copy">
                  <p className="text-sm font-semibold leading-snug">
                    {item.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <Link
          href="/events"
          className="home-events-strip flex items-center gap-3 rounded-2xl border border-violet-400/30 bg-gradient-to-r from-violet-950 to-fuchsia-950 p-4"
        >
          <CalendarDays className="size-7 shrink-0 text-pink-300" />
          <span className="flex-1">
            <b className="block text-base">Eventi in Europa</b>
            <span className="text-sm text-white/75">
              Fiere, festival e incontri
            </span>
          </span>
          <ChevronRight className="size-5" />
        </Link>
      </div>
      <MobileNav active="home" />
    </MobileShell>
  );
}
