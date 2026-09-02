export type EuropeEvent = {
  name: string;
  city: string;
  country: string;
  flag: string;
  start: string;
  end: string;
  dateLabel: string;
  type: 'Anime' | 'Comics' | 'Gaming' | 'Pop Culture';
  url: string;
  image: string;
  featured?: boolean;
  internalUrl?: string;
};

const eventCatalog: EuropeEvent[] = [
  { name:'Japan Con: Brussels Manga', city:'Brussels', country:'Belgium', flag:'🇧🇪', start:'2026-02-21', end:'2026-02-22', dateLabel:'21–22 FEB 2026', type:'Anime', url:'https://www.brusselsmanga.com/', image:'/hd-category-manga.png' },
  { name:'Manga-Comic-Con Leipzig', city:'Leipzig', country:'Germany', flag:'🇩🇪', start:'2026-03-19', end:'2026-03-22', dateLabel:'19–22 MAR 2026', type:'Anime', url:'https://www.manga-comic-con.de/en/', image:'/hd-category-manga.png' },
  { name:'I Heart Horror', city:'Lint', country:'Belgium', flag:'🇧🇪', start:'2026-03-21', end:'2026-03-22', dateLabel:'21–22 MAR 2026', type:'Pop Culture', url:'https://www.comiccon.group/', image:'/category-artist.png' },
  { name:'Heroes Dutch Comic Con Spring', city:'Utrecht', country:'Netherlands', flag:'🇳🇱', start:'2026-03-28', end:'2026-03-29', dateLabel:'28–29 MAR 2026', type:'Pop Culture', url:'https://www.dutchcomiccon.com/', image:'/hd-category-cosplay.png' },
  { name:'Romics Spring', city:'Rome', country:'Italy', flag:'🇮🇹', start:'2026-04-09', end:'2026-04-12', dateLabel:'9–12 APR 2026', type:'Comics', url:'https://www.romics.it/', image:'/category-artist.png' },
  { name:'Comic Con France', city:'Paris–Villepinte', country:'France', flag:'🇫🇷', start:'2026-04-18', end:'2026-04-19', dateLabel:'18–19 APR 2026', type:'Pop Culture', url:'https://www.comiccon.fr/', image:'/hd-category-figures.png' },
  { name:'COMICON Napoli', city:'Naples', country:'Italy', flag:'🇮🇹', start:'2026-04-30', end:'2026-05-03', dateLabel:'30 APR–3 MAY 2026', type:'Comics', url:'https://napoli.comicon.it/', image:'/category-artist.png' },
  { name:'Comic Con Brussels Spring', city:'Brussels', country:'Belgium', flag:'🇧🇪', start:'2026-05-02', end:'2026-05-03', dateLabel:'2–3 MAY 2026', type:'Pop Culture', url:'https://comicconbrussels.com/', image:'/hd-category-cosplay.png' },
  { name:'Comic Con Holland — Den Bosch', city:'Den Bosch', country:'Netherlands', flag:'🇳🇱', start:'2026-05-09', end:'2026-05-10', dateLabel:'9–10 MAY 2026', type:'Pop Culture', url:'https://comiccon.nl/', image:'/hd-category-figures.png' },
  { name:'Milano Comics & Games', city:'Milan', country:'Italy', flag:'🇮🇹', start:'2026-05-09', end:'2026-05-10', dateLabel:'9–10 MAY 2026', type:'Gaming', url:'https://www.fieredelfumetto.it/', image:'/hd-category-gaming.png' },
  { name:'Comic Barcelona', city:'Barcelona', country:'Spain', flag:'🇪🇸', start:'2026-05-15', end:'2026-05-17', dateLabel:'15–17 MAY 2026', type:'Comics', url:'https://www.comic-barcelona.com/en/home.cfm', image:'/hd-category-manga.png' },
  { name:'IberAnime Lisboa', city:'Lisbon', country:'Portugal', flag:'🇵🇹', start:'2026-05-16', end:'2026-05-17', dateLabel:'16–17 MAY 2026', type:'Anime', url:'https://www.iberanime.com/', image:'/category-artist.png' },
  { name:'DoKomi', city:'Düsseldorf', country:'Germany', flag:'🇩🇪', start:'2026-05-29', end:'2026-05-31', dateLabel:'29–31 MAY 2026', type:'Anime', url:'https://www.dokomi.de/en', image:'/category-artist.png' },
  { name:'COMICON Bergamo', city:'Bergamo', country:'Italy', flag:'🇮🇹', start:'2026-06-26', end:'2026-06-28', dateLabel:'26–28 JUN 2026', type:'Comics', url:'https://comicon.it/attivita/festival', image:'/hd-category-manga.png' },
  { name:'Comic Con Open Air', city:'Vilvoorde', country:'Belgium', flag:'🇧🇪', start:'2026-07-04', end:'2026-07-05', dateLabel:'4–5 JUL 2026', type:'Pop Culture', url:'https://www.comiccon.group/', image:'/hd-category-cosplay.png' },
  { name:'Japan Expo Paris', city:'Paris', country:'France', flag:'🇫🇷', start:'2026-07-09', end:'2026-07-12', dateLabel:'9–12 JUL 2026', type:'Anime', url:'https://paris.japan-expo.com/en', image:'/category-artist.png' },
  { name:'AnimagiC', city:'Mannheim', country:'Germany', flag:'🇩🇪', start:'2026-07-31', end:'2026-08-02', dateLabel:'31 JUL–2 AUG 2026', type:'Anime', url:'https://animagic.de/', image:'/cosmora-hero.png' },
  { name:'Elftopia', city:'Deinze', country:'Belgium', flag:'🇧🇪', start:'2026-08-08', end:'2026-08-09', dateLabel:'8–9 AUG 2026', type:'Pop Culture', url:'https://www.elftopia.be/', image:'/hd-category-cosplay.png' },
  { name:'gamescom', city:'Cologne', country:'Germany', flag:'🇩🇪', start:'2026-08-26', end:'2026-08-30', dateLabel:'26–30 AUG 2026', type:'Gaming', url:'https://www.gamescom.global/', image:'/hd-category-gaming.png', featured:true },
  { name:'BD Comic Strip Festival', city:'Brussels', country:'Belgium', flag:'🇧🇪', start:'2026-09-19', end:'2026-09-20', dateLabel:'19–20 SEP 2026', type:'Comics', url:'https://www.visit.brussels/en/visitors/agenda/bd-comic-strip-festival/home-page', image:'/hd-category-manga.png' },
  { name:'Romics Fall', city:'Rome', country:'Italy', flag:'🇮🇹', start:'2026-10-01', end:'2026-10-04', dateLabel:'1–4 OCT 2026', type:'Comics', url:'https://www.romics.it/', image:'/category-artist.png' },
  { name:'Comic Con Holland — Greater Amsterdam', city:'Vijfhuizen', country:'Netherlands', flag:'🇳🇱', start:'2026-10-10', end:'2026-10-11', dateLabel:'10–11 OCT 2026', type:'Pop Culture', url:'https://comiccon.nl/', image:'/hd-category-figures.png' },
  { name:'Paris Games Week', city:'Paris', country:'France', flag:'🇫🇷', start:'2026-10-22', end:'2026-10-25', dateLabel:'22–25 OCT 2026', type:'Gaming', url:'https://www.parisgamesweek.com/en', image:'/hd-category-gaming.png' },
  { name:'Comic Con Brussels Fall', city:'Brussels', country:'Belgium', flag:'🇧🇪', start:'2026-10-24', end:'2026-10-25', dateLabel:'24–25 OCT 2026', type:'Pop Culture', url:'https://comicconbrussels.com/', image:'/hd-category-cosplay.png' },
  { name:'Lucca Comics & Games', city:'Lucca', country:'Italy', flag:'🇮🇹', start:'2026-10-28', end:'2026-11-01', dateLabel:'28 OCT–1 NOV 2026', type:'Pop Culture', url:'https://www.luccacomicsandgames.com/', image:'/cosmora-hero.png', featured:true, internalUrl:'/events/lucca-comics-2026' },
  { name:'FACTS Fall', city:'Ghent', country:'Belgium', flag:'🇧🇪', start:'2026-10-31', end:'2026-11-01', dateLabel:'31 OCT–1 NOV 2026', type:'Pop Culture', url:'https://www.facts.be/en/', image:'/hd-category-figures.png' },
  { name:'Heroes Dutch Comic Con Winter', city:'Utrecht', country:'Netherlands', flag:'🇳🇱', start:'2026-11-21', end:'2026-11-22', dateLabel:'21–22 NOV 2026', type:'Pop Culture', url:'https://www.dutchcomiccon.com/', image:'/hd-category-cosplay.png' },
  { name:'Manga Barcelona', city:'Barcelona', country:'Spain', flag:'🇪🇸', start:'2026-12-05', end:'2026-12-08', dateLabel:'5–8 DEC 2026', type:'Anime', url:'https://www.manga-barcelona.com/en/home.cfm', image:'/hd-category-manga.png', featured:true },
];

