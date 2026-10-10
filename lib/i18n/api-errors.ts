import type { Locale } from './config';
import { accountRestrictions } from './account-restrictions.ts';

// Translate service errors for display only. Keep the original Error, status and
// code for authentication and retry decisions; never pass user content here.
const localeIndex: Record<Locale, number> = {
  it: 0,
  en: 1,
  fr: 2,
  de: 3,
  es: 4,
};
const copy = {
  unknown: [
    'Operazione non riuscita. Riprova; se il problema continua, contatta l’assistenza.',
    'The operation could not be completed. Try again; if the problem continues, contact support.',
    'L’opération n’a pas pu aboutir. Réessayez ; si le problème persiste, contactez l’assistance.',
    'Der Vorgang konnte nicht abgeschlossen werden. Versuche es erneut und kontaktiere den Support, falls das Problem bestehen bleibt.',
    'No se pudo completar la operación. Inténtalo de nuevo; si el problema continúa, contacta con asistencia.',
  ],
  login: [
    'Accedi per continuare.',
    'Sign in to continue.',
    'Connectez-vous pour continuer.',
    'Melde dich an, um fortzufahren.',
    'Inicia sesión para continuar.',
  ],
  authUnavailable: [
    'Accesso non disponibile. Riprova più tardi.',
    'Sign-in is unavailable. Try again later.',
    'La connexion est indisponible. Réessayez plus tard.',
    'Die Anmeldung ist nicht verfügbar. Versuche es später erneut.',
    'El acceso no está disponible. Inténtalo más tarde.',
  ],
  network: [
    'Connessione non disponibile. Controlla la rete e riprova.',
    'Connection unavailable. Check your network and try again.',
    'Connexion indisponible. Vérifiez votre réseau et réessayez.',
    'Keine Verbindung verfügbar. Prüfe dein Netzwerk und versuche es erneut.',
    'Conexión no disponible. Revisa tu red e inténtalo de nuevo.',
  ],
  timeout: [
    'La connessione sta impiegando troppo tempo. Controlla la rete e riprova.',
    'The connection is taking too long. Check your network and try again.',
    'La connexion prend trop de temps. Vérifiez votre réseau et réessayez.',
    'Die Verbindung dauert zu lange. Prüfe dein Netzwerk und versuche es erneut.',
    'La conexión está tardando demasiado. Revisa tu red e inténtalo de nuevo.',
  ],
  service: [
    'Servizio temporaneamente non disponibile. Riprova.',
    'Service temporarily unavailable. Try again.',
    'Service temporairement indisponible. Réessayez.',
    'Der Dienst ist vorübergehend nicht verfügbar. Versuche es erneut.',
    'Servicio temporalmente no disponible. Inténtalo de nuevo.',
  ],
  invalid: [
    'Controlla i campi obbligatori, le lunghezze e gli importi indicati.',
    'Check required fields, text lengths and amounts.',
    'Vérifiez les champs obligatoires, la longueur des textes et les montants.',
    'Prüfe Pflichtfelder, Textlängen und Beträge.',
    'Revisa los campos obligatorios, la longitud de los textos y los importes.',
  ],
  catalogue: [
    'Catalogo non disponibile. Riprova.',
    'The catalogue is unavailable. Try again.',
    'Le catalogue est indisponible. Réessayez.',
    'Der Katalog ist nicht verfügbar. Versuche es erneut.',
    'El catálogo no está disponible. Inténtalo de nuevo.',
  ],
  sellerInvalid: [
    'Venditore non valido.',
    'Invalid seller.',
    'Vendeur non valide.',
    'Ungültiger Verkäufer.',
    'Vendedor no válido.',
  ],
  sellersUnavailable: [
    'Informazioni sui venditori non disponibili. Riprova.',
    'Seller information is unavailable. Try again.',
    'Les informations sur les vendeurs sont indisponibles. Réessayez.',
    'Verkäuferinformationen sind nicht verfügbar. Versuche es erneut.',
    'La información de los vendedores no está disponible. Inténtalo de nuevo.',
  ],
  imagesUnavailable: [
    'Immagini non disponibili. Riprova.',
    'Images are unavailable. Try again.',
    'Les images sont indisponibles. Réessayez.',
    'Die Bilder sind nicht verfügbar. Versuche es erneut.',
    'Las imágenes no están disponibles. Inténtalo de nuevo.',
  ],
  listingPhotos: [
    'Inserisci da 1 a 8 foto.',
    'Add between 1 and 8 photos.',
    'Ajoutez entre 1 et 8 photos.',
    'Füge 1 bis 8 Fotos hinzu.',
    'Añade entre 1 y 8 fotos.',
  ],
  listingPhotoFormat: [
    'Le foto devono essere JPG, PNG o WebP e non superare 10 MB.',
    'Photos must be JPG, PNG or WebP and no larger than 10 MB.',
    'Les photos doivent être au format JPG, PNG ou WebP et ne pas dépasser 10 Mo.',
    'Fotos müssen im Format JPG, PNG oder WebP vorliegen und dürfen höchstens 10 MB groß sein.',
    'Las fotos deben ser JPG, PNG o WebP y no superar los 10 MB.',
  ],
  sellerProfile: [
    'Profilo venditore non disponibile.',
    'Seller profile unavailable.',
    'Profil vendeur indisponible.',
    'Verkäuferprofil nicht verfügbar.',
    'Perfil de vendedor no disponible.',
  ],
  sellerComplete: [
    'Completa prima il profilo venditore.',
    'Complete your seller profile first.',
    'Complétez d’abord votre profil vendeur.',
    'Vervollständige zuerst dein Verkäuferprofil.',
    'Completa primero tu perfil de vendedor.',
  ],
  salePrice: [
    'Inserisci il prezzo di vendita.',
    'Enter the sale price.',
    'Indiquez le prix de vente.',
    'Gib den Verkaufspreis ein.',
    'Introduce el precio de venta.',
  ],
  rentalPrice: [
    'Inserisci prezzo e durata del noleggio.',
    'Enter the rental price and duration.',
    'Indiquez le prix et la durée de location.',
    'Gib Mietpreis und Mietdauer ein.',
    'Introduce el precio y la duración del alquiler.',
  ],
  rentalUnavailable: [
    'Il noleggio non è disponibile in questa versione.',
    'Rentals are unavailable in this version.',
    'La location n’est pas disponible dans cette version.',
    'Vermietung ist in dieser Version nicht verfügbar.',
    'El alquiler no está disponible en esta versión.',
  ],
  listingCreate: [
    'Impossibile creare l’annuncio. Riprova.',
    'The listing could not be created. Try again.',
    'L’annonce n’a pas pu être créée. Réessayez.',
    'Die Anzeige konnte nicht erstellt werden. Versuche es erneut.',
    'No se pudo crear el anuncio. Inténtalo de nuevo.',
  ],
  photoUpload: [
    'Caricamento foto non riuscito. Riprova.',
    'Photo upload failed. Try again.',
    'L’envoi des photos a échoué. Réessayez.',
    'Die Fotos konnten nicht hochgeladen werden. Versuche es erneut.',
    'No se pudieron subir las fotos. Inténtalo de nuevo.',
  ],
  shippingCost: [
    'Indica il costo di spedizione, anche se gratuito.',
    'Enter the shipping cost, including zero for free shipping.',
    'Indiquez les frais de livraison, même s’ils sont nuls.',
    'Gib die Versandkosten an, auch bei kostenlosem Versand.',
    'Indica el coste del envío, aunque sea gratuito.',
  ],
  shippingDetails: [
    'Controlla modalità, costo e tempi di consegna. Il ritiro a mano deve avere costo zero.',
    'Check the delivery method, cost and timing. In-person pickup must cost zero.',
    'Vérifiez le mode, les frais et le délai de livraison. La remise en main propre doit avoir un coût nul.',
    'Prüfe Lieferart, Kosten und Lieferzeit. Persönliche Abholung muss kostenlos sein.',
    'Revisa el método, el coste y el plazo de entrega. La recogida en persona debe tener coste cero.',
  ],
  sellerFields: [
    'Controlla nome, paese e indirizzo email.',
    'Check your name, country and email address.',
    'Vérifiez votre nom, votre pays et votre adresse e-mail.',
    'Prüfe Name, Land und E-Mail-Adresse.',
    'Revisa tu nombre, país y dirección de correo electrónico.',
  ],
  businessFields: [
    'Completa i dati aziendali e le condizioni di vendita.',
    'Complete the business details and terms of sale.',
    'Complétez les informations de l’entreprise et les conditions de vente.',
    'Vervollständige die Unternehmensdaten und Verkaufsbedingungen.',
    'Completa los datos de la empresa y las condiciones de venta.',
  ],
  sellerSave: [
    'Impossibile salvare i dati venditore. Riprova.',
    'Seller details could not be saved. Try again.',
    'Les données du vendeur n’ont pas pu être enregistrées. Réessayez.',
    'Verkäuferdaten konnten nicht gespeichert werden. Versuche es erneut.',
    'No se pudieron guardar los datos del vendedor. Inténtalo de nuevo.',
  ],
  publicProfileSave: [
    'Dati salvati, ma il profilo pubblico non è stato aggiornato. Riprova.',
    'Details saved, but the public profile was not updated. Try again.',
    'Les données ont été enregistrées, mais le profil public n’a pas été mis à jour. Réessayez.',
    'Die Daten wurden gespeichert, aber das öffentliche Profil wurde nicht aktualisiert. Versuche es erneut.',
    'Los datos se guardaron, pero el perfil público no se actualizó. Inténtalo de nuevo.',
  ],
  profileUnavailable: [
    'Profilo non disponibile.',
    'Profile unavailable.',
    'Profil indisponible.',
    'Profil nicht verfügbar.',
    'Perfil no disponible.',
  ],
  listingsUnavailable: [
    'Annunci non disponibili. Riprova.',
    'Listings unavailable. Try again.',
    'Annonces indisponibles. Réessayez.',
    'Anzeigen nicht verfügbar. Versuche es erneut.',
    'Anuncios no disponibles. Inténtalo de nuevo.',
  ],
  pageInvalid: [
    'Pagina non valida.',
    'Invalid page.',
    'Page non valide.',
    'Ungültige Seite.',
    'Página no válida.',
  ],
  listingFields: [
    'Controlla titolo, descrizione e prezzi.',
    'Check the title, description and prices.',
    'Vérifiez le titre, la description et les prix.',
    'Prüfe Titel, Beschreibung und Preise.',
    'Revisa el título, la descripción y los precios.',
  ],
  listingUnavailable: [
    'Annuncio non disponibile.',
    'Listing unavailable.',
    'Annonce indisponible.',
    'Anzeige nicht verfügbar.',
    'Anuncio no disponible.',
  ],
  rentalEditHold: [
    'La modifica degli annunci con noleggio è sospesa in questa versione. I dati sono conservati.',
    'Editing rental listings is paused in this version. The data is retained.',
    'La modification des annonces de location est suspendue dans cette version. Les données sont conservées.',
    'Die Bearbeitung von Mietanzeigen ist in dieser Version ausgesetzt. Die Daten bleiben erhalten.',
    'La edición de los anuncios de alquiler está suspendida en esta versión. Los datos se conservan.',
  ],
  listingEdit: [
    'Questo annuncio non può essere modificato.',
    'This listing cannot be edited.',
    'Cette annonce ne peut pas être modifiée.',
    'Diese Anzeige kann nicht bearbeitet werden.',
    'Este anuncio no se puede editar.',
  ],
  listingPrice: [
    'Inserisci il prezzo previsto per questo annuncio.',
    'Enter the required price for this listing.',
    'Indiquez le prix requis pour cette annonce.',
    'Gib den erforderlichen Preis für diese Anzeige ein.',
    'Introduce el precio requerido para este anuncio.',
  ],
  saveFailed: [
    'Salvataggio non riuscito. Riprova.',
    'Saving failed. Try again.',
    'L’enregistrement a échoué. Réessayez.',
    'Speichern fehlgeschlagen. Versuche es erneut.',
    'No se pudo guardar. Inténtalo de nuevo.',
  ],
  listingConflict: [
    'Annuncio modificato in un’altra sessione. Aggiorna la pagina prima di salvare.',
    'The listing was changed in another session. Refresh the page before saving.',
    'L’annonce a été modifiée dans une autre session. Actualisez la page avant de l’enregistrer.',
    'Die Anzeige wurde in einer anderen Sitzung geändert. Aktualisiere die Seite vor dem Speichern.',
    'El anuncio se modificó en otra sesión. Actualiza la página antes de guardar.',
  ],
  communityUnavailable: [
    'Community non disponibile. Riprova.',
    'Community unavailable. Try again.',
    'Communauté indisponible. Réessayez.',
    'Community nicht verfügbar. Versuche es erneut.',
    'Comunidad no disponible. Inténtalo de nuevo.',
  ],
  postLoad: [
    'Non è stato possibile caricare i post. Riprova.',
    'Posts could not be loaded. Try again.',
    'Les publications n’ont pas pu être chargées. Réessayez.',
    'Beiträge konnten nicht geladen werden. Versuche es erneut.',
    'No se pudieron cargar las publicaciones. Inténtalo de nuevo.',
  ],
  communityMedia: [
    'Inserisci fino a 8 foto o video supportati (massimo 25 MB ciascuno).',
    'Add up to 8 supported photos or videos (maximum 25 MB each).',
    'Ajoutez jusqu’à 8 photos ou vidéos compatibles (25 Mo maximum chacune).',
    'Füge bis zu 8 unterstützte Fotos oder Videos hinzu (jeweils höchstens 25 MB).',
    'Añade hasta 8 fotos o vídeos compatibles (máximo 25 MB cada uno).',
  ],
  connectionInvalid: [
    'Collegamento non valido.',
    'Invalid connection.',
    'Lien non valide.',
    'Ungültige Verknüpfung.',
    'Enlace no válido.',
  ],
  connectionsUnavailable: [
    'Collegamenti non disponibili. Riprova.',
    'Connections unavailable. Try again.',
    'Liens indisponibles. Réessayez.',
    'Verknüpfungen nicht verfügbar. Versuche es erneut.',
    'Enlaces no disponibles. Inténtalo de nuevo.',
  ],
  eventUnavailable: [
    'Evento non disponibile.',
    'Event unavailable.',
    'Événement indisponible.',
    'Event nicht verfügbar.',
    'Evento no disponible.',
  ],
  crewUnavailable: [
    'Crew non disponibile.',
    'Crew unavailable.',
    'Groupe indisponible.',
    'Gruppe nicht verfügbar.',
    'Grupo no disponible.',
  ],
  postRateLimit: [
    'Pubblicazione momentaneamente non disponibile. Riprova più tardi.',
    'Publishing is temporarily unavailable. Try again later.',
    'La publication est temporairement indisponible. Réessayez plus tard.',
    'Veröffentlichen ist vorübergehend nicht verfügbar. Versuche es später erneut.',
    'La publicación no está disponible temporalmente. Inténtalo más tarde.',
  ],
  categoryUnavailable: [
    'Categoria non disponibile. Scegli un’altra categoria.',
    'Category unavailable. Choose another category.',
    'Catégorie indisponible. Choisissez une autre catégorie.',
    'Kategorie nicht verfügbar. Wähle eine andere Kategorie.',
    'Categoría no disponible. Elige otra categoría.',
  ],
  postPublish: [
    'Pubblicazione non riuscita. Riprova.',
    'Publishing failed. Try again.',
    'La publication a échoué. Réessayez.',
    'Veröffentlichung fehlgeschlagen. Versuche es erneut.',
    'No se pudo publicar. Inténtalo de nuevo.',
  ],
  mediaUpload: [
    'Caricamento dei contenuti non riuscito. Riprova.',
    'Media upload failed. Try again.',
    'L’envoi des fichiers a échoué. Réessayez.',
    'Die Dateien konnten nicht hochgeladen werden. Versuche es erneut.',
    'No se pudieron subir los archivos. Inténtalo de nuevo.',
  ],
  paymentsUnavailable: [
    'I pagamenti non sono disponibili in questa versione di COSMORA.',
    'Payments are unavailable in this version of COSMORA.',
    'Les paiements ne sont pas disponibles dans cette version de COSMORA.',
    'Zahlungen sind in dieser COSMORA-Version nicht verfügbar.',
    'Los pagos no están disponibles en esta versión de COSMORA.',
  ],
  payoutUnavailable: [
    'Verifica Stripe non disponibile. Riprova senza creare un altro account.',
    'Stripe verification is unavailable. Try again without creating another account.',
    'La vérification Stripe est indisponible. Réessayez sans créer un autre compte.',
    'Die Stripe-Verifizierung ist nicht verfügbar. Versuche es erneut, ohne ein weiteres Konto zu erstellen.',
    'La verificación de Stripe no está disponible. Inténtalo de nuevo sin crear otra cuenta.',
  ],
  payoutSave: [
    'Impossibile salvare il conto. Riprova.',
    'The payout account could not be saved. Try again.',
    'Le compte de versement n’a pas pu être enregistré. Réessayez.',
    'Das Auszahlungskonto konnte nicht gespeichert werden. Versuche es erneut.',
    'No se pudo guardar la cuenta de pagos. Inténtalo de nuevo.',
  ],
} as const;
type ErrorKey = keyof typeof copy;

