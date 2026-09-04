'use client';
import Link from '@/components/app-link';
import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { SellerListings } from '@/components/seller-listings';

export default function SellerDashboard() {
  return <MobileShell><ScreenHeader title="I miei annunci" back="/profile/me" />
    <div className="space-y-5 px-5 py-5 pb-28">
      <nav className="grid grid-cols-2 gap-3 text-base" aria-label="Gestione venditore">
        <Link href="/sell" className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 p-4 text-center">Nuovo annuncio</Link>
        <Link href="/seller/onboarding" className="rounded-xl border border-white/20 p-4 text-center">Dati venditore</Link>
        <Link href="/inbox?tab=orders" className="rounded-xl border border-white/20 p-4 text-center">I miei ordini</Link>
        <Link href="/inbox" className="rounded-xl border border-white/20 p-4 text-center">Messaggi</Link>
      </nav>
      <p className="text-base text-white/70">Qui trovi soltanto i tuoi annunci. I pagamenti reali non sono ancora attivi.</p>
      <SellerListings />
    </div><MobileNav active="sell" /></MobileShell>;
}
