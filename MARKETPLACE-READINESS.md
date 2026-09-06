# Marketplace — stato verificato 6 settembre 2026

## Confine della versione

## Decisioni confermate dal titolare — 6 settembre 2026

- COSMORA mette in contatto utenti: gli articoli sono venduti dai venditori, non da Kreluna.
- Il venditore sceglie e dichiara modalità, costo e tempi di spedizione nell'annuncio;
  l'acquirente deve vedere il totale prima di pagare. COSMORA non spedisce gli articoli.
- Acquirente e venditore gestiscono inizialmente resi e problemi nella conversazione
  collegata all'ordine. Il venditore può accettare il reso e autorizzare il rimborso.
- L'app deve registrare richiesta, risposte e stato della pratica e offrire un percorso
  di segnalazione all'assistenza quando le parti non trovano un accordo.
- Non sono ancora stabiliti commissione COSMORA, termini dei resi, costi del reso,
  tempi di risposta o responsabilità sulle contestazioni: non inventarli né considerarli approvati.
- Queste sono decisioni di prodotto, non condizioni legali definitive né attestazione
  che i relativi flussi siano già implementati o pubblicati.

## Modalità corrente

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

### Condizioni di spedizione implementate

- Creazione e modifica annuncio: il venditore sceglie spedizione/ritiro, modalità,
  costo e testo sui tempi/destinazioni. Ritiro a mano gratuito; nessuna tariffa/tempo
  imposti da COSMORA. Gli annunci precedenti restano senza condizioni, senza inventare valori.
- Catalogo e dettaglio mostrano condizioni e totale articolo più consegna.
- Checkout TEST bloccato se mancano condizioni; snapshot delle condizioni nell'ordine,
  importo Stripe comprensivo della consegna e commissione di prova calcolata solo sull'articolo.
- 26 test unitari, typecheck, lint, build e suite account integrata superati;
  persistenza e lettura pubblica delle condizioni confermate con annuncio temporaneo.
- Rimangono da implementare indirizzo di consegna, disponibilità atomica e pratica
  di reso concordata fra le parti. Non attivare live per la sola presenza dei nuovi campi.

### Avanzamento successivo, 6 settembre

- Aggiunti inserimento corriere/tracking del venditore, conferma ricezione dell'acquirente
  e segnalazione persistente di un problema, con controllo versione contro modifiche concorrenti.
- Aggiunto comando venditore di rimborso completo TEST con conferma esplicita,
  verifica PaymentIntent e chiave idempotente per ordine. L'esecuzione Stripe completa
  non è ancora stata provata con un addebito test reale: verificati autorizzazioni
  dell'endpoint e webhook firmati simulati, non dichiarare il rimborso end-to-end validato.
- Migrazioni applicate al database; rimossi anche privilegi TRUNCATE/TRIGGER/REFERENCES
  dei ruoli client sugli ordini. Solo SELECT autenticato con policy partecipanti.
- 24 test unitari e suite account integrata passati, incluse spedizione, ricezione,
  segnalazione, conflitto versione, divieto di rimborso da acquirente/estraneo.
- Advisor sicurezza: nessun nuovo avviso sulla tabella ordini. Rimane l'avviso
  preesistente sulla protezione password compromesse disabilitata:
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Il tracking è dichiarato dal venditore, non verificato dal corriere. Mancano ancora
  indirizzo/costi di spedizione, disponibilità atomica, gestione resi/contestazioni,
  notifiche operative e validazione Stripe completa prima dell'abilitazione live.

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
