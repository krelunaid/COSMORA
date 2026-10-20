# COSMORA — onboarding Connect v2 preparato, 10 ottobre 2026

## Modello concreto e approvazione

Il codice prepara un **conto di prova v2 con direct charges, Dashboard completa, commissione COSMORA del 5% e costi Stripe separati al venditore**. I tre flag `paymentsEnabled`, `CONNECT_MODEL_APPROVED`, `CONNECT_ONBOARDING_ENABLED` restano `false`. Anche dopo una futura abilitazione di prova, il client rifiuterà ogni chiave live.

Il modello assume che il venditore privato/negozio indicato nell’annuncio venda direttamente all’acquirente. Il 5% è confermato; relazione commerciale, Dashboard completa e responsabilità devono essere approvate dal titolare prima dell’attivazione. Piattaforma scelta: Andrea Gadducci, `acct_1U6X5C3kNaGT9OXn` (identificazione riferita dal lavoro principale, senza chiamate operative durante questa modifica).

Configurazione preparata:

- `dashboard: full`;
- `configuration.merchant.capabilities.card_payments.requested: true`;
- `defaults.responsibilities.fees_collector: stripe` e `losses_collector: stripe`;
- `identity.country`, `identity.entity_type`, `contact_email` e nome pubblico ricavati dal profilo venditore;
- `include`: `configuration.merchant`, `identity`, `defaults`, `requirements`;
- application fee pari al solo 5% dell’articolo, spedizione esclusa. Il netto mostrato rimane prima dei costi Stripe del venditore.

Dati bancari, documenti, nominativi legali, attestazioni e accettazioni dei termini vengono raccolti da Stripe: il server non li inventa. Nel SDK 22.6 la capacità merchant `stripe_balance.payouts` è una proprietà restituita da leggere, non un parametro del create merchant. Il codice non richiede recipient/trasferimenti, appartenenti a un flusso fondi diverso.

## Alternativa marketplace valutata

La guida Connect propone normalmente destination charges per un marketplace intermediario. Qui il direct charge è preparato sulla base del venditore quale controparte del cliente: il venditore riceve il pagamento, COSMORA la sola application fee. Il nome “marketplace” non stabilisce da solo la relazione contrattuale.

Se COSMORA deve essere la controparte, rivalutare destination charges con configurazioni e responsabilità compatibili: costi e addebiti di rimborsi/contestazioni ricadono sulla piattaforma, e il 5% non coincide automaticamente con il margine netto. Non riutilizzare la combinazione `full + fees_collector: stripe` per quel flusso. Trattenere denaro fino alla consegna richiede invece un progetto separato di incassi e trasferimenti. Queste alternative non vengono abilitate dal codice.

La responsabilità Stripe per saldi negativi collegati non elimina gli obblighi operativi di COSMORA o la responsabilità per il proprio saldo. I conti legacy Express/application_express non vengono convertiti o sostituiti automaticamente.

## Codice preparato

`lib/stripe/server.ts` accetta soltanto `rk_test_`/`sk_test_`, riutilizza il client e invalida la cache se cambia la chiave. API fissata a `2026-08-26.dahlia`, coerente con SDK 22.6, timeout di 20 secondi e 2 retry. Le reference correnti mostrano anche `2026-09-30.endive`: aggiornare SDK/pin e compatibilità insieme senza cambiare i piani già inviati. Nessuna chiave o corpo degli eventi viene stampato.

`connect-onboarding.ts` accetta solo il medesimo singleton test e verifica il conto piattaforma tramite `accounts.retrieve(null)`. Nessun fallback a chiavi più potenti in caso di permessi RAK insufficienti.

La migrazione `20261010150000_test_connect_onboarding.sql` aggiunge un registro solo servizio, con un piano unico per utente. Un trigger protegge body, identità del piano, orario iniziale e conto già associato. Il registro contiene email/paese necessari al create, non chiavi API o URL monouso.

1. `cosmora_prepare_test_connect` blocca l’utente, rifiuta un conto esistente e congela il body. Aggiunge request UUID, user ID, piattaforma, modello e modalità test ai metadata. Cambiamenti successivi al profilo non cambiano una richiesta incerta.
2. `cosmora_start_test_connect` fissa il primo orario prima del POST. `stripe.v2.core.accounts.create` riusa body/API salvati e chiave `cosmora-test-connect-<request-id>`.
3. Il risultato deve essere test, merchant/full con responsabilità previste e corrispondere ai metadata e all’identità congelata.
4. `cosmora_bind_test_connect` associa conto e registro venditore atomicamente, con `account_type: v2_direct_full`. Non sovrascrive conti diversi o legacy neppure in concorrenza.
5. Dopo risposta persa, il retry cerca il request UUID via list v2. Il list non offre un filtro metadata: scansione completa fino a 1000 conti; troncamento o più risultati fanno fallire il recupero. Nessun conto della lista viene esposto al client.
6. Entro 23 ore, l’assenza può essere recuperata ripetendo lo stesso POST idempotente; oltre la finestra il piano diventa `manual_review` e non viene creato un altro conto. Un conto ritrovato può ancora essere verificato/associato. Non eliminare un piano incerto per creare un nuovo tentativo.

