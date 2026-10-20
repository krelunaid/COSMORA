# COSMORA — bozza fattuale per Play Console

Data: 9 ottobre 2026. App Play Console: `4974190705613393494`.

Documento di preparazione: non attesta che i moduli siano salvati, che Google abbia approvato l’app o che tutti i flussi siano stati provati su Android. Le conclusioni sul comportamento derivano dal sorgente corrente; i soli controlli live di questo audit sono la lettura delle tre pagine pubbliche indicate sotto. Non contiene credenziali.

## 1. Scheda dello store

### Nome

COSMORA: Eventi e Cosplay

### Descrizione breve

Scopri eventi, cosplay e collezionismo. Annunci, community e crew.

### Descrizione completa

COSMORA è uno spazio per chi ama cosplay, manga e fumetti, action figure, carte collezionabili e videogiochi.

SCOPRI EVENTI E PASSIONI
Consulta il calendario degli eventi in Europa, apri le guide disponibili e raggiungi il sito dell’organizzatore per le informazioni ufficiali. Esplora le categorie e cerca annunci, post e persone.

ESPLORA GLI ANNUNCI
Sfoglia gli annunci pubblicati dagli utenti, consulta descrizioni e fotografie, salva i preferiti e contatta il venditore tramite i messaggi. Puoi creare un profilo venditore privato o negozio e proporre i tuoi articoli con foto, descrizione, condizioni e prezzo.

CONDIVIDI NELLA COMMUNITY
Pubblica post con foto o video delle tue creazioni, dei tuoi costumi e delle tue collezioni. Scopri i contenuti degli altri appassionati e i loro profili.

ORGANIZZA UNA CREW
Crea una squadra cosplay o un incontro legato a un evento. Indica luogo pubblico, data, regole e numero di partecipanti, oppure partecipa alle crew disponibili.

GESTISCI ACCOUNT E CONTATTI
Accedi con email o con i servizi di accesso disponibili. Gestisci il profilo, i messaggi e i preferiti. Puoi segnalare contenuti o utenti, bloccare contatti e avviare l’eliminazione del tuo account dalla funzione dedicata.

La consultazione degli eventi e dei contenuti pubblici è disponibile anche senza accesso. Per pubblicare, partecipare alle crew, usare i messaggi e inviare segnalazioni serve un account.

In questa versione COSMORA non gestisce pagamenti, cauzioni, noleggi o spedizioni. I contenuti di eventi e annunci possono cambiare; per biglietti e informazioni ufficiali consulta gli organizzatori. COSMORA non è l’app ufficiale degli eventi elencati.

Assistenza: info@kreluna.it
Privacy: https://cosmora.kreluna.it/privacy

### Categoria e limiti del testo

- Tipo: app, non gioco. Download gratuito. Il codice non attiva acquisti digitali o abbonamenti.
- Categoria coerente con il prodotto: Social, se questa resta la scelta del titolare. Non scegliere una categoria differente per eludere requisiti applicabili.
- Le foto delle categorie sono risorse incluse nell’app; non è presente un generatore di immagini per gli utenti.
- Le descrizioni non promettono verifiche di identità dei venditori, transazioni protette, presenza continua di moderatori, tempi di risposta, disponibilità di un contenuto specifico o rapporti ufficiali con gli eventi.
- Prima di usare il testo finale, verificare nel pacchetto caricato i flussi che si menzionano. Questo documento non sostituisce quella verifica.

## 2. Rating IARC: fatti utili al questionario

Usare la formulazione precisa delle domande della Console. La tabella non assegna un rating e non sostituisce il risultato IARC.

