export type CommunityCategory =
  | 'Cosplay'
  | 'Collection'
  | 'Creator Work'
  | 'Gaming'
  | 'Cards'
  | 'Comics'
  | 'Figures'
  | 'Event'
  | 'Making Of';

export const communityPosts = [
  {
    id: 'yae-lucca',
    author: 'Luna Cosplay',
    country: 'Italy',
    language: 'English',
    category: 'Cosplay',
    text: 'Yae Miko from Genshin Impact 🌸 Costume by Stardust Atelier.',
    image: '/cosmora-hero.jpg',
    likes: 256,
    comments: 39,
    product: 'Raiden Shogun Cosplay Costume',
    event: 'Lucca Comics & Games 2026',
  },
  {
    id: 'cards-grail',
    author: 'Collector_JTA',
    country: 'Spain',
    language: 'English',
    category: 'Collection',
    text: 'Finally completed my card collection! 🔥 What’s your grail card?',
    image: '/hd-category-cards.png',
    likes: 128,
    comments: 24,
    collection: 'One Piece TCG Collection',
  },
  {
    id: 'wig-making',
    author: 'Stardust Atelier',
    country: 'Germany',
    language: 'English',
    category: 'Making Of',
    text: 'Building volume and colour gradients for a custom cosplay wig.',
    image: '/category-artist.png',
    likes: 94,
    comments: 17,
    creator: 'Stardust Atelier',
    product: 'Custom Wig Commission',
  },
] as const;

export type SquadStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'FULL'
  | 'ARCHIVED'
  | 'SUSPENDED'
  | 'REMOVED';

export const squads = [
  {
    slug: 'one-piece-crew-lucca-2026',
    name: 'ONE PIECE CREW — LUCCA 2026',
    type: 'Cosplay Crew',
    fandom: 'One Piece',
    description:
      'Building a complete Straw Hat crew for Lucca. Friendly, photo-focused and inclusive.',
    event: 'Lucca Comics & Games 2026',
    city: 'Lucca',
    date: '2026-10-31',
    time: '11:00',
    location: 'Piazza San Michele meeting point',
    members: 8,
    maxMembers: 12,
    privacy: 'Public',
    approvalRequired: true,
    characters: ['Zoro', 'Nami', 'Sanji', 'Robin'],
    cover: '/hd-category-manga.png',
    status: 'ACTIVE' as SquadStatus,
  },
  {
    slug: 'lucca-night-photo-meetup',
    name: 'LUCCA NIGHT PHOTO MEETUP',
    type: 'Photo Meetup',
    fandom: 'All fandoms',
    description:
      'Golden-hour and night portraits around the historic centre with registered photographers.',
    event: 'Lucca Comics & Games 2026',
    city: 'Lucca',
    date: '2026-10-30',
    time: '17:30',
    location: 'Piazza Napoleone · public event area',
    members: 18,
    maxMembers: 25,
    privacy: 'Public',
    approvalRequired: false,
    characters: [],
    cover: '/events/lucca-comics-games-2026.jpg',
    status: 'ACTIVE' as SquadStatus,
  },
];

export const squadTypes = [
  'Cosplay Crew',
  'Event Meetup',
  'Photo Meetup',
  'Cosplay Contest Team',
  'Travel Group for Event',
] as const;