GET Connect può recuperare e associare localmente un conto già esistente, senza POST Stripe. Per il modello `v2_direct_full` usa esclusivamente l’account v2 letto con `include` e già verificato contro piattaforma, venditore e piano congelato. `assessTestV2ConnectAccount` / `assertTestV2ConnectPaymentReady` richiedono modalità test, conto non chiuso, configurazione merchant applicata, identità e requisiti presenti, Dashboard completa e responsabilità esplicite previste. Richiedono inoltre entrambe le capacità `merchant.capabilities.card_payments.status` e `merchant.capabilities.stripe_balance.payouts.status` uguali ad `active`.

`connected: true` nel ramo v2 significa associazione al venditore verificata; il risultato `paymentsReady` resta separato e falso finché modello/pagamenti non sono approvati e abilitati. I campi osservati provengono da v2; `fees_collector: stripe` viene rappresentato come `observed.feePayer: account`. Il server aggiorna le capacità osservate senza inventare un equivalente v2 di `details_submitted`. La lettura v1 resta diagnostica per i conti legacy e non può dichiararli pronti, neppure attivando in futuro il modello v2. Il ritorno dall’onboarding da solo non dimostra che pagamenti/payout siano attivi.

## Hosted Account Links e client

POST Connect crea un link v2 solo dopo il binding verificato: `account_onboarding`, `configurations: ['merchant']`, requisiti `eventually_due` e futuri inclusi. I ritorni usano esclusivamente `APP_URL` HTTPS esplicito. Il link deve essere test, dello stesso conto e sui domini Stripe previsti; non viene salvato o registrato nei log.

Un link scaduto può essere rigenerato senza creare un altro conto. Il refresh torna a `/seller/onboarding?stripe=refresh`, dove il client autenticato rifà POST dopo aver verificato il profilo salvato; `stripe=complete` legge GET e mostra le capacità attuali. L’autenticazione Supabase usa bearer: i redirect esterni non contengono token né generano link tramite GET anonimi.

Hosted onboarding viene aperto tramite `lib/stripe-browser.ts`: browser di sistema su native, navigazione normale sul web. Il client rilegge lo stato al ritorno, alla chiusura del browser e al ripristino del focus. Apertura, refresh e ritorno sono preparati nel sorgente e richiedono ancora verifica su dispositivi.

## Attivazione successiva

- Approvazione del titolare sul modello concreto; questa preparazione non abilita il live.
- Applicazione consapevole delle migrazioni e RAK test con permessi v2 Account create/list/read, Account Links create e lettura Account v1, oltre a quelli del flusso pagamenti. Una sandbox dedicata può avere un ID piattaforma diverso: verificare e aggiornare esplicitamente l’ID, senza aggirare il confronto.
- Accesso Accounts v2 della piattaforma e branding Connect richiesto per hosted onboarding. `accounts_v2_access_blocked` non deve attivare un ripiego legacy.
- Verifica dell'integrazione client e degli aggiornamenti dello stato account. I webhook pagamenti firmati restano obbligatori; eventuali eventi sottili v2 richiedono il proprio percorso/destinazione, non un cast a snapshot v1.
- Verifiche autorizzate sul percorso di prova e completamento dei blocchi operativi su inventario, rimborsi e contestazioni prima di attivare pagamenti reali.

## Fonti e verifica

Lette tramite Stripe CLI 1.53.1: [Accounts v2 e compatibilità v1](https://docs.stripe.com/connect/accounts-v2), [Create Account](https://docs.stripe.com/api/v2/core/accounts/create), [Create Account Link](https://docs.stripe.com/api/v2/core/account-links/create), [hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding), [responsabilità e Dashboard](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration), [fee payer](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior), [versioning](https://docs.stripe.com/api/versioning), [RAK](https://docs.stripe.com/keys).

Le reference `/references/connect.md`, `terminology-rules.md`, `compatibility-matrix.md`, `security.md` indicate dalle skill restituivano 404; sono state usate le pagine pubbliche ufficiali e i tipi SDK. La documentazione Account Link usa `account-links`, l’endpoint API `account_links`.

Solo implementazione e rilettura manuale locale: nessuna API operativa, credenziale letta, account/chiave creato, migrazione applicata, test, build o pubblicazione. Il funzionamento remoto non è stato verificato. Consultare [stato complessivo](./readiness-20261010.md) per salvataggio e confini della versione distribuita.
