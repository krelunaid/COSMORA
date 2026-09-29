export const MARKET_CATEGORY_IDS = [
  'Cosplay',
  'Comics',
  'Figures',
  'Cards',
  'Gaming',
] as const;

export type MarketCategoryId = (typeof MARKET_CATEGORY_IDS)[number];
export type MarketCategory = MarketCategoryId | 'All';

type MarketCategoryConfig = {
  image: string;
  suggestions: readonly string[];
};

// These are suggested text searches within the selected category, not inventory
// counts or product attributes that sellers are required to provide.
export const MARKET_CATEGORIES = {
  Cosplay: {
    image: '/mobile-category-cosplay.jpg',
    suggestions: ['Naruto', 'One Piece', 'Demon Slayer', 'Genshin Impact'],
  },
  Comics: {
    image: '/mobile-category-manga.jpg',
    suggestions: ['One Piece', 'Naruto', 'Dragon Ball', 'Marvel', 'DC'],
  },
  Figures: {
    image: '/mobile-category-figures.jpg',
    suggestions: ['Funko Pop', 'Bandai', 'Dragon Ball', 'Marvel'],
  },
  Cards: {
    image: '/mobile-category-cards.jpg',
    suggestions: ['Pokémon', 'Yu-Gi-Oh!', 'Magic', 'One Piece'],
  },
  Gaming: {
    image: '/mobile-category-gaming.jpg',
    suggestions: ['Nintendo', 'PlayStation', 'Xbox', 'PC', 'Controller'],
  },
} as const satisfies Record<MarketCategoryId, MarketCategoryConfig>;

const categoryIds = new Set<string>(MARKET_CATEGORY_IDS);

/** URL values must match a stored category ID before they can filter listings. */
export function resolveMarketCategory(value: unknown): MarketCategory {
  return typeof value === 'string' && categoryIds.has(value)
    ? (value as MarketCategoryId)
    : 'All';
}

export function getCategorySearchSuggestions(
  value: unknown,
): readonly string[] {
  const category = resolveMarketCategory(value);
  return category === 'All' ? [] : MARKET_CATEGORIES[category].suggestions;
}
