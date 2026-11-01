# COSMORA 1.0.6 — preparazione del rilascio, aggiornamento 30 ottobre 2026

## Stato attuale — recupero del 30 ottobre 2026

**Entrambi gli aggiornamenti sono stati caricati e inviati il 30 ottobre 2026. iOS 1.0.6 (47), inviato alle 19:51 Europe/Rome, risulta “In attesa di verifica”. Android 1.0.6 (46), verificato alle 20:01 Europe/Rome, compare sotto “Modifiche in fase di revisione”, con controlli rapidi ancora in corso: passerà alla revisione dopo tali controlli. Nessuna approvazione o pubblicazione dei nuovi aggiornamenti è confermata.** Il backend Community è distribuito sul progetto Supabase esistente. Il Mac è sbloccato e il controllo browser è stato ripristinato dopo il riavvio. Stato registrato in `outputs/release-1.0.6-recovery-20261030/store-progress.json`.

Apple: app `6809232374`, build `807462d5-03b4-4e2e-90af-20d820a1b02d`, invio `1003fe73-d3eb-4ffd-9b83-087565790528`. Dettaglio verificato: `https://appstoreconnect.apple.com/apps/6809232374/distribution/reviewsubmissions/details/1003fe73-d3eb-4ffd-9b83-087565790528`. Evidenze: `outputs/release-1.0.6-recovery-20261030/apple-review-1.0.6-47-20261030.jpg` e `apple-submitted-20261030.jpg` nella stessa cartella.

Google: upload ed elaborazione del bundle 46 completati; il bundle 46 ha sostituito il 45 nella release 6 del canale Produzione `4697762831338256553`, app `4974190705613393494`, developer `8769136787246988849`. Nome release: `1.0.6 (46) — Community e nuova home`. Dopo il salvataggio è stato premuto “Invia le modifiche per la revisione”. Alle `2026-10-30T19:01:12Z`, la pagina `https://play.google.com/console/u/0/developers/8769136787246988849/app/4974190705613393494/publishing` mostrava “Modifiche in fase di revisione”, riga “Produzione 46 — Avvio implementazione completa”, e controlli rapidi in corso. Pubblicazione gestita disattivata, implementazione prevista al 100%, nessun dispositivo aggiuntivo escluso rispetto al codice 44. Due soli avvisi non bloccanti: mapping di deoffuscamento e simboli di debug assenti. Evidenza: `outputs/release-1.0.6-recovery-20261030/google-review-1.0.6-46-20261030.jpg`.

Cronologia del recupero: alle 18:50 Europe/Rome Transporter aveva completato il caricamento di iOS 1.0.6 (47), poi mostrato “L'app ha terminato l'elaborazione”. Alle 18:52 il browser restituiva ancora “Local browser use is disabled in Work settings” e nessun nuovo pacchetto era stato inviato alla revisione. Questo blocco è successivamente rientrato; la build 47 ha sostituito la precedente 46 nella versione Apple 1.0.6 prima dell'invio delle 19:51. A quel punto il caricamento Android 46 era ancora in corso; è stato successivamente completato e inviato, come verificato alle 20:01.

La funzione `cosmora-community`, progetto `pwdpwgonvnuwmgfiidut`, è ACTIVE, versione 1, dal 30 ottobre alle 10:38 UTC. Solo GET `/api/community/posts` e PUT `/api/community/posts/interaction` del client nativo usano il nuovo endpoint. Creazione dei post, accesso, account e altre API mantengono i servizi attuali. Nessun nuovo database, migrazione di dati o modifica del dominio. La migrazione delle interazioni già applicata non è stata ripetuta.

Sorgente ed evidenze del servizio: `/Users/andreagadducci/Documents/Codex/2026-10-30/COSMORA-community-api-recovery/`. Otto controlli HTTP live superati, 17 test della funzione e suite completa mobile di 307 test superati. Revisione indipendente senza regressioni bloccanti. Le mutazioni reali con due account distinti restano non eseguite; proprietà e isolamento sono coperti dai test automatici. I cinque post correnti non hanno un profilo autore nel database: nessun nome è stato inventato.

Artefatti del recupero, cartella `outputs/release-1.0.6-recovery-20261030/`:

| Piattaforma | Versione | File | Byte | SHA-256 |
| --- | --- | --- | ---: | --- |
| Android | 1.0.6 (46) | `COSMORA-1.0.6-46-signed.aab` | 42809934 | `e949b35de2114810fa8c1b847be62b2c618b74767e81ead876915512843c837c` |
| iOS | 1.0.6 (47) | `ipa/App.ipa` | 38533845 | `e87f418447b7e43bd14a7eeead962f7a636d5c7061ac666602dd26c18cf8fe06` |

