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
import {
  exploreDiscoveries,
  exploreSections,
  filterExploreDiscoveries,
  type ExploreDiscovery,
  type ExploreSection,
} from '@/lib/explore-data';
import { ProfileDirectory } from '@/components/profile-directory';
import { DISCOVERY_CARD_CHROME } from '@/lib/mobile-layout';
import { CrewList } from '@/components/crew-list';
import { LiveListings } from '@/components/live-listings';

const discoveryIcons = {
  bag: ShoppingBag,
  calendar: CalendarDays,
  user: UserRound,
  users: UsersRound,
  sparkles: Sparkles,
} as const;

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<ExploreSection>(() =>
    exploreSections.includes(searchParams.get('section') as ExploreSection)
      ? (searchParams.get('section') as ExploreSection)
      : 'Per te',
  );
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const locationKey = searchParams.toString();
  const [lastLocation, setLastLocation] = useState(locationKey);
  if (lastLocation !== locationKey) {
    setLastLocation(locationKey);
    setQuery(searchParams.get('q') ?? '');
    setSection(
      exploreSections.includes(searchParams.get('section') as ExploreSection)
        ? (searchParams.get('section') as ExploreSection)
        : 'Per te',
    );
  }
  const visible = useMemo(
    () => filterExploreDiscoveries(exploreDiscoveries, section, query),
    [query, section],
  );

  return (
    <MobileShell className="flex flex-col">
      <div className="flex-1 px-3 pb-8 pt-5 sm:px-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.2em] text-pink-300">
            Scopri tutto COSMORA
          </p>
          <h1 className="mt-1 text-[28px] font-semibold">Esplora</h1>
        </div>
        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/65" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca prodotti, eventi, creator o crew"
            className="h-11 w-full rounded-xl border border-white/10 bg-[#17172b] pl-9 pr-3 text-base outline-none focus:border-pink-400/50"
          />
        </label>
        <div className="mt-4 flex min-h-12 w-full overflow-x-auto border-b border-white/10">
          {exploreSections.map((item) => (
            <button
              key={item}
              onClick={() => setSection(item)}
              aria-pressed={section === item}
              className={`shrink-0 px-3 py-3 text-sm ${section === item ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/70'}`}
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
              src="/cosmora-hero-mobile.jpg"
              alt="COSMORA cosplay discovery"
              fill
              priority
              sizes="(max-width: 430px) 100vw, 430px"
              className="object-cover object-[70%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09091b]/95 via-[#09091b]/65 to-transparent" />
            <div className="relative flex h-full max-w-[68%] flex-col justify-center p-4">
              <span className="text-xs font-semibold uppercase tracking-[.16em] text-pink-300">
                In evidenza
              </span>
              <h2 className="mt-2 text-lg font-semibold">
                Trova il tuo prossimo cosplay
              </h2>
              <p className="mt-1 text-xs leading-4 text-white/55">
                Prodotti, creator e community nello stesso universo.
              </p>
              <span className="mt-3 flex items-center text-xs text-pink-300">
                Esplora Cosplay <ChevronRight className="size-3" />
              </span>
            </div>
          </Link>
        )}

        {section === 'Creator' ? (
          <div className="mt-5">
            <ProfileDirectory query={query} />
          </div>
        ) : section === 'Crew' ? (
          <div className="mt-5">
            <Link href="/squads" className="mb-4 block text-pink-300">
              Tutte le crew e gli incontri →
            </Link>
            <CrewList />
          </div>
        ) : (
          <>
            {(section === 'Prodotti' || (section === 'Per te' && query)) && (
              <div className="mt-5">
                <LiveListings query={query} />
              </div>
            )}
            <div className="discovery-grid mb-2 mt-4 grid grid-cols-2 items-stretch gap-3">
              {visible.map((item) => (
                <DiscoveryCard
                  key={`${item.section}-${item.title}`}
                  item={item}
                />
              ))}
            </div>
            {!visible.length && section !== 'Prodotti' && (
              <div className="py-20 text-center">
                <Search className="mx-auto size-8 text-white/20" />
                <p className="mt-3 text-xs text-white/65">
                  Nessun risultato trovato.
                </p>
                <button
                  onClick={() => {
                    setQuery('');
                    setSection('Per te');
                  }}
                  className="mt-3 text-xs text-pink-300"
                >
                  Azzera ricerca
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

function DiscoveryCard({ item }: { item: ExploreDiscovery }) {
  const Icon = discoveryIcons[item.icon];
  return (
    <Link
      href={item.href}
      className="discovery-card flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#111225] transition hover:border-pink-400/25"
    >
      <div
        className={`discovery-card-media relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-[#17172b] ${item.imageFit === 'contain' ? 'discovery-card-media-logo p-3' : ''}`}
      >
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 430px) 50vw, 215px"
          className={
            item.imageFit === 'contain' ? 'object-contain' : 'object-cover'
          }
          style={{
            objectFit: item.imageFit === 'contain' ? 'contain' : 'cover',
          }}
        />
        <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-lg border border-white/10 bg-[#090a18]/80 backdrop-blur">
          <Icon className="size-3.5 text-pink-300" />
        </span>
      </div>
      <div
        className={`${DISCOVERY_CARD_CHROME.bodyHeightClass} flex shrink-0 flex-col p-3`}
      >
        <span className="shrink-0 text-xs font-medium uppercase tracking-[.12em] text-violet-300">
          {item.section}
        </span>
        <h2 className="mt-1 line-clamp-2 text-base font-medium leading-6">
          {item.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/65">
          {item.meta}
        </p>
      </div>
    </Link>
  );
}
