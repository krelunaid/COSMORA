# COSMORA — stato verificato, 4 settembre 2026

Non pronta per il lancio commerciale. Pagamenti reali bloccati nel codice.

## Implementato e verificato con account temporanei

- Profilo personale autenticato, lettura e salvataggio sul database.
- Messaggi persistenti tra partecipanti, isolamento da un terzo account.
- Invio con identificatore idempotente e limite applicativo di frequenza.
- Blocco reciproco dell'invio quando uno dei partecipanti blocca l'altro.
- Ordini letti dal database e filtrati per partecipante; stato vuoto senza esempi falsi.
- Pubblicazione annuncio con foto, recupero dal catalogo e dettaglio tramite slug.
- Il collegamento Profilo apre il proprio account, non Stardust Atelier.
- Gestione annunci personali: modifica titolo/descrizione/prezzi, sospensione e riattivazione, paginazione e conflitti tra sessioni. Pannello venditore senza ordini/incassi inventati.
- Recupero password e schermata accesso in italiano. Redirect di produzione configurati; prova del token e cambio password con account temporaneo. Consegna email e ritorno su iPhone ancora da verificare.
- Google e Apple predisposti ma disabilitati finché i provider Supabase non risultano attivi; non sono configurati.

Test ripetibile: scripts/test-account-flows.mjs, con TEST_APP_URL e variabili Supabase locali.
Il test crea account temporanei senza email e li elimina insieme ai dati di prova.

## Ancora da completare e verificare

- Chat: paginazione oltre 100 messaggi, allegati, segnalazioni e notifiche push.
- Account: verifica consegna email di recupero/conferma, eliminazione account, OAuth configurati e testati.
- Marketplace: catalogo dimostrativo ancora separato dagli annunci reali; filtri unificati, preferiti e carrello persistenti.
- Ordini: relazione articolo/quantità, stato spedizione, tracking, rimborso e contestazione; autorizzazioni e test end-to-end.
- Community e crew: collegamento completo delle schermate alle tabelle, adesioni, moderazione operativa e segnalazioni.
- Seller: distinguere persone fisiche, ditte individuali e società senza equiparare ogni negozio a una società.
- Pagamenti: decisione su Connect e responsabilità, poi configurazione e prove prima di abilitare chiavi live.
- Documenti privacy/condizioni, assistenza e requisiti App Store da completare con informazioni effettive dell'attività.
- Verifica su iPhone reale di foto, tastiera, navigazione, prestazioni, errori di rete e accessibilità.
- Il contenitore iOS carica tuttora l'interfaccia dal sito remoto: non è una migrazione a interfaccia offline/nativa.

## Avvisi database preesistenti

Gli advisor segnalano RLS senza policy su event_meetups, event_squads, moderation_actions, post_categories e privilegi pubblici sulla funzione rls_auto_enable. Non ampliare i permessi indiscriminatamente; verificare la funzione e l'accesso richiesto prima di modificarli.