const eventImages: Record<string, string> = {
  'Japan Con: Brussels Manga':'/events/japan-con-brussels-manga.svg',
  'Manga-Comic-Con Leipzig':'/events/manga-comic-con-leipzig.jpg',
  'I Heart Horror':'/events/i-heart-horror.webp',
  'Heroes Dutch Comic Con Spring':'/events/heroes-dutch-comic-con-spring.jpg',
  'Romics Spring':'/events/romics-spring.jpg',
  'Comic Con France':'/events/comic-con-france.jpg',
  'COMICON Napoli':'/events/comicon-napoli.jpg',
  'Comic Con Brussels Spring':'/events/comic-con-brussels-spring.jpg',
  'Comic Con Holland — Den Bosch':'/events/comic-con-holland-den-bosch.jpg',
  'Milano Comics & Games':'/events/milano-comics-games.jpg',
  'Comic Barcelona':'/events/comic-barcelona.png',
  'IberAnime Lisboa':'/events/iberanime-lisboa.png',
  'DoKomi':'/events/dokomi.png',
  'COMICON Bergamo':'/events/comicon-bergamo.jpg',
  'Comic Con Open Air':'/events/comic-con-open-air.webp',
  'Japan Expo Paris':'/events/japan-expo-paris.png',
  'AnimagiC':'/events/animagic.png',
  'Elftopia':'/events/elftopia.jpg',
  'gamescom':'/events/gamescom.png',
  'BD Comic Strip Festival':'/events/bd-comic-strip-festival.svg',
  'Romics Fall':'/events/romics-fall.jpg',
  'Comic Con Holland — Greater Amsterdam':'/events/comic-con-holland-greater-amsterdam.jpg',
  'Paris Games Week':'/events/paris-games-week.png',
  'Comic Con Brussels Fall':'/events/comic-con-brussels-fall.jpg',
  'Lucca Comics & Games':'/events/lucca-comics-games.jpg',
  'FACTS Fall':'/events/facts-fall.jpg',
  'Heroes Dutch Comic Con Winter':'/events/heroes-dutch-comic-con-winter.jpg',
  'Manga Barcelona':'/events/manga-barcelona.jpg',
};

export const europeEvents: EuropeEvent[] = eventCatalog.map((event) => ({ ...event, image: eventImages[event.name] ?? event.image }));
