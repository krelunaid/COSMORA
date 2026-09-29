'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { ChevronRight, ExternalLink, Search } from 'lucide-react';
import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { useI18n } from '@/components/i18n-provider';
import { useEventDay } from '@/components/use-event-day';
import { europeEvents } from '@/lib/events-data';
import { formatEventDates } from '@/lib/event-selection';
import { eventCountry, eventMessages } from '@/lib/i18n/events';

const countries = Array.from(new Set(europeEvents.map((event) => event.country)));

export default function EventsPage() {
  const { locale } = useI18n();
  const copy = eventMessages[locale];
  const today = useEventDay();
  const [scope, setScope] = useState<'all' | 'upcoming'>('upcoming');
  const [country, setCountry] = useState('All');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => europeEvents.filter((event) => {
    const matchesScope = scope === 'all' || event.end >= today;
    const matchesCountry = country === 'All' || event.country === country;
    const text = `${event.name} ${event.city} ${event.country} ${eventCountry(event.country, locale)} ${event.type} ${copy.types[event.type]}`.toLocaleLowerCase(locale);
    return matchesScope && matchesCountry && text.includes(query.trim().toLocaleLowerCase(locale));
  }).sort((a, b) => a.start.localeCompare(b.start)), [scope, country, query, today, locale, copy]);
  const countryOptions = ['All', ...[...countries].sort((a, b) => eventCountry(a, locale).localeCompare(eventCountry(b, locale), locale))];

  return <MobileShell className="flex flex-col"><ScreenHeader title={copy.events} back="/" action={<span className="text-xs text-pink-300">{visible.length} {copy.eventCount}</span>} /><div className="flex-1 px-4">
    <label className="relative mt-3 block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={copy.eventSearch} placeholder={copy.eventSearch} className="h-12 w-full rounded-xl border border-white/10 bg-[#17172b] pl-9 pr-3 text-sm outline-none focus:border-pink-400/50" /></label>
    <div className="mt-3 grid grid-cols-2 border-b border-white/10 text-center text-sm"><button aria-pressed={scope === 'upcoming'} onClick={() => setScope('upcoming')} className={`min-h-11 py-3 ${scope === 'upcoming' ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/50'}`}>{copy.upcoming}</button><button aria-pressed={scope === 'all'} onClick={() => setScope('all')} className={`min-h-11 py-3 ${scope === 'all' ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/50'}`}>{copy.allEvents}</button></div>
    <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">{countryOptions.map((item) => <button key={item} aria-pressed={country === item} onClick={() => setCountry(item)} className={`min-h-11 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${country === item ? 'border-pink-300/30 bg-gradient-to-r from-pink-500 to-violet-500' : 'border-white/10 text-white/55'}`}>{item === 'All' ? copy.allCountries : eventCountry(item, locale)}</button>)}</div>
    <div className="mt-3 space-y-2 pb-4">{visible.map((event) => <EventCard key={`${event.name}-${event.start}`} event={event} today={today} />)}{!visible.length && <p className="py-16 text-center text-sm text-white/60">{copy.noResults}</p>}</div>
  </div><MobileNav active="explore" /></MobileShell>;
}

function EventCard({ event, today }: { event: (typeof europeEvents)[number]; today: string }) {
  const { locale } = useI18n();
  const copy = eventMessages[locale];
  const past = event.end < today;
  const content = <><div className="relative"><Image src={event.image} alt="" fill sizes="104px" className="object-cover" /><span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs">{event.flag}</span></div><div className="relative p-3"><h2 className="text-sm font-medium leading-5">{event.name}</h2><p className="mt-1 text-xs text-white/65">{event.city}, {eventCountry(event.country, locale)}</p><p className="mt-2 text-xs text-white/65">{formatEventDates(event, locale)}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">{copy.types[event.type]}</span>{past ? <span className="text-xs text-white/50">{copy.past}</span> : event.start <= today ? <span className="text-xs text-pink-300">{copy.ongoing}</span> : null}{event.internalUrl ? <ChevronRight aria-hidden="true" className="ml-auto size-4 text-white/50" /> : <ExternalLink aria-label={copy.officialSite} className="ml-auto size-4 text-white/50" />}</div></div></>;
  const classes = 'grid min-h-[112px] grid-cols-[104px_1fr] overflow-hidden rounded-2xl border border-white/8 bg-[#111225]';
  return event.internalUrl ? <Link href={event.internalUrl} className={classes}>{content}</Link> : <a href={event.url} target="_blank" rel="noopener noreferrer" className={classes}>{content}</a>;
}
