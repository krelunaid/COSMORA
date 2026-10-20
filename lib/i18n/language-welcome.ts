import type { Locale } from './config';

type LanguageWelcomeCopy = {
  title: string;
  description: string;
  language: string;
  continue: string;
  changeLater: string;
  loading: string;
};

export const languageWelcomeMessages: Record<Locale, LanguageWelcomeCopy> = {
  it: {
    title: 'Scegli la tua lingua',
    description:
      'La lingua suggerita dipende dalle impostazioni del dispositivo. Scegli quella che preferisci.',
    language: 'Lingua dell’app',
    continue: 'Continua',
    changeLater: 'Potrai cambiarla quando vuoi dal tuo profilo.',
    loading: 'Apertura di COSMORA…',
  },
  en: {
    title: 'Choose your language',
    description:
      'The suggested language follows your device settings. Choose the language you prefer.',
    language: 'App language',
    continue: 'Continue',
    changeLater: 'You can change it at any time from your profile.',
    loading: 'Opening COSMORA…',
  },
  fr: {
    title: 'Choisissez votre langue',
    description:
      'La langue proposée dépend des réglages de votre appareil. Choisissez celle que vous préférez.',
    language: 'Langue de l’application',
    continue: 'Continuer',
    changeLater: 'Vous pourrez la modifier à tout moment depuis votre profil.',
    loading: 'Ouverture de COSMORA…',
  },
  de: {
    title: 'Wähle deine Sprache',
    description:
      'Die vorgeschlagene Sprache richtet sich nach deinen Geräteeinstellungen. Wähle deine bevorzugte Sprache.',
    language: 'Sprache der App',
    continue: 'Weiter',
    changeLater: 'Du kannst die Sprache jederzeit in deinem Profil ändern.',
    loading: 'COSMORA wird geöffnet…',
  },
  es: {
    title: 'Elige tu idioma',
    description:
      'El idioma sugerido depende de los ajustes de tu dispositivo. Elige el que prefieras.',
    language: 'Idioma de la aplicación',
    continue: 'Continuar',
    changeLater: 'Podrás cambiarlo cuando quieras desde tu perfil.',
    loading: 'Abriendo COSMORA…',
  },
};
