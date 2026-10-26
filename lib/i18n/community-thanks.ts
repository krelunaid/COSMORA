import type { Locale } from './config.ts';

type ThanksCopy = { title: string; intro: string; paragraphs: string[]; closing: string; signoff: string; signature: string; continue: string };

export const communityThanksMessages: Record<Locale, ThanksCopy> = {
  it: {
    title: 'Grazie di cuore per essere qui',
    intro: 'COSMORA è appena nata e tu fai già parte della sua storia.',
    paragraphs: [
      'Grazie per averci dato fiducia, per il tempo che dedichi all’app e per aiutarci a costruire una community dove condividere passioni, conoscere persone e vivere insieme eventi, cosplay, fumetti e videogiochi.',
      'Dietro questo progetto ci sono tanto lavoro e il desiderio di creare qualcosa di bello insieme a voi. Ogni suggerimento, contenuto condiviso e amico invitato ci aiuta a migliorare e a crescere.',
      'Abbiamo ancora tanto da fare e siamo felici di poterlo fare con te. Se qualcosa non funziona o hai un’idea, scrivici: ti ascoltiamo.',
    ],
    closing: 'Grazie per esserci fin dall’inizio. Il tuo sostegno conta davvero.',
    signoff: 'Con gratitudine,', signature: 'Andrea e il team COSMORA', continue: 'Continua su COSMORA',
  },
  en: {
    title: 'Thank you so much for being here',
    intro: 'COSMORA is just getting started, and you are already part of its story.',
    paragraphs: [
      'Thank you for trusting us, for the time you spend in the app, and for helping us build a community where we can share our passions, meet people, and enjoy events, cosplay, comics, and video games together.',
      'This project is built on hard work and a wish to create something wonderful with you. Every suggestion, shared post, and friend you invite helps us improve and grow.',
      'There is still so much to do, and we are happy to do it with you. If something is not working or you have an idea, get in touch: we are listening.',
    ],
    closing: 'Thank you for being here from the start. Your support really matters.',
    signoff: 'With gratitude,', signature: 'Andrea and the COSMORA team', continue: 'Continue to COSMORA',
  },
  fr: {
    title: 'Merci du fond du cœur d’être là',
    intro: 'COSMORA vient de naître et tu fais déjà partie de son histoire.',
    paragraphs: [
      'Merci pour ta confiance, pour le temps que tu consacres à l’application et pour ton aide à construire une communauté où partager nos passions, faire des rencontres et profiter ensemble des événements, du cosplay, des bandes dessinées et des jeux vidéo.',
      'Derrière ce projet, il y a beaucoup de travail et l’envie de créer quelque chose de beau avec vous. Chaque suggestion, contenu partagé et ami invité nous aide à nous améliorer et à grandir.',
      'Il nous reste beaucoup à faire et nous sommes heureux de le faire avec toi. Si quelque chose ne fonctionne pas ou si tu as une idée, écris-nous : nous sommes à ton écoute.',
    ],
    closing: 'Merci d’être là dès le début. Ton soutien compte vraiment.',
    signoff: 'Avec toute notre gratitude,', signature: 'Andrea et l’équipe COSMORA', continue: 'Continuer sur COSMORA',
  },
  de: {
    title: 'Danke von Herzen, dass du dabei bist',
    intro: 'COSMORA steht noch ganz am Anfang, und du bist schon Teil unserer Geschichte.',
    paragraphs: [
      'Danke für dein Vertrauen, für deine Zeit in der App und dafür, dass du uns hilfst, eine Community aufzubauen, in der wir unsere Interessen teilen, Menschen kennenlernen und gemeinsam Events, Cosplay, Comics und Videospiele erleben können.',
      'Hinter diesem Projekt stecken viel Arbeit und der Wunsch, gemeinsam mit euch etwas Schönes zu schaffen. Jede Anregung, jeder geteilte Beitrag und jeder eingeladene Freund helfen uns, besser zu werden und zu wachsen.',
      'Es gibt noch viel zu tun, und wir freuen uns, diesen Weg mit dir zu gehen. Wenn etwas nicht funktioniert oder du eine Idee hast, schreib uns: Wir hören dir zu.',
    ],
    closing: 'Danke, dass du von Anfang an dabei bist. Deine Unterstützung bedeutet uns viel.',
    signoff: 'In Dankbarkeit,', signature: 'Andrea und das COSMORA-Team', continue: 'Weiter zu COSMORA',
  },
  es: {
    title: 'Gracias de corazón por estar aquí',
    intro: 'COSMORA acaba de nacer y tú ya formas parte de su historia.',
    paragraphs: [
      'Gracias por confiar en nosotros, por el tiempo que dedicas a la app y por ayudarnos a construir una comunidad donde compartir pasiones, conocer gente y disfrutar juntos de eventos, cosplay, cómics y videojuegos.',
      'Detrás de este proyecto hay mucho trabajo y el deseo de crear algo bonito junto a vosotros. Cada sugerencia, contenido compartido y amigo invitado nos ayuda a mejorar y a crecer.',
      'Todavía nos queda mucho por hacer y nos alegra poder hacerlo contigo. Si algo no funciona o tienes una idea, escríbenos: te escuchamos.',
    ],
    closing: 'Gracias por estar desde el principio. Tu apoyo de verdad importa.',
    signoff: 'Con gratitud,', signature: 'Andrea y el equipo de COSMORA', continue: 'Continuar en COSMORA',
  },
};