| Tema della domanda | Fatti del prodotto e risposta preparatoria |
| --- | --- |
| Interazione tra utenti | Sì: post, profili, crew e messaggi diretti. Non dichiarare assenza di interazione. |
| Contenuti pubblicati dagli utenti | Sì: testi, annunci, fotografie e video. Sono distinti dalle immagini editoriali distribuite nella build. |
| Messaggi / chat | Sì: messaggi testuali diretti tra utenti autenticati; non è una chat anonima o un abbinamento casuale. |
| Segnalazione | Il codice offre Segnala per post, annunci, crew e utenti; un messaggio ricevuto può essere allegato alla segnalazione con controllo del partecipante. |
| Blocco degli utenti | Il codice dispone di blocco, sblocco e controllo bilaterale per impedire messaggi e contatti interessati. |
| Revisione / moderazione | Il codice inserisce nuovi post, annunci e crew in revisione e contiene strumenti riservati di rimozione e sospensione. Non attestare personale incaricato, tempi o presidio operativo senza evidenza live. |
| Violenza nei contenuti propri | Il contenuto editoriale riguarda cosplay, fumetti e figure, che possono comprendere armi o combattenti illustrati. Esaminare le immagini effettivamente distribuite se IARC distingue rappresentazioni fantastiche, realismo, intensità o sangue. Non usare un No generale soltanto perché non è un gioco. |
| Contenuti sessuali, odio, linguaggio volgare, droghe, alcol, tabacco | Il sorgente delle regole vieta contenuti sessualmente espliciti e abusi. Il catalogo utenti live non è stato inventariato in questo audit. Le risposte sulla presenza nei contenuti effettivi devono essere verificate; il divieto nei termini non prova l’assenza materiale. |
| Gioco d’azzardo / premi casuali | Nessuna funzione di gioco d’azzardo, scommesse o ricompense casuali realizzata nel codice esaminato. Le carte collezionabili sono una categoria di annunci, non un meccanismo di gioco dell’app. |
| Acquisti nell’app | Nessun acquisto di contenuti digitali o abbonamento attivo. I pagamenti e i noleggi sono disattivati; restano gli annunci di oggetti fisici e il contatto con il venditore. Se la domanda riguarda il commercio in generale, non confonderla con gli acquisti digitali integrati. |
| Posizione condivisa con altri utenti | Non esiste condivisione della posizione GPS live del dispositivo. Profili e crew possono rendere pubblici paese, città e luogo di incontro inseriti manualmente. Distinguere le due cose nella domanda concreta. |
| Dati personali pubblici | Nome pubblico, paese, post e annunci possono essere visibili anche ai visitatori. Sono presenti profili pubblici; non dichiarare assenza di informazioni personali visibili. |
| Accesso a internet / browser | API online e link verso siti ufficiali degli organizzatori; non è un browser web generalista. Le mappe usano tile OpenStreetMap. |

Riferimenti: `app/api/messages/route.ts:22`, `app/api/reports/route.ts:4`, `components/safety-center.tsx:19`, `app/api/squads/route.ts:124`, `app/api/community/posts/route.ts:196`, `lib/release-features.ts:3`, `lib/event-media.ts`, `lib/marketplace-categories.ts`.

## 3. Pubblico di riferimento

L’app riguarda appassionati, creator, collezionisti, venditori e partecipanti a eventi. Non esiste nel sorgente una data di nascita richiesta, una verifica dell’età o una soglia minima applicata all’accesso.

**Non decidibile dal solo codice:** fasce di età che il titolare intende selezionare in Play Console, eventuale esclusione dei minori, e applicabilità di ogni requisito Families. La grafica a tema manga o cosplay non determina da sola il pubblico. Il rating IARC e la scelta del pubblico target sono passaggi distinti.

Non introdurre nella scheda dello store una dicitura 13+, 16+ o 18+ priva di una decisione del titolare. Non attestare che l’app blocchi minori o verifichi l’età se il controllo non esiste.

