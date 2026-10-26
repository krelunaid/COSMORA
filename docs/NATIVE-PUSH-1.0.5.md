# COSMORA 1.0.5 — notifiche native facoltative

Verifica finale: 26 ottobre 2026, Europe/Rome. Questo documento aggiorna `COMMUNITY-THANKS-1.0.5.md`: il solo messaggio interno è ora accompagnato dall'infrastruttura push. Restano inclusi la correzione della sessione e i testi approvati del ringraziamento.

## Stato degli store

- **iOS 1.0.5 (45)**: consegnata da Transporter alle 22:02, elaborata da App Store Connect, selezionata e inviata alle 22:36. La pagina della pratica mostra **In attesa di verifica**. App `6809232374`, build `5e609732-8966-4363-92eb-b88b7f5c10bc`, invio `431e677c-febb-4d34-95f3-9a7cdaee29df`. Il precedente invio della build44 è stato ritirato per sostituirlo con45.
- **Android 1.0.5 (44)**: AAB caricato ed elaborato; release di produzione5, nome `1.0.5 (44) — Notifiche della community`, implementazione100% nei paesi già abilitati. Tre modifiche inviate: release, sicurezza dei dati, URL privacy. Google mostra **Modifiche in fase di revisione**, con controlli rapidi iniziali ancora in corso al momento dell'invio. App Console `4974190705613393494`, sviluppatore `8769136787246988849`.
- Pubblicazione automatica dopo approvazione preservata. **Non è stata verificata l'approvazione o disponibilità pubblica dei nuovi pacchetti.**

## Comportamento e consenso

- Notifiche disattivate per impostazione iniziale. L'utente autenticato sceglie `Profilo > Notifiche COSMORA > Attiva le notifiche` e accetta il permesso del sistema. Non viene mostrato un prompt automatico.
- L'opt-in non condiziona le altre funzionalità. Disattivazione, uscita e cambio account revocano la registrazione dell'installazione. Gli errori di rete hanno timeout e non bloccano navigazione/sessione; la revoca pendente viene ritentata al ritorno online.
- Italiano, inglese, tedesco, francese e spagnolo. La notifica del ringraziamento apre esclusivamente `/thanks`; la pagina completa è accessibile anche dal Profilo.
- Firebase auto-init è disabilitato finché l'utente non sceglie di registrarsi. Nessun Advertising ID o pubblicità di terzi introdotti.
- I vecchi utenti devono aggiornare e attivare le notifiche. Ultima anteprima del mittente: **0 dispositivi idonei, 0 iOS, 0 Android**. **Nessun invio reale o broadcast eseguito.**

## Infrastruttura e chiavi

- Abilitato Push Notifications per il solo identificativo Apple `it.kreluna.cosmora`; profilo App Store rigenerato con entitlement `aps-environment=production`, team `KMQA59LC4T`.
- Dopo autorizzazione esplicita, revocata esclusivamente la nuova chiave inutilizzabile `F7GH4L4A25`. Sostituzione `V47Q8L43MT`, **Production / Topic Specific / it.kreluna.cosmora**. PEM valido di257byte, cartella700 e file600. Le chiavi di altre app non sono state modificate.
- Configurazione privata in `~/.config/kreluna/cosmora-push/`; nessuna chiave privata è inclusa in repository, report pubblici o app. Firebase usa il client Android COSMORA del progetto `kreluna` e la credenziale server già autorizzata, senza modifiche IAM.
- Supabase `pwdpwgonvnuwmgfiidut`: applicata solo la migrazione `20261026200316_native_push_notifications.sql`. Tabelle private `push_devices` e `push_deliveries`, RLS, nessun accesso diretto anon/authenticated, dati collegati all'account e cancellazione in cascata.
- Funzione distribuita `push-devices` v1, ID `404d75fd-da4a-4bc3-aad5-2d85ba8d3a91`. Registrazione con verifica dell'utente, identificativo e segreto dell'installazione; revoca verificata tramite segreto anche dopo logout. Token e segreti non compaiono nei log di prova.
- `scripts/send-community-thanks.mjs` usa anteprima come modalità predefinita, scarta dispositivi senza consenso/inattivi da90giorni, deduplica per campagna e installazione, non ritenta automaticamente esiti di consegna incerti. L'invio reale richiede `--send --confirm-community-thanks-v1`. Non è stato creato uno scheduler.

