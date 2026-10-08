'use client';

import { Bell, CalendarDays, ChevronRight, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { useEventDay } from '@/components/use-event-day';
import { europeEvents } from '@/lib/events-data';
import { formatEventDates, selectFeaturedEvent } from '@/lib/event-selection';
import { eventMessages } from '@/lib/i18n/events';

const categories = [
  { label: 'cosplay', category: 'Cosplay', image: '/editorial/category-cosplay.svg' },
  { label: 'comics', category: 'Comics', image: '/editorial/category-manga.svg' },
  { label: 'figures', category: 'Figures', image: '/editorial/category-figures.svg' },
  { label: 'cards', category: 'Cards', image: '/editorial/category-cards.svg' },
  { label: 'gaming', category: 'Gaming', image: '/editorial/category-gaming.svg' },
  { label: 'people', href: '/explore?section=Creator', image: '/editorial/category-artist.svg' },
] as const;

export default function HomePage() {
  const { locale } = useI18n();
  const copy = eventMessages[locale];
  const today = useEventDay();
  const event = selectFeaturedEvent(europeEvents, today);
  const eventLinkClass = 'flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-sm font-semibold';
  return (
    <MobileShell className="home-shell flex flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <Link href="/community" aria-label={copy.openCommunity} className="grid size-11 place-items-center rounded-xl active:bg-white/10"><Menu /></Link>
        <Link href="/" className="brand-wordmark" aria-label={copy.home}>COSMORA</Link>
        <Link href="/inbox" aria-label={copy.inbox} className="grid size-11 place-items-center rounded-xl active:bg-white/10"><Bell /></Link>
      </header>
      <div className="home-main-content px-4 pb-2">
        <article className="home-event-hero relative overflow-hidden rounded-3xl border border-white/15">
          <Image src={event?.image ?? '/editorial/hero.svg'} alt="" fill priority sizes="(max-width: 640px) 100vw, 430px" className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080918]/95 via-[#080918]/80 to-[#080918]/30" />
          <div className="relative flex h-full flex-col items-start justify-center gap-2 p-4">
            {event ? <>
              <span className="rounded-full bg-fuchsia-500/25 px-3 py-1 text-xs font-semibold text-pink-200">{event.start <= today ? copy.ongoing : copy.featured}</span>
              <h1 className="max-w-[90%] text-[clamp(1.35rem,5.5vw,1.8rem)] font-bold leading-tight">{event.name}</h1>
              <p className="text-sm leading-relaxed text-white/85">{formatEventDates(event, locale)}<br />{event.flag} {event.city}</p>
              {event.internalUrl ? <Link href={event.internalUrl} className={eventLinkClass}>{copy.discover}<ChevronRight className="size-4 shrink-0" /></Link> : <a href={event.url} target="_blank" rel="noopener noreferrer" className={eventLinkClass}>{copy.discover}<ChevronRight className="size-4 shrink-0" /></a>}
            </> : <>
              <h1 className="text-2xl font-bold leading-tight">{copy.noUpcoming}</h1>
              <p className="text-sm text-white/85">{copy.noUpcomingBody}</p>
              <Link href="/events" className={eventLinkClass}>{copy.viewCalendar}<ChevronRight className="size-4 shrink-0" /></Link>
            </>}
          </div>
        </article>
        <section className="home-categories-section">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{copy.passions}</h2>
            <Link href="/marketplace" className="flex min-h-11 items-center text-right text-sm text-pink-300">{copy.listings}</Link>
          </div>
          <div className="home-categories-grid grid grid-cols-3 gap-2">
            {categories.map((item) => <Link key={item.label} href={'href' in item ? item.href : `/marketplace?category=${item.category}`} className="mobile-category home-category">
              <Image src={item.image} alt="" fill sizes="140px" className="object-cover" />
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