const aliases: Record<string, ErrorKey> = {
  'Accedi per continuare.': 'login',
  'Accesso non disponibile.': 'authUnavailable',
  'Accesso non disponibile. Riprova più tardi.': 'authUnavailable',
  'Connessione non disponibile. Controlla la rete e riprova.': 'network',
  'Failed to fetch': 'network',
  'Load failed': 'network',
  'Network request failed': 'network',
  'La connessione sta impiegando troppo tempo. Controlla la rete e riprova.':
    'timeout',
  'Risposta del servizio non valida. Riprova.': 'service',
  'Servizio non disponibile.': 'service',
  'Servizio temporaneamente non disponibile. Riprova.': 'service',
  'Catalogo non disponibile.': 'catalogue',
  'Catalogo non disponibile. Riprova.': 'catalogue',
  'Venditore non valido.': 'sellerInvalid',
  'Informazioni sui venditori non disponibili. Riprova.': 'sellersUnavailable',
  'Immagini non disponibili. Riprova.': 'imagesUnavailable',
  'Dati non validi.': 'invalid',
  'Inserisci da 1 a 8 foto.': 'listingPhotos',
  'Le foto devono essere JPG, PNG o WebP e non superare 10 MB.':
    'listingPhotoFormat',
  'Profilo venditore non disponibile.': 'sellerProfile',
  'Completa prima il profilo venditore.': 'sellerComplete',
  'Salva prima il profilo venditore.': 'sellerComplete',
  'Inserisci il prezzo di vendita.': 'salePrice',
  'Inserisci prezzo e durata del noleggio.': 'rentalPrice',
  'Il noleggio non è disponibile in questa versione.': 'rentalUnavailable',
  'Impossibile creare l’annuncio.': 'listingCreate',
  'Caricamento foto non riuscito. Riprova.': 'photoUpload',
  'Indica il costo di spedizione, anche se gratuito.': 'shippingCost',
  'Controlla modalità, costo e tempi di consegna. Il ritiro a mano deve avere costo zero.':
    'shippingDetails',
  'Controlla nome, paese e indirizzo email.': 'sellerFields',
  'Completa i dati aziendali e le condizioni di vendita.': 'businessFields',
  'Impossibile salvare i dati venditore.': 'sellerSave',
  'Dati salvati, ma il profilo pubblico non è stato aggiornato. Riprova.':
    'publicProfileSave',
  'Profilo non disponibile.': 'profileUnavailable',
  'Annunci non disponibili. Riprova.': 'listingsUnavailable',
  'Pagina non valida.': 'pageInvalid',
  'Controlla titolo, descrizione e prezzi.': 'listingFields',
  'Annuncio non trovato.': 'listingUnavailable',
  'Annuncio non disponibile.': 'listingUnavailable',
  'La modifica degli annunci con noleggio è sospesa in questa versione. I dati sono conservati.':
    'rentalEditHold',
  'Questo annuncio non può essere modificato.': 'listingEdit',
  'Inserisci il prezzo previsto per questo annuncio.': 'listingPrice',
  'Salvataggio non riuscito. Riprova.': 'saveFailed',
  'Annuncio modificato in un’altra sessione. Aggiorna la pagina prima di salvare.':
    'listingConflict',
  'Community non disponibile.': 'communityUnavailable',
  'Non è stato possibile caricare i post.': 'postLoad',
  'Inserisci fino a 8 foto o video supportati (massimo 25 MB ciascuno).':
    'communityMedia',
  'Collegamento non valido.': 'connectionInvalid',
  'Collegamenti non disponibili.': 'connectionsUnavailable',
  'Evento non disponibile.': 'eventUnavailable',
  'Crew non disponibile.': 'crewUnavailable',
  'Pubblicazione momentaneamente non disponibile. Riprova più tardi.':
    'postRateLimit',
  'Categoria non disponibile.': 'categoryUnavailable',
  'Pubblicazione non riuscita.': 'postPublish',
  'Caricamento dei contenuti non riuscito.': 'mediaUpload',
  'I pagamenti non sono disponibili in questa versione di COSMORA.':
    'paymentsUnavailable',
  'Autenticazione o Stripe non configurati.': 'payoutUnavailable',
  'Conto non disponibile. Riprova.': 'payoutUnavailable',
  'Verifica Stripe non disponibile. Riprova senza creare un altro account.':
    'payoutUnavailable',
  'Impossibile salvare il conto.': 'payoutSave',
};

