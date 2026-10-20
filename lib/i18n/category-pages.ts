import type { MarketCategoryId } from '../marketplace-categories';
import type { Locale } from './config';

type CategoryPageCopy = {
  intro: string;
  searchPlaceholder: string;
};

export const categoryPages = {
  it: {
    Cosplay: {
      intro: 'Cerca costumi, parrucche e accessori per il tuo prossimo cosplay.',
      searchPlaceholder: 'Personaggio, taglia o accessorio…',
    },
    Comics: {
      intro: 'Cerca manga, fumetti e volumi per la tua collezione.',
      searchPlaceholder: 'Titolo, serie o autore…',
    },
    Figures: {
      intro: 'Cerca action figure, statue e personaggi da collezione.',
      searchPlaceholder: 'Personaggio, marchio o serie…',
    },
    Cards: {
      intro: 'Cerca carte singole, mazzi e accessori per la tua collezione.',
      searchPlaceholder: 'Gioco, carta o espansione…',
    },
    Gaming: {
      intro: 'Cerca videogiochi, console e accessori per giocare.',
      searchPlaceholder: 'Gioco, console o accessorio…',
    },
  },
  en: {
    Cosplay: {
      intro: 'Search for costumes, wigs and accessories for your next cosplay.',
      searchPlaceholder: 'Character, size or accessory…',
    },
    Comics: {
      intro: 'Search for manga, comics and volumes for your collection.',
      searchPlaceholder: 'Title, series or author…',
    },
    Figures: {
      intro: 'Search for action figures, statues and collectible characters.',
      searchPlaceholder: 'Character, brand or series…',
    },
    Cards: {
      intro: 'Search for single cards, decks and accessories for your collection.',
      searchPlaceholder: 'Game, card or expansion…',
    },
    Gaming: {
      intro: 'Search for video games, consoles and gaming accessories.',
      searchPlaceholder: 'Game, console or accessory…',
    },
  },
  fr: {
    Cosplay: {
      intro: 'Recherchez des costumes, des perruques et des accessoires pour votre prochain cosplay.',
      searchPlaceholder: 'Personnage, taille ou accessoire…',
    },
    Comics: {
      intro: 'Recherchez des mangas, des BD et des tomes pour votre collection.',
      searchPlaceholder: 'Titre, série ou auteur…',
    },
    Figures: {
      intro: 'Recherchez des figurines, des statues et des personnages de collection.',
      searchPlaceholder: 'Personnage, marque ou série…',
    },
    Cards: {
      intro: 'Recherchez des cartes à l’unité, des decks et des accessoires pour votre collection.',
      searchPlaceholder: 'Jeu, carte ou extension…',
    },
    Gaming: {
      intro: 'Recherchez des jeux vidéo, des consoles et des accessoires de jeu.',
      searchPlaceholder: 'Jeu, console ou accessoire…',
    },
  },
  de: {
    Cosplay: {
      intro: 'Suche nach Kostümen, Perücken und Zubehör für dein nächstes Cosplay.',
      searchPlaceholder: 'Charakter, Größe oder Zubehör…',
    },
    Comics: {
      intro: 'Suche nach Manga, Comics und Bänden für deine Sammlung.',
      searchPlaceholder: 'Titel, Reihe oder Autor…',
    },
    Figures: {
      intro: 'Suche nach Actionfiguren, Statuen und Sammelfiguren.',
      searchPlaceholder: 'Charakter, Marke oder Reihe…',
    },
    Cards: {
      intro: 'Suche nach Einzelkarten, Decks und Zubehör für deine Sammlung.',
      searchPlaceholder: 'Spiel, Karte oder Erweiterung…',
    },
    Gaming: {
      intro: 'Suche nach Videospielen, Konsolen und Gaming-Zubehör.',
      searchPlaceholder: 'Spiel, Konsole oder Zubehör…',
    },
  },
  es: {
    Cosplay: {
      intro: 'Busca disfraces, pelucas y accesorios para tu próximo cosplay.',
      searchPlaceholder: 'Personaje, talla o accesorio…',
    },
    Comics: {
      intro: 'Busca manga, cómics y tomos para tu colección.',
      searchPlaceholder: 'Título, serie o autor…',
    },
    Figures: {
      intro: 'Busca figuras de acción, estatuas y personajes de colección.',
      searchPlaceholder: 'Personaje, marca o serie…',
    },
    Cards: {
      intro: 'Busca cartas sueltas, mazos y accesorios para tu colección.',
      searchPlaceholder: 'Juego, carta o expansión…',
    },
    Gaming: {
      intro: 'Busca videojuegos, consolas y accesorios para jugar.',
      searchPlaceholder: 'Juego, consola o accesorio…',
    },
  },
} as const satisfies Record<Locale, Record<MarketCategoryId, CategoryPageCopy>>;

export function categoryPageCopy(
  locale: Locale,
  category: MarketCategoryId,
): CategoryPageCopy {
  return categoryPages[locale][category];
}

// Order: Italian, English, French, German, Spanish.
export const categoryPageStrings = {
  relatedSearches: [
    'Ricerche suggerite',
    'Suggested searches',
    'Recherches suggérées',
    'Suchvorschläge',
    'Búsquedas sugeridas',
  ],
  browseAll: [
    'Tutte le categorie',
    'All categories',
    'Toutes les catégories',
    'Alle Kategorien',
    'Todas las categorías',
  ],
  browseExplore: [
    'Torna a Esplora',
    'Back to Explore',
    'Retour à Explorer',
    'Zurück zu Entdecken',
    'Volver a Explorar',
  ],
  peopleSearch: [
    'Cerca una persona o un venditore',
    'Search for a person or seller',
    'Rechercher un membre ou un vendeur',
    'Person oder Verkäufer suchen',
    'Buscar una persona o un vendedor',
  ],
  peopleIntro: [
    'Scopri i profili, guarda gli annunci e contatta chi condivide le tue passioni.',
    'Discover profiles, browse listings and contact people who share your passions.',
    'Découvrez les profils, parcourez les annonces et contactez des personnes qui partagent vos passions.',
    'Entdecke Profile, sieh dir Anzeigen an und kontaktiere Menschen, die deine Leidenschaften teilen.',
    'Descubre perfiles, explora anuncios y contacta con personas que comparten tus pasiones.',
  ],
  clearSearch: [
    'Cancella ricerca',
    'Clear search',
    'Effacer la recherche',
    'Suche löschen',
    'Borrar búsqueda',
  ],
  resultsInCategory: [
    'Annunci in',
    'Listings in',
    'Annonces dans',
    'Anzeigen in',
    'Anuncios en',
  ],
  searchResults: [
    'Risultati per',
    'Results for',
    'Résultats pour',
    'Ergebnisse für',
    'Resultados para',
  ],
} as const satisfies Record<string, readonly [string, string, string, string, string]>;

export type CategoryPageKey = keyof typeof categoryPageStrings;
const localeIndex: Record<Locale, number> = { it: 0, en: 1, fr: 2, de: 3, es: 4 };

export function categoryPageText(locale: Locale, key: CategoryPageKey): string {
  return categoryPageStrings[key][localeIndex[locale]];
}
