# Marketplace — stato verificato 6 settembre 2026

## Confine della versione

Solo modalità Stripe TEST. `getStripe()` rifiuta chiavi live; gli ordini di prova
non riservano merce e non comportano spedizioni. Non esiste una garanzia acquisti
COSMORA, un servizio escrow o una copertura assicurativa. Non presentarli come attivi.

## Implementato e verificato

- Checkout autenticato, prezzo dal database, rifiuto di acquisti propri e richieste con importi client.
- Idempotenza per tentativo, verifica conto venditore con documentazione completata,
  addebiti e accrediti abilitati.
- Accesso agli ordini limitato a compratore/venditore.
- Webhook firmati: controllo account, valuta, importo e sessione; replay non riapre un ordine pagato.
- Riconciliazione rimborsi parziali/totali; notifiche in ritardo non annullano un rimborso totale.
- Stati leggibili condivisi fra elenco e dettaglio, assistenza con oggetto COSMORA e ID ordine.
- Errori temporanei di Stripe Connect e controlli delle risposte database.

21 test unitari, typecheck, lint e build superati. Nel test integrato sono passati
isolamento carrello/preferiti, controllo checkout, webhook e rimborsi simulati.
Il primo giro si è interrotto per EHOSTUNREACH verso Supabase. Ripetuto con
risoluzione IPv4 prioritaria, il test integrato completo è passato (community,
chat, blocchi, profili, annunci e recupero password inclusi); account temporanei rimossi.
Nessun addebito/rimborso reale. I webhook sono simulati e firmati, non un acquisto
completo attraverso l'interfaccia Stripe.

## Prima di vendite reali

1. Decidere il modello commerciale e responsabilità di Kreluna e venditori:
   commissione, costi Stripe, resi, spedizione, contestazioni, saldo negativo.
   Le percentuali già nel codice sono parametri di prova, non una policy approvata.
2. Completare flusso rimborsi operativo (richiesta, autorizzazione, esecuzione Stripe,
   restituzione commissione), dispute, notifiche e gestione assistenza.
3. Gestire disponibilità atomica, consegna/tracciamento, annullamento e ritiro annunci.
4. Verificare venditori, termini e obblighi consumer/privacy con consulente competente.
5. Prova Stripe completa su account collegato TEST, inclusi successo, rifiuto,
   interruzione, rimborso e doppio clic; poi prova su iPhone.
6. Dopo deploy approvato, aggiungere al webhook Stripe esistente
   `checkout.session.async_payment_failed` e `charge.refunded`, mantenendo gli eventi già presenti.
   La sottoscrizione remota NON è stata ancora modificata: il sito pubblicato non contiene ancora questi handler.
7. Solo dopo verifica della configurazione commerciale separata, preparare abilitazione live.

Queste modifiche non costituiscono pubblicazione web né caricamento TestFlight.