Se resta la categoria Social, completare il requisito Child Safety anche per un eventuale pubblico adulto. Il nuovo contenuto locale di `/child-safety` è ancora una **bozza con operatore non confermato** (`lib/i18n/child-safety.ts:5`): prima dell’attestazione occorrono adozione del processo, referente effettivo e URL pubblico funzionante. [Requisiti Google Child Safety](https://support.google.com/googleplay/android-developer/answer/14747720?hl=en)

## 4. Data Safety: impostazioni generali

- Raccolta dati: **Sì**. Non scegliere la dichiarazione di assenza totale di dati.
- Trasmissione protetta: gli endpoint propri, Supabase e OSM esaminati usano HTTPS; il manifest Android vieta traffico cleartext. Verificare che il pacchetto finale e il backend mantengano questi endpoint.
- Cancellazione: funzione presente nell’app e sul web. La lettura della pagina è stata verificata, non l’esecuzione della cancellazione di un account reale.
- Account creati tramite email/password, Google e Apple, se i provider sono disponibili dal servizio Auth. L’app legge la configurazione reale dei provider; non presumere che tutti siano attivi in ogni momento.
- Nessuna certificazione di revisione indipendente della sicurezza individuata. Non selezionarla.
- Nessun SDK pubblicitario, identificatore pubblicitario o importazione della rubrica del dispositivo individuati.
- Provider: Supabase Auth/database/Storage; backend del sito e infrastruttura Cloudflare/Sites; Aruba per l’assistenza; Google/Apple per gli accessi; OSM per mappe; Stripe solo per eventuali vecchie operazioni di prova.

### Convenzioni della matrice

`Funzioni` = esecuzione delle funzioni richieste; `Account` = gestione account; `Sicurezza` = abusi, frodi e conformità.

`Facoltativo app` indica che è possibile consultare COSMORA da ospite o evitare la funzione interessata. Alcuni dati restano obbligatori per completare la singola funzione: non significa che si possano omettere all’interno di quel flusso.

Per `Condivisione`, l’uso di fornitori che trattano dati per conto dello sviluppatore e le azioni di pubblicazione/chat richieste dall’utente possono rientrare nelle eccezioni. Non equiparare automaticamente un servizio esterno a un fornitore incaricato. La matrice distingue l’assenza di trasferimenti dall’eventuale esenzione applicabile. [Guida Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

### Matrice campo per campo

| Voce | Raccolta osservabile | Condivisione da impostare/verificare | Finalità | Obbligo / controllo dell’utente | Trattamento effimero |
| --- | --- | --- | --- | --- | --- |
| Nome | Sì: nome pubblico e dati venditore/negozio inviati al backend. | Profili pubblici e pubblicazioni; valutare esenzione per azione richiesta dall’utente. Supabase come fornitore del servizio se il rapporto lo conferma. | Funzioni, Account, Sicurezza per identità/abusi. | Facoltativo app; obbligatorio in alcuni moduli e ricevuto dal provider sociale quando fornito. | No: profili persistenti. |
| Email | Sì: Auth e profilo venditore. | Auth/hosting e provider di accesso; non è stato individuato un invio a partner pubblicitari. Verificare il rapporto di servizio e il flusso OAuth. | Account, Funzioni, Sicurezza. | Facoltativo app; necessaria per account e profilo venditore del relativo flusso. | No. |
| Identificativi utente | Sì: UUID account, autore, mittente/destinatario, memberships, report e blocchi. | Identificativi nelle API di contenuti/profili; fornitori del servizio e azioni utente come sopra. | Account, Funzioni, Sicurezza. | Facoltativo app; necessari quando si usa un account. | No. |
| Indirizzo | Sì: indirizzo registrato e fatturazione nei dati venditore. | Nei percorsi esaminati i dati completi venditore sono letti dal proprietario; nessun invio generalizzato a terzi individuato. Conservazione tramite fornitori. | Funzioni, Account. | Facoltativo app; alcuni campi obbligatori per negozi, altri facoltativi. | No. |
| Telefono | Sì: modulo venditore. | Nessuna rubrica letta; nessun trasferimento pubblicitario individuato. Conservazione tramite fornitori. | Funzioni, Account. | Facoltativo app; il modulo venditore può richiederlo. | No. |
| Altre informazioni personali | Sì, se personali: tipo venditore, rappresentante legale, registrazione, partita IVA e altri campi commerciali liberi. | Fornitori; eventuale materiale reso pubblico solo nei flussi effettivamente esposti. Non dichiarare un’intera anagrafica pubblica senza verificarla. | Funzioni, Account, Sicurezza. | Facoltativo app; vari campi richiesti ai negozi. | No. |
| Foto | Sì: foto pubblicate in post/annunci. Anche l’immagine profilo può arrivare dal provider sociale. | Pubblicazione intenzionale e Storage del fornitore. L’elaborazione locale dello sfondo non trasmette da sola la foto al modello remoto. | Funzioni; Sicurezza per le foto sottoposte a verifica. | Facoltativo app; fotografie richieste quando il relativo modulo lo impone. | No per pubblicazioni persistenti. |
| Video | Sì: video caricati nei post Community. | Pubblicazione intenzionale e Storage del fornitore. | Funzioni; Sicurezza per contenuti sottoposti a verifica. | Facoltativo app. | No. |
| Messaggi nell’app | Sì: testo, UUID dei partecipanti e data dei messaggi diretti. | Consegnati al partecipante scelto; un messaggio ricevuto può essere incluso nella segnalazione. Valutare esenzione per azione utente; non sono crittografati end-to-end. | Funzioni; Sicurezza per segnalazioni e limiti d’abuso. | Facoltativo app, attivati dall’utente. | No. |
| Altri contenuti creati dall’utente | Sì: caption, descrizioni, biografie, dettagli annunci/crew, regole, luoghi manuali e dettagli dei report. | Contenuti pubblicati intenzionalmente; report destinati agli operatori autorizzati; fornitori. | Funzioni, Sicurezza. | Facoltativo app; alcune informazioni necessarie per pubblicare. | No. |
| Interazioni / altre azioni nell’app | Sì: preferiti, partecipazioni/ruoli, blocchi, report e ricevuta di consenso ai termini. | Fornitori; alcuni dati sociali sono esposti ai destinatari o proprietari della crew. Nessun partner pubblicitario individuato. | Funzioni, Account per consenso, Sicurezza per report/blocchi. | Facoltativo app; consenso richiesto per uso ordinario dell’account, con percorso di cancellazione esente. | No per azioni persistenti. |
| Ricerche nell’app | Sì: ricerca di prodotti, post e profili invia il testo `q` alle API. Alcune ricerche eventi/crew filtrano invece sul dispositivo. | Backend e fornitori; nessun invio pubblicitario individuato. | Funzioni. | Facoltativo app: l’utente decide se usare la ricerca. | Da confermare: non esiste una tabella di cronologia nel codice, ma questo non prova assenza di log delle richieste. Non selezionare Sì senza verifica dei registri. |
| Posizione approssimativa | Sì: paese/città/luogo manuale associati al profilo o alle crew; mappe e infrastrutture possono ricevere informazioni di area. | Pubblicazione di luoghi manuali richiesta dall’utente; OSM riceve richieste tile/IP. Valutare separatamente l’esenzione per provider o azione/consenso. | Funzioni. | Facoltativo app; paese/luogo può essere necessario in una funzione specifica. | No per i campi salvati; registri di OSM non verificati come effimeri. |
| Posizione precisa | GPS elaborato in memoria e non salvato in Supabase. Quando la mappa si centra sul GPS, le richieste tile a OSM rendono inferibile l’area mostrata a zoom16. Nessun reverse-geocoding trovato. | OSM; non presumere un rapporto di servizio per conto di Kreluna né l’adeguatezza della disclosure/consenso. Se l’esenzione non è accertata, dichiarare la condivisione per la mappa. | Funzioni. | Facoltativo app: apertura mappa e attivazione GPS. Nessuna posizione in background. | Non attestare Sì per l’intero flusso: marker locale transitorio, richieste e registri esterni separati. |
| Contatti / relazioni sociali | Nessuna lettura della rubrica. Sono però persistenti relazioni fra utenti: membri delle crew e partecipanti ai messaggi. | Relazioni esposte ai partecipanti/proprietari nei flussi previsti; fornitori. | Funzioni. | Facoltativo app. | No. La voce Google comprende relazioni sociali: se la Console la include in Contatti, dichiarare queste relazioni senza affermare accesso alla rubrica. |
| Cronologia acquisti | I nuovi checkout sono disattivati; il codice consente gestione di ordini test preesistenti. | Può coinvolgere Stripe test tramite backend per gli identificativi necessari. | Funzioni, Sicurezza per contestazioni/operazioni esistenti. | Da decidere sullo stato reale degli account e degli ordini accessibili. Non attesta acquisti reali. | Ordini conservati, quindi non effimeri quando presenti. |
| Dati di pagamento, salute, documenti, calendario del dispositivo, audio separato, app installate, navigazione web generale, advertising/device ID | Nessun relativo flusso di raccolta individuato nel sorgente esaminato. Il contenuto audio dentro un video è coperto dalla raccolta del video; non c’è registratore vocale separato. | Non individuata. | Non selezionare finalità inesistenti. | Non applicabile ai flussi individuati. | Non applicabile. |
| Crash / diagnostica / altri dati di prestazioni | Nessun SDK di telemetria o crash reporting individuato. Hosting/Auth possono conservare registri tecnici. | Configurazione effettiva dei fornitori da verificare. | Eventuali Funzioni/Sicurezza/diagnostica solo se realmente effettuate. | Da verificare. | Non certificabile dal repository. |

### Riferimenti per le voci Data Safety

- Account: `app/api/account/route.ts:5`, `components/auth/auth-form.tsx:41`.
- Venditore: `app/api/seller/profile/route.ts:26`, `app/seller/onboarding/page.tsx:164`.
- Post/media: `app/api/community/posts/route.ts:196`, `components/community-media-picker.tsx:121`.
- Messaggi e partecipanti: `app/api/messages/route.ts:5` e `:36`.
- Crew e relazioni: `app/api/squads/route.ts:11`, `:124`, `:148`.
- Ricerca: `components/live-listings.tsx:170`, `app/api/listings/route.ts:43`, `app/community/page.tsx:129`, `app/api/profiles/route.ts:29`.
- Report: `app/api/reports/route.ts:4`, `:58`, `:81`.
- Posizione: `components/event-live-map.tsx:34`, `:59`, `:65`, `:117`; registri del provider: [Privacy OSM](https://osmfoundation.org/wiki/Privacy_Policy#Personal_data_we_receive_automatically).
- Sfondo foto: `lib/background-removal.worker.ts:17` scarica il modello, l’inferenza è locale.
- Pagamenti: `lib/release-features.ts:3`, `lib/stripe/server.ts:6`, `app/checkout/page.tsx:65`.
- Informativa: `lib/i18n/privacy.ts:4`.
- Trasporto nativo: `lib/native-api-transport.ts:3`; manifest Android e manifest merged release.

## 5. URL e account per la revisione

Le seguenti pagine sono state lette senza autenticazione il 9 ottobre 2026, con risposta HTTP200:

- Privacy: https://cosmora.kreluna.it/privacy
- Cancellazione: https://cosmora.kreluna.it/account/delete
- Regole: https://cosmora.kreluna.it/community/rules

La pagina di eliminazione mostra cosa verrà rimosso, ma richiede login quando si esegue. La privacy espone conservazione ed eccezioni; non promette cancellazione istantanea di ogni backup. Il sorgente elimina file e dati associati, revoca la sessione e rimuove l’account (`app/api/account/delete/route.ts:44` e `:73`). Non è stata eseguita una cancellazione in questo audit.

La pagina regole live letta era precedente alla versione termini2026-10-06 del sorgente. La nuova policy di tutela minori richiede deployment web e successiva rilettura pubblica; includerla nell’AAB da solo non la pubblica al suo URL.

In App access indicare che **alcune funzioni sono soggette ad accesso**. Servono credenziali di un account dedicato, già confermato, senza OTP obbligatorio e con accesso alle funzioni esaminate. Inserirle solo nei campi autorizzati della Console, mai in questo documento o nel repository.

Istruzioni preparabili senza credenziali:

1. Aprire Profilo → Accedi; leggere/accettare i termini correnti per uso ordinario dell’account.
2. Usare l’account di revisione fornito nel campo dedicato. La navigazione pubblica resta disponibile da ospite.
3. Per pubblicare un annuncio, completare prima il profilo venditore scegliendo Privato o Negozio. I nuovi contenuti possono essere in revisione: non promettere pubblicazione immediata.
4. Per segnalare o bloccare aprire Profilo → Segnala o blocca, oppure Segnala nel contenuto/conversazione. Usare un contenuto di prova già predisposto, se ne viene fornito uno.
5. Per eliminare l’account aprire la funzione dedicata; usare un account separato sacrificabile se il revisore deve compiere davvero l’operazione, evitando di cancellare l’unico account di revisione.

## 6. Punti ancora da risolvere prima delle attestazioni

- Scelta esplicita delle fasce di pubblico target; nessuna età minima è deducibile dal sorgente.
- Inventario dei contenuti reali rilevanti per IARC; non equivale alle sole regole di divieto.
- Operatore e processo Child Safety adottati, con policy pubblica finale e contatto effettivo; attualmente il codice nuovo è una bozza.
- Verifica del rapporto di servizio/esenzione e della disclosure per OSM; nessuna attestazione di log esterni effimeri.
- Configurazione reale dei log di hosting/Auth e degli ordini test preesistenti, per completare senza ipotesi le relative voci.
- GPS Android: il manifest release39 originale non conteneva permessi posizione. In questa sessione il manifest sorgente è stato modificato dal responsabile della release; verificare il **manifest del nuovo AAB** prima di dichiarare la funzione funzionante.
- Credenziali e dati di prova per il revisore, e verifica Android dei flussi autenticati. Questo audit non ha eseguito test.

