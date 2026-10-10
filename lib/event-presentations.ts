import type { Locale } from './i18n/config';

const en = {
  showcase: 'Event guide', date: 'When', location: 'Where', category: 'Explore',
  about: 'Plan your visit', officialInfo: 'Programme, tickets, opening hours and the latest announcements are available on the organiser’s official website.',
  independent: 'An independent COSMORA guide. Event names identify their respective organisers; COSMORA is not the organiser.',
  pastInfo: 'This edition has ended. The official website may now show a later edition.',
  imageSource: 'Image source', license: 'Licence', usageTerms: 'Terms of use', archive: 'Archive photo', photo: 'Photo',
  officialLogo: 'Event logo', editorial: 'COSMORA illustration', imageCredits: 'Image credits',
  back: 'All events', unavailable: 'Event not found', communityIntro: 'Meet people who share your interests and organise your next visit together.',
};

export const eventPresentationMessages: Record<Locale, typeof en> = {
  en,
  it: {
    showcase: 'Vetrina evento', date: 'Quando', location: 'Dove', category: 'Da scoprire',
    about: 'Prepara la tua visita', officialInfo: 'Programma, biglietti, orari di apertura e ultimi aggiornamenti sono disponibili sul sito ufficiale dell’organizzatore.',
    independent: 'Una guida indipendente di COSMORA. I nomi identificano i rispettivi eventi; COSMORA non è l’organizzatore.',
    pastInfo: 'Questa edizione è terminata. Il sito ufficiale potrebbe già mostrare un’edizione successiva.',
    imageSource: 'Fonte immagine', license: 'Licenza', usageTerms: 'Condizioni d’uso', archive: 'Foto d’archivio', photo: 'Foto',
    officialLogo: 'Logo dell’evento', editorial: 'Illustrazione COSMORA', imageCredits: 'Crediti immagine',
    back: 'Tutti gli eventi', unavailable: 'Evento non trovato', communityIntro: 'Incontra persone con le tue passioni e organizza insieme la prossima visita.',
  },
  fr: {
    showcase: 'Guide de l’événement', date: 'Quand', location: 'Où', category: 'À découvrir',
    about: 'Préparez votre visite', officialInfo: 'Le programme, les billets, les horaires et les dernières annonces sont disponibles sur le site officiel de l’organisateur.',
    independent: 'Un guide indépendant de COSMORA. Les noms identifient les événements respectifs ; COSMORA n’en est pas l’organisateur.',
    pastInfo: 'Cette édition est terminée. Le site officiel peut déjà présenter une édition ultérieure.',
    imageSource: 'Source de l’image', license: 'Licence', usageTerms: 'Conditions d’utilisation', archive: 'Photo d’archives', photo: 'Photo',
    officialLogo: 'Logo de l’événement', editorial: 'Illustration COSMORA', imageCredits: 'Crédits de l’image',
    back: 'Tous les événements', unavailable: 'Événement introuvable', communityIntro: 'Rencontrez des personnes qui partagent vos passions et préparez votre prochaine visite ensemble.',
  },
  de: {
    showcase: 'Event-Guide', date: 'Wann', location: 'Wo', category: 'Entdecken',
    about: 'Plane deinen Besuch', officialInfo: 'Programm, Tickets, Öffnungszeiten und aktuelle Ankündigungen findest du auf der offiziellen Website des Veranstalters.',
    independent: 'Ein unabhängiger COSMORA-Guide. Die Namen bezeichnen die jeweiligen Veranstaltungen; COSMORA ist nicht der Veranstalter.',
    pastInfo: 'Diese Ausgabe ist beendet. Die offizielle Website zeigt möglicherweise bereits eine spätere Ausgabe.',
    imageSource: 'Bildquelle', license: 'Lizenz', usageTerms: 'Nutzungsbedingungen', archive: 'Archivfoto', photo: 'Foto',
    officialLogo: 'Event-Logo', editorial: 'COSMORA-Illustration', imageCredits: 'Bildnachweis',
    back: 'Alle Events', unavailable: 'Event nicht gefunden', communityIntro: 'Triff Menschen mit gleichen Interessen und plant euren nächsten Besuch gemeinsam.',
  },
  es: {
    showcase: 'Guía del evento', date: 'Cuándo', location: 'Dónde', category: 'Descubrir',
    about: 'Prepara tu visita', officialInfo: 'El programa, las entradas, los horarios y las últimas novedades están disponibles en la web oficial del organizador.',
    independent: 'Una guía independiente de COSMORA. Los nombres identifican los eventos correspondientes; COSMORA no es el organizador.',
    pastInfo: 'Esta edición ha terminado. La web oficial puede mostrar ya una edición posterior.',
    imageSource: 'Fuente de la imagen', license: 'Licencia', usageTerms: 'Condiciones de uso', archive: 'Foto de archivo', photo: 'Foto',
    officialLogo: 'Logo del evento', editorial: 'Ilustración COSMORA', imageCredits: 'Créditos de la imagen',
    back: 'Todos los eventos', unavailable: 'Evento no encontrado', communityIntro: 'Conoce a personas con tus aficiones y organizad juntos vuestra próxima visita.',
  },
};
