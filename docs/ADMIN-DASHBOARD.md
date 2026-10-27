# COSMORA: pannello privato della community

Il pannello web è disponibile a `https://software.kreluna.it/cosmora/admin/`.
Sorgenti frontend: `admin-web/`; non fa parte del pacchetto nativo.
Hosting: repository `krelunaid/kreluna-software`, ramo `sito-attuale`,
cartella `source/cosmora/admin/` con il bundle generato da questo progetto.

## Dati e autorizzazione

- Progetto Supabase: `pwdpwgonvnuwmgfiidut`, condiviso con l'app COSMORA.
- Edge Function `community-admin`, JWT verification attiva; ripete `getUser`
  sul server per non fidarsi di grant obsoleti nel token.
- Permesso dedicato: `app_metadata.cosmora_dashboard_access` booleano `true`.
  Anche il ruolo server `cosmora_role=admin` è ammesso. Il semplice ruolo
  moderator, il profilo e i metadata modificabili dall'utente non concedono accesso.
- La console non permette registrazioni, assegnazione ruoli o modifiche ai dati.
- Il permesso va assegnato soltanto a un indirizzo confermato dal proprietario,
  tramite Auth Admin API, preservando gli altri app_metadata. Non concederlo via
  codice frontend, trigger su email arbitrarie o metadata pubblici.
- Invito iniziale all'indirizzo scelto dal proprietario inviato il 27 ottobre 2026.
  La prima password viene impostata dall'utente sulla pagina esistente
  `https://cosmora.kreluna.it/auth/recovery`; il redirect è stato verificato.
- Gli account anonimi, eliminati, in eliminazione e sospesi non possono usare la console.

RPC `public.cosmora_admin_dashboard(text,integer)` in sola lettura, SECURITY
DEFINER con search_path vuoto e privilegio EXECUTE limitato a service_role.
Migrazione applicata: `20261027150204_community_admin_dashboard.sql`.
Nome originariamente generato tramite CLI migration new; versione locale
riallineata al timestamp registrato dal servizio dopo apply_migration.

La proiezione restituisce email, nome, paese, date di registrazione/ultima
autenticazione e stato account; non espone token push, password, chat private o
metadata completi. Risposte no-store e CORS limitato al sito operativo e
`http://127.0.0.1:4330` per i controlli locali.

## Significato dei numeri

- Iscritti: account non anonimi e non eliminati, inclusi account tecnici,
  di revisione, non confermati e sospesi. Non sono tutti clienti acquisiti.
- Nuovi iscritti: finestre di 7/30 giorni di calendario Europe/Rome, oggi incluso.
- Accessi: account con autenticazione recente, non ogni apertura dell'app né DAU.
- Post, annunci, squad e incontri: record presenti, tutti gli stati inclusi.
- Push: registrazioni dei dispositivi; non prova di consegna o di permesso ancora attivo.
- Download: non disponibili nel database; collegamenti ai portali ufficiali.

## Controlli effettuati il 27 ottobre 2026

- 9 test del gestore: autenticazione, metadata falsificati, revoca/sospensione,
  errori, CORS, metodi e validazione dei parametri.
- 7 test SQL su PostgreSQL isolato/PGlite: proiezione, grant, ricerca letterale,
  ordinamento/paginazione e finestre di calendario.
- TypeScript completo del progetto, lint frontend e build dedicata passati.
- API pubblicata: 401 senza JWT valido, 403 account normale anche con falsi
  metadata admin, RPC negata a authenticated, 200 solo con grant sul server.
- Test reali di ricerca, preflight, no-store e rifiuto di origini/metodi non ammessi.
- Browser: accesso, dashboard con dati reali, ricerca, uscita e assenza di dati dopo logout.
- Account QA effimero usato soltanto per collaudo, poi rimosso dopo la verifica online.
- Pannello pubblicato su Cloudflare Pages, deployment
  `cb2d7f23-8811-4e6f-b8c8-357de364fcad`: HTTP 200, CSP e no-store verificati,
  accesso autorizzato e logout verificati anche sul dominio definitivo.
- Password dell'account proprietario impostata su richiesta esplicita tramite
  Auth Admin API; il servizio non ha confermato automaticamente l'indirizzo.
  L'utente deve aprire l'invito ricevuto per confermare l'email. Le credenziali
  sono conservate solo in un file locale privato, esterno al repository.

Advisory Supabase: nessun nuovo rilievo legato al pannello. Restano preesistenti
tabelle RLS senza policy (accesso diretto negato intenzionalmente) e la protezione
delle password compromesse disattivata. Riferimento:
[password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Nuove pubblicazioni

Seguire `admin-web/README.md`, generare il bundle, confrontare e sostituire solo
`source/cosmora/admin/` nel repository del sito. Seguire lì AGENTS.md per build,
salvataggio e pubblicazione. Non inviare le chiavi server o i test come file statici.
Per aggiornare Edge Function caricare index.ts e handler.ts con verify_jwt=true.
Nuove migrazioni DDL devono restare service-only e non allargare RLS agli utenti.
