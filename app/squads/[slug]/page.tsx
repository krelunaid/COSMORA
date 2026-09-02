'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Flag, MapPin, MessageCircle, ShieldCheck, UsersRound } from 'lucide-react';

import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { squads } from '@/lib/community-data';

export default function SquadDetailPage({ params: _params }: { params: Promise<{ slug: string }> }) {
  const squad = squads[0];
  const [joined, setJoined] = useState(false);
  const [character, setCharacter] = useState('');
  const [reported, setReported] = useState(false);
  return <MobileShell className="flex flex-col"><ScreenHeader title="Squad" back="/community" action={<button onClick={() => setReported(true)} aria-label="Report squad"><Flag className="size-4 text-white/55" /></button>} /><div className="flex-1 pb-4"><div className="relative h-52"><Image src={squad.cover} alt={squad.name} fill priority sizes="430px" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#080918] via-transparent to-transparent" /></div><div className="-mt-8 relative px-4"><span className="rounded-full bg-pink-500 px-2 py-1 text-[8px] uppercase">{squad.type}</span><h1 className="mt-3 text-xl font-semibold">{squad.name}</h1><p className="mt-2 text-[10px] leading-4 text-white/55">{squad.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-[9px]"><Info icon={CalendarDays} text={`${squad.date} · ${squad.time}`} /><Info icon={MapPin} text={squad.location} /><Info icon={UsersRound} text={`${squad.members} / ${squad.maxMembers} members`} /><Info icon={ShieldCheck} text={squad.approvalRequired ? 'Approval required' : 'Open join'} /></div><Link href="/events/lucca-comics-2026" className="mt-3 block rounded-xl border border-pink-400/25 bg-pink-400/5 p-3 text-[9px] text-pink-300">Linked event · {squad.event} ›</Link>
      <section className="mt-4 rounded-2xl border border-white/8 bg-[#111225] p-3"><h2 className="text-xs font-semibold">Characters needed</h2><div className="mt-3 flex flex-wrap gap-2">{squad.characters.map((item) => <button key={item} onClick={() => setCharacter(item)} className={`rounded-full border px-3 py-1.5 text-[9px] ${character === item ? 'border-pink-400 bg-pink-400/10 text-pink-300' : 'border-white/10 text-white/55'}`}>{item}</button>)}</div></section>
      <section className="mt-4 rounded-2xl border border-white/8 bg-[#111225] p-3"><div className="flex items-center gap-2"><MessageCircle className="size-4 text-violet-300" /><h2 className="text-xs font-semibold">Squad updates</h2></div><p className="mt-3 text-[9px] text-white/55">Owner · Costume coordination call on 18 October. Please post progress photos before then.</p></section>
      {reported && <p className="mt-3 rounded-xl border border-amber-400/20 p-3 text-[9px] text-amber-200">Report received for moderation review.</p>}
      <button onClick={() => setJoined(true)} className="mt-4 h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium">{joined ? (squad.approvalRequired ? 'Request sent' : 'Joined') : character ? `Apply as ${character}` : squad.approvalRequired ? 'Request to Join' : 'Join Squad'}</button>
    </div></div><MobileNav active="home" /></MobileShell>;
}

function Info({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) { return <div className="flex items-center gap-2 rounded-xl border border-white/8 p-2.5 text-white/60"><Icon className="size-3.5 shrink-0 text-violet-300" /><span>{text}</span></div>; }