Identità, firme, tutti i 166 asset, endpoint Community e scansione dei segreti verificati direttamente nei pacchetti. I 371 sorgenti al freeze sono rimasti invariati. Evidenze complete in `artifacts-verification.json` nella nuova cartella. L'export Apple è riuscito; un avviso relativo alle credenziali Xcode non ha impedito la firma manuale valida.

Passaggi rimanenti:

1. Verificare il completamento dei controlli rapidi e l'esito della revisione Google per Android 1.0.6 (46).
2. Verificare l'esito della revisione Apple 1.0.6 (47), attualmente in attesa di verifica.
3. Verificare separatamente approvazione e pubblicazione di entrambe le piattaforme. Le versioni già installate usano ancora l'endpoint precedente fino all'aggiornamento.

**Non inviare i pacchetti precedenti Android 45 / iOS 46:** non contengono il nuovo instradamento Community. Le sezioni seguenti conservano esclusivamente le evidenze storiche anteriori al recupero.

## Stato storico prima del recupero

Pacchetti nuovi costruiti e firmati dopo il freeze della home e della Community B. **Android 1.0.6 (45) è stato caricato su Google Play e salvato come bozza; non è stato inviato alla revisione. Su App Store Connect è stata creata la versione iOS 1.0.6, nello stato “In preparazione per l’invio”, con build 46 selezionata. Nessuna delle due versioni è stata aggiunta o inviata alla revisione.** Il rilascio resta subordinato alla disponibilità e al collaudo delle API necessarie sul backend di produzione corretto. Preparazione e selezione della build non dimostrano la pubblicazione delle funzioni online.

Android Google Play è stato verificato dal coordinatore alla versione precedente 1.0.5 (44), disponibile al 100% dal 26 ottobre. La nuova bozza è la release 6 del canale `4697762831338256553`, app `4974190705613393494`, developer `8769136787246988849`, nome `1.0.6 (45) — Community e nuova home`. Il portale ha confermato il bundle 45 (1.0.6) e “Modifiche salvate. Ora puoi visualizzare l'anteprima della release prima di inviarla per la revisione”. Non è stata premuta alcuna azione di invio/revisione/pubblicazione.

Il Mac è stato sbloccato dal titolare. Transporter conservava l’accesso a `krelunaid@gmail.com` e ha ricevuto il pacchetto 1.0.6 (46) per l’app `6809232374` il 29 ottobre alle 17:22 (Europe/Rome), senza errore di build duplicata. Prova del caricamento: `outputs/release-1.0.6/apple-upload-completed.png`.

Il **30 ottobre l’accesso Apple è stato ripristinato**. Il coordinatore ha creato la versione 1.0.6 e selezionato la build **46**, ID **`4ab3a2b3-7d54-4623-a2d2-e60eaa455b9d`**. Le novità sono state salvate in italiano, francese, inglese (Regno Unito), spagnolo (Spagna) e tedesco, insieme alle nuove note di revisione. Stato osservato: **“In preparazione per l’invio”**. Non è stata eseguita alcuna aggiunta o invio ad App Review. Prova: `outputs/release-1.0.6/apple-prepared-20261030.png`.

La conferma dell’utente in questo passaggio riguarda soltanto il login Apple, non dimostra il ripristino dell’accesso Sites. Il controllo del 30 ottobre continua a restituire `NOT_FOUND` per il progetto Sites corretto. Alle 05:46 UTC le API live rispondono ancora GET Community 200 senza `author_profile_url`, `liked` e `saved`, e route `/api/community/posts/interaction` 404: il gate backend resta aperto.

La migrazione delle interazioni è stata applicata e verificata (`20261029082427 community_post_interactions`). Le API di produzione restano quelle precedenti; il candidato mirato è conservato in `outputs/release-1.0.6/backend-candidate/` e non è stato distribuito. L'account Sites corrente vede un vecchio progetto distinto; il progetto corretto restituisce `NOT_FOUND`.

## Artefatti

Evidenza storica del 29 ottobre, successiva all’upload: Transporter mostrava COSMORA 1.0.6 (46) come **“L’app può essere testata internamente”**, confermando l’elaborazione Apple completata. Prova: `outputs/release-1.0.6/apple-processed-internal-testing.png`. A quel controllo il browser Apple era ancora fermo alla password; lo stato è superato dalla preparazione in App Store Connect del 30 ottobre descritta sopra. L’elaborazione non costituiva invio ad App Review.

