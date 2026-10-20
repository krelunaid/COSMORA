# Correzioni Cosmora — 27 settembre 2026

## Comportamento aggiornato

- La home sceglie un evento in corso oppure il prossimo in ordine cronologico. La data finale resta inclusa; il cambio avviene alla mezzanotte di Europe/Rome e al ritorno nell'app. Catalogo esaurito: stato vuoto con accesso al calendario.
- Il calendario e le scoperte usano la data corrente; rimossa la data fissa del 2 settembre. Le date originali dei 28 eventi sono conservate.
- Categorie più esplicite: Action figure, Carte collezionabili, Videogiochi, Persone e venditori. I codici dei filtri e gli URL precedenti restano compatibili.
- Interfaccia in italiano, inglese, francese, tedesco e spagnolo. Prima apertura: prima lingua supportata tra quelle del dispositivo; scelta manuale salvata con priorità, anche se lo storage non è disponibile. Il selettore è visibile nel Profilo anche senza login.
- Tradotti navigazione, home, eventi, mappe, accesso, profili, community, crew, messaggi, annunci, preferiti, carrello, checkout di prova, assistenza e privacy. Testi utente e nomi ufficiali degli eventi non vengono tradotti. I testi italiani della privacy sono preservati; le traduzioni non sono una revisione legale.
- Migliorati caricamenti annullati, paginazione duplicata, rimozione preferiti, errori di pubblicazione, ricerca crew, iscrizioni a crew piene/concluse e messaggi di errore pagamento/rimborso.
- Rimossa la falsa conferma di invio della schermata commissioni, priva di API. Ora indirizza ai profili reali. La pagina noleggi descrive correttamente la funzione non attiva.
- iOS: dichiarate cinque lingue e localizzati i permessi; sistemato un avviso Swift e sincronizzate le risorse native.

## Verifiche effettuate

- `pnpm typecheck`: superato.
- `pnpm lint`: superato; controlli aggiuntivi sui componenti modificati superati.
- `pnpm test`: 55 test superati, inclusi cambi di giorno/ora legale, scelta lingua e istruzioni checkout.
- `pnpm build`: superato, incluse le verifiche su variabili pubbliche e credenziali nel client.
- Compilazione Xcode per simulatore iOS: superata, senza firma né caricamento su Apple.
- Browser: cambio italiano/francese/spagnolo, home e categorie, calendario con otto eventi futuri/in corso, marketplace e profilo.
- `git diff --check`: superato.

## Limiti di questa consegna

Le correzioni sono disponibili nell'anteprima locale http://localhost:4317. La configurazione locale non contiene le credenziali Supabase/Stripe: accesso, dati privati e transazioni non sono stati provati contro la produzione. Il checkout resta esclusivamente TEST; noleggi e incassi reali non sono stati attivati.

La pubblicazione sul collegamento esistente è bloccata: il connettore Sites attualmente collegato non trova `appgprj_6a97f24742b88191826232d66f1aa235` e Cosmora non compare fra i progetti posseduti o condivisi. Occorre il collegamento all'account che gestisce `cosmora-app.andreagadducci.chatgpt.site`. Il contenitore iOS continua a puntare a tale URL. Nessuna release App Store/TestFlight è stata caricata.

Un controllo esteso anche alla libreria UI non modificata segnala errori preesistenti di lint in alcuni componenti generici; questi non rientrano nel comando lint del progetto. Non sono stati modificati i flussi backend, eseguite operazioni reali o completata una revisione di sicurezza/legale dell'intero servizio.

## Aggiornamento: pagine dedicate alle passioni

- Entrando in Cosplay, Manga e fumetti, Action figure, Carte collezionabili o Videogiochi si vedono titolo, immagine, ricerca e suggerimenti pertinenti alla categoria scelta. I pulsanti delle altre categorie restano nella vista generale, raggiungibile da “Tutte le categorie”.
- Le ricerche suggerite cercano parole nel titolo degli annunci della categoria selezionata. Non rappresentano disponibilità di prodotti o filtri su attributi strutturati. Cambiando categoria si azzerano ricerca e filtri locali.
- Persone e venditori apre una pagina dedicata alla ricerca dei profili. Tutti i nuovi testi sono disponibili nelle cinque lingue supportate.
- Controlli completati: typecheck, lint, build e 59 test superati. Nell'anteprima sono stati controllati suggerimenti, ritorno alle categorie, pagina Carte e pagina Persone e venditori. I dati del catalogo restano indisponibili nell'ambiente locale senza configurazione Supabase.
