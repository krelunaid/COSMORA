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
    meta: 'Compra oppure noleggia',
    image: '/mobile-category-cosplay.jpg',
    href: '/marketplace?category=Cosplay',
    icon: 'bag',
  },
  {
    section: 'Prodotti',
    title: 'Manga & Comics',
    meta: 'Edizioni e collezioni',
    image: '/mobile-category-manga.jpg',
    href: '/marketplace?category=Comics',
    icon: 'bag',
  },
  {
    section: 'Prodotti',
    title: 'Figures',
    meta: 'Figure e collectibles',
    image: '/mobile-category-figures.jpg',
    href: '/marketplace?category=Figures',
    icon: 'bag',
  },
  {
    section: 'Eventi',
    title: 'Lucca Comics & Games 2026',
    meta: 'Lucca · 28 OTT–1 NOV',
    image: '/events/lucca-comics-games-mobile.jpg',
    href: '/events/lucca-comics-2026',
    icon: 'calendar',
    imageFit: 'contain',
  },
  {
    section: 'Eventi',
    title: 'gamescom 2026',
    meta: 'Colonia · 26–30 AGO',
    image: '/events/gamescom-mobile.jpg',
    href: '/events',
    icon: 'calendar',
  },
  {
    section: 'Creator',
    title: 'Stardust Atelier',
    meta: 'Cosplay creator · Commissioni aperte',
    image: '/mobile-category-artist.jpg',
    href: '/profile/stardust-atelier',
    icon: 'user',
  },
  {
    section: 'Crew',
    title: 'One Piece Crew — Lucca',
    meta: '8/12 membri · Cerca personaggi',
    image: '/community/squad-example-mobile.jpg',
    href: '/squads/one-piece-crew-lucca-2026',
    icon: 'users',
  },
  {
    section: 'Community',
    title: 'Community COSMORA',
    meta: 'Post, collezioni e making of',
    image: '/community/meetup-example-mobile.jpg',
    href: '/community',
    icon: 'sparkles',
  },
];

export function filterExploreDiscoveries(
  items: readonly ExploreDiscovery[],
  section: ExploreSection,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (section === 'Per te' || item.section === section) &&
      (!needle ||
        `${item.title} ${item.meta} ${item.section}`
          .toLowerCase()
          .includes(needle)),
  );
}
