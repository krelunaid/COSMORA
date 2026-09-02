import Image from 'next/image';
import Link from '@/components/app-link';
import { BadgeCheck, Heart, Mail, MapPin, Star } from 'lucide-react';
import { MobileNav, MobileShell } from '@/components/mobile-shell';

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  await params;
  const portfolio = ['/category-artist.png','/hd-category-cosplay.png','/cosmora-hero.png'];
  const services = [['Custom Wigs','From €90'],['Props & Weapons','From €120'],['Full Costume Builds','From €350']];
  return <MobileShell className="flex flex-col"><div className="flex-1">
    <div className="relative h-44"><Image src="/cosmora-hero.png" alt="Stardust Atelier cover" fill priority sizes="430px" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#080918] to-transparent" /><Link href="/" className="absolute left-4 top-4 text-2xl">‹</Link></div>
    <div className="-mt-10 px-4"><div className="relative size-20 overflow-hidden rounded-full border-4 border-[#080918]"><Image src="/category-artist.png" alt="Stardust Atelier" fill sizes="80px" className="object-cover" /></div><div className="mt-2 flex items-center gap-2"><h1 className="text-xl font-semibold">Stardust Atelier ✨</h1><BadgeCheck className="size-4 text-sky-400" /></div><p className="text-[10px] text-white/50">Cosplay Creator · Pro Seller</p>
      <div className="mt-3 flex gap-4 text-[9px] text-white/60"><span className="flex items-center gap-1"><Star className="size-3 fill-amber-300 text-amber-300" />4.9 (238)</span><span>512 Followers</span><span>96% Response</span></div><p className="mt-3 flex items-center gap-1 text-[9px] text-white/50"><MapPin className="size-3" />Rome, Italy · English, Italian</p><p className="mt-3 text-[10px] leading-4 text-white/65">Custom cosplay & props with love to details. Bringing characters to life, one build at a time.</p>
      <Link href="/commissions/new" className="mt-3 flex h-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/8 text-xs font-medium text-emerald-200">Commissions Open · Request a quote</Link>
      <div className="mt-2 grid grid-cols-[1fr_1fr_44px] gap-2"><button className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-xs"><Heart className="size-4" />Follow</button><Link href="/inbox" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white/8 text-xs"><Mail className="size-4" />Message</Link><button className="rounded-xl bg-white/8">↗</button></div>
      <div className="mt-4 grid grid-cols-4 border-b border-white/10 text-center text-[10px]"><span className="border-b-2 border-pink-400 py-3 text-pink-300">Shop</span><span className="py-3 text-white/50">Portfolio</span><span className="py-3 text-white/50">Reviews</span><span className="py-3 text-white/50">About</span></div><h2 className="mt-4 text-xs font-semibold">Featured Portfolio</h2><div className="mt-2 grid grid-cols-3 gap-2">{portfolio.map((src) => <div key={src} className="relative aspect-square overflow-hidden rounded-xl"><Image src={src} alt="" fill sizes="120px" className="object-cover" /></div>)}</div><h2 className="mt-4 text-xs font-semibold">Services</h2><div className="mt-2 space-y-2 pb-4">{services.map(([title, price]) => <div key={title} className="flex items-center rounded-xl border border-white/8 bg-[#111225] p-3 text-[10px]"><span>{title}</span><span className="ml-auto text-emerald-300">{price}</span></div>)}</div>
    </div></div><MobileNav active="profile" /></MobileShell>;
}
