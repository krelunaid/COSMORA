'use client';

import { useParams } from 'next/navigation';
import Link from '@/components/app-link';
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, UsersRound } from 'lucide-react';
import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { EventCover, EventMediaCredit } from '@/components/event-cover';
import { useI18n } from '@/components/i18n-provider';
import { useEventDay } from '@/components/use-event-day';
import { findEventBySlug } from '@/lib/events-data';
import { formatEventDates } from '@/lib/event-selection';
import { eventPresentationMessages } from '@/lib/event-presentations';
import { eventCountry, eventMessages } from '@/lib/i18n/events';

export default function EventShowcasePage() {
  const { slug } = useParams<{ slug: string }>();
  const { locale } = useI18n();
  const today = useEventDay();
  const copy = eventMessages[locale];
  const details = eventPresentationMessages[locale];
  const event = findEventBySlug(slug);

  if (!event) return <MobileShell className="flex flex-col"><ScreenHeader title={details.showcase} back="/events" /><div className="flex-1 px-5 py-16 text-center"><h1 className="text-xl font-semibold">{details.unavailable}</h1><Link href="/events" className="mt-5 inline-flex min-h-11 items-center gap-2 text-pink-200"><ArrowLeft className="size-4" />{details.back}</Link></div><MobileNav active="explore" /></MobileShell>;

  const past = event.end < today;
  const ongoing = !past && event.start <= today;
  return <MobileShell className="flex flex-col">
    <ScreenHeader title={details.showcase} back="/events" />
    <div className="flex-1 px-4 pb-7 pt-2">
      <figure className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111225]">
        <EventCover event={event} className="aspect-video w-full" />
        <EventMediaCredit event={event} className="px-3 py-2.5" />
      </figure>
      <header className="pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-violet-200">{copy.types[event.type]}</span><span className="text-white/60">{event.flag} {eventCountry(event.country, locale)}</span>{past ? <span className="ml-auto text-white/55">{copy.past}</span> : ongoing ? <span className="ml-auto text-pink-300">{copy.ongoing}</span> : null}</div>
        <h1 className="text-[30px] font-bold leading-[1.12] tracking-tight">{event.name}</h1>
      </header>
      <dl className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#111225] px-4">
        <div className="flex items-start gap-3 py-4"><CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-pink-300" /><div><dt className="text-[11px] uppercase tracking-[.12em] text-white/50">{details.date}</dt><dd className="mt-1 text-base font-medium">{formatEventDates(event, locale)}</dd></div></div>
        <div className="flex items-start gap-3 py-4"><MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-pink-300" /><div><dt className="text-[11px] uppercase tracking-[.12em] text-white/50">{details.location}</dt><dd className="mt-1 text-base font-medium">{event.venue && <span className="mb-0.5 block">{event.venue}</span>}{event.city}, {eventCountry(event.country, locale)}</dd></div></div>
      </dl>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">{details.about}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{details.officialInfo}</p>
        {past && <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-sm leading-relaxed text-amber-100/80">{details.pastInfo}</p>}
        <a href={event.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 text-base font-semibold shadow-lg shadow-violet-950/30 focus-visible:outline-2 focus-visible:outline-pink-200">{copy.officialSite}<ArrowUpRight aria-hidden="true" className="size-5 shrink-0" /></a>
      </section>
      <Link href="/community" className="mt-5 flex min-h-14 items-start gap-3 rounded-2xl border border-fuchsia-300/20 bg-[#19132b] p-4"><UsersRound aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-pink-300" /><div><h2 className="font-semibold">{copy.community}</h2><p className="mt-1 text-sm leading-relaxed text-white/65">{details.communityIntro}</p></div></Link>
      <p className="mt-5 text-xs leading-relaxed text-white/50">{details.independent}</p>
      <Link href="/events" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-pink-200"><ArrowLeft aria-hidden="true" className="size-4" />{details.back}</Link>
    </div>
    <MobileNav active="explore" />
  </MobileShell>;
}
