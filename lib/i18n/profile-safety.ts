import type { Locale } from './config';

export const profileSafetyMessages: Record<Locale, {
  ownProfile: string;
  manageProfile: string;
  you: string;
  blockedTitle: string;
  blockedDescription: string;
  manageSafety: string;
}> = {
  it: {
    ownProfile: 'Questo è il tuo profilo',
    manageProfile: 'Gestisci profilo',
    you: 'Tu',
    blockedTitle: 'Hai bloccato questo utente',
    blockedDescription: 'I suoi contenuti sono nascosti. Puoi ancora segnalarlo o sbloccarlo nella sezione Segnala o blocca.',
    manageSafety: 'Gestisci segnalazioni e blocchi',
  },
  en: {
    ownProfile: 'This is your profile',
    manageProfile: 'Manage profile',
    you: 'You',
    blockedTitle: 'You blocked this user',
    blockedDescription: 'Their content is hidden. You can still report or unblock them in Report or block.',
    manageSafety: 'Manage reports and blocked users',
  },
  fr: {
    ownProfile: 'C’est votre profil',
    manageProfile: 'Gérer le profil',
    you: 'Vous',
    blockedTitle: 'Vous avez bloqué cet utilisateur',
    blockedDescription: 'Ses contenus sont masqués. Vous pouvez toujours le signaler ou le débloquer dans Signaler ou bloquer.',
    manageSafety: 'Gérer les signalements et les blocages',
  },
  de: {
    ownProfile: 'Das ist dein Profil',
    manageProfile: 'Profil verwalten',
    you: 'Du',
    blockedTitle: 'Du hast diesen Nutzer blockiert',
    blockedDescription: 'Die Inhalte dieses Nutzers sind ausgeblendet. Unter Melden oder blockieren kannst du ihn weiterhin melden oder entsperren.',
    manageSafety: 'Meldungen und blockierte Nutzer verwalten',
  },
  es: {
    ownProfile: 'Este es tu perfil',
    manageProfile: 'Gestionar perfil',
    you: 'Tú',
    blockedTitle: 'Has bloqueado a este usuario',
    blockedDescription: 'Su contenido está oculto. Aún puedes denunciarlo o desbloquearlo en Denunciar o bloquear.',
    manageSafety: 'Gestionar denuncias y bloqueos',
  },
};
