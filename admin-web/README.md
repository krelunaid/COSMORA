# COSMORA — console amministrativa e moderazione

Interfaccia web separata dall’app, servita sotto `/cosmora/admin/`. Non importa layout, service worker, routing o componenti dell’app principale. Nessun account viene creato e nessun ruolo viene assegnato da questa interfaccia.

## Avvio e build

Dalla radice del progetto:

```sh
pnpm exec vite --config admin-web/vite.config.ts --port 4330 --strictPort
pnpm exec vite build --config admin-web/vite.config.ts
pnpm exec vite preview --config admin-web/vite.config.ts --port 4330 --strictPort
```

Aprire `/cosmora/admin/` sull’origine mostrata dal comando. Output della build: `dist/admin-web`. La cartella di output deve essere servita sotto `/cosmora/admin/`; la pubblicazione non viene effettuata da questi comandi.

La build legge esclusivamente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` per la configurazione client, dall’ambiente Vite del progetto. Non inserire una chiave service-role o altri segreti in queste variabili. Il bundle contiene soltanto la configurazione pubblica di autenticazione.

## Accesso e dati

- Login email/password attraverso Supabase. Nessuna registrazione, modifica ruoli o esportazione.
- La panoramica degli iscritti resta in sola lettura. La sezione `#moderation` usa separatamente `community-moderation`: solo operatori con ruolo server `cosmora_role=moderator` o `admin` possono decidere sui contenuti. Il solo accesso al dashboard non basta.
- Approva propone una motivazione precompilata; Rifiuta richiede una scelta tra motivi espliciti (testo obbligatorio solo per Altro). La conferma invia lo stato atteso del contenuto: il server applica decisione e registro atomicamente tramite la RPC esistente.
- Tutti i media devono essere disponibili e caricati prima di approvare; foto e video provengono da URL firmati temporanei. I post reali non vanno approvati durante il collaudo della grafica.
- Sessione isolata dall’app con `sessionStorage` e chiave `cosmora-admin-auth`.
- Richieste di autenticazione limitate a 12 secondi; attesa iniziale/login limitata a 13 secondi. Nessuna chiamata asincrona al client auth nei callback di `onAuthStateChange`.
- I dati provengono da `GET https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/community-admin`, con token Bearer e parametri `q` e `page` (pagina iniziale 1).
- Il backend deve verificare l’autorizzazione amministrativa e restituire `401` / `403` quando necessario. L’interfaccia mostra dati soltanto dopo una risposta valida del backend.
- Logout e cambio account eliminano immediatamente i dati privati dalla memoria della UI. Le risposte fuori ordine o annullate vengono ignorate. Le risposte dei dati non sono memorizzate nel browser.
- Le date sono visualizzate in `Europe/Rome`; la data di aggiornamento è quella restituita dal server.
- L’ultimo accesso autenticato non misura tutte le aperture dell’app. I dispositivi push non sono download. I download si consultano nei portali ufficiali Apple e Google collegati dalla console.

Nessun dato di esempio, utente dimostrativo, credenziale o elenco di amministratori è incluso nel codice di produzione.

## Verifiche locali

```sh
pnpm exec tsc --noEmit --allowImportingTsExtensions --target es2022 --module esnext --moduleResolution bundler --jsx react-jsx --lib es2022,dom,dom.iterable --skipLibCheck --strict admin-web/env.d.ts admin-web/main.tsx admin-web/App.tsx admin-web/api.ts admin-web/vite.config.ts
pnpm exec oxlint admin-web
pnpm exec vite build --config admin-web/vite.config.ts
node scripts/check-client-secrets.mjs dist/admin-web
```

Il collaudo con un amministratore reale richiede che la funzione `community-admin` sia pubblicata e che l’account sia autorizzato sul server. La compilazione locale non dimostra questi requisiti.
