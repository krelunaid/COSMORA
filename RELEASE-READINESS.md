# COSMORA — verifica del 5 settembre 2026

## Stato
Versione di test, non pronta per pagamenti reali o lancio commerciale.
Il contenitore iOS usa ancora l’interfaccia remota: questi interventi NON lo trasformano in un’app offline o in un’interfaccia Swift nativa.

## Interventi implementati
- Home e pagine interne usano la stessa navigazione: Home, Esplora, Crea, Messaggi, Profilo personale.
- Home con titolo e pulsante evento leggibili; categorie senza contatori inventati. Scorrimento consentito sui dispositivi piccoli per non tagliare contenuti.
- Testi e controlli ingranditi nelle sezioni modificate, zoom consentito, menu Crea in dialogo accessibile.
- Cache del service worker limitata alle risorse statiche immutabili; niente cache di pagine, API, navigazioni o dati personali.
- Marketplace con annunci reali, filtri ricerca/categoria/condizione/prezzo/vendita-noleggio, paginazione e dettagli.
- Profili pubblici e directory con dati reali, annuncio collegato al venditore effettivo.
- Community: feed persistente, caricamento di foto/video, collegamenti validati a eventi/prodotti/profili/crew, blocchi e segnalazioni.
- Post e annunci diventano pubblici soltanto dopo il completamento del caricamento immagini.
- Crew/incontri salvati sul database, iscrizioni e richieste approvate dall’organizzatore; limite posti protetto da transazione.
- Dati amministrativi venditore persistenti e privati, distinti dal profilo pubblico. Paese e forma attività Stripe derivano dai dati salvati, non da valori predefiniti.
- Mutazioni community/crew/segnalazioni riservate alle API autenticate per impedire l’aggiramento dei controlli applicativi.
- Le chiavi Stripe live restano bloccate.
- Carrello e preferiti persistenti, isolati per account; rimossi prodotti, totali e campi carta dimostrativi.
- Checkout Stripe Connect solo TEST, un articolo per ordine, prezzo deciso dal server, chiave di idempotenza e dettaglio ordine accessibile ai partecipanti.
- Webhook Connect di test configurato: firma, modalità, account, sessione, importo e valuta verificati prima di confermare il pagamento. Le ripetizioni non duplicano la conferma.
- Gli ordini TEST non riservano disponibilità, non segnano venduti gli annunci e non avviano spedizioni.
- Pubblicazione bloccata automaticamente se le variabili pubbliche o i file del client contengono credenziali private riconoscibili. Cache statica aggiornata.

## Verifiche
- TypeScript, lint e test di regressione layout/media.
- scripts/test-account-flows.mjs verifica account temporanei, recupero password senza invio email, messaggi e isolamento, blocco invio, ordini per partecipante, pubblicazione e modifica annunci, filtri, profili, dati venditore, post con media, segnalazioni, adesioni/approvazioni/capienza crew.
- Account e immagini temporanei rimossi dal test.
- Verifica browser mobile 390×844: navigazione interamente nel viewport, cambio Messaggi/Ordini e apertura delle sezioni.
- La verifica browser desktop/mobile non sostituisce la verifica su iPhone reale.

## Ancora necessari prima del lancio commerciale
- Apple e Google OAuth: credenziali/provider configurati e ritorno all’app testato; email di conferma/recupero effettivamente recapitate.
- Eliminazione account, preferenze privacy e flussi assistenza.
- Ordini completi: articolo/quantità, checkout di beni reali, spedizione/tracking, resi, rimborsi, contestazioni e responsabilità Connect.
- Checkout: test completo su Stripe con account venditore abilitato, carta di test, annullamento e ritorno all’app. Verificati per ora validazione API e webhook firmati sintetici, non una transazione end-to-end su Stripe.
- Rinnovo delle credenziali amministrative e verifica delle configurazioni prima della validazione finale di sicurezza.
- Chat: cronologia oltre 100 messaggi, allegati, stato lettura e notifiche push.
- Community: commenti/like reali, moderazione operativa e sottotitoli dei video. La verifica automatica del testo è soltanto un primo filtro.
- Crew: modifiche/annullamento, copertina personalizzata, notifiche ai partecipanti e calendario.
- Eventi: sostituire tutte le residue informazioni dimostrative, accordi con gli organizzatori per dati ufficiali, loghi, biglietti e mappe.
- Traduzione completa dell’interfaccia; le pagine modificate sono in italiano, non ancora localizzate in tutte le lingue.
- Privacy, condizioni di servizio, documenti societari e revisione legale specifica.
- Architettura mobile con interfaccia inclusa nella build, navigazione e cache dati dedicate; misure su dispositivi/reti reali.
- TestFlight richiede upload e successiva elaborazione Apple. Una compilazione locale non equivale a disponibilità per i tester.
