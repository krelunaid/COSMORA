import type { Locale } from './config';

type CoreMessages = {
  nav: {
    home: string;
    explore: string;
    events: string;
    community: string;
    create: string;
    sell: string;
    inbox: string;
    profile: string;
  };
  auth: {
    welcome: string;
    create: string;
    email: string;
    password: string;
    name: string;
    role: string;
    signIn: string;
    register: string;
  };
};

export const messages: Record<Locale, CoreMessages> = {
  en: {
    nav: {
      home: 'Home',
      explore: 'Explore',
      events: 'Events',
      community: 'Community',
      create: 'Create',
      sell: 'Sell',
      inbox: 'Inbox',
      profile: 'Profile',
    },
    auth: {
      welcome: 'Welcome back',
      create: 'Create your COSMORA account',
      email: 'Email',
      password: 'Password',
      name: 'Display name',
      role: 'Account type',
      signIn: 'Sign in',
      register: 'Create account',
    },
  },
  it: {
    nav: {
      home: 'Home',
      explore: 'Esplora',
      events: 'Eventi',
      community: 'Community',
      create: 'Crea',
      sell: 'Vendi',
      inbox: 'Messaggi',
      profile: 'Profilo',
    },
    auth: {
      welcome: 'Bentornato',
      create: 'Crea il tuo account COSMORA',
      email: 'Email',
      password: 'Password',
      name: 'Nome pubblico',
      role: 'Tipo di account',
      signIn: 'Accedi',
      register: 'Crea account',
    },
  },
  fr: {
    nav: {
      home: 'Accueil',
      explore: 'Explorer',
      events: 'Événements',
      community: 'Communauté',
      create: 'Créer',
      sell: 'Vendre',
      inbox: 'Messages',
      profile: 'Profil',
    },
    auth: {
      welcome: 'Bon retour',
      create: 'Créez votre compte COSMORA',
      email: 'E-mail',
      password: 'Mot de passe',
      name: 'Nom public',
      role: 'Type de compte',
      signIn: 'Se connecter',
      register: 'Créer un compte',
    },
  },
  de: {
    nav: {
      home: 'Start',
      explore: 'Entdecken',
      events: 'Events',
      community: 'Community',
      create: 'Erstellen',
      sell: 'Verkaufen',
      inbox: 'Postfach',
      profile: 'Profil',
    },
    auth: {
      welcome: 'Willkommen zurück',
      create: 'Erstelle dein COSMORA-Konto',
      email: 'E-Mail',
      password: 'Passwort',
      name: 'Anzeigename',
      role: 'Kontotyp',
      signIn: 'Anmelden',
      register: 'Konto erstellen',
    },
  },
  es: {
    nav: {
      home: 'Inicio',
      explore: 'Explorar',
      events: 'Eventos',
      community: 'Comunidad',
      create: 'Crear',
      sell: 'Vender',
      inbox: 'Mensajes',
      profile: 'Perfil',
    },
    auth: {
      welcome: 'Te damos la bienvenida',
      create: 'Crea tu cuenta COSMORA',
      email: 'Correo',
      password: 'Contraseña',
      name: 'Nombre público',
      role: 'Tipo de cuenta',
      signIn: 'Iniciar sesión',
      register: 'Crear cuenta',
    },
  },
};
