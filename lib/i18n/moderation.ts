import type { Locale } from './config';
import type { ModerationAction, ModerationTargetType } from '@/lib/moderation';

type ModerationCopy = {
  title: string;
  intro: string;
  authorProfile: string;
  mediaUnavailable: string;
  examineMedia: string;
  mediaAlt: string;
  blockNotice: string;
  blockReview: string;
  sourceContent: string;
  reportedMessage: string;
  decision: string;
  chooseDecision: string;
  reason: string;
  restoreHint: string;
  suspendHint: string;
  saving: string;
  confirm: string;
  decisionFailed: string;
  queueFailed: string;
  authorizedOnly: string;
  changed: string;
  unavailable: string;
  invalidDecision: string;
  blockCount: string;
  pending: string;
  hidden: string;
  history: string;
  refresh: string;
  loading: string;
  login: string;
  latestDecisions: string;
  noDecisions: string;
  empty: string;
  previous: string;
  next: string;
  user: string;
  unknown: string;
  actions: Record<ModerationAction, string>;
  targets: Record<ModerationTargetType, string>;
  statuses: Record<string, string>;
  reasons: Record<string, string>;
};

export const moderationMessages: Record<Locale, ModerationCopy> = {
  it: {
    title: 'Moderazione',
    intro:
      'Area riservata agli operatori autorizzati. Ogni decisione registra la motivazione. Le segnalazioni richiedono una presa in carico tempestiva.',
    authorProfile: 'Profilo dell’autore',
    mediaUnavailable:
      'Alcuni file non sono disponibili. Aggiorna per riprovare; non approvare contenuti che non puoi esaminare.',
    examineMedia: 'Esamina tutti i file prima di approvare la pubblicazione.',
    mediaAlt: 'Contenuto da esaminare',
    blockNotice: 'Blocco utente · avviso al gestore',
    blockReview: 'Verifica del blocco',
    sourceContent: 'Contenuto di origine',
    reportedMessage: 'Messaggio segnalato',
    decision: 'Decisione',
    chooseDecision: 'Seleziona una decisione',
    reason: 'Motivazione nel registro (almeno 5 caratteri)',
    restoreHint:
      'Ripristina lo stato registrato prima della rimozione. Un contenuto già pubblico tornerà visibile.',
    suspendHint:
      'Blocca l’accesso alle funzioni dell’account. L’eliminazione dell’account resta disponibile. Esamina anche i contenuti pubblici già caricati dall’utente.',
    saving: 'Salvataggio…',
    confirm: 'Conferma decisione',
    decisionFailed:
      'Non abbiamo ricevuto conferma del salvataggio. Aggiorna la coda prima di riprovare.',
    queueFailed: 'Coda non disponibile. Riprova.',
    authorizedOnly: 'Accesso riservato ai moderatori autorizzati.',
    changed: 'Il contenuto è cambiato. Aggiorna la coda prima di decidere.',
    unavailable: 'Contenuto non più disponibile',
    invalidDecision: 'Questa decisione non è valida per lo stato attuale.',
    blockCount: 'Avvisi di blocco da esaminare in questa pagina',
    pending: 'Da esaminare',
    hidden: 'Nascosti e sospesi',
    history: 'Registro',
    refresh: 'Aggiorna',
    loading: 'Caricamento…',
    login: 'Accedi con un account autorizzato',
    latestDecisions: 'Ultime 100 decisioni.',
    noDecisions: 'Nessuna decisione registrata.',
    empty: 'Nessun contenuto in questa coda.',
    previous: 'Precedenti',
    next: 'Successivi',
    user: 'Utente COSMORA',
    unknown: 'Non disponibile',
    actions: {
      APPROVE: 'Approva la pubblicazione',
      HIDE: 'Nascondi',
      REJECT: 'Rifiuta',
      RESTORE: 'Ripristina lo stato precedente',
      SUSPEND: 'Sospendi utente',
      DISMISS: 'Archivia segnalazione non fondata',
      RESOLVE: 'Chiudi segnalazione senza cambiare il contenuto',
    },
    targets: {
      POST: 'Post',
      SQUAD: 'Crew',
      MEETUP: 'Incontro',
      LISTING: 'Annuncio',
      USER: 'Utente',
    },
    statuses: {
      DRAFT: 'Bozza',
      PENDING_REVIEW: 'In attesa di verifica',
      ACTIVE: 'Attivo',
      PUBLISHED: 'Pubblicato',
      FULL: 'Completo',
      ARCHIVED: 'Archiviato',
      SUSPENDED: 'Sospeso',
      REMOVED: 'Rimosso',
      MODERATED: 'Nascosto dalla moderazione',
      SOLD: 'Venduto',
      MISSING: 'Non disponibile',
    },
    reasons: {
      SPAM: 'Spam',
      SCAM: 'Possibile truffa',
      HARASSMENT: 'Molestie',
      SEXUAL_CONTENT: 'Contenuti sessuali',
      HATE: 'Odio',
      VIOLENCE: 'Violenza',
      COPYRIGHT: 'Diritto d’autore',
      COUNTERFEIT: 'Contraffazione',
      OTHER: 'Altro',
    },
  },
  en: {
    title: 'Moderation',
    intro:
      'Restricted to authorized moderators. Every decision records its reason. Reports must be handled promptly.',
    authorProfile: 'Author’s profile',
    mediaUnavailable:
      'Some files are unavailable. Refresh to retry; do not approve content you cannot review.',
    examineMedia: 'Review every file before approving publication.',
    mediaAlt: 'Content to review',
    blockNotice: 'User blocked · notice to moderators',
    blockReview: 'Block review',
    sourceContent: 'Original content',
    reportedMessage: 'Reported message',
    decision: 'Decision',
    chooseDecision: 'Choose a decision',
    reason: 'Reason in the log (at least 5 characters)',
    restoreHint:
      'Restore the state recorded before removal. Previously public content will become visible again.',
    suspendHint:
      'Restrict access to account features. Account deletion remains available. Also review public content already uploaded by this user.',
    saving: 'Saving…',
    confirm: 'Confirm decision',
    decisionFailed:
      'We did not receive confirmation that the decision was saved. Refresh the queue before retrying.',
    queueFailed: 'Queue unavailable. Please retry.',
    authorizedOnly: 'Access is restricted to authorized moderators.',
    changed: 'The content has changed. Refresh the queue before deciding.',
    unavailable: 'Content no longer available',
    invalidDecision: 'This decision is not valid for the current state.',
    blockCount: 'Block notices to review on this page',
    pending: 'To review',
    hidden: 'Hidden and suspended',
    history: 'Decision log',
    refresh: 'Refresh',
    loading: 'Loading…',
    login: 'Sign in with an authorized account',
    latestDecisions: 'Latest 100 decisions.',
    noDecisions: 'No decisions recorded.',
    empty: 'No content in this queue.',
    previous: 'Previous',
    next: 'Next',
    user: 'COSMORA user',
    unknown: 'Unavailable',
    actions: {
      APPROVE: 'Approve publication',
      HIDE: 'Hide',
      REJECT: 'Reject',
      RESTORE: 'Restore previous state',
      SUSPEND: 'Suspend user',
      DISMISS: 'Dismiss unfounded report',
      RESOLVE: 'Close report without changing content',
    },
    targets: {
      POST: 'Post',
      SQUAD: 'Crew',
      MEETUP: 'Meetup',
      LISTING: 'Listing',
      USER: 'User',
    },
    statuses: {
      DRAFT: 'Draft',
      PENDING_REVIEW: 'Awaiting review',
      ACTIVE: 'Active',
      PUBLISHED: 'Published',
      FULL: 'Full',
      ARCHIVED: 'Archived',
      SUSPENDED: 'Suspended',
      REMOVED: 'Removed',
      MODERATED: 'Hidden by moderation',
      SOLD: 'Sold',
      MISSING: 'Unavailable',
    },
    reasons: {
      SPAM: 'Spam',
      SCAM: 'Possible scam',
      HARASSMENT: 'Harassment',
      SEXUAL_CONTENT: 'Sexual content',
      HATE: 'Hate',
      VIOLENCE: 'Violence',
      COPYRIGHT: 'Copyright',
      COUNTERFEIT: 'Counterfeit',
      OTHER: 'Other',
    },
  },
  fr: {
    title: 'Modération',
    intro:
      'Espace réservé aux modérateurs autorisés. Chaque décision enregistre son motif. Les signalements doivent être traités rapidement.',
    authorProfile: 'Profil de l’auteur',
    mediaUnavailable:
      'Certains fichiers sont indisponibles. Actualisez pour réessayer ; n’approuvez pas de contenu que vous ne pouvez pas examiner.',
    examineMedia:
      'Examinez tous les fichiers avant d’approuver la publication.',
    mediaAlt: 'Contenu à examiner',
    blockNotice: 'Utilisateur bloqué · avis aux modérateurs',
    blockReview: 'Vérification du blocage',
    sourceContent: 'Contenu d’origine',
    reportedMessage: 'Message signalé',
    decision: 'Décision',
    chooseDecision: 'Choisissez une décision',
    reason: 'Motif dans le registre (au moins 5 caractères)',
    restoreHint:
      'Rétablit l’état enregistré avant la suppression. Un contenu auparavant public redeviendra visible.',
    suspendHint:
      'Restreint l’accès aux fonctionnalités du compte. La suppression du compte reste disponible. Examinez aussi les contenus publics déjà publiés par cet utilisateur.',
    saving: 'Enregistrement…',
    confirm: 'Confirmer la décision',
    decisionFailed:
      'Nous n’avons pas reçu de confirmation de l’enregistrement. Actualisez la liste avant de réessayer.',
    queueFailed: 'Liste indisponible. Réessayez.',
    authorizedOnly: 'Accès réservé aux modérateurs autorisés.',
    changed: 'Le contenu a changé. Actualisez la liste avant de décider.',
    unavailable: 'Contenu désormais indisponible',
    invalidDecision: 'Cette décision n’est pas valide pour l’état actuel.',
    blockCount: 'Avis de blocage à examiner sur cette page',
    pending: 'À examiner',
    hidden: 'Masqués et suspendus',
    history: 'Registre',
    refresh: 'Actualiser',
    loading: 'Chargement…',
    login: 'Connectez-vous avec un compte autorisé',
    latestDecisions: '100 dernières décisions.',
    noDecisions: 'Aucune décision enregistrée.',
    empty: 'Aucun contenu dans cette liste.',
    previous: 'Précédents',
    next: 'Suivants',
    user: 'Utilisateur COSMORA',
    unknown: 'Indisponible',
    actions: {
      APPROVE: 'Approuver la publication',
      HIDE: 'Masquer',
      REJECT: 'Refuser',
      RESTORE: 'Rétablir l’état précédent',
      SUSPEND: 'Suspendre l’utilisateur',
      DISMISS: 'Classer le signalement non fondé',
      RESOLVE: 'Clore le signalement sans modifier le contenu',
    },
    targets: {
      POST: 'Publication',
      SQUAD: 'Crew',
      MEETUP: 'Rencontre',
      LISTING: 'Annonce',
      USER: 'Utilisateur',
    },
    statuses: {
      DRAFT: 'Brouillon',
      PENDING_REVIEW: 'En attente de vérification',
      ACTIVE: 'Actif',
      PUBLISHED: 'Publié',
      FULL: 'Complet',
      ARCHIVED: 'Archivé',
      SUSPENDED: 'Suspendu',
      REMOVED: 'Supprimé',
      MODERATED: 'Masqué par la modération',
      SOLD: 'Vendu',
      MISSING: 'Indisponible',
    },
    reasons: {
      SPAM: 'Spam',
      SCAM: 'Fraude possible',
      HARASSMENT: 'Harcèlement',
      SEXUAL_CONTENT: 'Contenu sexuel',
      HATE: 'Haine',
      VIOLENCE: 'Violence',
      COPYRIGHT: 'Droit d’auteur',
      COUNTERFEIT: 'Contrefaçon',
      OTHER: 'Autre',
    },
  },
  de: {
    title: 'Moderation',
    intro:
      'Nur für autorisierte Moderatoren. Jede Entscheidung wird mit ihrem Grund protokolliert. Meldungen müssen zeitnah bearbeitet werden.',
    authorProfile: 'Profil des Autors',
    mediaUnavailable:
      'Einige Dateien sind nicht verfügbar. Aktualisiere die Liste; genehmige keine Inhalte, die du nicht prüfen kannst.',
    examineMedia:
      'Prüfe alle Dateien, bevor du die Veröffentlichung genehmigst.',
    mediaAlt: 'Zu prüfender Inhalt',
    blockNotice: 'Nutzer blockiert · Hinweis an die Moderation',
    blockReview: 'Blockierung prüfen',
    sourceContent: 'Ursprünglicher Inhalt',
    reportedMessage: 'Gemeldete Nachricht',
    decision: 'Entscheidung',
    chooseDecision: 'Entscheidung auswählen',
    reason: 'Begründung im Protokoll (mindestens 5 Zeichen)',
    restoreHint:
      'Stellt den vor der Entfernung gespeicherten Zustand wieder her. Zuvor öffentliche Inhalte werden wieder sichtbar.',
    suspendHint:
      'Sperrt den Zugriff auf Kontofunktionen. Die Kontolöschung bleibt verfügbar. Prüfe auch die bereits veröffentlichten Inhalte dieses Nutzers.',
    saving: 'Wird gespeichert…',
    confirm: 'Entscheidung bestätigen',
    decisionFailed:
      'Das Speichern wurde nicht bestätigt. Aktualisiere die Liste, bevor du es erneut versuchst.',
    queueFailed: 'Liste nicht verfügbar. Versuche es erneut.',
    authorizedOnly: 'Zugriff nur für autorisierte Moderatoren.',
    changed:
      'Der Inhalt hat sich geändert. Aktualisiere die Liste vor der Entscheidung.',
    unavailable: 'Inhalt nicht mehr verfügbar',
    invalidDecision:
      'Diese Entscheidung ist für den aktuellen Zustand nicht gültig.',
    blockCount: 'Zu prüfende Blockierungshinweise auf dieser Seite',
    pending: 'Zu prüfen',
    hidden: 'Ausgeblendet und gesperrt',
    history: 'Protokoll',
    refresh: 'Aktualisieren',
    loading: 'Wird geladen…',
    login: 'Mit einem autorisierten Konto anmelden',
    latestDecisions: 'Die letzten 100 Entscheidungen.',
    noDecisions: 'Keine Entscheidungen protokolliert.',
    empty: 'Keine Inhalte in dieser Liste.',
    previous: 'Zurück',
    next: 'Weiter',
    user: 'COSMORA-Nutzer',
    unknown: 'Nicht verfügbar',
    actions: {
      APPROVE: 'Veröffentlichung genehmigen',
      HIDE: 'Ausblenden',
      REJECT: 'Ablehnen',
      RESTORE: 'Vorherigen Zustand wiederherstellen',
      SUSPEND: 'Nutzer sperren',
      DISMISS: 'Unbegründete Meldung archivieren',
      RESOLVE: 'Meldung ohne Inhaltsänderung schließen',
    },
    targets: {
      POST: 'Beitrag',
      SQUAD: 'Crew',
      MEETUP: 'Treffen',
      LISTING: 'Anzeige',
      USER: 'Nutzer',
    },
    statuses: {
      DRAFT: 'Entwurf',
      PENDING_REVIEW: 'Wartet auf Prüfung',
      ACTIVE: 'Aktiv',
      PUBLISHED: 'Veröffentlicht',
      FULL: 'Voll',
      ARCHIVED: 'Archiviert',
      SUSPENDED: 'Gesperrt',
      REMOVED: 'Entfernt',
      MODERATED: 'Durch Moderation ausgeblendet',
      SOLD: 'Verkauft',
      MISSING: 'Nicht verfügbar',
    },
    reasons: {
      SPAM: 'Spam',
      SCAM: 'Möglicher Betrug',
      HARASSMENT: 'Belästigung',
      SEXUAL_CONTENT: 'Sexuelle Inhalte',
      HATE: 'Hass',
      VIOLENCE: 'Gewalt',
      COPYRIGHT: 'Urheberrecht',
      COUNTERFEIT: 'Fälschung',
      OTHER: 'Sonstiges',
    },
  },
  es: {
    title: 'Moderación',
    intro:
      'Área reservada a los moderadores autorizados. Cada decisión registra su motivo. Las denuncias deben atenderse con rapidez.',
    authorProfile: 'Perfil del autor',
    mediaUnavailable:
      'Algunos archivos no están disponibles. Actualiza para reintentarlo; no apruebes contenido que no puedas revisar.',
    examineMedia: 'Revisa todos los archivos antes de aprobar la publicación.',
    mediaAlt: 'Contenido para revisar',
    blockNotice: 'Usuario bloqueado · aviso a los moderadores',
    blockReview: 'Revisión del bloqueo',
    sourceContent: 'Contenido de origen',
    reportedMessage: 'Mensaje denunciado',
    decision: 'Decisión',
    chooseDecision: 'Elige una decisión',
    reason: 'Motivo en el registro (al menos 5 caracteres)',
    restoreHint:
      'Restaura el estado registrado antes de la eliminación. El contenido que era público volverá a ser visible.',
    suspendHint:
      'Restringe el acceso a las funciones de la cuenta. La eliminación de la cuenta sigue disponible. Revisa también el contenido público ya subido por este usuario.',
    saving: 'Guardando…',
    confirm: 'Confirmar decisión',
    decisionFailed:
      'No hemos recibido confirmación del guardado. Actualiza la lista antes de reintentarlo.',
    queueFailed: 'Lista no disponible. Reinténtalo.',
    authorizedOnly: 'Acceso reservado a los moderadores autorizados.',
    changed: 'El contenido ha cambiado. Actualiza la lista antes de decidir.',
    unavailable: 'Contenido ya no disponible',
    invalidDecision: 'Esta decisión no es válida para el estado actual.',
    blockCount: 'Avisos de bloqueo para revisar en esta página',
    pending: 'Para revisar',
    hidden: 'Ocultos y suspendidos',
    history: 'Registro',
    refresh: 'Actualizar',
    loading: 'Cargando…',
    login: 'Inicia sesión con una cuenta autorizada',
    latestDecisions: 'Últimas 100 decisiones.',
    noDecisions: 'No hay decisiones registradas.',
    empty: 'No hay contenido en esta lista.',
    previous: 'Anteriores',
    next: 'Siguientes',
    user: 'Usuario de COSMORA',
    unknown: 'No disponible',
    actions: {
      APPROVE: 'Aprobar publicación',
      HIDE: 'Ocultar',
      REJECT: 'Rechazar',
      RESTORE: 'Restaurar estado anterior',
      SUSPEND: 'Suspender usuario',
      DISMISS: 'Archivar denuncia infundada',
      RESOLVE: 'Cerrar denuncia sin cambiar el contenido',
    },
    targets: {
      POST: 'Publicación',
      SQUAD: 'Crew',
      MEETUP: 'Encuentro',
      LISTING: 'Anuncio',
      USER: 'Usuario',
    },
    statuses: {
      DRAFT: 'Borrador',
      PENDING_REVIEW: 'Pendiente de revisión',
      ACTIVE: 'Activo',
      PUBLISHED: 'Publicado',
      FULL: 'Completo',
      ARCHIVED: 'Archivado',
      SUSPENDED: 'Suspendido',
      REMOVED: 'Eliminado',
      MODERATED: 'Oculto por moderación',
      SOLD: 'Vendido',
      MISSING: 'No disponible',
    },
    reasons: {
      SPAM: 'Spam',
      SCAM: 'Posible fraude',
      HARASSMENT: 'Acoso',
      SEXUAL_CONTENT: 'Contenido sexual',
      HATE: 'Odio',
      VIOLENCE: 'Violencia',
      COPYRIGHT: 'Derechos de autor',
      COUNTERFEIT: 'Falsificación',
      OTHER: 'Otro',
    },
  },
};

// Backend values remain unchanged; these helpers only label their presentation.
export function moderationStatusLabel(
  status: string | undefined,
  locale: Locale,
) {
  return status
    ? (moderationMessages[locale].statuses[status.toUpperCase()] ?? status)
    : moderationMessages[locale].unknown;
}

export function moderationTargetLabel(target: string, locale: Locale) {
  return (
    moderationMessages[locale].targets[target as ModerationTargetType] ?? target
  );
}

export function moderationReasonLabel(reason: string, locale: Locale) {
  return moderationMessages[locale].reasons[reason] ?? reason;
}
