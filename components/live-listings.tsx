'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
type Listing = { id: string; slug: string; seller_id: string; title: string; description: string; images: string[]; sale_price_cents: number | null };
export function LiveListings({ slug }: { slug?: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/listings${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, { signal: controller.signal }).then(async (response) => {
      const value = await response.json() as { listings: Listing[]; error?: string };
      if (!response.ok) throw new Error(value.error || 'Catalogo non disponibile.');
      setListings(value.listings);
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);
  return <section className="space-y-4 py-5"><h2 className="text-xl font-semibold">{slug ? 'Dettaglio annuncio' : 'Annunci della community'}</h2>{loading && <p>Caricamento…</p>}{error && <output className="block text-amber-200">{error}</output>}{!loading && !error && listings.length === 0 && <p className="text-base text-white/70">{slug ? 'Annuncio non disponibile o non più in vendita.' : 'Non ci sono ancora annunci pubblicati.'}</p>}{listings.map((listing) => <article key={listing.id} className="space-y-3 rounded-2xl border border-white/15 p-4">{listing.images[0] && <div className="relative aspect-square overflow-hidden rounded-xl"><Image src={listing.images[0]} alt={listing.title} fill unoptimized sizes="400px" className="object-contain" /></div>}<Link href={`/marketplace/${listing.slug}`} className="block text-lg font-semibold">{listing.title}</Link>{listing.sale_price_cents !== null && <p className="text-lg text-pink-300">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(listing.sale_price_cents / 100)}</p>}{slug && <><p className="whitespace-pre-wrap text-base text-white/80">{listing.description}</p><Link href={`/inbox/${listing.seller_id}`} className="block rounded-xl bg-violet-600 p-3 text-center text-base">Contatta il venditore</Link><p className="text-sm text-white/70">Gli acquisti in denaro reale non sono ancora attivi.</p></>}</article>)}</section>;
}
