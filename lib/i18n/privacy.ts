import type { Locale } from './config';

export const PRIVACY_UPDATED_AT = '2026-10-28';

export const pushPrivacy: Record<Locale, string> = {
  "it": "Le notifiche sono facoltative e si basano sul consenso che esprimi scegliendo di attivarle (art. 6.1.a GDPR). Registriamo identificativo di installazione, token del dispositivo, piattaforma, lingua, scelta e date tecniche, associati al tuo account, per inviare il ringraziamento e le novità COSMORA tramite Apple Push Notification service o Firebase Cloud Messaging di Google. Non sono pubblicità di terzi. Puoi disattivarle nel Profilo: il token viene rimosso dal registro COSMORA quando la richiesta raggiunge il server. Se sei offline, l’app ritenta alla riconnessione o riapertura. La revoca nelle impostazioni del telefono impedisce la visualizzazione delle notifiche; l’app aggiorna il registro quando viene riaperta e può collegarsi. I dispositivi inattivi da oltre 90 giorni sono esclusi dagli invii: questa esclusione non equivale alla cancellazione dei dati. La cancellazione dell’account rimuove i dati push associati nei sistemi COSMORA; non significa cancellazione immediata di ogni identificativo presso Apple o Google.",
  "en": "Notifications are optional and rely on the consent you give by choosing to enable them (Article 6(1)(a) GDPR). We register an installation identifier, device token, platform, language, choice and technical timestamps, linked to your account, to send our thank-you message and COSMORA news through Apple Push Notification service or Google Firebase Cloud Messaging. They are not third-party advertising. You can turn them off in Profile: the token is removed from the COSMORA register when the request reaches the server. If you are offline, the app retries when connectivity returns or the app reopens. Revoking permission in your phone settings prevents notifications from being displayed; the app updates the register when reopened with a working connection. Devices inactive for more than 90 days are excluded from sending: exclusion does not mean deletion. Account deletion removes associated push records from COSMORA systems; it does not mean every identifier held by Apple or Google is immediately deleted.",
  "fr": "Les notifications sont facultatives et reposent sur le consentement exprimé en choisissant de les activer (article 6.1.a du RGPD). Nous enregistrons un identifiant d’installation, un jeton d’appareil, la plateforme, la langue, votre choix et des dates techniques, associés à votre compte, pour envoyer notre remerciement et les nouvelles COSMORA via Apple Push Notification service ou Firebase Cloud Messaging de Google. Il ne s’agit pas de publicité de tiers. Vous pouvez les désactiver dans le Profil : le jeton est retiré du registre COSMORA lorsque la demande atteint le serveur. Hors ligne, l’application réessaie à la reconnexion ou à sa réouverture. La révocation dans les réglages du téléphone empêche l’affichage des notifications ; l’application met le registre à jour à sa réouverture avec une connexion disponible. Les appareils inactifs depuis plus de 90 jours sont exclus des envois : cette exclusion ne signifie pas leur suppression. La suppression du compte efface les données push associées dans les systèmes COSMORA, sans signifier la suppression immédiate de chaque identifiant chez Apple ou Google.",
  "de": "Mitteilungen sind freiwillig und beruhen auf deiner Einwilligung, die du durch Aktivierung erteilst (Art. 6 Abs. 1 Buchst. a DSGVO). Wir speichern eine Installationskennung, ein Geräte-Token, Plattform, Sprache, deine Entscheidung und technische Zeitangaben, verknüpft mit deinem Konto, um unseren Dank und COSMORA-Neuigkeiten über Apple Push Notification service oder Googles Firebase Cloud Messaging zu versenden. Es handelt sich nicht um Werbung Dritter. Du kannst sie im Profil deaktivieren: Das Token wird aus dem COSMORA-Register entfernt, sobald die Anfrage den Server erreicht. Offline versucht die App es bei erneuter Verbindung oder beim nächsten Öffnen wieder. Der Widerruf in den Telefoneinstellungen verhindert die Anzeige von Mitteilungen; beim erneuten Öffnen mit Verbindung aktualisiert die App das Register. Geräte, die länger als 90 Tage inaktiv sind, werden vom Versand ausgeschlossen: Das ist keine Datenlöschung. Die Kontolöschung entfernt zugehörige Push-Daten aus COSMORA-Systemen; sie bedeutet nicht, dass jede Kennung bei Apple oder Google sofort gelöscht wird.",
  "es": "Las notificaciones son opcionales y se basan en el consentimiento que das al activarlas (artículo 6.1.a del RGPD). Registramos un identificador de instalación, un token del dispositivo, la plataforma, el idioma, tu elección y fechas técnicas, asociados a tu cuenta, para enviar nuestro agradecimiento y novedades COSMORA mediante Apple Push Notification service o Firebase Cloud Messaging de Google. No son publicidad de terceros. Puedes desactivarlas en el Perfil: el token se elimina del registro COSMORA cuando la solicitud llega al servidor. Sin conexión, la app reintenta al reconectarse o volver a abrirse. Revocar el permiso en los ajustes del teléfono impide mostrar notificaciones; la app actualiza el registro al abrirse con conexión. Los dispositivos inactivos durante más de 90 días se excluyen de los envíos: esto no significa que se eliminen sus datos. Eliminar la cuenta borra los datos push asociados en los sistemas COSMORA, sin implicar la eliminación inmediata de todos los identificadores en Apple o Google."
};

type PrivacyMessages = {
  title: string;
  heading: string;
  updated: string;
  contact: string;
  deleteAccount: string;
  authority: string;
  sections: string[][];
};

