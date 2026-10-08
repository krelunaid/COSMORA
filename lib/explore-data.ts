import type { DiscoveryCardContent } from './mobile-layout';

export const exploreSections = [
  'Per te',
  'Prodotti',
  'Eventi',
  'Creator',
  'Crew',
  'Community',
] as const;

export type ExploreSection = (typeof exploreSections)[number];

export type ExploreDiscovery = DiscoveryCardContent & {
  section: Exclude<ExploreSection, 'Per te'>;
  icon: 'bag' | 'calendar' | 'user' | 'users' | 'sparkles';
  imageFit?: 'cover' | 'contain';
};

export const exploreDiscoveries: ExploreDiscovery[] = [
  {
    section: 'Prodotti',
    title: 'Cosplay e accessori',
    meta: 'Esplora gli annunci e contatta i venditori',
    image: '/editorial/category-cosplay.svg',
    href: '/marketplace?category=Cosplay',
    icon: 'bag',
  },
  {
    section: 'Prodotti',
    title: 'Manga & Comics',
    meta: 'Edizioni e collezioni',
    image: '/editorial/category-manga.svg',
    href: '/marketplace?category=Comics',
    icon: 'bag',
  },
  {
    section: 'Prodotti',
    title: 'Figures',
    meta: 'Figure e collectibles',
    image: '/editorial/category-figures.svg',
    href: '/marketplace?category=Figures',
    icon: 'bag',
  },
  {
    section: 'Eventi',
    title: 'Lucca Comics & Games 2026',
    meta: 'Lucca · 28 OTT–1 NOV',
    image: '/events/lucca-comics-games.svg',
    href: '/events/lucca-comics-2026',
    icon: 'calendar',
    imageFit: 'contain',
  },
  {
    section: 'Eventi',
    title: 'gamescom 2026',
    meta: 'Colonia · 26–30 AGO',
    image: '/events/gamescom.svg',
    href: '/events',
    icon: 'calendar',
  },
  {
    section: 'Creator',
    title: 'Creator e venditori',
    meta: 'Scopri i profili della community',
    image: '/editorial/category-artist.svg',
    href: '/explore?section=Creator',
    icon: 'user',
  },
  {
    section: 'Crew',
    title: 'Crew e incontri',
    meta: 'Trova una squadra o organizza un incontro',
    image: '/editorial/crew.svg',
    href: '/squads',
    icon: 'users',
  },
  {
    section: 'Community',
    title: 'Community COSMORA',
    meta: 'Post, collezioni e making of',
    image: '/editorial/meetup.svg',
    href: '/community',
    icon: 'sparkles',
  },
];

export function filterExploreDiscoveries(
  items: readonly ExploreDiscovery[],
  section: ExploreSection,
  query: string,
  sectionLabel: (section: ExploreSection) => string = (value) => value,
) {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (section === 'Per te' || item.section === section) &&
      (!needle ||
        `${item.title} ${item.meta} ${sectionLabel(item.section)}`
          .toLowerCase()
          .includes(needle)),
  );
}