## Privacy pubblica

Dichiarazione Apple aggiornata con ID dispositivo collegato all'utente, funzionalità app, senza tracking. In Google gli ID dispositivo erano già dichiarati: aggiunta la finalità Comunicazioni dello sviluppatore, conservando l'uso facoltativo.

L'informativa inclusa nell'app contiene la nuova sezione sulle notifiche. La stessa informativa completa è pubblicata e verificata, senza login, in cinque lingue:

https://software.kreluna.it/cosmora/privacy/

Entrambi gli store ora usano questo URL. Il dominio `cosmora.kreluna.it` appartiene al Site `appgprj_6ac23124aa008191b49cfda336e9296b`, che il connettore attuale non può gestire; il vecchio `.openai/hosting.json` identifica invece un Site differente. Nessun deployment è stato eseguito sul Site sbagliato. La vecchia pagina web resta precedente; l'informativa negli store e nel nuovo pacchetto è aggiornata.

Pubblicazione della sola nuova pagina e traduzioni sul sito aziendale tramite il progetto operativo Kreluna Software: commit sorgenti `7bf79689`, commit riferimenti `2fe77ef2`, deployment Cloudflare `e7568f52-bbad-4747-ae85-4d0824bfc7c4`. Le variazioni alle pagine esistenti sono esclusivamente la versione della cache generata dalla build. Backend Montecarlo, DNS e sito principale non modificati.

## Verifiche

- TypeScript e compilazioni finali passati.35 test unitari/integrati passati: ciclo consenso, cambio account, scadenze e isolamento sessioni, timeout/revoca e regressioni della correzione Auth.
- Dieci scenari browser per motore Chromium/WebKit passati in cinque lingue, compresi schermo320px, chiusura/riapertura, guest, fallimento lettura/salvataggio. Pagina completa `/thanks` aperta e verificata separatamente.
- Integrazione backend con utente temporaneo rimosso al termine: richiesta anonima respinta401, registrazione200, conflitto con segreto errato409, token non leggibili dal client, revoca corretta e nessun residuo di prova.
- Provider verificati con identificativi artificiali: Google validate-only `INVALID_ARGUMENT` e Apple `BadDeviceToken`, senza errori di autenticazione. **Non sono prove di ricezione su un dispositivo reale.**
- Firma iOS: produzione APNs, corretto team/bundle, debug disattivato. Android firmato con chiave upload esistente. Nessuna regressione nella compatibilità dispositivi segnalata da Google.
- Google mostra due avvisi non bloccanti su deoffuscamento/simboli nativi; l'avviso DEX preesistente ha scadenza febbraio2027. Non risolti in questa modifica.
- Rimane da verificare il primo opt-in e la ricezione su un telefono con il nuovo aggiornamento. Finché non ci sono installazioni registrate non è possibile recapitarvi il ringraziamento push.

## Pacchetti ed evidenze locali

- iOS: `outputs/native-push/ipa-final/App.ipa`, SHA256 `f5723584e9e9f6d2b78e4fd63c3d675a17bf4392c7bebe7ad55b0478c5c40bac`.
- Android: `outputs/native-push/COSMORA-1.0.5-44-signed.aab`, SHA256 `e458e79ac5a353c623e7a448427479c6943c95c354a16c0797d5d63cfd7a62bd`.
- Prove: `outputs/native-push/apple-45-submitted.png`, `google-44-submitted.png`, `transporter-45-delivered.png`, `backend-verification.json`, `provider-check.json`, `tests.log`, `thanks-page.png`.
- Non usare i pacchetti preliminari della stessa cartella privi del suffisso final, né i precedenti pacchetti iOS44/Android43 per il push.
