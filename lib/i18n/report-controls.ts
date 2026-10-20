import type { Locale } from './config';

export const reportControls: Record<Locale, {
  close: string;
  another: string;
  safety: string;
}> = {
  it: { close: 'Chiudi segnalazione', another: 'Invia un’altra segnalazione', safety: 'Gestisci segnalazioni e blocchi' },
  en: { close: 'Close report', another: 'Send another report', safety: 'Manage reports and blocked users' },
  fr: { close: 'Fermer le signalement', another: 'Envoyer un autre signalement', safety: 'Gérer les signalements et les blocages' },
  de: { close: 'Meldung schließen', another: 'Weitere Meldung senden', safety: 'Meldungen und blockierte Nutzer verwalten' },
  es: { close: 'Cerrar denuncia', another: 'Enviar otra denuncia', safety: 'Gestionar denuncias y bloqueos' },
};