Cartella: `outputs/release-1.0.6/`. I pacchetti precedenti in `outputs/native-push/` sono preservati.

| Piattaforma | Identità | Versione | File | Byte | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| Android | `com.kreluna.cosmora` | 1.0.6 (45) | `COSMORA-1.0.6-45-signed.aab` | 42809728 | `b204c237630d929b6843e587833b330ebfded772132a0a65a2c497e5fe31a709` |
| iOS | `it.kreluna.cosmora` | 1.0.6 (46) | `ipa/App.ipa` | 38533552 | `dc1bc4d1071d089eeaca26064aa20dc7b11e76b8e1c0bea907f2a23e988e9032` |

Archivio iOS: `COSMORA-1.0.6-46.xcarchive`.

## Verifiche effettuate

- `pnpm run android:bundle`: build mobile, scansioni credenziali, sync Android e Gradle Release riusciti.
- AAB firmato con l'helper `scripts/sign-android-release.mjs` e la chiave esistente `cosmora-upload`; firma verificata dall'helper.
- Bundletool 1.18.1: validazione riuscita; manifest del pacchetto conferma `com.kreluna.cosmora`, versione 1.0.6, codice 45.
- Certificato Android SHA-256: `0cd0bba9991a9e9cc37cbe734854667609dcac3b2d6f90db6f5a85816554cc23`, uguale alla firma upload precedente.
- `pnpm run ios:sync`, `xcodebuild archive` ed export IPA riusciti. Export con `destination=export`, senza upload e senza rinumerazione automatica.
- `codesign --verify --deep --strict` sull'app archiviata riuscito.
- IPA: identità, versione e build lette direttamente dal suo `Info.plist`; deployment target iOS 16.4.
- Firma iOS team `KMQA59LC4T`, APNs `production`, `get-task-allow=false`; profilo `COSMORA Kreluna App Store`, UUID `a4b3dd0b-b43a-46bf-aa85-8835a0b6c37b`, scadenza 6 settembre 2027.
- Tutti i 166 asset web sincronizzati coincidono byte per byte con quelli contenuti in ciascun pacchetto.
- Scansione credenziali ripetuta direttamente negli ZIP finali: 88 file testuali IPA e 92 AAB, zero corrispondenze ai formati segreti controllati o JWT Supabase `service_role`.
- Configurazione Capacitor corretta per ogni piattaforma, senza URL remoto del contenitore web.
- Il manifest SHA-256 dei sorgenti al freeze non aveva differenze al completamento dell'archivio/export. I test della suite applicativa sono gestiti separatamente dal coordinatore; non sono prova di un invio agli store o di test su telefono fisico.
- Suite completa dopo aggiornamento dei test obsoleti: **303/303 passati**, nessun test saltato; TypeScript e lint dei componenti modificati superati. I test del layout usano fixture locali: le interazioni con account distinti vanno ancora collaudate sulle API distribuite.

Avvisi non bloccanti: chunk web grande, repository Gradle `flatDir`, warning Swift già nella dipendenza Capacitor Camera, estrazione AppIntents non richiesta. Nessuna modifica alle dipendenze introdotta per questi avvisi.

## Registri

Nella cartella artefatti sono conservati `source-manifest.json`, `android-build.log`, `android-signing.log`, `android-validation.log`, `android-manifest.xml`, `android-release.json`, `android-verification.json`, `android-certificate.txt`, `ios-sync.log`, `ios-archive.log`, `ios-export.log`, `ios-signature-verification.log` e `artifacts-verification.json`. Non contengono password o chiavi private.

## Passaggi storici, sostituiti dal recupero sopra

1. Recuperare l'accesso al Site `appgprj_6ac23124aa008191b49cfda336e9296b`, che serve `cosmora.kreluna.it`; non usare il vecchio Site diverso indicato dal manifest della copia mobile.
2. Coordinare migrazione e API delle interazioni, verificando utenti diversi, blocchi, moderazione e autorizzazioni.
3. Verificare che i sorgenti applicativi non siano cambiati dopo la costruzione. Se cambiano, rigenerare i pacchetti in una nuova cartella preservando questa evidenza.
4. Dopo il collaudo backend, ricontrollare la versione Apple 1.0.6 con build 46 già selezionata e la bozza Google 1.0.6 (45), quindi completare l’invio di entrambi gli aggiornamenti alla revisione, distinguendo preparazione, invio, revisione e pubblicazione.
