import type { Locale } from './config';

export const uiControls: Record<
  Locale,
  {
    close: string;
    previousSlide: string;
    nextSlide: string;
    carousel: string;
    slide: string;
  }
> = {
  it: {
    close: 'Chiudi',
    previousSlide: 'Immagine precedente',
    nextSlide: 'Immagine successiva',
    carousel: 'Carosello',
    slide: 'Elemento',
  },
  en: {
    close: 'Close',
    previousSlide: 'Previous slide',
    nextSlide: 'Next slide',
    carousel: 'Carousel',
    slide: 'Slide',
  },
  fr: {
    close: 'Fermer',
    previousSlide: 'Élément précédent',
    nextSlide: 'Élément suivant',
    carousel: 'Carrousel',
    slide: 'Élément',
  },
  de: {
    close: 'Schließen',
    previousSlide: 'Vorheriges Element',
    nextSlide: 'Nächstes Element',
    carousel: 'Karussell',
    slide: 'Element',
  },
  es: {
    close: 'Cerrar',
    previousSlide: 'Elemento anterior',
    nextSlide: 'Elemento siguiente',
    carousel: 'Carrusel',
    slide: 'Elemento',
  },
};
