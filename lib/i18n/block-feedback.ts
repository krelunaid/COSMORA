import type { Locale } from './config';

export const blockFeedbackMessages: Record<Locale, { help: string; saved: string; dismiss: string }> = {
  it: {
    help: 'Nasconde i suoi contenuti, impedisce lo scambio di messaggi e avvisa i moderatori.',
    saved: 'I suoi contenuti sono nascosti, i messaggi tra voi sono bloccati e i moderatori sono stati avvisati. Puoi sbloccarlo in Utenti bloccati.',
    dismiss: 'Chiudi conferma del blocco',
  },
  en: {
    help: 'Hides their content, prevents messages between you and notifies moderators.',
    saved: 'Their content is hidden, messages between you are blocked and moderators have been notified. You can unblock them in Blocked users.',
    dismiss: 'Dismiss block confirmation',
  },
  fr: {
    help: 'Masque ses contenus, empêche les messages entre vous et avertit les modérateurs.',
    saved: 'Ses contenus sont masqués, les messages entre vous sont bloqués et les modérateurs ont été avertis. Vous pouvez le débloquer dans Utilisateurs bloqués.',
    dismiss: 'Fermer la confirmation du blocage',
  },
  de: {
    help: 'Blendet die Inhalte aus, verhindert Nachrichten zwischen euch und benachrichtigt die Moderation.',
    saved: 'Die Inhalte sind ausgeblendet, Nachrichten zwischen euch sind blockiert und die Moderation wurde benachrichtigt. Unter Blockierte Nutzer kannst du die Blockierung aufheben.',
    dismiss: 'Blockierungsbestätigung schließen',
  },
  es: {
    help: 'Oculta su contenido, impide los mensajes entre vosotros y avisa a los moderadores.',
    saved: 'Su contenido está oculto, los mensajes entre vosotros están bloqueados y se ha avisado a los moderadores. Puedes desbloquearlo en Usuarios bloqueados.',
    dismiss: 'Cerrar confirmación del bloqueo',
  },
};