export const privacyMessages: Record<Locale, PrivacyMessages> = {
  "it": {
    "title": "Privacy",
    "heading": "Informativa sulla privacy",
    "updated": "Aggiornata il 28 ottobre 2026",
    "contact": "Contatta il titolare per la privacy",
    "deleteAccount": "Elimina il tuo account",
    "authority": "Garante per la protezione dei dati personali",
    "sections": [
      [
        "Titolare e ambito",
        "Il titolare del trattamento è Andrea Gadducci, titolare della ditta individuale Kreluna Software, Viale Dante Alighieri 3, 51016 Montecatini Terme (PT), Italia. Contatto: info@kreluna.it, oggetto [COSMORA] Privacy. Questa informativa riguarda l’app COSMORA, cosmora.kreluna.it, le pagine COSMORA e il pannello riservato su software.kreluna.it/cosmora/. Le altre aree del sito aziendale hanno informative proprie: le loro tecnologie pubblicitarie non descrivono automaticamente quelle di COSMORA."
      ],
      [
        "Account e accesso",
        "Trattiamo email, identificativo dell’account, credenziali gestite dal servizio di autenticazione, nome pubblico, paese e dati che scegli di aggiungere al profilo. Con Apple o Google riceviamo i dati resi disponibili dal relativo accesso, come email, nome e immagine; non riceviamo la password Apple o Google. Registrazione, conferma dell’indirizzo e date di autenticazione servono a gestire l’account. La base è l’esecuzione del servizio richiesto (art. 6.1.b GDPR). I dati obbligatori sono necessari per la funzione scelta; puoi consultare le parti accessibili senza account."
      ],
      [
        "Community e visibilità",
        "Trattiamo foto e video caricati, post, annunci, messaggi, preferiti, relazioni e partecipazioni a crew e incontri per fornire le funzioni che richiedi (art. 6.1.b GDPR). Nome pubblico, paese, post e annunci possono essere visibili anche senza accesso. I messaggi sono destinati ai partecipanti, non sono post pubblici. Evita di condividere dati sensibili o informazioni altrui senza averne titolo. Altri possono copiare i contenuti pubblici: eliminare l’originale non cancella automaticamente copie esterne."
      ],
      [
        "Gestione, assistenza e sicurezza",
        "Il titolare e i soggetti autorizzati possono consultare nel pannello riservato email, nome, paese, registrazione, ultima autenticazione, stato dell’account e conteggi di contenuti e dispositivi con notifiche, per gestire il servizio e la crescita della community. L’ultima autenticazione non misura ogni apertura dell’app. Il pannello non mostra password, token push o chat private. Gestiamo richieste di assistenza, segnalazioni e blocchi per fornire assistenza e proteggere il servizio: art. 6.1.b GDPR per le richieste relative al servizio, art. 6.1.f per il legittimo interesse alla gestione e sicurezza, art. 6.1.c per obblighi di legge. Puoi opporti ai trattamenti fondati sul legittimo interesse. Controlli automatici del testo possono sospendere la pubblicazione in attesa di verifica; puoi chiedere un riesame umano all’assistenza."
      ],
      [
        "Foto, mappe e funzioni facoltative",
        "Accediamo ai file che scegli di caricare; non pubblichiamo automaticamente la libreria Foto. I file pubblicati possono conservare metadati incorporati, anche EXIF o posizione: controllali e rimuovi quelli che non vuoi condividere prima del caricamento. La rimozione dello sfondo elabora l’immagine sul dispositivo dopo il caricamento facoltativo del modello. Aprendo una mappa, OpenStreetMap e la relativa infrastruttura ricevono IP, informazioni tecniche della richiesta e area visualizzata. Se attivi il GPS, il componente usa la posizione sul dispositivo per mostrarti sulla mappa e non salva le coordinate GPS nel database COSMORA; le richieste cartografiche possono comunque rivelare l’area. I permessi si gestiscono nelle impostazioni del dispositivo. Link a biglietti, video o altri servizi aprono servizi esterni con proprie informative; i loro gestori ricevono i dati necessari alla visita o alla funzione richiesta."
      ],
      [
        "Notifiche COSMORA",
        pushPrivacy.it
      ],
      [
        "Cookie e archivi sul dispositivo",
        "COSMORA usa archivi tecnici del browser o dell’app per mantenere l’accesso, ricordare lingua, accettazione dei termini, lettura del ringraziamento e scelta delle notifiche. L’app conserva la sessione per ritrovare l’accesso; uscire dall’account rimuove la sessione locale. Il pannello usa sessionStorage con la chiave cosmora-admin-auth, legata alla sessione della scheda: non è un cookie pubblicitario. Altre preferenze locali restano finché vengono cambiate o elimini i dati dell’app o del sito; cancellarli non elimina l’account sul server. Queste tecnologie servono alle funzioni richieste e non vengono usate da COSMORA per pubblicità comportamentale. Nei componenti COSMORA e nel pannello non sono integrati Meta Pixel o Google Ads."
      ],
      [
        "Venditori, ordini e pagamenti",
        "Se usi un profilo venditore, trattiamo contatti, paese e dati commerciali, di fatturazione o consegna che inserisci; per i negozi anche dati aziendali e condizioni di vendita. In questa versione pagamenti, collegamento Stripe, cauzioni e noleggi sono disattivati. Eventuali ordini di prova precedenti possono conservare partecipanti, prodotti, importi, stati e riferimenti Stripe, utilizzati per consultare o gestire le operazioni di prova disponibili. Queste azioni non costituiscono incassi, spedizioni o rimborsi reali. Non inserire carte, conti bancari o documenti d’identità nei campi liberi."
      ],
      [
        "Fornitori e trasferimenti",
        "Supabase fornisce autenticazione, database e file; Sites e Cloudflare l’infrastruttura web; Aruba la posta di assistenza. Apple e Google intervengono per gli accessi scelti e, se abilitate, le notifiche; OpenStreetMap per le mappe; Stripe può intervenire sugli ordini di prova. Trattano anche dati tecnici necessari a erogazione e sicurezza. Il database Supabase di COSMORA è configurato nella regione UE di Francoforte, Germania. Questa scelta non significa che ogni trattamento, accesso di assistenza o servizio esterno resti nel SEE: i fornitori possono usare infrastrutture e subfornitori internazionali. Le loro condizioni pubbliche descrivono le garanzie previste per i trasferimenti; puoi richiedere a info@kreluna.it informazioni sui destinatari, paesi e garanzie applicabili al tuo trattamento e una copia dei relativi documenti."
      ],
      [
        "Conservazione e cancellazione",
        "Account, profilo e contenuti sono conservati per mantenere il servizio finché l’account è attivo, salvo eliminazione del contenuto o dell’account. Assistenza e segnalazioni sono conservate per gestire la richiesta o il caso; eventuale ulteriore conservazione va limitata ai dati necessari per obblighi di legge o controversie, per la durata pertinente. I registri tecnici e le eventuali copie infrastrutturali seguono le impostazioni del fornitore: la cancellazione nell’app non garantisce la scomparsa istantanea da ogni registro o copia. La funzione Elimina account rimuove account, contenuti associati e file dai sistemi operativi COSMORA. Se risultano ordini non di prova, la procedura automatica richiede l’intervento dell’assistenza; ciò non esclude il diritto di chiedere la cancellazione. Scrivici se la procedura fallisce o per conoscere i tempi applicabili alla tua richiesta. Per i dati push e gli archivi locali valgono anche le indicazioni sopra."
      ],
      [
        "Diritti e richieste",
        "Nei casi previsti dalla legge puoi chiedere accesso e copia, rettifica, cancellazione, limitazione e portabilità, opporti ai trattamenti basati sul legittimo interesse e revocare un consenso senza pregiudicare il trattamento precedente. Scrivi a info@kreluna.it; chiediamo solo informazioni necessarie a verificare l’identità. Per le richieste soggette al GDPR rispondiamo senza ingiustificato ritardo, normalmente entro un mese; un’estensione fino a due ulteriori mesi è possibile nei casi previsti, comunicandone motivi e necessità entro il primo mese. Puoi presentare reclamo al Garante italiano o all’autorità competente, anche nel paese di residenza abituale o lavoro ove previsto. I diritti applicabili non sono limitati dalla lingua scelta nell’app."
      ],
      [
        "Minori e genitori",
        "Il pubblico dichiarato di COSMORA comprende adolescenti dai 13 anni e adulti. Questo non significa che a 13 anni si possano esprimere autonomamente tutti i consensi: le condizioni dipendono dal paese e dalla finalità. L’app non dispone attualmente di un sistema di verifica dell’età o di autorizzazione genitoriale; accettare i termini non dimostra il rispetto di tali requisiti. Per una richiesta relativa ai dati di un minore o per segnalare un uso non appropriato scrivi a info@kreluna.it. Le regole di tutela dei minori e i canali di segnalazione sono disponibili nell’app."
      ],
      [
        "Aggiornamenti",
        "Aggiorniamo questa informativa quando cambiano funzioni o trattamenti. Le novità rilevanti e gli eventuali nuovi consensi vengono comunicati prima di usare i dati per finalità che li richiedono. L’informativa descrive i trattamenti; non è un consenso generale a qualsiasi utilizzo dei dati."
      ]
    ]
  },
  "en": {
    "title": "Privacy",
    "heading": "Privacy notice",
    "updated": "Updated 28 October 2026",
    "contact": "Contact the data controller about privacy",
    "deleteAccount": "Delete your account",
    "authority": "Italian Data Protection Authority",
    "sections": [
      [
        "Controller and scope",
        "The controller is Andrea Gadducci, owner of the sole proprietorship Kreluna Software, Viale Dante Alighieri 3, 51016 Montecatini Terme (PT), Italy. Contact: info@kreluna.it, subject [COSMORA] Privacy. This notice covers the COSMORA app, cosmora.kreluna.it, and the COSMORA pages and restricted dashboard at software.kreluna.it/cosmora/. Other areas of the company website have their own notices: their advertising technologies do not automatically describe those used by COSMORA."
      ],
      [
        "Account and sign-in",
        "We process your email, account identifier, credentials managed by the authentication service, public name, country and information you choose to add to your profile. Apple or Google sign-in provides the information made available by that service, such as email, name and picture; we do not receive your Apple or Google password. Registration, email confirmation and authentication dates support account management. The basis is performance of the requested service (Article 6(1)(b) GDPR). Required data are necessary for the feature you choose; you can browse areas available without an account."
      ],
      [
        "Community and visibility",
        "We process uploaded photos and videos, posts, listings, messages, favourites, connections and participation in crews and meetups to provide the features you request (Article 6(1)(b) GDPR). Public name, country, posts and listings may be visible without signing in. Messages are for the participants, not public posts. Avoid sharing sensitive information or other people’s data without authority to do so. Others may copy public content: deleting the original does not automatically delete external copies."
      ],
      [
        "Administration, support and security",
        "The controller and authorised persons can view email, name, country, registration, last authentication, account status, and content and notification-device counts in a restricted dashboard to manage the service and community growth. Last authentication does not measure every app opening. The dashboard does not show passwords, push tokens or private chats. We handle support requests, reports and blocks to provide assistance and protect the service: Article 6(1)(b) GDPR for service-related requests, Article 6(1)(f) for legitimate interests in administration and security, and Article 6(1)(c) for legal duties. You may object to processing based on legitimate interests. Automated text checks may hold publication pending review; you can request human reconsideration from support."
      ],
      [
        "Photos, maps and optional features",
        "We access the files you choose to upload; we do not automatically publish your photo library. Published files may retain embedded metadata, including EXIF or location: check and remove information you do not want to share before uploading. Background removal processes the image on your device after an optional model download. Opening a map sends OpenStreetMap and its infrastructure your IP address, technical request information and displayed area. If you enable GPS, the component uses your position on-device to show you on the map and does not save GPS coordinates in the COSMORA database; map requests may still reveal the area. Permissions are managed in device settings. Ticket, video and other links open external services with their own notices; their operators receive the data needed for your visit or requested feature."
      ],
      [
        "COSMORA notifications",
        pushPrivacy.en
      ],
      [
        "Cookies and on-device storage",
        "COSMORA uses technical browser or app storage to maintain sign-in and remember language, terms acceptance, whether the thank-you message was read and notification choices. The app retains the session so you can return signed in; signing out removes the local session. The dashboard uses sessionStorage under cosmora-admin-auth, tied to the tab session: it is not an advertising cookie. Other local preferences remain until changed or you clear app or website data; clearing them does not delete your server account. COSMORA uses these technologies for requested features, not behavioural advertising. Meta Pixel and Google Ads are not integrated into COSMORA components or the dashboard."
      ],
      [
        "Sellers, orders and payments",
        "For a seller profile we process the contact details, country and commercial, billing or delivery information you provide; shops also provide business details and sale terms. Payments, Stripe account connection, deposits and rentals are disabled in this version. Earlier test orders may retain participants, products, amounts, statuses and Stripe references used to view or perform available test actions. These actions do not represent real payments, shipments or refunds. Do not put card, bank account or identity-document information in free-text fields."
      ],
      [
        "Providers and transfers",
        "Supabase provides authentication, database and file services; Sites and Cloudflare provide web infrastructure; Aruba provides support email. Apple and Google are involved in your chosen sign-in and, if enabled, notifications; OpenStreetMap in maps; Stripe may be involved in test orders. They also process technical information needed for service and security. COSMORA’s Supabase database is configured in the EU region in Frankfurt, Germany. This does not mean all processing, support access or external services remain in the EEA: providers may use international infrastructure and subprocessors. Their public terms describe safeguards for transfers; you can request information on the recipients, countries and safeguards applicable to your processing, and copies of the relevant documents, at info@kreluna.it."
      ],
      [
        "Retention and deletion",
        "Accounts, profiles and content are retained to operate the service while the account is active, unless the content or account is deleted. Support requests and reports are retained to handle the request or case; further retention must be limited to information necessary for legal duties or disputes, for the relevant period. Technical logs and any infrastructure copies follow provider settings: deletion in the app does not guarantee immediate removal from every log or copy. Delete account removes the account, associated content and files from COSMORA’s operational systems. If non-test orders exist, automatic deletion requires support intervention; this does not remove your right to request erasure. Contact us if deletion fails or to learn which timeframes apply to your request. The information above also applies to push records and local storage."
      ],
      [
        "Rights and requests",
        "Where provided by law, you can request access and a copy, correction, erasure, restriction and portability, object to processing based on legitimate interests, and withdraw consent without affecting prior processing. Email info@kreluna.it; we ask only for information necessary to verify identity. For GDPR requests, we respond without undue delay, normally within one month; an extension of up to two further months is possible where permitted, with reasons and the need for extension communicated within the first month. You may complain to the Italian Data Protection Authority or another competent authority, including in your habitual residence or workplace where applicable. Your applicable rights are not limited by the app language you choose."
      ],
      [
        "Children and parents",
        "COSMORA’s declared audience includes teenagers aged 13 and above and adults. This does not mean that a 13-year-old can independently give every consent: conditions depend on the country and purpose. The app does not currently provide an age-verification or parental-authorisation system; accepting the terms does not demonstrate that these requirements are met. For requests about a child’s information or to report inappropriate use, contact info@kreluna.it. Child-safety rules and reporting channels are available in the app."
      ],
      [
        "Updates",
        "We update this notice when features or processing change. Material changes and any new consent requests are communicated before data are used for purposes that require them. This notice describes processing; it is not blanket consent to any use of personal information."
      ]
    ]
  },
  "fr": {
    "title": "Confidentialité",
    "heading": "Politique de confidentialité",
    "updated": "Mise à jour le 28 octobre 2026",
    "contact": "Contacter le responsable du traitement",
    "deleteAccount": "Supprimer votre compte",
    "authority": "Autorité italienne de protection des données",
    "sections": [
      [
        "Responsable et périmètre",
        "Le responsable est Andrea Gadducci, titulaire de l’entreprise individuelle Kreluna Software, Viale Dante Alighieri 3, 51016 Montecatini Terme (PT), Italie. Contact : info@kreluna.it, objet [COSMORA] Privacy. Cette politique couvre l’application COSMORA, cosmora.kreluna.it, les pages COSMORA et le tableau de bord réservé sur software.kreluna.it/cosmora/. Les autres parties du site de l’entreprise disposent de leurs propres informations : leurs technologies publicitaires ne décrivent pas automatiquement celles de COSMORA."
      ],
      [
        "Compte et connexion",
        "Nous traitons votre adresse e-mail, l’identifiant du compte, les identifiants gérés par le service d’authentification, le nom public, le pays et les informations que vous ajoutez au profil. Avec Apple ou Google, nous recevons les données fournies par ce service de connexion, comme l’e-mail, le nom et l’image ; nous ne recevons pas votre mot de passe Apple ou Google. Inscription, confirmation de l’adresse et dates d’authentification servent à gérer le compte. La base est l’exécution du service demandé (article 6, paragraphe 1, point b du RGPD). Les données obligatoires sont nécessaires à la fonction choisie ; les parties accessibles sans compte restent consultables."
      ],
      [
        "Communauté et visibilité",
        "Nous traitons les photos et vidéos importées, publications, annonces, messages, favoris, relations et participations aux groupes et rencontres pour fournir les fonctions demandées (article 6.1.b du RGPD). Le nom public, le pays, les publications et annonces peuvent être visibles sans connexion. Les messages sont destinés aux participants, pas au public. Évitez de partager des informations sensibles ou des données d’autrui sans en avoir le droit. Des tiers peuvent copier des contenus publics : supprimer l’original ne supprime pas automatiquement les copies externes."
      ],
      [
        "Gestion, assistance et sécurité",
        "Le responsable et les personnes autorisées peuvent consulter, dans un tableau de bord réservé, e-mail, nom, pays, inscription, dernière authentification, statut du compte et nombres de contenus et d’appareils avec notifications, afin de gérer le service et la croissance de la communauté. La dernière authentification ne mesure pas chaque ouverture de l’application. Le tableau de bord ne montre ni mots de passe, ni jetons push, ni discussions privées. Nous gérons demandes d’assistance, signalements et blocages : article 6.1.b du RGPD pour les demandes liées au service, article 6.1.f pour l’intérêt légitime à la gestion et à la sécurité, article 6.1.c pour les obligations légales. Vous pouvez vous opposer aux traitements fondés sur l’intérêt légitime. Des contrôles automatiques du texte peuvent suspendre une publication en attendant son examen ; vous pouvez demander un réexamen humain à l’assistance."
      ],
      [
        "Photos, cartes et fonctions facultatives",
        "Nous accédons aux fichiers que vous choisissez d’importer ; nous ne publions pas automatiquement votre photothèque. Les fichiers publiés peuvent conserver des métadonnées intégrées, notamment EXIF ou de localisation : vérifiez-les et retirez les informations que vous ne souhaitez pas partager avant l’importation. La suppression de l’arrière-plan traite l’image sur votre appareil après le téléchargement facultatif du modèle. L’ouverture d’une carte transmet à OpenStreetMap et à son infrastructure l’adresse IP, les informations techniques de la requête et la zone affichée. Si vous activez le GPS, le composant utilise votre position sur l’appareil sans enregistrer ces coordonnées dans la base COSMORA ; les requêtes cartographiques peuvent néanmoins révéler la zone. Les autorisations se gèrent dans les réglages de l’appareil. Les liens vers billets, vidéos et autres services ouvrent des services externes avec leurs propres politiques, dont les opérateurs reçoivent les données nécessaires à la visite ou à la fonction demandée."
      ],
      [
        "Notifications COSMORA",
        pushPrivacy.fr
      ],
      [
        "Cookies et stockage sur l’appareil",
        "COSMORA utilise le stockage technique du navigateur ou de l’application pour maintenir la connexion et mémoriser langue, acceptation des conditions, lecture du remerciement et choix des notifications. L’application conserve la session pour retrouver votre connexion ; la déconnexion supprime la session locale. Le tableau de bord utilise sessionStorage, clé cosmora-admin-auth, lié à la session de l’onglet : ce n’est pas un cookie publicitaire. Les autres préférences locales restent jusqu’à modification ou effacement des données du site ou de l’application ; cet effacement ne supprime pas votre compte sur le serveur. Ces technologies servent aux fonctions demandées, pas à la publicité comportementale. Meta Pixel et Google Ads ne sont pas intégrés aux composants COSMORA ni au tableau de bord."
      ],
      [
        "Vendeurs, commandes et paiements",
        "Pour un profil vendeur, nous traitons les coordonnées, le pays et les informations commerciales, de facturation ou de livraison fournies ; les boutiques indiquent aussi leurs données d’entreprise et conditions de vente. Paiements, connexion Stripe, cautions et locations sont désactivés dans cette version. D’anciennes commandes de test peuvent conserver participants, produits, montants, statuts et références Stripe pour consulter ou gérer les actions de test disponibles. Il ne s’agit pas d’encaissements, expéditions ou remboursements réels. Ne saisissez pas de données de carte, de compte bancaire ou de pièce d’identité dans les champs libres."
      ],
      [
        "Prestataires et transferts",
        "Supabase fournit authentification, base de données et fichiers ; Sites et Cloudflare l’infrastructure web ; Aruba les e-mails d’assistance. Apple et Google interviennent pour les connexions choisies et les notifications activées, OpenStreetMap pour les cartes, et éventuellement Stripe pour les commandes de test. Ils traitent aussi les informations techniques nécessaires au service et à sa sécurité. La base Supabase de COSMORA est configurée dans la région UE de Francfort, Allemagne. Cela ne signifie pas que tous les traitements, accès d’assistance ou services externes restent dans l’EEE : les prestataires peuvent utiliser des infrastructures et sous-traitants internationaux. Leurs conditions publiques décrivent les garanties prévues pour les transferts ; vous pouvez demander à info@kreluna.it des informations sur les destinataires, pays et garanties applicables à votre traitement et une copie des documents concernés."
      ],
      [
        "Conservation et suppression",
        "Compte, profil et contenus sont conservés pour fournir le service tant que le compte est actif, sauf suppression du contenu ou du compte. Assistance et signalements sont conservés pour traiter la demande ou le cas ; une conservation supplémentaire doit se limiter aux données nécessaires pour des obligations légales ou litiges, pendant la durée pertinente. Les journaux techniques et éventuelles copies d’infrastructure suivent les paramètres du prestataire : supprimer dans l’application ne garantit pas leur disparition immédiate de chaque journal ou copie. Supprimer le compte retire le compte, les contenus associés et les fichiers des systèmes opérationnels COSMORA. Des commandes autres que de test nécessitent l’intervention de l’assistance pour la suppression automatique, sans retirer votre droit de demander l’effacement. Contactez-nous en cas d’échec ou pour connaître les délais applicables à votre demande. Les indications précédentes concernent également les données push et le stockage local."
      ],
      [
        "Droits et demandes",
        "Dans les cas prévus par la loi, vous pouvez demander accès et copie, rectification, effacement, limitation et portabilité, vous opposer aux traitements fondés sur l’intérêt légitime et retirer un consentement sans affecter les traitements antérieurs. Écrivez à info@kreluna.it ; nous demandons uniquement les informations nécessaires pour vérifier votre identité. Pour les demandes relevant du RGPD, nous répondons sans retard injustifié, normalement sous un mois ; une prolongation pouvant atteindre deux mois supplémentaires est possible dans les cas prévus, en vous informant de sa nécessité et de ses motifs avant la fin du premier mois. Vous pouvez saisir l’autorité italienne ou une autre autorité compétente, notamment celle de votre résidence habituelle ou de votre lieu de travail lorsque prévu. La langue choisie dans l’application ne limite pas vos droits applicables."
      ],
      [
        "Mineurs et parents",
        "Le public déclaré de COSMORA comprend adolescents à partir de 13 ans et adultes. Cela ne signifie pas qu’à 13 ans tous les consentements puissent être donnés de façon autonome : les conditions dépendent du pays et de la finalité. L’application ne dispose actuellement ni d’un système de vérification de l’âge ni d’autorisation parentale ; accepter les conditions ne démontre pas le respect de ces exigences. Pour une demande concernant les données d’un mineur ou un usage inapproprié, contactez info@kreluna.it. Les règles de protection des mineurs et canaux de signalement sont disponibles dans l’application."
      ],
      [
        "Mises à jour",
        "Nous actualisons cette politique lorsque les fonctions ou traitements changent. Les modifications importantes et éventuelles nouvelles demandes de consentement sont communiquées avant l’utilisation des données pour des finalités qui les nécessitent. Cette politique décrit les traitements ; elle ne constitue pas un consentement général à toute utilisation des données."
      ]
    ]
  },
  "de": {
    "title": "Datenschutz",
    "heading": "Datenschutzhinweise",
    "updated": "Aktualisiert am 28. Oktober 2026",
    "contact": "Verantwortlichen zum Datenschutz kontaktieren",
    "deleteAccount": "Dein Konto löschen",
    "authority": "Italienische Datenschutzbehörde",
    "sections": [
      [
        "Verantwortlicher und Geltungsbereich",
        "Verantwortlich ist Andrea Gadducci, Inhaber des Einzelunternehmens Kreluna Software, Viale Dante Alighieri 3, 51016 Montecatini Terme (PT), Italien. Kontakt: info@kreluna.it, Betreff [COSMORA] Privacy. Diese Hinweise gelten für die COSMORA-App, cosmora.kreluna.it sowie die COSMORA-Seiten und das zugangsbeschränkte Dashboard unter software.kreluna.it/cosmora/. Andere Bereiche der Unternehmenswebsite haben eigene Hinweise: Deren Werbetechnologien beschreiben nicht automatisch die von COSMORA."
      ],
      [
        "Konto und Anmeldung",
        "Wir verarbeiten E-Mail-Adresse, Kontokennung, vom Authentifizierungsdienst verwaltete Zugangsdaten, öffentlichen Namen, Land und Angaben, die du deinem Profil hinzufügst. Bei Apple- oder Google-Anmeldung erhalten wir die dort bereitgestellten Daten wie E-Mail-Adresse, Name und Bild; nicht dein Apple- oder Google-Passwort. Registrierung, E-Mail-Bestätigung und Anmeldezeitpunkte dienen der Kontoverwaltung. Grundlage ist die Erfüllung des angeforderten Dienstes (Art. 6 Abs. 1 Buchst. b DSGVO). Pflichtangaben sind für die gewählte Funktion erforderlich; öffentlich zugängliche Bereiche kannst du ohne Konto ansehen."
      ],
      [
        "Community und Sichtbarkeit",
        "Wir verarbeiten hochgeladene Fotos und Videos, Beiträge, Anzeigen, Nachrichten, Favoriten, Kontakte sowie Crew- und Treffen-Teilnahmen für die angeforderten Funktionen (Art. 6 Abs. 1 Buchst. b DSGVO). Öffentlicher Name, Land, Beiträge und Anzeigen können ohne Anmeldung sichtbar sein. Nachrichten sind für die Beteiligten bestimmt und keine öffentlichen Beiträge. Teile sensible Angaben oder Daten anderer nur, wenn du dazu berechtigt bist. Öffentliche Inhalte können kopiert werden: Das Löschen des Originals entfernt externe Kopien nicht automatisch."
      ],
      [
        "Verwaltung, Support und Sicherheit",
        "Der Verantwortliche und befugte Personen können im geschützten Dashboard E-Mail-Adresse, Namen, Land, Registrierung, letzte Authentifizierung, Kontostatus sowie Zahlen zu Inhalten und Geräten mit Mitteilungen einsehen, um den Dienst und das Wachstum der Community zu verwalten. Die letzte Authentifizierung erfasst nicht jedes Öffnen der App. Das Dashboard zeigt keine Passwörter, Push-Tokens oder privaten Chats. Wir bearbeiten Supportanfragen, Meldungen und Sperren: Art. 6 Abs. 1 Buchst. b DSGVO für dienstbezogene Anfragen, Buchst. f für berechtigte Interessen an Verwaltung und Sicherheit sowie Buchst. c für gesetzliche Pflichten. Der Verarbeitung auf Grundlage berechtigter Interessen kannst du widersprechen. Automatische Textprüfungen können Veröffentlichungen bis zur Prüfung zurückhalten; beim Support kannst du eine menschliche Überprüfung beantragen."
      ],
      [
        "Fotos, Karten und optionale Funktionen",
        "Wir greifen auf die zum Hochladen ausgewählten Dateien zu und veröffentlichen nicht automatisch deine Fotomediathek. Veröffentlichte Dateien können eingebettete Metadaten wie EXIF- oder Standortdaten behalten: Prüfe sie und entferne vor dem Hochladen Angaben, die du nicht teilen möchtest. Die Hintergrundentfernung verarbeitet Bilder auf deinem Gerät nach optionalem Herunterladen des Modells. Beim Öffnen einer Karte erhalten OpenStreetMap und dessen Infrastruktur IP-Adresse, technische Anfragedaten und den angezeigten Bereich. Wenn du GPS aktivierst, zeigt die Komponente deine Position auf dem Gerät an und speichert diese GPS-Koordinaten nicht in der COSMORA-Datenbank; Kartenanfragen können den Bereich dennoch erkennen lassen. Berechtigungen verwaltest du in den Geräteeinstellungen. Ticket-, Video- und andere Links öffnen externe Dienste mit eigenen Datenschutzhinweisen, deren Betreiber die für den Besuch oder die Funktion notwendigen Daten erhalten."
      ],
      [
        "COSMORA-Mitteilungen",
        pushPrivacy.de
      ],
      [
        "Cookies und Gerätespeicher",
        "COSMORA verwendet technischen Browser- oder App-Speicher für Anmeldung, Sprache, Annahme der Bedingungen, Lesestatus der Dankesnachricht und Mitteilungseinstellungen. Die App speichert die Sitzung zur Wiederaufnahme der Anmeldung; Abmelden entfernt die lokale Sitzung. Das Dashboard nutzt sessionStorage unter cosmora-admin-auth für die Tab-Sitzung: Das ist kein Werbe-Cookie. Andere lokale Einstellungen bleiben, bis sie geändert oder App- bzw. Websitedaten gelöscht werden; das löscht nicht dein Konto auf dem Server. Diese Technologien dienen angeforderten Funktionen, nicht verhaltensbezogener Werbung. Meta Pixel und Google Ads sind weder in die COSMORA-Komponenten noch in das Dashboard integriert."
      ],
      [
        "Verkäufer, Bestellungen und Zahlungen",
        "Bei Verkäuferprofilen verarbeiten wir angegebene Kontaktdaten, Land sowie Geschäfts-, Rechnungs- oder Lieferinformationen; Geschäfte geben zusätzlich Unternehmensdaten und Verkaufsbedingungen an. Zahlungen, Stripe-Kontoverbindung, Kautionen und Vermietungen sind in dieser Version deaktiviert. Frühere Testbestellungen können Beteiligte, Produkte, Beträge, Status und Stripe-Referenzen für die Anzeige oder verfügbare Testaktionen enthalten. Diese Aktionen sind keine echten Zahlungen, Lieferungen oder Erstattungen. Gib in Freitextfeldern keine Karten-, Bankkonto- oder Ausweisdaten ein."
      ],
      [
        "Dienstleister und Übermittlungen",
        "Supabase stellt Authentifizierung, Datenbank und Dateien bereit, Sites und Cloudflare die Webinfrastruktur und Aruba Support-E-Mails. Apple und Google sind bei gewählten Anmeldungen und aktivierten Mitteilungen beteiligt, OpenStreetMap bei Karten und gegebenenfalls Stripe bei Testbestellungen. Sie verarbeiten auch notwendige technische Betriebs- und Sicherheitsdaten. Die Supabase-Datenbank von COSMORA ist in der EU-Region Frankfurt, Deutschland, konfiguriert. Das bedeutet nicht, dass jede Verarbeitung, jeder Supportzugriff oder externe Dienst im EWR verbleibt: Anbieter können internationale Infrastruktur und Unterauftragnehmer einsetzen. Ihre öffentlichen Bedingungen beschreiben vorgesehene Übermittlungsgarantien. Unter info@kreluna.it kannst du Informationen zu Empfängern, Ländern und anwendbaren Garantien deiner Verarbeitung sowie Kopien entsprechender Unterlagen anfordern."
      ],
      [
        "Speicherung und Löschung",
        "Konto, Profil und Inhalte werden für den Dienst gespeichert, solange das Konto aktiv ist, sofern Inhalt oder Konto nicht gelöscht werden. Supportanfragen und Meldungen werden zur Bearbeitung des Anliegens oder Falls gespeichert; darüber hinaus dürfen nur notwendige Daten für gesetzliche Pflichten oder Rechtsstreitigkeiten für den einschlägigen Zeitraum verbleiben. Technische Protokolle und etwaige Infrastrukturkopien richten sich nach den Anbietereinstellungen: Die Löschung in der App garantiert keine sofortige Entfernung aus jedem Protokoll oder jeder Kopie. Konto löschen entfernt Konto, zugehörige Inhalte und Dateien aus den operativen COSMORA-Systemen. Bei vorhandenen Nicht-Testbestellungen erfordert die automatische Löschung Supportunterstützung; dein Recht, Löschung zu verlangen, bleibt bestehen. Kontaktiere uns bei Fehlern oder für die auf deinen Antrag anwendbaren Zeiträume. Für Push-Daten und lokalen Speicher gelten zusätzlich die Angaben oben."
      ],
      [
        "Rechte und Anfragen",
        "Soweit gesetzlich vorgesehen, kannst du Auskunft und Kopie, Berichtigung, Löschung, Einschränkung und Übertragbarkeit verlangen, Verarbeitung auf Grundlage berechtigter Interessen widersprechen und Einwilligungen ohne Auswirkung auf frühere Verarbeitung widerrufen. Schreibe an info@kreluna.it; wir verlangen nur zur Identitätsprüfung notwendige Angaben. DSGVO-Anfragen beantworten wir unverzüglich, normalerweise innerhalb eines Monats. Eine Verlängerung um bis zu zwei weitere Monate ist in den vorgesehenen Fällen möglich; Gründe und Notwendigkeit teilen wir innerhalb des ersten Monats mit. Du kannst dich bei der italienischen oder einer anderen zuständigen Aufsichtsbehörde beschweren, gegebenenfalls auch an deinem gewöhnlichen Aufenthalts- oder Arbeitsort. Deine anwendbaren Rechte hängen nicht von der gewählten App-Sprache ab."
      ],
      [
        "Minderjährige und Eltern",
        "Zur erklärten Zielgruppe von COSMORA gehören Jugendliche ab 13 Jahren und Erwachsene. Das bedeutet nicht, dass mit 13 jede Einwilligung selbstständig erteilt werden kann: Voraussetzungen hängen von Land und Zweck ab. Die App bietet derzeit kein System zur Altersprüfung oder elterlichen Genehmigung; die Annahme der Bedingungen weist die Erfüllung dieser Anforderungen nicht nach. Für Anfragen zu Daten Minderjähriger oder Meldungen ungeeigneter Nutzung schreibe an info@kreluna.it. Regeln zum Schutz Minderjähriger und Meldewege sind in der App verfügbar."
      ],
      [
        "Aktualisierungen",
        "Wir aktualisieren diese Hinweise, wenn sich Funktionen oder Verarbeitung ändern. Wesentliche Änderungen und erforderliche neue Einwilligungen werden vor einer Nutzung für entsprechende Zwecke mitgeteilt. Diese Hinweise beschreiben die Verarbeitung; sie sind keine pauschale Einwilligung in jede Datennutzung."
      ]
    ]
  },
  "es": {
    "title": "Privacidad",
    "heading": "Aviso de privacidad",
    "updated": "Actualizado el 28 de octubre de 2026",
    "contact": "Contactar con el responsable de privacidad",
    "deleteAccount": "Eliminar tu cuenta",
    "authority": "Autoridad italiana de protección de datos",
    "sections": [
      [
        "Responsable y alcance",
        "El responsable es Andrea Gadducci, titular de la empresa individual Kreluna Software, Viale Dante Alighieri 3, 51016 Montecatini Terme (PT), Italia. Contacto: info@kreluna.it, asunto [COSMORA] Privacy. Este aviso cubre la app COSMORA, cosmora.kreluna.it, y las páginas COSMORA y el panel restringido en software.kreluna.it/cosmora/. Otras áreas del sitio de la empresa tienen avisos propios: sus tecnologías publicitarias no describen automáticamente las de COSMORA."
      ],
      [
        "Cuenta y acceso",
        "Tratamos correo electrónico, identificador de cuenta, credenciales gestionadas por el servicio de autenticación, nombre público, país y los datos que añadas al perfil. Con Apple o Google recibimos los datos facilitados por su acceso, como correo, nombre e imagen; no recibimos tu contraseña de Apple o Google. Registro, confirmación de dirección y fechas de autenticación sirven para gestionar la cuenta. La base es la ejecución del servicio solicitado (artículo 6.1.b del RGPD). Los datos obligatorios son necesarios para la función elegida; puedes consultar las áreas disponibles sin cuenta."
      ],
      [
        "Comunidad y visibilidad",
        "Tratamos fotos y vídeos subidos, publicaciones, anuncios, mensajes, favoritos, relaciones y participación en grupos y encuentros para ofrecer las funciones solicitadas (artículo 6.1.b del RGPD). Nombre público, país, publicaciones y anuncios pueden ser visibles sin iniciar sesión. Los mensajes son para sus participantes, no publicaciones públicas. Evita compartir datos sensibles o de otras personas sin estar legitimado. Otros pueden copiar contenido público: eliminar el original no elimina automáticamente las copias externas."
      ],
      [
        "Administración, asistencia y seguridad",
        "El responsable y las personas autorizadas pueden consultar en un panel restringido correo, nombre, país, registro, última autenticación, estado de cuenta y recuentos de contenido y dispositivos con notificaciones, para gestionar el servicio y el crecimiento de la comunidad. La última autenticación no mide cada apertura de la app. El panel no muestra contraseñas, tokens push ni chats privados. Gestionamos solicitudes de asistencia, denuncias y bloqueos: artículo 6.1.b del RGPD para solicitudes del servicio, artículo 6.1.f para el interés legítimo en administración y seguridad, y artículo 6.1.c para obligaciones legales. Puedes oponerte al tratamiento basado en el interés legítimo. Los controles automáticos del texto pueden retener una publicación pendiente de revisión; puedes solicitar revisión humana a asistencia."
      ],
      [
        "Fotos, mapas y funciones opcionales",
        "Accedemos a los archivos que eliges subir, sin publicar automáticamente tu fototeca. Los archivos publicados pueden conservar metadatos incorporados, incluidos EXIF o ubicación: revísalos y elimina la información que no quieras compartir antes de subirlos. La eliminación del fondo procesa la imagen en tu dispositivo tras la descarga opcional del modelo. Abrir un mapa comunica a OpenStreetMap y su infraestructura la IP, datos técnicos de la solicitud y la zona mostrada. Si activas GPS, el componente usa tu posición en el dispositivo para mostrarla sin guardar esas coordenadas en la base COSMORA; las solicitudes cartográficas pueden revelar la zona. Los permisos se gestionan en los ajustes del dispositivo. Los enlaces a entradas, vídeos y otros servicios abren servicios externos con avisos propios, cuyos operadores reciben los datos necesarios para la visita o función solicitada."
      ],
      [
        "Notificaciones COSMORA",
        pushPrivacy.es
      ],
      [
        "Cookies y almacenamiento en el dispositivo",
        "COSMORA utiliza almacenamiento técnico del navegador o de la app para mantener el acceso y recordar idioma, aceptación de condiciones, lectura del agradecimiento y elección de notificaciones. La app conserva la sesión para recuperar el acceso; cerrarla elimina la sesión local. El panel usa sessionStorage con la clave cosmora-admin-auth, vinculado a la sesión de la pestaña: no es una cookie publicitaria. Otras preferencias locales permanecen hasta modificarlas o borrar los datos de la app o del sitio; esto no elimina tu cuenta del servidor. Estas tecnologías sirven para las funciones solicitadas, no para publicidad comportamental. Meta Pixel y Google Ads no están integrados en los componentes COSMORA ni en el panel."
      ],
      [
        "Vendedores, pedidos y pagos",
        "Para un perfil vendedor tratamos los contactos, país y datos comerciales, de facturación o entrega que proporcionas; las tiendas también indican información empresarial y condiciones de venta. Pagos, conexión Stripe, depósitos y alquileres están desactivados en esta versión. Los pedidos de prueba anteriores pueden conservar participantes, productos, importes, estados y referencias Stripe para consultar o realizar las acciones de prueba disponibles. Estas acciones no son cobros, envíos ni reembolsos reales. No incluyas datos de tarjetas, cuentas bancarias o documentos de identidad en campos libres."
      ],
      [
        "Proveedores y transferencias",
        "Supabase proporciona autenticación, base de datos y archivos; Sites y Cloudflare, infraestructura web; Aruba, correo de asistencia. Apple y Google intervienen en los accesos elegidos y las notificaciones activadas, OpenStreetMap en mapas y, en su caso, Stripe en pedidos de prueba. También tratan los datos técnicos necesarios para el servicio y su seguridad. La base Supabase de COSMORA está configurada en la región UE de Fráncfort, Alemania. Esto no significa que todos los tratamientos, accesos de asistencia o servicios externos permanezcan en el EEE: los proveedores pueden utilizar infraestructura y subencargados internacionales. Sus condiciones públicas describen las garantías previstas para transferencias; en info@kreluna.it puedes solicitar información sobre destinatarios, países y garantías aplicables a tu tratamiento, y una copia de los documentos correspondientes."
      ],
      [
        "Conservación y eliminación",
        "Cuenta, perfil y contenido se conservan para mantener el servicio mientras la cuenta esté activa, salvo eliminación del contenido o cuenta. Asistencia y denuncias se conservan para gestionar la solicitud o caso; cualquier conservación posterior debe limitarse a lo necesario para obligaciones legales o controversias, durante el plazo pertinente. Los registros técnicos y posibles copias de infraestructura siguen la configuración del proveedor: eliminar en la app no garantiza la desaparición inmediata de cada registro o copia. Eliminar cuenta borra la cuenta, contenido asociado y archivos de los sistemas operativos COSMORA. Si hay pedidos que no son de prueba, la eliminación automática requiere intervención de asistencia; esto no elimina tu derecho a solicitar la supresión. Escríbenos si falla o para conocer los plazos de tu solicitud. También se aplican las indicaciones anteriores sobre datos push y almacenamiento local."
      ],
      [
        "Derechos y solicitudes",
        "Cuando lo prevea la ley, puedes solicitar acceso y copia, rectificación, supresión, limitación y portabilidad, oponerte al tratamiento basado en el interés legítimo y retirar consentimiento sin afectar al tratamiento previo. Escribe a info@kreluna.it; pedimos solo lo necesario para verificar tu identidad. Respondemos a las solicitudes sujetas al RGPD sin dilación indebida, normalmente en un mes; se permite prorrogar hasta otros dos meses en los casos previstos, informando de la necesidad y motivos dentro del primer mes. Puedes reclamar ante la autoridad italiana u otra competente, incluida la de tu residencia habitual o trabajo cuando corresponda. El idioma elegido en la app no limita tus derechos aplicables."
      ],
      [
        "Menores y progenitores",
        "El público declarado de COSMORA incluye adolescentes a partir de 13 años y adultos. Esto no significa que a los 13 se pueda dar todo consentimiento de forma autónoma: los requisitos dependen del país y finalidad. Actualmente la app no dispone de verificación de edad ni autorización parental; aceptar las condiciones no demuestra el cumplimiento de estos requisitos. Para solicitudes sobre datos de menores o comunicar uso inadecuado, contacta con info@kreluna.it. Las normas de protección de menores y los canales de denuncia están disponibles en la app."
      ],
      [
        "Actualizaciones",
        "Actualizamos este aviso cuando cambian las funciones o tratamientos. Los cambios relevantes y las posibles solicitudes de nuevos consentimientos se comunican antes de usar datos para finalidades que los necesiten. Este aviso describe el tratamiento; no constituye un consentimiento general para cualquier uso de datos."
      ]
    ]
  }
};
