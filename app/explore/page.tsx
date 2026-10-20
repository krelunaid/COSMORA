'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator } from '@/lib/i18n/community';
import { categoryPageText } from '@/lib/i18n/category-pages';
import { europeEvents } from '@/lib/events-data';
import {
  formatEventDates,
  selectFeaturedEvent,
} from '@/lib/event-selection';
import { useEventDay } from '@/components/use-event-day';
import Image from 'next/image';
import Link from '@/components/app-link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
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
import { EventCover, EventMediaCredit } from '@/components/event-cover';

const discoveryIcons = {
  bag: ShoppingBag,
  calendar: CalendarDays,
  user: UserRound,
  users: UsersRound,
  sparkles: Sparkles,
} as const;

export default function ExplorePage() {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const today = useEventDay();
  const homeEventName = selectFeaturedEvent(europeEvents, today)?.name;
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
  const discoveries = useMemo(() => {
    const cards = exploreDiscoveries
      .filter(
        (item) =>
          item.section !== 'Eventi' &&
          item.section !== 'Prodotti' &&
          item.section !== 'Creator',
      )
      .map((item) => ({
        ...item,
        title: t(item.title),
        meta: t(item.meta),
      }));
    const events: ExploreDiscovery[] = europeEvents
      .filter(
        (event) =>
          event.end >= today &&
          (section !== 'Per te' || query.trim() || event.name !== homeEventName),
      )
      .sort(
        (a, b) =>
          a.start.localeCompare(b.start) || a.name.localeCompare(b.name),
      )
      .slice(0, section === 'Eventi' || query.trim() ? undefined : 2)
      .map((event) => ({
        section: 'Eventi',
        icon: 'calendar',
        imageFit: 'contain',
        title: event.name,
        meta: `${event.city} · ${formatEventDates(event, locale)}`,
        image: event.image,
        href: event.internalUrl || event.url,
      }));
    return [...cards.slice(0, 3), ...events, ...cards.slice(3)];
  }, [locale, t, today, homeEventName, section, query]);
  const visible = useMemo(
    () => filterExploreDiscoveries(discoveries, section, query, t),
    [discoveries, query, section, t],
  );
  const focusedPeople =
    searchParams.get('section') === 'Creator' && section === 'Creator';
  const searchLabel = focusedPeople
    ? categoryPageText(locale, 'peopleSearch')
    : t('Cerca prodotti, eventi, persone o crew');

  return (
    <MobileShell className="flex flex-col">
      <div className="flex-1 px-3 pb-8 pt-5 sm:px-4">
        <div>
          {focusedPeople ? (
            <Link
              href="/explore"
              className="mb-3 flex min-h-11 items-center text-sm text-white/70"
            >
              ← {categoryPageText(locale, 'browseExplore')}
            </Link>
          ) : (
            <p className="text-xs font-medium uppercase tracking-[.2em] text-pink-300">
              {t('Scopri tutto COSMORA')}
            </p>
          )}
          <h1 className="mt-1 text-[28px] font-semibold">
            {focusedPeople ? t('Creator') : t('Esplora')}
          </h1>
          {focusedPeople && (
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              {categoryPageText(locale, 'peopleIntro')}
            </p>
          )}
        </div>
        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/65" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="h-11 w-full rounded-xl border border-white/10 bg-[#17172b] pl-9 pr-3 text-base outline-none focus:border-pink-400/50"
          />
        </label>
        {!focusedPeople && (
          <div className="mt-4 flex min-h-12 w-full overflow-x-auto border-b border-white/10">
            {exploreSections
              .filter((item) => item !== 'Creator')
              .map((item) => (
                <button
                  key={item}
                  onClick={() => setSection(item)}
                  aria-pressed={section === item}
                  className={`shrink-0 px-3 py-3 text-sm ${section === item ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/70'}`}
                >
                  {t(item)}
                </button>
              ))}
          </div>
        )}

        {section === 'Creator' ? (
          <div className="mt-5">
            <ProfileDirectory query={query} />
          </div>
        ) : section === 'Crew' ? (
          <div className="mt-5">
            <Link href="/squads" className="mb-4 block text-pink-300">
              {t('Tutte le crew e gli incontri →')}
            </Link>
            <CrewList query={query} />
          </div>
        ) : (
          <>
            {section === 'Prodotti' ? (
              <section className="mt-5" aria-labelledby="marketplace-listings">
                <h2
                  id="marketplace-listings"
                  className="mb-1 text-lg font-semibold"
                >
                  {t('Annunci del marketplace')}
                </h2>
                <p className="mb-3 text-sm text-white/60">
                  {t('Tutti i prodotti disponibili')}
                </p>
                <LiveListings query={query} />
              </section>
            ) : (
              <>
                {section === 'Per te' && query && (
                  <div className="mt-5">
                    <LiveListings query={query} />
                  </div>
                )}
                <div className="discovery-grid mb-2 mt-4 grid grid-cols-2 items-stretch gap-3">
                  {visible.map((item) => (
                    <DiscoveryCard
                      key={`${t(item.section)}-${item.title}`}
                      item={item}
                    />
                  ))}
                </div>
              </>
            )}
            {!visible.length &&
              section !== 'Prodotti' &&
              !(section === 'Per te' && query) && (
                <div className="py-20 text-center">
                  <Search className="mx-auto size-8 text-white/20" />
                  <p className="mt-3 text-base text-white/75">
                    {t('Nessun risultato trovato.')}
                  </p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setSection('Per te');
                    }}
                    className="mt-3 min-h-11 px-3 text-sm text-pink-300"
                  >
                    {t('Azzera ricerca')}
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
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const Icon = discoveryIcons[item.icon];
  const event = item.section === 'Eventi' ? europeEvents.find((entry) => entry.internalUrl === item.href) : undefined;
  return (
    <article className="discovery-card flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#111225] transition hover:border-pink-400/25">
    <Link
      href={item.href}
      target={item.href.startsWith('https://') ? '_blank' : undefined}
      rel={item.href.startsWith('https://') ? 'noopener noreferrer' : undefined}
      className="flex min-w-0 flex-1 flex-col"
    >
      <div
        className={`discovery-card-media relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-[#17172b] ${item.imageFit === 'contain' ? 'discovery-card-media-logo p-3' : ''}`}
      >
        {event ? <div className="absolute inset-0"><EventCover event={event} showDetails={false} className="h-full w-full" sizes="(max-width: 430px) 50vw, 215px" /></div> : <Image
          src={item.image}
          alt=""
          fill
          sizes="(max-width: 430px) 50vw, 215px"
          className={
            item.imageFit === 'contain' ? 'object-contain' : 'object-cover'
          }
          style={{
            objectFit: item.imageFit === 'contain' ? 'contain' : 'cover',
          }}
        />}
        <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-lg border border-white/10 bg-[#090a18]/80 backdrop-blur">
          <Icon className="size-3.5 text-pink-300" />
        </span>
      </div>
      <div
        className={`${DISCOVERY_CARD_CHROME.bodyHeightClass} flex shrink-0 flex-col p-3`}
      >
        <span className="shrink-0 text-xs font-medium uppercase tracking-[.12em] text-violet-300">
          {t(item.section)}
        </span>
        <h2 className="mt-1 line-clamp-2 text-base font-medium leading-6">
          {item.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/65">
          {item.meta}
        </p>
      </div>
    </Link>
    {event && <EventMediaCredit event={event} className="border-t border-white/5 px-3 py-2" />}
    </article>
  );
}
