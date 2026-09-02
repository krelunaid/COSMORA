'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, Flag, Heart, MessageCircle, MoreHorizontal, Search, Share2, UsersRound } from 'lucide-react';

import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { communityPosts, squads } from '@/lib/community-data';

const tabs = ['For You','Following','Cosplay','Collections','Creators','Events'] as const;

export default function CommunityPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('For You');
  const [country, setCountry] = useState('All Europe');
  const [language, setLanguage] = useState('All languages');
  const posts = useMemo(() => communityPosts.filter((post) => (country === 'All Europe' || post.country === country) && (language === 'All languages' || post.language === language) && (tab === 'For You' || tab === 'Following' || (tab === 'Cosplay' && post.category === 'Cosplay') || (tab === 'Collections' && post.category === 'Collection') || (tab === 'Creators' && ('creator' in post)) || (tab === 'Events' && ('event' in post)))), [country, language, tab]);

  return <MobileShell className="flex flex-col"><header className="flex h-16 items-center justify-between px-4"><h1 className="text-xl font-semibold">Community</h1><div className="flex gap-4"><Search className="size-5" /><Bell className="size-5" /></div></header>
    <div className="no-scrollbar flex overflow-x-auto border-b border-white/10 px-2 text-center text-[9px]">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 px-3 py-3 ${tab === item ? 'border-b-2 border-pink-400 text-pink-300' : 'text-white/50'}`}>{item}</button>)}</div>
    <div className="grid grid-cols-2 gap-2 border-b border-white/8 p-2"><select value={country} onChange={(event) => setCountry(event.target.value)} className="h-9 rounded-xl border border-white/10 bg-[#111225] px-3 text-[9px]"><option>All Europe</option><option>Italy</option><option>France</option><option>Germany</option><option>Spain</option><option>Belgium</option><option>Netherlands</option><option>Other</option></select><select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-9 rounded-xl border border-white/10 bg-[#111225] px-3 text-[9px]"><option>All languages</option><option>English</option><option>Italian</option><option>French</option><option>German</option><option>Spanish</option></select></div>
    <div className="flex-1 space-y-3 bg-[#050611] p-2">{posts.map((post) => <Post key={post.id} post={post} />)}{(tab === 'For You' || tab === 'Events') && <SquadCard />}{!posts.length && <div className="py-20 text-center text-xs text-white/40">No posts match these filters.</div>}</div><MobileNav active="home" /></MobileShell>;
}

function Post({ post }: { post: (typeof communityPosts)[number] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return <div className="rounded-xl border border-white/8 p-4 text-center text-[9px] text-white/40">Post hidden.</div>;
  return <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#111225]"><div className="relative p-3"><div className="flex items-center gap-2"><span className="relative size-8 overflow-hidden rounded-full"><Image src={post.image} alt="" fill sizes="32px" className="object-cover" /></span><div><p className="text-[10px] font-medium">{post.author}</p><p className="text-[8px] text-white/45">2h · {post.category} · {post.country}</p></div><button onClick={() => setMenuOpen((value) => !value)} className="ml-auto"><MoreHorizontal className="size-4 text-white/60" /></button></div>{menuOpen && <div className="absolute right-3 top-11 z-10 w-36 rounded-xl border border-white/10 bg-[#1a1b31] p-1 text-[9px] shadow-xl"><button onClick={() => setHidden(true)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">Hide post</button><button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">Mute user</button><button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">Block user</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-300 hover:bg-white/5"><Flag className="size-3" />Report</button></div>}<p className="mt-2 text-[10px] leading-4">{post.text}</p></div><div className="relative h-[260px]"><Image src={post.image} alt="Community post" fill sizes="414px" className="object-cover" /></div>
    <div className="space-y-1 border-b border-white/8 p-3 text-[9px]">{'creator' in post && <Link href="/profile/stardust-atelier" className="block text-violet-300">Creator: @{post.creator}</Link>}{'event' in post && <Link href="/events/lucca-comics-2026" className="block text-pink-300">Event: {post.event}</Link>}{'product' in post && <Link href="/marketplace/raiden-shogun-cosplay" className="mt-2 grid h-9 place-items-center rounded-lg border border-pink-400/30 text-pink-300">View Product · {post.product}</Link>}{'collection' in post && <span className="block text-violet-300">Collection: {post.collection}</span>}</div>
    <div className="flex items-center gap-4 p-3 text-[9px] text-white/65"><span className="flex items-center gap-1"><Heart className="size-4" />{post.likes}</span><span className="flex items-center gap-1"><MessageCircle className="size-4" />{post.comments}</span><Share2 className="ml-auto size-4" /></div></article>;
}

function SquadCard() {
  const squad = squads[0];
  return <Link href={`/squads/${squad.slug}`} className="block rounded-2xl border border-violet-400/20 bg-[#111225] p-3"><div className="flex items-center gap-3"><span className="relative size-12 overflow-hidden rounded-xl"><Image src={squad.cover} alt="" fill sizes="48px" className="object-cover" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-medium">{squad.name}</p><p className="mt-1 text-[8px] text-white/45">{squad.type} · {squad.members}/{squad.maxMembers} members</p></div><span className="rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-2 text-[9px]">View</span></div><p className="mt-3 flex items-center gap-2 text-[8px] text-violet-300"><UsersRound className="size-3" />Linked to Lucca Comics & Games 2026</p></Link>;
}
