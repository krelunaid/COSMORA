'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { Bookmark, ExternalLink, Search } from 'lucide-react';
import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { europeEvents } from '@/lib/events-data';

const today = '2026-09-02';
const countries = ['All', ...Array.from(new Set(europeEvents.map((event) => event.country))).sort()];

export default function EventsPage() {
  const [scope, setScope] = useState<'all' | 'upcoming'>('upcoming');
  const [country, setCountry] = useState('All');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => europeEvents.filter((event) => {
    const matchesScope = scope === 'all' || event.end >= today;
    const matchesCountry = country === 'All' || event.country === country;
    const text = `${event.name} ${event.city} ${event.country} ${event.type}`.toLowerCase();
    return matchesScope && matchesCountry && text.includes(query.toLowerCase());
  }), [scope, country, query]);

  return <MobileShell className="flex flex-col"><ScreenHeader title="Europe 2026" back="/" action={<span className="text-[9px] text-pink-300">{visible.length} events</span>} /><div className="flex-1 px-4">
    <label className="relative mt-3 block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, city or category" className="h-10 w-full rounded-xl border border-white/10 bg-[#17172b] pl-9 pr-3 text-xs outline-none focus:border-pink-400/50" /></label>
    <div className="mt-3 grid grid-cols-2 border-b border-white/10 text-center text-[10px]"><button onClick={() => setScope('upcoming')} className={`py-3 ${scope === 'upcoming' ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/50'}`}>Upcoming</button><button onClick={() => setScope('all')} className={`py-3 ${scope === 'all' ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/50'}`}>All 2026</button></div>
    <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">{countries.map((item) => <button key={item} onClick={() => setCountry(item)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] ${country === item ? 'border-pink-300/30 bg-gradient-to-r from-pink-500 to-violet-500' : 'border-white/10 text-white/55'}`}>{item}</button>)}</div>
    <div className="mt-3 space-y-2 pb-4">{visible.map((event) => <EventCard key={`${event.name}-${event.start}`} event={event} />)}{!visible.length && <p className="py-16 text-center text-sm text-white/45">No matching events.</p>}</div>
  </div><MobileNav active="explore" /></MobileShell>;
}

function EventCard({ event }: { event: (typeof europeEvents)[number] }) {
  const past = event.end < today;
  const content = <><div className="relative"><Image src={event.image} alt="" fill sizes="104px" className="object-cover" /><span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs">{event.flag}</span></div><div className="relative p-3"><span className="absolute right-3 top-3"><Bookmark className="size-4 text-pink-400" /></span><h2 className="max-w-[205px] pr-5 text-xs font-medium leading-4">{event.name}</h2><p className="mt-1 text-[9px] text-white/55">{event.city}, {event.country}</p><p className="mt-2 text-[9px] text-white/45">{event.dateLabel}</p><div className="mt-2 flex items-center gap-2"><span className="rounded bg-violet-500/20 px-2 py-0.5 text-[8px] text-violet-200">{event.type}</span>{event.featured && <span className="rounded bg-pink-500 px-2 py-0.5 text-[8px]">Featured</span>}{past && <span className="text-[8px] text-white/30">Past</span>}<ExternalLink className="ml-auto size-3 text-white/35" /></div></div></>;
  const classes = "grid min-h-[112px] grid-cols-[104px_1fr] overflow-hidden rounded-2xl border border-white/8 bg-[#111225]";
  return event.internalUrl ? <Link href={event.internalUrl} className={classes}>{content}</Link> : <a href={event.url} target="_blank" rel="noreferrer" className={classes}>{content}</a>;
}
