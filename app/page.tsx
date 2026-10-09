'use client';

import { Bell, CalendarDays, ChevronRight, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { useEventDay } from '@/components/use-event-day';
import { EventCover, EventMediaCredit } from '@/components/event-cover';
import { europeEvents } from '@/lib/events-data';
import { formatEventDates, selectFeaturedEvent } from '@/lib/event-selection';
import { eventMessages } from '@/lib/i18n/events';
import { MARKET_CATEGORIES } from '@/lib/marketplace-categories';
import { EVENT_MEDIA } from '@/lib/event-media';

const categories = [
  { label: 'cosplay', category: 'Cosplay', image: MARKET_CATEGORIES.Cosplay.image },
  { label: 'comics', category: 'Comics', image: MARKET_CATEGORIES.Comics.image },
  { label: 'figures', category: 'Figures', image: MARKET_CATEGORIES.Figures.image },
  { label: 'cards', category: 'Cards', image: MARKET_CATEGORIES.Cards.image },
  { label: 'gaming', category: 'Gaming', image: MARKET_CATEGORIES.Gaming.image },
  { label: 'people', href: '/explore?section=Creator', image: '/editorial/category-artist-v2.png' },
] as const;

export default function HomePage() {
  const { locale } = useI18n();
  const copy = eventMessages[locale];
  const today = useEventDay();
  const event = selectFeaturedEvent(europeEvents, today);
  const eventMedia = event ? EVENT_MEDIA[event.name] : undefined;
  const eventLinkClass = 'flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-sm font-semibold';
  const eventAction = event ? (event.internalUrl ? <Link href={event.internalUrl} className={eventLinkClass}>{copy.discover}<ChevronRight className="size-4 shrink-0" /></Link> : <a href={event.url} target="_blank" rel="noopener noreferrer" className={eventLinkClass}>{copy.discover}<ChevronRight className="size-4 shrink-0" /></a>) : null;
  return (
    <MobileShell className="home-shell flex flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <Link href="/community" aria-label={copy.openCommunity} className="grid size-11 place-items-center rounded-xl active:bg-white/10"><Menu /></Link>
        <Link href="/" className="brand-wordmark" aria-label={copy.home}>COSMORA</Link>
        <Link href="/inbox" aria-label={copy.inbox} className="grid size-11 place-items-center rounded-xl active:bg-white/10"><Bell /></Link>
      </header>
      <div className="home-main-content px-4 pb-2">
        <div className="home-event-section">
        <article className="home-event-hero relative overflow-hidden rounded-3xl border border-white/15">
          {event && eventMedia?.kind === 'logo' ? <div className="flex h-full flex-col items-start justify-center gap-2 bg-neutral-950 p-3 min-[360px]:p-4">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_clamp(88px,28vw,120px)] items-center gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-fuchsia-500/25 px-3 py-1 text-xs font-semibold text-pink-200">{event.start <= today ? copy.ongoing : copy.featured}</span>
                <h1 className="mt-2 text-[clamp(1.1rem,5vw,1.4rem)] font-bold leading-tight">{event.name}</h1>
              </div>
              <div className="relative aspect-[1.4] w-full rounded-xl border border-white/10 bg-black">
                <Image src={eventMedia.image} alt="" fill priority sizes="120px" className="object-contain p-1" />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/85">{formatEventDates(event, locale)}<br />{event.flag} {event.city}</p>
            {eventAction}
          </div> : <>
          {event ? <div className="absolute inset-0"><EventCover event={event} priority showDetails={false} className="h-full w-full" sizes="(max-width: 640px) 100vw, 430px" /></div> : <Image src="/editorial/hero.svg" alt="" fill priority sizes="(max-width: 640px) 100vw, 430px" className="object-cover object-center" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/65 to-transparent" />
          <div className="relative flex h-full flex-col items-start justify-center gap-2 p-4">
            {event ? <>
              <span className="rounded-full bg-fuchsia-500/25 px-3 py-1 text-xs font-semibold text-pink-200">{event.start <= today ? copy.ongoing : copy.featured}</span>
              <h1 className="max-w-[90%] text-[clamp(1.35rem,5.5vw,1.8rem)] font-bold leading-tight">{event.name}</h1>
              <p className="text-sm leading-relaxed text-white/85">{formatEventDates(event, locale)}<br />{event.flag} {event.city}</p>
              {eventAction}
            </> : <>
              <h1 className="text-2xl font-bold leading-tight">{copy.noUpcoming}</h1>
              <p className="text-sm text-white/85">{copy.noUpcomingBody}</p>
              <Link href="/events" className={eventLinkClass}>{copy.viewCalendar}<ChevronRight className="size-4 shrink-0" /></Link>
            </>}
          </div>
          </>}
        </article>
        {event && <EventMediaCredit event={event} className="shrink-0 px-1" />}
        </div>
        <section className="home-categories-section">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{copy.passions}</h2>
            <Link href="/marketplace" className="flex min-h-11 items-center text-right text-sm text-pink-300">{copy.listings}</Link>
          </div>
          <div className="home-categories-grid grid grid-cols-3 gap-2">
            {categories.map((item) => <Link key={item.label} href={'href' in item ? item.href : `/marketplace?category=${item.category}`} className="mobile-category home-category">
              <Image src={item.image} alt="" fill sizes="(max-width: 430px) 30vw, 132px" className="home-category-image object-cover" />
              <div className="category-copy"><p className="text-sm font-semibold leading-snug">{copy[item.label]}</p></div>
            </Link>)}
          </div>
        </section>
        <Link href="/events" className="home-events-strip flex items-center gap-3 rounded-2xl border border-violet-400/30 bg-gradient-to-r from-violet-950 to-fuchsia-950 p-4">
          <CalendarDays className="size-7 shrink-0 text-pink-300" /><span className="flex-1"><b className="block text-base">{copy.events}</b><span className="text-sm text-white/75">{copy.eventsSubtitle}</span></span><ChevronRight className="size-5" />
        </Link>
      </div>
      <MobileNav active="home" />
    </MobileShell>
  );
}