function details(error: unknown) {
  if (typeof error === 'string')
    return { message: error, status: undefined, code: undefined };
  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown;
      status?: unknown;
      code?: unknown;
    };
    return {
      message: typeof value.message === 'string' ? value.message : '',
      status: typeof value.status === 'number' ? value.status : undefined,
      code: typeof value.code === 'string' ? value.code : undefined,
    };
  }
  return { message: '', status: undefined, code: undefined };
}

/** Return only a known translation, never an unrecognised server message. */
export function knownApiErrorText(
  locale: Locale,
  error: unknown,
): string | undefined {
  const { message, status, code } = details(error);
  if (code === 'ACCOUNT_SUSPENDED')
    return accountRestrictions[locale].suspended;
  if (code === 'ACCOUNT_DELETION_PENDING')
    return accountRestrictions[locale].deleting;
  const key = Object.hasOwn(aliases, message) ? aliases[message] : undefined;
  if (key) return copy[key][localeIndex[locale]];
  if (
    status === 401 ||
    code === 'AUTH_REQUIRED' ||
    /^(Accedi |Authentication required|Sign in to continue)/.test(message)
  )
    return copy.login[localeIndex[locale]];
  // Zod validation text has no field path in the API response. Give a useful
  // localised form-level message rather than guessing which field failed.
  if (
    /^(Too small:|Too big:|Invalid input:|Invalid option:|Invalid value:|Invalid email|Invalid string|String must contain|Number must be|Expected |Required$|Unrecognized key)/.test(
      message,
    )
  )
    return copy.invalid[localeIndex[locale]];
  return undefined;
}

/** The optional fallback must already be localised by the calling screen. */
export function apiErrorText(
  locale: Locale,
  error: unknown,
  localizedFallback?: string,
): string {
  return (
    knownApiErrorText(locale, error) ??
    localizedFallback ??
    copy.unknown[localeIndex[locale]]
  );
}
