'use client';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { Button } from '@/components/ui/button';
import { accountRequest } from '@/lib/account-client';

type Listing = { id: string; slug: string; title: string; description: string; status: string; sale_mode: string; sale_price_cents: number | null; rental_price_cents: number | null; updated_at: string };
type Page = { listings: Listing[]; hasMore: boolean };
const statusLabels: Record<string, string> = { active: 'Pubblicato', paused: 'Sospeso', draft: 'Bozza', sold: 'Venduto' };
const field = 'mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3 text-base';

function ListingEditor({ listing, onSaved }: { listing: Listing; onSaved: (value: Listing) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setNotice('');
    try {
      const price = (key: string) => form.has(key) ? Math.round(Number(form.get(key)) * 100) : null;
      const result = await accountRequest<{ listing: Listing }>('/api/seller/listings', { method: 'PATCH', body: JSON.stringify({ id: listing.id, updatedAt: listing.updated_at, title: form.get('title'), description: form.get('description'), status: form.get('paused') ? 'paused' : 'active', salePriceCents: price('salePrice'), rentalPriceCents: price('rentalPrice') }) });
      onSaved(result.listing); setEditing(false); setNotice('Modifiche salvate.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Salvataggio non riuscito.'); }
    finally { setBusy(false); }
  }
  return <article className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.025] p-4">
    <p className="text-sm text-pink-300">{statusLabels[listing.status] || listing.status}</p><h2 className="text-lg font-semibold">{listing.title}</h2>
    {notice && <output className="block text-base text-emerald-300">{notice}</output>}
    {editing ? <form onSubmit={save} className="space-y-4">
      <label className="block">Titolo<input name="title" defaultValue={listing.title} required minLength={3} maxLength={120} className={field} /></label>
      <label className="block">Descrizione<textarea name="description" defaultValue={listing.description} required minLength={10} maxLength={5000} rows={5} className={field} /></label>
      {listing.sale_mode !== 'rent' && <label className="block">Prezzo di vendita (€)<input name="salePrice" type="number" defaultValue={(listing.sale_price_cents ?? 0) / 100} min="0" max="1000000" step="0.01" required className={field} /></label>}
      {listing.sale_mode !== 'buy' && <label className="block">Prezzo di noleggio (€)<input name="rentalPrice" type="number" defaultValue={(listing.rental_price_cents ?? 0) / 100} min="0.01" max="1000000" step="0.01" required className={field} /></label>}
      <label className="flex min-h-12 items-center gap-3"><input name="paused" type="checkbox" defaultChecked={listing.status === 'paused'} className="size-5 accent-pink-500" />Sospendi l’annuncio</label><p className="text-sm text-white/70">Gli annunci sospesi non sono visibili nel catalogo. Puoi riattivarli in qualsiasi momento.</p>
      {error && <p role="alert" className="text-base text-amber-200">{error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy} className="min-h-12 px-5 text-base">{busy ? 'Salvataggio…' : 'Salva modifiche'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)} className="min-h-12 px-5 text-base">Annulla</Button></div>
    </form> : <div className="flex flex-wrap items-center gap-4">{['active', 'paused'].includes(listing.status) && <Button onClick={() => { setEditing(true); setError(''); setNotice(''); }} variant="outline" className="min-h-12 px-4 text-base">Modifica</Button>}{listing.status === 'active' && <Link className="py-3 text-base text-pink-300" href={`/marketplace/${listing.slug}`}>Vedi annuncio</Link>}</div>}
  </article>;
}

export function SellerListings() {
  const [page, setPage] = useState<Page>({ listings: [], hasMore: false });
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<Page>(`/api/seller/listings?offset=${offset}`, { signal: controller.signal }).then((value) => { if (!controller.signal.aborted) setPage(value); }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [offset, retry]);
  function navigate(next: number) { setLoading(true); setError(''); setOffset(next); }
  return <section className="space-y-4 text-base" aria-label="I miei annunci">
    {loading ? <output>Caricamento annunci…</output> : error ? <div className="space-y-3"><p role="alert" className="text-amber-200">{error}</p><Button onClick={() => { setLoading(true); setError(''); setRetry((n) => n + 1); }} className="min-h-12 text-base">Riprova</Button><Link href="/auth/login" className="block text-pink-300">Accedi al tuo account</Link></div> : <>
      {!page.listings.length && <p className="rounded-2xl border border-white/15 p-5 text-white/75">Non ci sono annunci in questa pagina. Pubblica il tuo primo oggetto per iniziare.</p>}
      {page.listings.map((listing) => <ListingEditor key={listing.id} listing={listing} onSaved={(saved) => setPage((current) => ({ ...current, listings: current.listings.map((item) => item.id === saved.id ? saved : item) }))} />)}
      <div className="flex justify-between gap-3">{offset > 0 && <Button variant="outline" className="min-h-12 text-base" onClick={() => navigate(Math.max(0, offset - 20))}>Precedenti</Button>}{page.hasMore && <Button variant="outline" className="min-h-12 text-base" onClick={() => navigate(offset + 20)}>Successivi</Button>}</div>
    </>}
  </section>;
}
