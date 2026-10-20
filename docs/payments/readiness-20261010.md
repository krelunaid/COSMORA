# COSMORA — avanzamento pagamenti, 10 ottobre 2026

## Decisioni e controllo del conto

Il titolare ha confermato il 5% e il conto Stripe **Andrea Gadducci**. La lettura del conto tramite il connettore Stripe ha restituito `charges_enabled=true`, `payouts_enabled=true`, nessun requisito attualmente dovuto e nessun conto venditore collegato nella lista completa. Questi valori non attestano una configurazione Connect di COSMORA pronta.

Il profilo commerciale attuale descrive software e servizi digitali. La futura operatività di marketplace tra venditori e acquirenti deve essere dichiarata e configurata con Stripe. Nessun dato del conto, chiave, banca, contratto o pagamento è stato modificato. Non sono riportati qui dati personali o bancari restituiti dal provider.

## Implementazione preparata nel sorgente

- Commissione 5% sul solo articolo, spedizione esclusa; ogni ordine conserva la propria policy storica.
- Riepilogo venditore con articolo, spedizione, commissione e importo prima dei costi del pagamento. Nessuna stima viene presentata come costo Stripe effettivo o accredito definitivo.
- Prenotazione atomica di un singolo articolo nell’inventario **di prova**. Prezzo e consegna vengono ricontrollati al primo blocco; i retry mantengono lo snapshot dell’ordine. Il magazzino reale non viene modificato.
- Stessa chiave checkout conservata per utente/articolo; binding immutabile della sessione e recupero via webhook di una creazione Stripe già avvenuta. Le sessioni incerte non vengono ricreate dopo la finestra sicura.
- Rimborsi parziali e del residuo con richiesta persistente, un solo tentativo non terminale per ordine e restituzione proporzionale della commissione storica. Un risultato `pending` non viene mostrato come rimborso eseguito.
- Registro dei webhook processati, lettura dello stato attuale Stripe e importi rimborsati confermati che non regrediscono con eventi tardivi.
- Contestazioni di prova registrate senza accettarle o inviare prove a nome del venditore. Una contestazione persa blocca le azioni; tracking e stato rimangono consultabili.
- Azioni di consegna serializzate con contestazioni e richieste di rimborso, con verifica di ruolo e versione.
- Onboarding Connect v2 e link ospitato preparati dietro blocchi espliciti: piano immutabile, recupero conto, nessuna creazione duplicata dopo un esito incerto. Nessun conto venditore è stato creato.
- Browser di sistema per i moduli Stripe su iOS/Android; il ritorno dall’onboarding richiede una nuova lettura dello stato, non equivale a verifica completata.
- Messaggi dei flussi preparati in italiano, inglese, francese, tedesco e spagnolo.

## Confini e lavoro rimanente

Il codice mantiene `paymentsEnabled=false`, `CONNECT_MODEL_APPROVED=false`, `CONNECT_ONBOARDING_ENABLED=false`. Il client accetta soltanto chiavi di prova, incluse chiavi a permessi limitati. Il solo cambio del flag generale non abilita nuovi conti o incassi.

La proposta implementata per la prova usa venditore come controparte, Dashboard Stripe completa, addebiti diretti e responsabilità di Stripe per costi/saldi negativi del conto collegato. Questa scelta non è ancora approvata. Se COSMORA deve gestire direttamente l’incasso o trattenere fondi fino alla consegna, occorre implementare il diverso movimento dei fondi e relativa responsabilità della piattaforma. Consultare [configurazione Connect](./connect-readiness.md).

Prima di attivare anche il percorso di prova servono: scelta del modello commerciale, piattaforma/sandbox identificata, credenziale di prova e segreto webhook configurati, applicazione delle migrazioni allo stesso backend e verifiche autorizzate del flusso completo. Le migrazioni sono versionate in ordine: fee5%, refund requests, inventory, payment reconciliation, order actions, Connect onboarding.

Prima dei pagamenti reali rimangono inoltre magazzino reale, condizioni venditore e costi effettivi, trattamento fiscale, accrediti, assistenza rimborsi/contestazioni, verifica provider e nuova distribuzione. La preparazione test non costituisce implementazione commerciale live.

Sono state eseguite letture dei sorgenti, dei tipi SDK e della documentazione, con correzioni dopo una rilettura indipendente. **Nessun test funzionale, build o pagamento di prova eseguito in questo intervento. Nessuna migrazione remota o pubblicazione eseguita.**

Apple 1.0.2 (40), inviata il 9 ottobre alle 23:37, è precedente a queste modifiche: il pacchetto in revisione non le include. Anche il backend pubblico non è stato aggiornato con questo lavoro.

## Fonti

- [Stripe: tipi di addebito](https://docs.stripe.com/connect/charges).
- [Stripe: addebiti diretti e rimborsi delle commissioni](https://docs.stripe.com/connect/direct-charges?platform=web&ui=stripe-hosted).
- [Stripe: gestione dei webhook](https://docs.stripe.com/webhooks).
- [Stripe: account Connect v2](https://docs.stripe.com/connect/accounts-v2).

I documenti dei singoli moduli descrivono contratti e requisiti del codice. La disponibilità effettiva va verificata sul provider e sul backend distribuito.
