import type { Locale } from './config';

type HomeCommunityCopy = {
  title: string;
  all: string;
  loading: string;
  unavailable: string;
  retry: string;
  empty: string;
  create: string;
  open: string;
  image: string;
};

export const homeCommunityMessages: Record<Locale, HomeCommunityCopy> = {
  it: {
    title: 'Dalla community',
    all: 'Tutti i post',
    loading: 'Caricamento dei post…',
    unavailable: 'I post non sono disponibili al momento.',
    retry: 'Riprova',
    empty: 'Il prossimo momento da condividere potrebbe essere il tuo.',
    create: 'Condividi una foto',
    open: 'Apri il post',
    image: 'Foto non disponibile',
  },
  en: {
    title: 'From the community',
    all: 'All posts',
    loading: 'Loading posts…',
    unavailable: 'Posts are currently unavailable.',
    retry: 'Try again',
    empty: 'The next moment to share could be yours.',
    create: 'Share a photo',
    open: 'Open post',
    image: 'Photo unavailable',
  },
  fr: {
    title: 'Dans la communauté',
    all: 'Tous les posts',
    loading: 'Chargement des posts…',
    unavailable: 'Les posts sont indisponibles pour le moment.',
    retry: 'Réessayer',
    empty: 'Le prochain moment à partager pourrait être le vôtre.',
    create: 'Partager une photo',
    open: 'Ouvrir le post',
    image: 'Photo indisponible',
  },
  de: {
    title: 'Aus der Community',
    all: 'Alle Beiträge',
    loading: 'Beiträge werden geladen…',
    unavailable: 'Beiträge sind momentan nicht verfügbar.',
    retry: 'Erneut versuchen',
    empty: 'Der nächste gemeinsame Moment könnte deiner sein.',
    create: 'Foto teilen',
    open: 'Beitrag öffnen',
    image: 'Foto nicht verfügbar',
  },
  es: {
    title: 'De la comunidad',
    all: 'Todas las publicaciones',
    loading: 'Cargando publicaciones…',
    unavailable: 'Las publicaciones no están disponibles en este momento.',
    retry: 'Reintentar',
    empty: 'El próximo momento para compartir podría ser el tuyo.',
    create: 'Compartir una foto',
    open: 'Abrir publicación',
    image: 'Foto no disponible',
  },
};
