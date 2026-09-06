# COSMORA — preparazione App Store

Aggiornamento: 6 settembre 2026. Bozza, NON inviata ad App Review.

## Stato corrente e cambio account

- Nuova iscrizione annuale Apple Developer acquistata; pagina Apple di conferma ordine osservata. Attivazione non ancora verificata: il portale Developer richiede un nuovo accesso.
- L'acquisto del nuovo abbonamento non trasferisce COSMORA dal precedente account. Prima di intervenire su identificatori, firma o trasferimenti, verificare l'attivazione e il percorso consentito da Apple per l'app esistente.
- Build 23 caricata con esito positivo il 5 settembre; elaborazione Apple successiva non verificata. Ultima associazione osservata nella versione Store: build 22.
- Screenshot iPhone e iPad catturati il 6 settembre e conservati in outputs/app-store-screenshots-2026-09-06 nella directory di lavoro esterna al repository; non ancora caricati in App Store Connect. Ricatturarli se vengono sostituiti gli asset.
- Restano da completare: account dedicato al revisore, privacy pubblica coerente con i trattamenti reali, verifica/sostituzione degli asset di terzi, prova finale dei flussi e caricamento materiali.
- Non inserire credenziali, dati della carta o indirizzo privato in Git o nelle pagine pubbliche senza uno scopo e un'autorizzazione specifici.
- Partita IVA non inserita nel checkout. Per fattura con partita IVA Apple indica il numero 800 915 911: https://www.apple.com/it/shop/help/payments. La possibilità di correggere l'ordine già effettuato va confermata da Apple; non ripetere l'acquisto.

Le sezioni seguenti conservano le verifiche precedenti e non attestano una nuova verifica sul nuovo account.

## Verificato e preparato in App Store Connect

- App: COSMORA: Cosplay & Collect, ID 6807907973, bundle com.kreluna.cosmora.
- Versione 1.0 in preparazione. Build 20 presente in TestFlight, gruppo interno Cosmo.
- Scheda versione: descrizione, testo promozionale, parole chiave e URL marketing compilati in inglese UK e italiano.
- Rilascio manuale selezionato: nessuna pubblicazione automatica dopo approvazione.
- Categoria primaria salvata: Social network. Sottotitolo inglese: Find your fandom community. Sottotitolo italiano: Trova la tua community cosplay.
- I testi non promettono checkout reale, assicurazione, protezione acquisti, partnership ufficiali, traduzione AI o funzionamento offline.

## Materiali ancora necessari

- Screenshot della build candidata effettiva su iPhone, senza messaggi personali, contatori fittizi o funzioni non disponibili. Al momento la scheda contiene zero screenshot.
- Sequenza proposta: Home/Esplora; community; crew e incontri; annunci; conversazione con account di prova. Catturare solo flussi realmente funzionanti.
- Il campo screenshot iPhone 6,5 pollici osservato accetta 1242×2688, 1284×2778 e orientamenti inversi. Verificare requisiti iPad se la build lo supporta. Non ritagliare vecchie immagini dell'app per nascondere difetti.
- URL assistenza pubblico con contatto operativo; URL privacy pubblico, policy coerente con i servizi e trattamenti reali.
- Titolare del copyright da confermare; contatto revisione (nome, cognome, telefono, email) e account dedicato al revisore da predisporre. Nessuna credenziale in questo documento o in Git.
- Questionari privacy, classificazione per età, diritti contenuti e adempimenti DSA da completare con dati reali. Non dichiarare «nessun dato raccolto»: account, media e messaggi sono parte del prodotto.
- Associare la build finale alla versione App Store dopo i test; non considerare la presenza su TestFlight una selezione automatica per lo Store.

## Blocchi funzionali prima dell'invio

Fare riferimento a RELEASE-READINESS.md. In particolare:

1. Completare e provare registrazione, conferma email, recupero password e login social, incluso ritorno alla sessione iOS. La sola capability Apple attiva non completa Sign in with Apple.
2. Implementare/verificare eliminazione account dall'app e gestione dei relativi dati.
3. Assistenza e moderazione operativa dei contenuti; provare segnalazione e blocco utenti.
4. Checkout attualmente solo TEST: non pubblicizzare o offrire pagamenti reali finché Connect, rimborsi e gestione ordini non sono validati. La prima versione pubblica richiede una scelta esplicita sulle funzioni commerciali da includere.
5. Test su dispositivo reale di navigazione, safe area, prestazioni, foto HEIC/picker e flussi completi. Il contenitore attuale carica l'interfaccia remota.
6. Verificare diritti degli asset, loghi ed eventi; niente dichiarazioni di partnership non documentate.

## Testi italiani salvati

Testo promozionale:
Scopri cosplay, collezionismo e community. Esplora gli annunci, condividi le tue creazioni e trova eventi, crew e incontri.

Descrizione:
COSMORA riunisce cosplay, collezionismo e community in un unico spazio.

ESPLORA LE TUE PASSIONI
Sfoglia annunci di cosplay, manga, fumetti, figure, carte e gaming. Usa ricerca e filtri per trovare gli articoli e scoprire i profili dei venditori.

CONDIVIDI LE TUE CREAZIONI
Pubblica foto e video, scopri creator e collega i tuoi post ad annunci, eventi e crew pertinenti.

TROVA LA TUA COMMUNITY
Scopri crew cosplay e incontri, partecipa alle attività della community e scambia messaggi con gli altri membri.

SCOPRI GLI EVENTI
Esplora il calendario degli eventi e visita i siti degli organizzatori per le informazioni aggiornate.

Per pubblicare contenuti, inviare messaggi e partecipare alle attività è necessario un account. È richiesta una connessione internet.

COSMORA è una piattaforma indipendente e non è affiliata agli organizzatori degli eventi o ai marchi di intrattenimento presenti negli annunci e nei contenuti della community.

Parole chiave:
cosplay,collezionismo,manga,fumetti,figure,carte,community,creator,eventi,crew,incontri

## Fonti Apple

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://developer.apple.com/app-store/review/

L'invio va fatto soltanto dopo chiusura dei blocchi. Preparare la scheda non equivale ad approvazione Apple.
