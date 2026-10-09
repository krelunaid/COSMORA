import type { Locale } from './config';

// Keep the proposed operational commitments visibly in draft until the operator
// confirms who receives reports and how incidents are escalated and retained.
export const CHILD_SAFETY_OPERATOR_CONFIRMED: boolean = false;

type ChildSafetyCopy = {
  title: string;
  intro: string;
  draftTitle: string;
  draftBody: string;
  sections: readonly (readonly [string, string])[];
  contact: string;
  report: string;
  rules: string;
  privacy: string;
  updated: string;
};

export const childSafetyMessages: Record<Locale, ChildSafetyCopy> = {
  it: {
    title: 'Tutela dei minori',
    intro: 'Standard COSMORA contro l’abuso e lo sfruttamento sessuale dei minori (CSAE). Si applicano a profili, annunci, post, foto e video, crew, incontri e messaggi, anche privati.',
    draftTitle: 'Bozza — in attesa di conferma del gestore',
    draftBody: 'Questa proposta descrive gli standard da adottare e il processo operativo da confermare. Il processo indicato non è dichiarato attivo finché il titolare non ne conferma responsabilità e attuazione.',
    sections: [
      ['Divieto assoluto di abuso e sfruttamento', 'COSMORA vieta qualsiasi abuso o sfruttamento sessuale di persone di età inferiore a 18 anni, l’adescamento (grooming), la sessualizzazione di minori, le richieste di contenuti sessuali a minori, la coercizione e il traffico a fini di sfruttamento sessuale. È vietato pubblicare, condividere, richiedere, promuovere o facilitare materiale di abuso sessuale su minori (CSAM), inclusi link e rappresentazioni digitali o generate artificialmente. Non sono previste eccezioni per presunto consenso, conversazioni private o spostamento su altri servizi.'],
      ['Come segnalare nell’app', 'Apri Profilo → Segnala o blocca un utente, oppure usa Segnala nel contenuto o nella conversazione interessata. Cerca il nome pubblico, seleziona il motivo disponibile più pertinente e descrivi il sospetto di abuso o sfruttamento di minori e dove è avvenuto. Se il motivo specifico non è presente, scegli Altro e spiegalo nei dettagli. Per inviare una segnalazione nell’app è necessario accedere. Non copiare né caricare materiale illecito nel modulo.'],
      ['Blocco e protezione dei contatti', 'Nella stessa schermata puoi scegliere Blocca anche questo utente o Blocca utente. Il blocco nasconde i suoi contenuti e impedisce lo scambio di messaggi con te; non sostituisce una segnalazione. Puoi tornare in Segnala o blocca per segnalare nuovamente o gestire gli utenti già bloccati.'],
      ['Segnalazioni senza account', 'Puoi contattare info@kreluna.it anche senza un account COSMORA, indicando nell’oggetto [COSMORA] Tutela dei minori. Fornisci il nome pubblico o il riferimento del contenuto, il link se disponibile, la data e una descrizione testuale. Non allegare, scaricare o inoltrare immagini o video di abuso sessuale su minori; non cercare altro materiale per raccogliere prove.'],
      ['Processo operativo proposto', 'Il gestore esamina le segnalazioni ricevute, limita l’accesso al materiale sospetto quando necessario per la tutela delle persone, rimuove i contenuti accertati come vietati e limita o sospende gli account responsabili. Conserva solo le informazioni necessarie a gestire il caso, proteggere le persone e adempiere agli obblighi di legge, con accesso riservato ai soggetti autorizzati. La cancellazione di un account non annulla gli eventuali obblighi di conservazione previsti dalla legge. Non è dichiarato un presidio continuo né un tempo garantito di risposta.'],
      ['Segnalazione alle autorità', 'Quando viene accertata la presenza di CSAM, il processo prevede la segnalazione alle autorità competenti e, ove applicabile, al National Center for Missing & Exploited Children (NCMEC), secondo la normativa applicabile. La cooperazione e l’eventuale trasmissione di informazioni avvengono tramite i canali previsti dalla legge, senza ulteriore diffusione del materiale. In caso di pericolo immediato, contatta direttamente i servizi di emergenza locali.'],
      ['Responsabile e contatto', 'Il riferimento per la sicurezza dei minori su COSMORA è Kreluna Software, Andrea Gadducci, contattabile a info@kreluna.it. Le richieste relative a questa pagina e alle segnalazioni di CSAE possono essere inviate allo stesso indirizzo.'],
    ],
    contact: 'Scrivi al contatto per la tutela dei minori',
    report: 'Apri Segnala o blocca',
    rules: 'Leggi le regole della community',
    privacy: 'Leggi l’informativa sulla privacy',
    updated: 'Bozza del 9 ottobre 2026',
  },
  en: {
    title: 'Child safety',
    intro: 'COSMORA standards against child sexual abuse and exploitation (CSAE). They apply to profiles, listings, posts, photos and videos, crews, meetups and messages, including private messages.',
    draftTitle: 'Draft — awaiting operator confirmation',
    draftBody: 'This proposal describes standards to adopt and an operational process to confirm. The process below is not declared active until the owner confirms responsibility and implementation.',
    sections: [
      ['Absolute prohibition of abuse and exploitation', 'COSMORA prohibits all sexual abuse or exploitation of people under 18, grooming, sexualisation of children, requests for sexual content from children, coercion and trafficking for sexual exploitation. Publishing, sharing, requesting, promoting or facilitating child sexual abuse material (CSAM), including links and digital or artificially generated depictions, is prohibited. There are no exceptions for purported consent, private conversations or moving to other services.'],
      ['How to report in the app', 'Open Profile → Report or block a user, or use Report on the relevant content or conversation. Find the public name, select the most relevant available reason and describe the suspected child abuse or exploitation and where it happened. If a specific reason is unavailable, select Other and explain in the details. In-app reporting requires sign-in. Do not copy or upload illegal material into the form.'],
      ['Blocking and contact protection', 'On the same screen you can select Also block this user or Block user. Blocking hides their content and prevents messages between you; it does not replace a report. You can return to Report or block to report again or manage users you already blocked.'],
      ['Reports without an account', 'You can contact info@kreluna.it without a COSMORA account, with [COSMORA] Child safety in the subject. Provide the public name or content reference, a link if available, the date and a text description. Do not attach, download or forward images or videos of child sexual abuse, or seek more material to collect evidence.'],
      ['Proposed operational process', 'The operator reviews received reports, restricts access to suspected material where necessary to protect people, removes content confirmed to violate these standards and restricts or suspends responsible accounts. Only information needed to handle the case, protect people and meet legal obligations is retained, with access limited to authorised persons. Account deletion does not override any retention duties imposed by law. No continuous monitoring or guaranteed response time is declared.'],
      ['Reporting to authorities', 'When CSAM is confirmed, the process provides for reporting to the competent authorities and, where applicable, the National Center for Missing & Exploited Children (NCMEC), in accordance with applicable law. Cooperation and any information transfer use legally prescribed channels without further dissemination of the material. If there is immediate danger, contact local emergency services directly.'],
      ['Responsible operator and contact', 'The child safety contact for COSMORA is Kreluna Software, Andrea Gadducci, reachable at info@kreluna.it. Requests about this page and CSAE reports can be sent to the same address.'],
    ],
    contact: 'Email the child safety contact', report: 'Open Report or block',
    rules: 'Read the community rules', privacy: 'Read the privacy notice', updated: 'Draft dated 9 October 2026',
  },
  fr: {
    title: 'Protection des mineurs',
    intro: 'Standards COSMORA contre les abus et l’exploitation sexuels des mineurs (CSAE). Ils s’appliquent aux profils, annonces, publications, photos et vidéos, groupes, rencontres et messages, y compris privés.',
    draftTitle: 'Projet — en attente de confirmation du gestionnaire',
    draftBody: 'Cette proposition décrit les standards à adopter et le processus opérationnel à confirmer. Le processus ci-dessous n’est pas déclaré actif tant que le responsable n’en confirme pas la responsabilité et la mise en œuvre.',
    sections: [
      ['Interdiction absolue des abus et de l’exploitation', 'COSMORA interdit tout abus ou exploitation sexuels de personnes de moins de 18 ans, la manipulation à des fins sexuelles (grooming), la sexualisation des mineurs, les demandes de contenus sexuels à des mineurs, la coercition et la traite à des fins d’exploitation sexuelle. Il est interdit de publier, partager, demander, promouvoir ou faciliter du matériel d’abus sexuels sur mineurs (CSAM), y compris des liens et des représentations numériques ou générées artificiellement. Aucune exception n’est admise pour un consentement supposé, des conversations privées ou un déplacement vers d’autres services.'],
      ['Comment signaler dans l’app', 'Ouvrez Profil → Signaler ou bloquer un utilisateur, ou utilisez Signaler dans le contenu ou la conversation concernés. Recherchez le nom public, choisissez le motif disponible le plus pertinent et décrivez le soupçon d’abus ou d’exploitation de mineurs et l’endroit concerné. Si aucun motif précis n’est proposé, choisissez Autre et expliquez dans les détails. Les signalements dans l’app nécessitent une connexion. Ne copiez et ne téléversez pas de matériel illicite dans le formulaire.'],
      ['Blocage et protection des contacts', 'Sur le même écran, vous pouvez choisir Bloquer aussi cet utilisateur ou Bloquer l’utilisateur. Le blocage masque ses contenus et empêche les messages entre vous ; il ne remplace pas un signalement. Vous pouvez revenir dans Signaler ou bloquer pour signaler à nouveau ou gérer les utilisateurs déjà bloqués.'],
      ['Signalements sans compte', 'Vous pouvez contacter info@kreluna.it sans compte COSMORA, avec [COSMORA] Protection des mineurs comme objet. Indiquez le nom public ou la référence du contenu, un lien si disponible, la date et une description textuelle. Ne joignez, ne téléchargez et ne transférez pas d’images ou de vidéos d’abus sexuels sur mineurs ; ne recherchez pas d’autres contenus pour recueillir des preuves.'],
      ['Processus opérationnel proposé', 'Le gestionnaire examine les signalements reçus, limite l’accès au matériel suspect si nécessaire pour protéger les personnes, retire les contenus dont la violation est établie et limite ou suspend les comptes responsables. Il conserve uniquement les informations nécessaires au traitement du cas, à la protection des personnes et aux obligations légales, avec un accès réservé aux personnes autorisées. La suppression d’un compte n’annule pas les éventuelles obligations légales de conservation. Aucun suivi permanent ni délai de réponse garanti n’est déclaré.'],
      ['Signalement aux autorités', 'Lorsque la présence de CSAM est confirmée, le processus prévoit un signalement aux autorités compétentes et, le cas échéant, au National Center for Missing & Exploited Children (NCMEC), selon le droit applicable. La coopération et les éventuelles transmissions d’informations utilisent les canaux prévus par la loi, sans diffusion supplémentaire du matériel. En cas de danger immédiat, contactez directement les secours locaux.'],
      ['Responsable et contact', 'Le contact chargé de la protection des mineurs sur COSMORA est Kreluna Software, Andrea Gadducci, joignable à info@kreluna.it. Les demandes relatives à cette page et les signalements de CSAE peuvent être envoyés à cette adresse.'],
    ],
    contact: 'Écrire au contact pour la protection des mineurs', report: 'Ouvrir Signaler ou bloquer',
    rules: 'Lire les règles de la communauté', privacy: 'Lire la politique de confidentialité', updated: 'Projet du 9 octobre 2026',
  },
  de: {
    title: 'Schutz Minderjähriger',
    intro: 'COSMORA-Standards gegen sexuellen Missbrauch und sexuelle Ausbeutung Minderjähriger (CSAE). Sie gelten für Profile, Anzeigen, Beiträge, Fotos und Videos, Crews, Treffen und Nachrichten, einschließlich privater Nachrichten.',
    draftTitle: 'Entwurf — Bestätigung des Betreibers ausstehend',
    draftBody: 'Dieser Vorschlag beschreibt einzuführende Standards und einen zu bestätigenden Ablauf. Der unten beschriebene Ablauf gilt erst als aktiv, wenn der Inhaber die Verantwortung und Umsetzung bestätigt.',
    sections: [
      ['Absolutes Verbot von Missbrauch und Ausbeutung', 'COSMORA verbietet jeglichen sexuellen Missbrauch oder sexuelle Ausbeutung von Personen unter 18 Jahren, Grooming, Sexualisierung Minderjähriger, Aufforderungen an Minderjährige zu sexuellen Inhalten, Nötigung und Menschenhandel zur sexuellen Ausbeutung. Das Veröffentlichen, Teilen, Anfordern, Bewerben oder Ermöglichen von Material sexuellen Missbrauchs von Kindern (CSAM), einschließlich Links und digitaler oder künstlich erzeugter Darstellungen, ist verboten. Es gibt keine Ausnahmen für vermeintliche Einwilligung, private Gespräche oder einen Wechsel zu anderen Diensten.'],
      ['In der App melden', 'Öffne Profil → Nutzer melden oder blockieren oder nutze Melden beim betroffenen Inhalt oder Gespräch. Suche den öffentlichen Namen, wähle den passendsten verfügbaren Grund und beschreibe den Verdacht auf Missbrauch oder Ausbeutung Minderjähriger und den Ort des Vorfalls. Ist kein genauer Grund verfügbar, wähle Sonstiges und erläutere ihn in den Details. Meldungen in der App erfordern eine Anmeldung. Kopiere oder lade kein illegales Material in das Formular.'],
      ['Blockierung und Schutz der Kontakte', 'Auf demselben Bildschirm kannst du Diesen Nutzer auch blockieren oder Nutzer blockieren wählen. Die Blockierung blendet seine Inhalte aus und verhindert Nachrichten zwischen euch; sie ersetzt keine Meldung. Unter Melden oder blockieren kannst du erneut melden oder bereits blockierte Nutzer verwalten.'],
      ['Meldungen ohne Konto', 'Du kannst info@kreluna.it auch ohne COSMORA-Konto mit dem Betreff [COSMORA] Schutz Minderjähriger kontaktieren. Nenne den öffentlichen Namen oder die Inhaltsreferenz, wenn vorhanden einen Link, das Datum und eine textliche Beschreibung. Hänge keine Bilder oder Videos sexuellen Missbrauchs von Kindern an, lade sie nicht herunter und leite sie nicht weiter; suche kein weiteres Material zur Beweissammlung.'],
      ['Vorgeschlagener betrieblicher Ablauf', 'Der Betreiber prüft eingegangene Meldungen, beschränkt bei Bedarf zum Schutz von Personen den Zugang zu verdächtigem Material, entfernt bestätigte Verstöße und beschränkt oder sperrt verantwortliche Konten. Gespeichert werden nur Informationen, die zur Fallbearbeitung, zum Schutz von Personen und zur Erfüllung gesetzlicher Pflichten notwendig sind; Zugriff haben ausschließlich befugte Personen. Eine Kontolöschung hebt gesetzliche Aufbewahrungspflichten nicht auf. Eine durchgehende Überwachung oder garantierte Antwortzeit wird nicht zugesagt.'],
      ['Meldung an Behörden', 'Bei bestätigtem CSAM sieht der Ablauf eine Meldung an die zuständigen Behörden und, soweit anwendbar, an das National Center for Missing & Exploited Children (NCMEC) nach geltendem Recht vor. Zusammenarbeit und etwaige Informationsübermittlung erfolgen über gesetzlich vorgesehene Wege ohne weitere Verbreitung des Materials. Bei unmittelbarer Gefahr kontaktiere direkt den örtlichen Notruf.'],
      ['Verantwortlicher und Kontakt', 'Ansprechpartner für den Schutz Minderjähriger bei COSMORA ist Kreluna Software, Andrea Gadducci, erreichbar unter info@kreluna.it. Anfragen zu dieser Seite und Meldungen von CSAE können an dieselbe Adresse gerichtet werden.'],
    ],
    contact: 'Kontakt zum Schutz Minderjähriger anschreiben', report: 'Melden oder blockieren öffnen',
    rules: 'Community-Regeln lesen', privacy: 'Datenschutzhinweise lesen', updated: 'Entwurf vom 9. Oktober 2026',
  },
  es: {
    title: 'Protección de menores',
    intro: 'Normas de COSMORA contra el abuso y la explotación sexual de menores (CSAE). Se aplican a perfiles, anuncios, publicaciones, fotos y vídeos, grupos, encuentros y mensajes, incluidos los privados.',
    draftTitle: 'Borrador — pendiente de confirmación del responsable',
    draftBody: 'Esta propuesta describe las normas que deben adoptarse y el proceso operativo que debe confirmarse. El proceso siguiente no se declara activo hasta que el titular confirme la responsabilidad y su puesta en práctica.',
    sections: [
      ['Prohibición absoluta del abuso y la explotación', 'COSMORA prohíbe cualquier abuso o explotación sexual de personas menores de 18 años, el grooming, la sexualización de menores, las solicitudes de contenido sexual a menores, la coacción y la trata con fines de explotación sexual. Se prohíbe publicar, compartir, solicitar, promover o facilitar material de abuso sexual infantil (CSAM), incluidos enlaces y representaciones digitales o generadas artificialmente. No hay excepciones por supuesto consentimiento, conversaciones privadas o traslado a otros servicios.'],
      ['Cómo denunciar en la app', 'Abre Perfil → Denunciar o bloquear a un usuario, o utiliza Denunciar en el contenido o la conversación afectados. Busca el nombre público, selecciona el motivo disponible más pertinente y describe la sospecha de abuso o explotación de menores y dónde ocurrió. Si no hay un motivo específico, elige Otro y explica los detalles. Para denunciar en la app es necesario iniciar sesión. No copies ni subas material ilícito al formulario.'],
      ['Bloqueo y protección de los contactos', 'En la misma pantalla puedes elegir Bloquear también a este usuario o Bloquear usuario. El bloqueo oculta su contenido e impide los mensajes entre vosotros; no sustituye a una denuncia. Puedes volver a Denunciar o bloquear para denunciar de nuevo o gestionar usuarios que ya hayas bloqueado.'],
      ['Denuncias sin cuenta', 'Puedes contactar con info@kreluna.it sin una cuenta de COSMORA, indicando [COSMORA] Protección de menores en el asunto. Facilita el nombre público o la referencia del contenido, un enlace si está disponible, la fecha y una descripción textual. No adjuntes, descargues ni reenvíes imágenes o vídeos de abuso sexual infantil; no busques más material para reunir pruebas.'],
      ['Proceso operativo propuesto', 'El responsable examina las denuncias recibidas, restringe el acceso al material sospechoso cuando sea necesario para proteger a las personas, retira contenido que se confirme como prohibido y limita o suspende las cuentas responsables. Conserva solo la información necesaria para gestionar el caso, proteger a las personas y cumplir obligaciones legales, con acceso limitado a personas autorizadas. La eliminación de una cuenta no anula las posibles obligaciones legales de conservación. No se declara vigilancia continua ni un plazo de respuesta garantizado.'],
      ['Denuncia a las autoridades', 'Cuando se confirme la presencia de CSAM, el proceso prevé denunciarlo a las autoridades competentes y, cuando corresponda, al National Center for Missing & Exploited Children (NCMEC), conforme a la legislación aplicable. La cooperación y cualquier transmisión de información se realizan por los canales previstos por la ley, sin difundir más el material. En caso de peligro inmediato, contacta directamente con los servicios de emergencia locales.'],
      ['Responsable y contacto', 'El contacto para la protección de menores en COSMORA es Kreluna Software, Andrea Gadducci, disponible en info@kreluna.it. Las consultas sobre esta página y las denuncias de CSAE pueden enviarse a la misma dirección.'],
    ],
    contact: 'Escribir al contacto de protección de menores', report: 'Abrir Denunciar o bloquear',
    rules: 'Leer las normas de la comunidad', privacy: 'Leer el aviso de privacidad', updated: 'Borrador del 9 de octubre de 2026',
  },
};
