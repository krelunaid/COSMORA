# Inventario separato per il checkout di prova

Preparazione locale: `20261010120000_test_inventory_reservations.sql` e `lib/stripe/inventory.ts`. La migrazione non è stata applicata e nessun test è stato eseguito durante questa modifica.

## Isolamento e transazioni

La tabella `test_inventory_reservations` rappresenta una singola unità di prova per ogni annuncio. Stati: `reserved`, `consumed`, `released`. Un indice unico parziale impedisce che lo stesso annuncio abbia più ordini di prova riservati/consumati. Tutte le RPC bloccano prima l’ordine e poi la stessa chiave di inventario; consumo/rilascio e stato dell’ordine vengono salvati in una transazione.

Nessuna RPC modifica `listings`, disponibilità reale, carrello, spedizioni o ordini `is_test=false`. Anche un pagamento test riuscito lascia invariato l’annuncio reale. Il consumo resta nel registro di prova dopo un rimborso: non si rimette automaticamente in vendita un’unità. La cancellazione di un annuncio o dell’ordine elimina la relativa riga di prova, senza bloccare la cancellazione dei dati reali. La tabella è protetta da RLS senza policy client e le RPC sono eseguibili soltanto da `service_role`.

## API integrate lato server

`admin` è il client Supabase con ruolo di servizio già ottenuto dal server. Ogni funzione restituisce `{ managed, orderId, listingId?, state, sessionId?, expiresAt?, orderStatus, releaseReason? }`.

1. `reserveTestInventory(admin, orderId)` dopo aver salvato/trovato l’ordine e prima della chiamata Stripe. Crea una prenotazione persistente oppure restituisce quella esistente. Procedere alla creazione/restituzione della sessione soltanto con `state === 'reserved'` e ordine pendente. `UNAVAILABLE` significa articolo già impegnato da un altro ordine nel solo inventario di prova.
2. Creare/recuperare Checkout con l’idempotency key stabile dello stesso ordine. Non creare una nuova chiave se la prima richiesta Stripe ha un esito incerto.
3. `bindTestInventorySession(admin, orderId, { sessionId, expiresAt })`, dove `expiresAt` è `session.expires_at` in secondi Unix. Dopo aver verificato `livemode === false`, associa la sessione sia alla prenotazione sia all’ordine, in modo atomico. Non usare un salvataggio separato del solo `stripe_checkout_session_id`. Una sessione diversa per lo stesso ordine è rifiutata.
4. `finalizeTestInventory(admin, orderId, { outcome, sessionId, paymentIntentId, accountId, amountCents, currency })` soltanto dopo verifica Stripe e corrispondenza con l’ordine. `outcome`: `paid`, `expired`, `failed`, `cancelled`. Per i record gestiti aggiorna già lo stato ordine e il PaymentIntent: sostituisce l’update precedente di riconciliazione, non va chiamato dopo tale update.

Gli esiti duplicati non consumano due volte. Un evento scaduto/fallito tardivo non libera un articolo consumato. Un pagamento dopo rilascio genera `RELEASED_PAYMENT_CONFLICT`, da riconciliare esplicitamente; non sottrae l’articolo a una nuova prenotazione. I vecchi ordini privi di prenotazione restituiscono `managed:false` dopo le verifiche di identità della sessione e restano affidati al precedente percorso di riconciliazione solo test. Le nuove creazioni devono sempre passare dal punto 1, fallendo se la RPC non è disponibile.

## Scadenza e annullamento

`expiresAt` è un riferimento diagnostico, non un’autorizzazione a liberare inventario. Non rilasciare solo per orario trascorso: una sessione Stripe potrebbe essere ancora aperta o un webhook in ritardo.

- `paid`: verificare `payment_status === 'paid'` e un PaymentIntent corrispondente.
- `expired`: verificare lo stato `expired` della sessione Stripe o il suo evento firmato.
- `failed`: usare soltanto un esito definitivo `checkout.session.async_payment_failed` verificato.
- `cancelled`: prima recuperare/scadere la sessione tramite Stripe sul conto collegato e verificarla `expired` e non pagata; soltanto dopo rilasciare. Un ritorno a `cancel_url` non è una cancellazione affidabile.

Se la creazione della sessione ha esito incerto, mantenere la prenotazione e riprovare con la stessa idempotency key per recuperarla. Nessun rilascio automatico delle prenotazioni senza sessione è implementato: il recupero deve prima stabilire che non esista una sessione pagabile. Le chiavi idempotenti Stripe hanno durata limitata: `reserveTestInventory` rifiuta un ordine senza sessione associata creato oltre 23 ore prima (`RECOVERY_REQUIRED`), per impedirne la ricreazione alla cieca. Un’eventuale sessione esistente va recuperata e associata con `bindTestInventorySession`, oppure riconciliata esplicitamente, prima di riprendere.

## Errori e integrazione rimanente

`TestInventoryError.code`: `INVALID_ORDER`, `INVALID_LISTING`, `UNAVAILABLE`, `RESERVATION_REQUIRED`, `SESSION_MISMATCH`, `INVALID_TRANSITION`, `RELEASED_PAYMENT_CONFLICT`, `RECOVERY_REQUIRED`, `UNAVAILABLE_SERVICE`. Errori di migrazione, permessi o risposta inattesa fanno fallire l’operazione; non proseguire senza prenotazione.

Checkout, riconciliazione e webhook richiamano le RPC e il client presenta gli errori. Il ritorno a `cancel_url` non libera la prenotazione: il rilascio usa lo stato scaduto verificato sul provider. Non è preparato un comando separato di annullamento anticipato. Flag pagamenti disabilitato e tutti i controlli test-only restano attivi. Questo registro non costituisce un’implementazione dell’inventario live. Nessuna migrazione o verifica funzionale remota eseguita; consultare [stato complessivo](./readiness-20261010.md).
