'use client';
import { useCommerce } from '@/components/use-commerce';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from '@/components/app-link';
import { ArrowLeft, Search, SlidersHorizontal, Plus, X } from 'lucide-react';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { LiveListings } from '@/components/live-listings';
import { rentalsEnabled } from '@/lib/release-features';
import {
  MARKET_CATEGORY_IDS,
  MARKET_CATEGORIES,
  resolveMarketCategory,
  getCategorySearchSuggestions,
  type MarketCategory,
} from '@/lib/marketplace-categories';
import { categoryPageCopy, categoryPageText } from '@/lib/i18n/category-pages';

export default function MarketplacePage() {
  const params = useSearchParams();
  const category = resolveMarketCategory(params.get('category'));
  // A category change starts a fresh search and clears filters from the previous one.
  return (
    <MarketplaceContent
      key={category}
      category={category}
      search={params.get('q') || ''}
    />
  );
}

function MarketplaceContent({
  category,
  search,
}: {
  category: MarketCategory;
  search: string;
}) {
  const { t, locale } = useCommerce();
  const [mode, setMode] = useState('buy');
  const [query, setQuery] = useState(search);
  const [filters, setFilters] = useState(false);
  const [condition, setCondition] = useState('');
  const [max, setMax] = useState('');
  const [lastSearch, setLastSearch] = useState(search);
  if (lastSearch !== search) {
    setLastSearch(search);
    setQuery(search);
  }
  const focused = category !== 'All';
  const details = focused ? MARKET_CATEGORIES[category] : null;
  const copy = focused ? categoryPageCopy(locale, category) : null;
  const suggestions = getCategorySearchSuggestions(category);
  const placeholder = copy?.searchPlaceholder ?? t('searchPlaceholder');
  const clearSearchLabel = categoryPageText(locale, 'clearSearch');
  return (
    <MobileShell className="flex flex-col">
      <header className="space-y-4 px-4 pt-4 pb-5">
        <div className="flex min-h-11 items-center justify-between gap-3">
          {focused ? (
            <Link
              href="/marketplace"
              className="flex min-h-11 items-center gap-2 text-sm text-white/70"
            >
              <ArrowLeft className="size-4 shrink-0" />
              {categoryPageText(locale, 'browseAll')}
            </Link>
          ) : (
            <h1 className="text-2xl font-semibold">{t('marketplace')}</h1>
          )}
          <Link
            href="/sell"
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-violet-500/20 px-3 text-sm text-pink-200"
          >
            <Plus className="size-4" />
            {t('sell')}
          </Link>
        </div>
        {focused && details && copy && (
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-white/15">
              <Image
                src={details.image}
                alt=""
                fill
                priority
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight">
                {t(category)}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {copy.intro}
              </p>
            </div>
          </div>
        )}
      </header>
      <section className="flex-1 px-4">
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-[#17172b] px-3">
            <Search className="size-5 shrink-0 text-white/50" />
            <input
              aria-label={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label={clearSearchLabel}
                onClick={() => setQuery('')}
                className="grid size-11 shrink-0 place-items-center text-white/60"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
          <button
            type="button"
            aria-label={t('filters')}
            aria-expanded={filters}
            aria-controls="marketplace-filters"
            onClick={() => setFilters(!filters)}
            className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/15"
          >
            <SlidersHorizontal className="size-5" />
          </button>
        </div>
        {focused ? (
          <section
            className="mt-5"
            aria-label={categoryPageText(locale, 'relatedSearches')}
          >
            <h2 className="mb-2 text-sm font-medium text-white/65">
              {categoryPageText(locale, 'relatedSearches')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((term) => {
                const selected =
                  query.trim().toLocaleLowerCase() === term.toLocaleLowerCase();
                return (
                  <button
                    type="button"
                    key={term}
                    onClick={() => setQuery(selected ? '' : term)}
                    aria-pressed={selected}
                    className={`min-h-11 rounded-xl border px-3 text-sm ${selected ? 'border-pink-400 bg-fuchsia-500/20 text-pink-200' : 'border-white/15 bg-white/[0.03] text-white/80'}`}
                  >
                    {term}
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <nav
            className="mt-4 flex gap-2 overflow-x-auto pb-2"
            aria-label={t('categories')}
          >
            {MARKET_CATEGORY_IDS.map((value) => (
              <Link
                key={value}
                href={`/marketplace?category=${value}`}
                className="flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm text-white/75"
              >
                {t(value)}
              </Link>
            ))}
          </nav>
        )}
        {rentalsEnabled && (
          <div className="my-4 grid grid-cols-2 border-b border-white/15">
            {(
              [
                ['buy', t('buy')],
                ['rent', t('rent')],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`min-h-12 border-b-2 text-base ${mode === value ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/70'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {filters && (
          <div
            id="marketplace-filters"
            className="mt-3 space-y-3 rounded-2xl border border-white/15 p-4"
          >
            <label className="block text-sm">
              {t('condition')}
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="checkout-input mt-2"
              >
                <option value="">{t('All')}</option>
                <option value="New">{t('New')}</option>
                <option value="Like New">{t('Like New')}</option>
                <option value="Used">{t('Used')}</option>
              </select>
            </label>
            <label className="block text-sm">
              {t('maxPrice')}
              <input
                type="number"
                min="0"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="checkout-input mt-2"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setCondition('');
                setMax('');
              }}
              className="min-h-11 text-sm text-pink-300"
            >
              {t('reset')}
            </button>
          </div>
        )}
        {(focused || query.trim()) && (
          <h2 className="mt-6 text-lg font-semibold">
            {query.trim() ? (
              <>
                {categoryPageText(locale, 'searchResults')} “{query.trim()}”
              </>
            ) : (
              <>
                {categoryPageText(locale, 'resultsInCategory')} {t(category)}
              </>
            )}
          </h2>
        )}
        <LiveListings
          category={category}
          mode={mode}
          query={query}
          condition={condition}
          max={max}
        />
        {!rentalsEnabled && (
          <p className="mb-5 text-xs leading-relaxed text-white/50">
            {t('browseNotice')}
          </p>
        )}
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}
