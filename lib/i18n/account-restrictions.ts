import type { Locale } from './config';

export const accountRestrictions: Record<Locale, { suspended: string; deleting: string }> = {
  it: { suspended: 'Il tuo account è sospeso. Puoi contattare l’assistenza per chiedere un riesame oppure eliminare il tuo account.', deleting: 'L’eliminazione del tuo account è in corso. Usa Elimina il mio account per riprendere una richiesta interrotta, oppure contatta l’assistenza.' },
  en: { suspended: 'Your account is suspended. You can contact support to request a review or delete your account.', deleting: 'Your account deletion is in progress. Use Delete my account to resume an interrupted request, or contact support.' },
  fr: { suspended: 'Votre compte est suspendu. Vous pouvez contacter l’assistance pour demander un réexamen ou supprimer votre compte.', deleting: 'La suppression de votre compte est en cours. Utilisez Supprimer mon compte pour reprendre une demande interrompue ou contactez l’assistance.' },
  de: { suspended: 'Dein Konto ist gesperrt. Du kannst beim Support eine erneute Prüfung anfordern oder dein Konto löschen.', deleting: 'Die Löschung deines Kontos läuft. Wähle Mein Konto löschen, um eine unterbrochene Anfrage fortzusetzen, oder kontaktiere den Support.' },
  es: { suspended: 'Tu cuenta está suspendida. Puedes contactar con asistencia para solicitar una revisión o eliminar tu cuenta.', deleting: 'La eliminación de tu cuenta está en curso. Usa Eliminar mi cuenta para continuar una solicitud interrumpida o contacta con asistencia.' },
};
