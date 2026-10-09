# COSMORA — commissione sulle vendite del 9 ottobre 2026

Il titolare ha confermato una commissione COSMORA del **5% sul prezzo dell’articolo**. La spedizione è esclusa dalla base. I costi del pagamento sono previsti separatamente a carico del venditore: la loro configurazione Stripe deve ancora essere completata. Noleggi e lavori personalizzati mantengono le regole precedenti; questa modifica riguarda soltanto le vendite.

## Preparazione nel codice

- `lib/monetization.ts`: vendita a 500 punti base, arrotondamento al centesimo; policy `2026-10-09-sale-5pct`.
- I nuovi ordini memorizzano la policy insieme a percentuale e importo della commissione. I tentativi ripetuti usano l’ordine già salvato, senza ricalcolare la vecchia commissione. La policy salvata viene copiata nei metadati di Checkout e PaymentIntent.
- `sellerAmountBeforeProcessingFeesCents` esplicita il significato del ricavo dopo la sola fee COSMORA. `sellerNetCents` resta un alias per compatibilità; `seller_net_cents` nel database continua a comprendere l’eventuale spedizione. Nessuno di questi importi è il netto definitivo dopo i costi Stripe.
- Il messaggio di onboarding di prova è aggiornato nelle cinque lingue. Nessuna schermata corrente mostra un netto Stripe definitivo.
- La migrazione `20261009190000_sale_fee_five_percent.sql` chiude la regola vendita precedente e aggiunge la nuova, in una transazione. Una seconda applicazione non cambia nulla e non riattiva la policy se una successiva l’ha già sostituita. Non aggiorna ordini storici né percentuali di noleggi/lavori.

Esempio: articolo 100 €, spedizione 10 € → totale acquirente 110 €, commissione COSMORA 5 €, ricavo venditore 105 € **prima dei costi del pagamento**. I 5 € sono ricavo lordo di COSMORA; trattamento fiscale e costo effettivo Stripe non sono calcolati da questo esempio.

## Prima dei pagamenti reali

1. Configurare e verificare chi sostiene i costi Stripe e la responsabilità dei saldi negativi. L’attuale onboarding legacy Express e i direct charges non vengono modificati da questa preparazione; non attestano già il modello commerciale approvato.
2. Completare condizioni venditore, trasparenza di commissioni/costi, trattamento fiscale, ricavo definitivo e regole di accredito. La tabella delle regole deve essere aggiornata con la migrazione quando si distribuisce il codice: il calcolo runtime usa ancora le costanti del sorgente.
3. Implementare prenotazione e aggiornamento dell’inventario per evitare più pagamenti sullo stesso articolo. Il flusso di prova attuale non riserva merce.
4. Completare gestione delle contestazioni Stripe, rimborsi reali e parziali/residui, consegna e riconciliazione dei costi effettivi. Il pulsante di rimborso attuale resta integrale e solo di prova, con restituzione della fee COSMORA.
5. Eseguire le verifiche dei flussi in ambiente Stripe di prova prima di qualsiasi attivazione commerciale, quando richieste/autorizzate.

**Stato di questa preparazione:** pagamenti e noleggi restano disabilitati; il client Stripe continua a rifiutare chiavi live; tutti i controlli test-only sono conservati. Nessuna migrazione remota applicata, nessun conto modificato, nessuna transazione, build, pubblicazione o test eseguito durante questa modifica.

La policy del 5% è successiva alla compilazione della 1.0.2 (40) inviata ad Apple e non è inclusa in quell'archivio. Il backend di produzione non è stato distribuito con questa policy.

## Fonti tecniche consultate

- [Stripe: tipi di addebito e commissioni](https://docs.stripe.com/connect/charges).
- [Stripe: chi sostiene i costi negli addebiti diretti](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior).
- [Stripe: rimborsi e contestazioni negli addebiti diretti](https://docs.stripe.com/connect/saas/tasks/refunds-disputes).
