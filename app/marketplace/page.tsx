'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from '@/components/app-link';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { LiveListings } from '@/components/live-listings';

const categories = [
  ['Cosplay', 'Cosplay'],
  ['Comics', 'Fumetti'],
  ['Figures', 'Figure'],
  ['Cards', 'Carte'],
  ['Gaming', 'Gaming'],
  ['All', 'Tutti'],
];
export default function MarketplacePage() {
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get('category') || 'All');
  const [mode, setMode] = useState('buy');
  const [query, setQuery] = useState(params.get('q') || '');
  const [filters, setFilters] = useState(false);
  const [condition, setCondition] = useState('');
  const [max, setMax] = useState('');
  const locationKey = params.toString();
  const [lastLocation, setLastLocation] = useState(locationKey);
  if (lastLocation !== locationKey) {
    setLastLocation(locationKey);
    setCategory(params.get('category') || 'All');
    setQuery(params.get('q') || '');
  }
  return (
    <MobileShell className="flex flex-col">
      <header className="flex items-center justify-between p-5">
        <h1 className="text-2xl font-semibold">Marketplace</h1>
        <Link
          href="/sell"
          className="flex min-h-11 items-center gap-1 rounded-xl bg-violet-500/20 px-3 text-sm text-pink-200"
        >
          <Plus className="size-4" />
          Vendi
        </Link>
      </header>
      <section className="flex-1 px-4">
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-[#17172b] px-3">
            <Search className="size-5 shrink-0 text-white/50" />
            <input
              aria-label="Cerca annunci"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca un annuncio…"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </label>
          <button
            aria-label="Filtri"
            aria-expanded={filters}
            onClick={() => setFilters(!filters)}
            className="grid size-12 place-items-center rounded-xl border border-white/15"
          >
            <SlidersHorizontal className="size-5" />
          </button>
        </div>
        <div className="my-4 grid grid-cols-2 border-b border-white/15">
          {[
            ['buy', 'Compra'],
            ['rent', 'Noleggia'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-12 border-b-2 text-base ${mode === value ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/70'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Categorie">
          {categories.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              aria-pressed={category === value}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${category === value ? 'border-pink-400 bg-fuchsia-500/20 text-pink-200' : 'border-white/15 text-white/75'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {filters && (
          <div className="mt-3 space-y-3 rounded-2xl border border-white/15 p-4">
            <label className="block text-sm">
              Condizione
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="checkout-input mt-2"
              >
                <option value="">Tutte</option>
                <option value="New">Nuovo</option>
                <option value="Like New">Come nuovo</option>
                <option value="Used">Usato</option>
              </select>
            </label>
            <label className="block text-sm">
              Prezzo massimo (€)
              <input
                type="number"
                min="0"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="checkout-input mt-2"
              />
            </label>
            <button
              onClick={() => {
                setCondition('');
                setMax('');
              }}
              className="min-h-11 text-sm text-pink-300"
            >
              Azzera filtri
            </button>
          </div>
        )}
        <LiveListings
          category={category}
          mode={mode}
          query={query}
          condition={condition}
          max={max}
        />
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}
