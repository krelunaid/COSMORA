'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  ChevronRight,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';

import { MobileNav, MobileShell } from '@/components/mobile-shell';

type ExploreSection =
  | 'Per te'
  | 'Prodotti'
  | 'Eventi'
  | 'Creator'
  | 'Crew'
  | 'Community';

const sections: ExploreSection[] = [
  'Per te',
  'Prodotti',
  'Eventi',
  'Creator',
  'Crew',
  'Community',
];

const discoveries = [
  {
    section: 'Prodotti' as const,
    title: 'Cosplay e accessori',
    meta: 'Compra oppure noleggia',
    image: '/hd-category-cosplay.png',
    href: '/marketplace?category=Cosplay',
    icon: ShoppingBag,
  },
  {
    section: 'Prodotti' as const,
    title: 'Manga & Comics',
    meta: 'Edizioni e collezioni',
    image: '/hd-category-manga.png',
    href: '/marketplace?category=Comics',
    icon: ShoppingBag,
  },
  {
    section: 'Prodotti' as const,
    title: 'Figures',
    meta: 'Figure e collectibles',
    image: '/hd-category-figures.png',
    href: '/marketplace?category=Figures',
    icon: ShoppingBag,
  },
  {
    section: 'Eventi' as const,
    title: 'Lucca Comics & Games 2026',
    meta: 'Lucca · 28 OTT–1 NOV',
    image: '/events/lucca-comics-games.jpg',
    href: '/events/lucca-comics-2026',
    icon: CalendarDays,
  },
  {
    section: 'Eventi' as const,
    title: 'gamescom 2026',
    meta: 'Colonia · 26–30 AGO',
    image: '/events/gamescom.png',
    href: '/events',
    icon: CalendarDays,
  },
  {
    section: 'Creator' as const,
    title: 'Stardust Atelier',
    meta: 'Cosplay creator · Commissioni aperte',
    image: '/category-artist.png',
    href: '/profile/stardust-atelier',
    icon: UserRound,
  },
  {
    section: 'Crew' as const,
    title: 'One Piece Crew — Lucca',
    meta: '8/12 membri · Cerca personaggi',
    image: '/community/squad-example.jpg',
    href: '/squads/one-piece-crew-lucca-2026',
    icon: UsersRound,
  },
  {
    section: 'Community' as const,
    title: 'Community COSMORA',
    meta: 'Post, collezioni e making of',
    image: '/community/meetup-example.jpg',
    href: '/community',
    icon: Sparkles,
  },
];

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<ExploreSection>('Per te');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const visible = useMemo(
    () =>
      discoveries.filter(
        (item) =>
          (section === 'Per te' || item.section === section) &&
          `${item.title} ${item.meta} ${item.section}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, section],
  );

  return (
    <MobileShell className="flex max-w-[480px] flex-col">
      <div className="flex-1 px-3 pb-2 pt-5 sm:px-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[.2em] text-pink-300">
            Scopri tutto COSMORA
          </p>
          <h1 className="mt-1 text-[28px] font-semibold">Esplora</h1>
        </div>
        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca prodotti, eventi, creator o crew"
            className="h-11 w-full rounded-xl border border-white/10 bg-[#17172b] pl-9 pr-3 text-xs outline-none focus:border-pink-400/50"
          />
        </label>
        <div className="mt-4 grid h-11 w-full grid-cols-6 border-b border-white/10">
          {sections.map((item) => (
            <button
              key={item}
              onClick={() => setSection(item)}
              className={`min-w-0 px-0.5 text-[9px] sm:text-[10px] ${section === item ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/45'}`}
            >
              {item}
            </button>
          ))}
        </div>

        {section === 'Per te' && !query && (
          <Link
            href="/marketplace?category=Cosplay"
            className="relative mt-4 block h-44 overflow-hidden rounded-2xl border border-violet-400/20 sm:h-48"
          >
            <Image
              src="/cosmora-hero.png"
              alt="COSMORA cosplay discovery"
              fill
              priority
              sizes="398px"
              className="object-cover object-[70%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09091b]/95 via-[#09091b]/65 to-transparent" />
            <div className="relative flex h-full max-w-[68%] flex-col justify-center p-4">
              <span className="text-[8px] font-semibold uppercase tracking-[.16em] text-pink-300">
                In evidenza
              </span>
              <h2 className="mt-2 text-lg font-semibold">
                Trova il tuo prossimo cosplay
              </h2>
              <p className="mt-1 text-[9px] leading-4 text-white/55">
                Prodotti, creator e community nello stesso universo.
              </p>
              <span className="mt-3 flex items-center text-[9px] text-pink-300">
                Esplora Cosplay <ChevronRight className="size-3" />
              </span>
            </div>
          </Link>
        )}

        <div className="mb-4 mt-4 grid grid-cols-2 gap-3">
          {visible.map((item) => (
            <DiscoveryCard key={`${item.section}-${item.title}`} item={item} />
          ))}
        </div>
        {!visible.length && (
          <div className="py-20 text-center">
            <Search className="mx-auto size-8 text-white/20" />
            <p className="mt-3 text-xs text-white/45">
              Nessun risultato trovato.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setSection('Per te');
              }}
              className="mt-3 text-[10px] text-pink-300"
            >
              Azzera ricerca
            </button>
          </div>
        )}
      </div>
      <MobileNav active="explore" wide />
    </MobileShell>
  );
}

function DiscoveryCard({ item }: { item: (typeof discoveries)[number] }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="overflow-hidden rounded-2xl border border-white/8 bg-[#111225] transition hover:border-pink-400/25"
    >
      <div className="relative h-36 sm:h-40">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="220px"
          className="object-cover"
        />
        <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-lg border border-white/10 bg-[#090a18]/80 backdrop-blur">
          <Icon className="size-3.5 text-pink-300" />
        </span>
      </div>
      <div className="min-h-[86px] p-3.5">
        <span className="text-[7px] font-medium uppercase tracking-[.12em] text-violet-300">
          {item.section}
        </span>
        <h2 className="mt-1 text-xs font-medium leading-4">{item.title}</h2>
        <p className="mt-1.5 text-[9px] leading-3 text-white/45">{item.meta}</p>
      </div>
    </Link>
  );
}
