import type { Locale } from './config';
import { TERMS_VERSION } from '../terms-consent';
import { authTerms } from './auth-terms';

type RulesCopy = { title: string; intro: string; publish: string; sections: readonly (readonly [string, string])[]; support: string };

export const communityRules: Record<Locale, RulesCopy> = {
  it: {
    title: authTerms.it.title,
    intro: 'COSMORA è uno spazio per cosplay, collezionismo e incontri tra appassionati. Queste regole valgono per annunci, profili, post, crew e messaggi.',
    publish: 'Pubblica solo contenuti che puoi condividere e rispetta le regole della community.',
    sections: [
      [authTerms.it.version + ' ' + TERMS_VERSION, authTerms.it.summary + ' ' + authTerms.it.moderation],
      ['Rispetta le persone', 'Non sono ammessi molestie, minacce, odio, discriminazioni, bullismo o diffusione di dati privati di altre persone. Non impersonare utenti, aziende o organizzatori.'],
      ['Proteggi la community', 'Non pubblicare contenuti sessualmente espliciti, sfruttamento di minori, violenza estrema o istruzioni per arrecare danno. Non usare il servizio per attività illegali, truffe, spam o vendita di beni vietati.'],
      ['Condividi con il permesso', 'Usa foto, video, testi e altri materiali di cui hai i diritti o il permesso di pubblicazione. Rispetta anche la privacy e il consenso delle persone riconoscibili. Non presentare copie contraffatte come prodotti originali.'],
      ['Descrivi gli annunci con chiarezza', 'Indica condizioni, difetti e prezzo in modo veritiero. Non chiedere password, codici di accesso o dati di carte nei messaggi. In questa versione COSMORA non gestisce pagamenti, cauzioni, noleggi o spedizioni.'],
      ['Segnala e blocca', 'Usa Segnala per indicarci un contenuto o comportamento problematico e Blocco utente per interrompere i contatti dove disponibile. Per dettagli aggiuntivi, richieste sui tuoi contenuti o problemi urgenti scrivi a info@kreluna.it. In caso di pericolo immediato contatta i servizi di emergenza locali.'],
      ['Revisione dei contenuti', 'I contenuti possono essere sottoposti a revisione prima della pubblicazione. Le violazioni possono comportare la rimozione del contenuto o la sospensione dell’account. Puoi chiedere un riesame scrivendo all’assistenza e indicando il contenuto interessato.'],
    ],
    support: 'Contatta l’assistenza',
  },
  en: {
    title: authTerms.en.title,
    intro: 'COSMORA is a space for cosplay, collecting and meeting fellow fans. These rules apply to listings, profiles, posts, crews and messages.',
    publish: 'Only publish content you have permission to share and follow the community rules.',
    sections: [
      [authTerms.en.version + ' ' + TERMS_VERSION, authTerms.en.summary + ' ' + authTerms.en.moderation],
      ['Respect people', 'Harassment, threats, hate, discrimination, bullying and sharing other people’s private information are not allowed. Do not impersonate users, businesses or event organisers.'],
      ['Keep the community safe', 'Do not publish sexually explicit content, child exploitation, extreme violence or instructions to harm others. Do not use the service for illegal activities, scams, spam or prohibited goods.'],
      ['Share with permission', 'Use photos, videos, text and other materials that you own or have permission to publish. Respect the privacy and consent of identifiable people. Do not present counterfeit copies as original products.'],
      ['Describe listings honestly', 'State condition, defects and price accurately. Never ask for passwords, access codes or card details in messages. This version of COSMORA does not handle payments, deposits, rentals or shipping.'],
      ['Report and block', 'Use Report to flag problematic content or behaviour and Block user to stop contact where available. For further details, requests about your content or urgent problems, email info@kreluna.it. For immediate danger, contact local emergency services.'],
      ['Content review', 'Content may be reviewed before publication. Violations may result in content removal or account suspension. You can request reconsideration by contacting support and identifying the affected content.'],
    ],
    support: 'Contact support',
  },
  fr: {
    title: authTerms.fr.title,
    intro: 'COSMORA est un espace consacré au cosplay, aux collections et aux rencontres entre passionnés. Ces règles concernent les annonces, profils, publications, groupes et messages.',
    publish: 'Publiez uniquement des contenus que vous avez le droit de partager et respectez les règles de la communauté.',
    sections: [
      [authTerms.fr.version + ' ' + TERMS_VERSION, authTerms.fr.summary + ' ' + authTerms.fr.moderation],
      ['Respectez les personnes', 'Le harcèlement, les menaces, la haine, les discriminations et la diffusion de données privées sont interdits. N’usurpez pas l’identité d’une personne, d’une entreprise ou d’un organisateur.'],
      ['Protégez la communauté', 'Ne publiez pas de contenus sexuellement explicites, d’exploitation de mineurs, de violence extrême ou d’instructions visant à nuire. Les activités illégales, arnaques, spams et produits interdits ne sont pas autorisés.'],
      ['Partagez avec autorisation', 'Utilisez des photos, vidéos, textes et autres éléments dont vous détenez les droits ou l’autorisation de publication. Respectez la vie privée et le consentement des personnes identifiables. Ne présentez pas de contrefaçons comme des produits originaux.'],
      ['Décrivez honnêtement les annonces', 'Indiquez précisément l’état, les défauts et le prix. Ne demandez jamais de mots de passe, codes d’accès ou données bancaires dans les messages. Cette version de COSMORA ne gère ni paiements, ni cautions, ni locations, ni expéditions.'],
      ['Signalez et bloquez', 'Utilisez Signaler pour signaler un contenu ou un comportement problématique et Bloquer pour interrompre les contacts lorsque cette option est disponible. Pour toute précision ou demande urgente, écrivez à info@kreluna.it. En cas de danger immédiat, contactez les secours locaux.'],
      ['Examen des contenus', 'Les contenus peuvent être examinés avant publication. Une violation peut entraîner le retrait du contenu ou la suspension du compte. Pour demander un réexamen, contactez l’assistance en précisant le contenu concerné.'],
    ],
    support: 'Contacter l’assistance',
  },
  de: {
    title: authTerms.de.title,
    intro: 'COSMORA ist ein Ort für Cosplay, Sammeln und Begegnungen unter Fans. Diese Regeln gelten für Anzeigen, Profile, Beiträge, Crews und Nachrichten.',
    publish: 'Veröffentliche nur Inhalte, die du teilen darfst, und beachte die Community-Regeln.',
    sections: [
      [authTerms.de.version + ' ' + TERMS_VERSION, authTerms.de.summary + ' ' + authTerms.de.moderation],
      ['Respektiere andere', 'Belästigung, Drohungen, Hass, Diskriminierung, Mobbing und die Weitergabe privater Daten anderer sind nicht erlaubt. Gib dich nicht als andere Person, Unternehmen oder Veranstalter aus.'],
      ['Schütze die Community', 'Veröffentliche keine sexuell expliziten Inhalte, Ausbeutung Minderjähriger, extreme Gewalt oder Anleitungen, anderen zu schaden. Illegale Aktivitäten, Betrug, Spam und verbotene Waren sind nicht erlaubt.'],
      ['Teile mit Erlaubnis', 'Verwende Fotos, Videos, Texte und andere Materialien nur mit entsprechenden Rechten oder Veröffentlichungserlaubnis. Respektiere die Privatsphäre und Einwilligung erkennbarer Personen. Gib Fälschungen nicht als Originalprodukte aus.'],
      ['Beschreibe Anzeigen ehrlich', 'Gib Zustand, Mängel und Preis korrekt an. Frage in Nachrichten niemals nach Passwörtern, Zugangscodes oder Kartendaten. Diese COSMORA-Version wickelt keine Zahlungen, Kautionen, Vermietungen oder Lieferungen ab.'],
      ['Melden und blockieren', 'Nutze Melden bei problematischen Inhalten oder Verhalten und Nutzer blockieren, um Kontakte zu unterbrechen, sofern verfügbar. Für weitere Angaben oder dringende Anliegen schreibe an info@kreluna.it. Bei unmittelbarer Gefahr kontaktiere den örtlichen Notruf.'],
      ['Prüfung von Inhalten', 'Inhalte können vor der Veröffentlichung geprüft werden. Verstöße können zur Entfernung von Inhalten oder zur Sperrung des Kontos führen. Eine erneute Prüfung kannst du beim Support unter Angabe der betroffenen Inhalte anfordern.'],
    ],
    support: 'Support kontaktieren',
  },
  es: {
    title: authTerms.es.title,
    intro: 'COSMORA es un espacio para el cosplay, el coleccionismo y los encuentros entre aficionados. Estas normas se aplican a anuncios, perfiles, publicaciones, grupos y mensajes.',
    publish: 'Publica solo contenido que tengas permiso para compartir y respeta las normas de la comunidad.',
    sections: [
      [authTerms.es.version + ' ' + TERMS_VERSION, authTerms.es.summary + ' ' + authTerms.es.moderation],
      ['Respeta a las personas', 'No se permiten el acoso, las amenazas, el odio, la discriminación ni la difusión de datos privados de otras personas. No suplantes a usuarios, empresas u organizadores.'],
      ['Protege a la comunidad', 'No publiques contenido sexualmente explícito, explotación de menores, violencia extrema ni instrucciones para causar daño. No uses el servicio para actividades ilegales, estafas, spam o productos prohibidos.'],
      ['Comparte con permiso', 'Usa fotos, vídeos, textos y otros materiales cuyos derechos poseas o que tengas permiso para publicar. Respeta la privacidad y el consentimiento de las personas identificables. No presentes falsificaciones como productos originales.'],
      ['Describe los anuncios con sinceridad', 'Indica correctamente el estado, los defectos y el precio. Nunca pidas contraseñas, códigos de acceso ni datos de tarjetas por mensaje. Esta versión de COSMORA no gestiona pagos, depósitos, alquileres ni envíos.'],
      ['Denuncia y bloquea', 'Usa Denunciar para indicar contenido o comportamientos problemáticos y Bloquear usuario para interrumpir el contacto donde esté disponible. Para más información o problemas urgentes, escribe a info@kreluna.it. Si hay peligro inmediato, contacta con los servicios de emergencia locales.'],
      ['Revisión de contenido', 'El contenido puede revisarse antes de su publicación. Los incumplimientos pueden dar lugar a la retirada del contenido o a la suspensión de la cuenta. Puedes solicitar una nueva revisión a asistencia indicando el contenido afectado.'],
    ],
    support: 'Contactar con asistencia',
  },
};
