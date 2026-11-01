# Community B — 29 ottobre 2026

Scelta approvata dall’utente: «mi piace la b», riferita a `/community-options/`.

## Implementazione

- La pagina Community usa una griglia a due colonne; ciascuna foto apre il post in un dialog con media sfogliabili, nome pubblico, data, testo e azioni.
- Mi piace e Salvati sono privati e legati all’account verificato. Il client attende l’esito API, gestisce errori e interrompe richieste obsolete; niente conteggi o nomi degli altri utenti.
- Ricerca e tag usano il testo effettivamente scritto dagli autori. Salvati filtra nel database prima della paginazione.
- Il menu del post mantiene segnalazione e blocco. I blocchi in entrambi i versi sono caricati con paginazione e applicati prima della firma dei media. Errori nella lettura impediscono di mostrare dati potenzialmente bloccati.
- Conservata la correzione dei link agli autori: profili non disponibili non diventano link non funzionanti; il proprio autore porta alla gestione dell’account. Non vengono pubblicati nomi privati provenienti dai dati di autenticazione.
- Chiusura con pulsante, Escape o Indietro Android; ritorno del focus al comando di apertura. UI tradotta nelle cinque lingue esistenti.
- Informativa aggiornata con descrizione delle scelte Mi piace/Salvati, visibilità privata e cancellazione. Nessuna nuova tecnologia pubblicitaria.
- Home, navigazione inferiore e altre proposte grafiche restano fuori da questa modifica.

## Verifiche

- 51 test mirati passati: API, isolamento tra account, idempotenza, blocchi oltre il limite di righe, errori, link autore, tag, localizzazione e route native.
- Harness locale con la vera pagina e i veri componenti, API/sessioni simulate: 16 verifiche WebKit e 16 Chromium passate. Griglia a 390/320 px senza overflow; apertura/chiusura/focus, Mi piace/Salva, ricaricamento, filtro Salvati, ricerca, errore 503, cambio account e accesso anonimo. Nessuna scrittura sui servizi reali.
- Typecheck, lint mirato e build mobile passati; controllo credenziali del bundle passato.
- Due verifiche preesistenti delle suite più ampie non passano: `mobile-layout.test.ts` si aspetta ancora l’immagine Figures SVG; `profile-safety-regressions.test.ts` si aspetta il layout senza `CommunityThanks`. Non causate da questa modifica. Lint di `mobile/main.tsx` segnala inoltre il link HTML di ErrorScreen già presente in HEAD.

## Anteprima e stato di rilascio

Anteprima locale: <http://127.0.0.1:8781/>. Harness e screenshot in `outputs/community-grid-20261029/`; banner DEMO e dati dimostrativi. La persistenza dimostrativa è separata dagli account reali.

**Nessun deploy, aggiornamento store o modifica del database di produzione in questo turno.**

Prima del rilascio coordinato occorre:

1. Applicare `supabase/migrations/20261029050427_community_post_interactions.sql`: tabelle private con FK verso account/post, cancellazione a cascata, RLS e assenza di accesso client diretto. Verificare sul database reale i permessi e il join PostgREST dei Salvati. La migrazione non è ancora stata applicata né provata sul database reale.
2. Pubblicare API GET e PUT e l’informativa insieme, dopo la migrazione. Il GET autenticato richiede le nuove tabelle: non pubblicare prima lo strato API.
3. Verificare due account autorizzati, salvataggio/rimozione, isolamento, blocchi e riapertura su servizio reale; poi distribuire il client aggiornato secondo il flusso di rilascio approvato.

Questa cartella contiene anche correzioni pregresse della sessione e del profilo: la loro presenza nella build non prova alcuna nuova pubblicazione.
