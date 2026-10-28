# COSMORA — registro operativo privacy verificato il 28 ottobre 2026

## Ambito e limiti

Questo registro distingue fatti verificati, limiti dell'evidenza e azioni ancora da adottare. Non è una certificazione GDPR, una DPIA completata o un'attestazione di conformità contrattuale. Non sono stati letti record personali, credenziali o contenuti degli utenti; non sono stati modificati database, impostazioni dei fornitori, account o store. Il controllo ha riguardato sorgenti, configurazioni non segrete, schema del database, documentazione e pacchetti locali.

Le righe dei sorgenti si riferiscono allo stato esaminato prima delle correzioni privacy di questa giornata. Le proposte sotto non diventano procedure adottate soltanto perché descritte qui.

## Pacchetti nativi verificati

Sono i pacchetti finali identificati in `docs/NATIVE-PUSH-1.0.5.md`, non una nuova attestazione della versione pubblicamente distribuita.

| Pacchetto | Identità e prova |
| --- | --- |
| `outputs/native-push/ipa-final/App.ipa` | iOS 1.0.5 (45), `it.kreluna.cosmora`; SHA-256 `f5723584e9e9f6d2b78e4fd63c3d675a17bf4392c7bebe7ad55b0478c5c40bac` |
| `outputs/native-push/COSMORA-1.0.5-44-signed.aab` | Android 1.0.5 (44), `com.kreluna.cosmora`; SHA-256 `e458e79ac5a353c623e7a448427479c6943c95c354a16c0797d5d63cfd7a62bd` |

Il manifest Android è stato estratto con bundletool: permessi Internet, rete, posizione approssimativa/esatta, notifiche, wake lock e ricezione FCM; assenti `READ_CONTACTS`, `WRITE_CONTACTS`, `ACCESS_BACKGROUND_LOCATION` e Advertising ID. `firebase_messaging_auto_init_enabled` e `firebase_analytics_collection_enabled` sono `false`; `allowBackup=false` riguarda il backup Android, non i backup dei fornitori server. Il plist iOS dichiara posizione durante l'uso, fotocamera, libreria foto/aggiunta foto e microfono per video; manca `NSContactsUsageDescription`.

Gli asset JavaScript di entrambi i pacchetti contengono `tile.openstreetmap.org` e `watchPosition`, non i marker controllati relativi alla rubrica. Questo corrobora l'audit sorgenti; non equivale a una prova dinamica di ogni richiesta o a un'analisi completa di tutti i binari.

## Registro dei flussi

| Flusso | Comportamento verificato | Conservazione effettiva / limite |
| --- | --- | --- |
| Account e autenticazione | Supabase Auth, email, ID, profilo e provider OAuth. I nomi/profili e i contenuti approvati possono essere visibili anche a visitatori. | Nessuna scadenza automatica degli account inattivi individuata. Eliminazione esplicita tramite endpoint autenticato. |
| Chat e community | Messaggi, post, foto/video, annunci, crew, incontri, blocchi e segnalazioni. Le chat sono controllate tramite autorizzazioni dei partecipanti; non è provata crittografia end-to-end. | Cascate di cancellazione rimuovono profilo, contenuti, messaggi e relazioni. Le copie già scaricate da altri utenti non sono revocabili. |
| File pubblicati | File scelti dall'utente inviati al backend e a Supabase Storage. In Community il client converte soprattutto HEIC; JPEG/PNG/video possono rimanere originali. La UI annunci invece ricodifica tutte le foto in JPEG (`app/sell/page.tsx:622–632`). | `lib/community-media-client.ts:114`, `app/api/community/posts/route.ts:329`, `app/api/listings/route.ts:278`: le API caricano i byte ricevuti; non è garantita in tutti i percorsi la rimozione di EXIF, coordinate o altri metadati incorporati. Non promettere che tutti i file siano privi di posizione. |
| Mappa/GPS | Mappa attivata dall'utente; tile OpenStreetMap. GPS facoltativo, in memoria, senza scrittura delle coordinate nel database individuata. Si ferma quando la pagina è nascosta. | `components/event-live-map.tsx:25`, `:34`, `:53`, `:59`, `:65`. I tile richiesti comunicano IP e area visualizzata a OSMF/CDN; l'area può corrispondere alla posizione GPS. Distinguere questo flusso dai metadati delle foto. |
| Ricerca | Testo `q` inviato alle API di post, annunci e profili; altre ricerche sono locali. | `app/community/page.tsx:129`; nessuna tabella applicativa della cronologia individuata. Parametri URL possono essere presenti nei log del percorso di hosting. Non attestata l'assenza assoluta di cronologia. |
| Push | Registrazione facoltativa per account autenticato: ID installazione, hash del segreto, token, piattaforma, lingua, consenso e ultimo aggiornamento. APNs su iOS, FCM su Android. | La disattivazione rimuove il record server; offline si ritenta. Revoca nelle impostazioni OS rilevata alla riapertura. Invii escludono dispositivi inattivi da oltre 90 giorni, ma questo filtro **non cancella** i record. |
| Ricevute push | Campagna/installazione, stato, ID risposta fornitore e aggiornamento, per deduplicazione e riscontro tecnico. | `push_deliveries` è cancellata in cascata quando scompare l'installazione. Nessuna scadenza autonoma individuata. |
| Console amministrativa | Email, nome, paese, registrazione/ultima autenticazione, stato account e conteggi. Non espone password, token push o chat. | Accesso verificato sul server mediante `app_metadata`, non profilo modificabile dall'utente. Risposte `no-store`; sessione console in `sessionStorage`. Accessi recenti non equivalgono a ogni apertura o DAU. |
| Pagamenti | `lib/release-features.ts:3`: pagamenti e noleggi disabilitati in questo codice. Stripe presente per implementazione/storico di test. | L'esistenza di dati reali attuali non è stata verificata. Qualunque ordine `is_test=false` blocca l'eliminazione automatica e rinvia all'assistenza. Non affermare assenza di acquisti soltanto da un vecchio test. |
| Assistenza | Indirizzo pubblico `info@kreluna.it`; comunicazioni possono essere trattate tramite la posta del titolare. | Nessun periodo operativo verificato per email, allegati, esportazioni o archivi locali. |

Riferimenti push: `lib/native-push.ts:81–104`, `supabase/functions/push-devices/index.ts:16–31`, `supabase/migrations/20261026200316_native_push_notifications.sql:2–27`, `scripts/send-community-thanks.mjs:28`. Il plugin Android `PushNotificationsPlugin.java:128` disabilita auto-init e chiama `FirebaseMessaging.deleteToken()`, non `FirebaseInstallations.delete()`: la revoca del token non prova la cancellazione immediata di ogni identificativo Google.

Riferimenti console: `admin-web/api.ts:26`, `supabase/functions/community-admin/handler.ts:54–62`, `supabase/migrations/20261027150204_community_admin_dashboard.sql:25–93`, `docs/ADMIN-DASHBOARD.md:31–44`.

La UI usa scontorno locale (`app/sell/page.tsx:693`). Nel codice inizialmente esaminato esisteva anche la vecchia route `app/api/images/remove-background/route.ts`, che avrebbe inoltrato a remove.bg se configurata: nessun chiamante UI individuato, stato della chiave non letto. Non considerarla una trasmissione effettivamente avvenuta. La correzione sorgente di fine audit, descritta sotto, la rende inattiva; il comportamento live resta da verificare dopo pubblicazione.

## Infrastruttura e conservazione: evidenza live

Supabase MCP ha confermato progetto COSMORA `pwdpwgonvnuwmgfiidut`, regione **eu-central-1**, stato operativo, organizzazione Kreluna su piano **Free**. La [pagina prezzi ufficiale](https://supabase.com/pricing) indica per Free un giorno di visibilità/conservazione dei log API/database e un'ora per Auth Audit Logs; i backup automatici del piano non sono inclusi. La [documentazione backup](https://supabase.com/docs/guides/platform/backups) raccomanda esportazioni proprie per Free e chiarisce che i backup database non includono i file Storage.

Questi limiti non attestano il periodo di ogni copia tecnica del fornitore o di esportazioni del titolare. Non è stata verificata una procedura di backup/restore propria; non dichiarare sette giorni di backup, caratteristica del piano Pro.

Query di sola configurazione/schema: `log_statement=ddl`, `log_min_duration_statement=-1`, logging connessioni/disconnessioni disattivato; nessuna estensione `pg_cron`/`pg_net`. Esiste `auth.audit_log_entries`, senza FK di cancellazione verso l'utente. I [log Auth](https://supabase.com/docs/guides/auth/audit-logs) possono essere salvati anche in tale tabella: la sola presenza della tabella non prova che la scrittura sia attiva, né la durata effettiva. Nessuna routine di purge individuata nel codice; non esclusi processi interni del servizio o esterni non esaminati.

Console e pagina privacy aziendale sono ospitate su Cloudflare Pages secondo evidenza di deployment in `docs/ADMIN-DASHBOARD.md:58` e `docs/NATIVE-PUSH-1.0.5.md`. L'app web principale appartiene a un Site separato (stesso documento, sezione Privacy pubblica). Non verificati piano, esportazioni dei log, regione, retention e termini specifici del servizio Sites; non confondere hosting console, hosting app e database.

## Fornitori, contratti e trasferimenti da registrare

| Fornitore / ruolo tecnico | Evidenza contrattuale pubblica | Verifica operativa ancora necessaria |
| --- | --- | --- |
| Supabase, Auth/DB/Storage/Edge Functions | [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), versione 1 del 1 agosto 2026: incorporato nei termini, Supabase come processor; SCC applicabili, importatore Supabase Pte Ltd/Singapore. Regione primaria non esclude ogni trattamento altrove. [Subprocessor list](https://supabase.com/legal/customer-resources/subprocessor-list). | Registrare account/accordo applicabile e data, subfornitori rilevanti, accessi e paesi ulteriori, gestione richieste e backup. Nessuna ricevuta contrattuale specifica esaminata. La finestra di restituzione dati dopo cessazione contratto non è la retention ordinaria degli utenti. |
| Cloudflare, sito/console e rete | [DPA v6.4](https://www.cloudflare.com/cloudflare-customer-dpa/), 3 aprile 2026, parte degli accordi anche self-service: SCC per trasferimenti ristretti, DPF quando applicabile. | Identificare account/piano e servizi attivi, log e destinatari effettivi. Il testo pubblico non prova da solo tutte le condizioni dell'account. |
| Google Firebase, push Android | [Privacy e sicurezza](https://firebase.google.com/support/privacy): termini di trattamento inclusi, FCM globale, FID per recapito. Dichiara rimozione live/backup entro 180 giorni dopo richiesta API di eliminazione FID. | Non applicare automaticamente tale termine al solo `deleteToken()`. Verificare controlli progetto, termini applicabili, minimizzazione e procedure di cancellazione FID prima di una promessa più ampia. |
| Apple, APNs e accesso Apple; Google, OAuth | Servizi presenti nel codice e nei pacchetti. | Conservare termini dei servizi developer/OAuth effettivamente accettati; ruoli, paesi, categorie e tempi applicabili. Non inventare DPA o retention APNs. |
| OpenStreetMap Foundation, tile/CDN | [Privacy OSMF](https://osmfoundation.org/wiki/Privacy_Policy): IP/device/referrer/orario e richieste servizio; tile distribuiti su cache globali. | Trattare come servizio terzo attivato dall'utente. Il termine di 180 giorni riferito a Piwik non è una prova del termine di tutti i log tile. Nessun accordo processor specifico verificato. |
| Sites, hosting app; Aruba, posta; Stripe, test/storico | Identificati dal progetto/informativa e dal flusso tecnico. | Raccogliere i contratti e le configurazioni dei singoli account, confermare eventuali accessi o trasferimenti. Non etichettare tutti come responsabili con DPA firmato senza tale verifica. |

La selezione di una regione UE è una misura utile, non una prova che tutti i fornitori e le attività di supporto restino nel SEE. Occorre valutare il meccanismo realmente applicabile a ogni trasferimento e l'eventuale valutazione del trasferimento/misure supplementari, non inserire una garanzia generica.

## Minori e valutazione d'impatto

**Decisione esistente, non nuova:** `docs/google-play/CONSOLE-2026-10-09.md:52,61` registra scelta esplicita del titolare di pubblico **13+**, fasce 13–15, 16–17, 18+. Non equivale a verifica tecnica dell'età, autorizzazione genitoriale o base giuridica per tutti i trattamenti. Il codice esaminato non implementa un flusso completo di age assurance/consenso genitoriale. Non introdurre tacitamente una diversa soglia 16/18 anni nei testi.

Il [Garante sui minori](https://www.garanteprivacy.it/temi/minori) distingue la soglia italiana di 14 anni per consenso ai servizi della società dell'informazione dalle altre basi giuridiche e dalla capacità contrattuale; le soglie variano nei paesi serviti. Serve una decisione documentata sulle funzioni offerte ai tredicenni, dati necessari, basi giuridiche e coinvolgimento dei genitori, coerente con gli store. Il referente/processo di sicurezza dei minori è già adottato in `docs/google-play/child-safety-operator-draft.md:19–23`; non è una certificazione NCMEC.

**Da valutare, non già svolto:** screening DPIA considerando minori, comunicazioni private, pubblicazione di immagini/video e metadati, rapporti tra utenti, moderazione e ubicazione. Il semplice nome “social” o l'uso del GPS non determina da solo l'esito. Registrare scala, necessità, proporzionalità, rischi e controlli; svolgere DPIA se ricorrono i presupposti di rischio elevato. [Riferimento ufficiale DPIA](https://www.garanteprivacy.it/valutazione-d-impatto-della-protezione-dei-dati-dpia-).

## Cancellazione ed eccezioni da rendere operative

`app/api/account/delete/route.ts:13–15` ferma la procedura per ordini reali; `:46–81` elimina cartelle personali, ordini test, sessioni e account. Errori parziali richiedono retry/assistenza. Le segnalazioni presentate da un utente sono in cascata sul suo account (`supabase/migrations/20260902_community_squads.sql:115`); i riferimenti a messaggi segnalati diventano null quando sparisce il messaggio (`20261003190000_moderation_queue.sql:7`). Non individuato un blocco tecnico generale di legal hold.

Il processo minori adottato prevede di preservare quanto dovuto per legge anche in caso di richiesta di cancellazione. Prima di promettere tale preservazione automatica, definire come l'operatore separa e protegge le sole prove necessarie, chi può accedervi e quando terminarne la conservazione. Non bloccare indiscriminatamente tutte le cancellazioni né conservare tutto “per sicurezza”.

## Procedure consigliate, non implementate da questo audit

1. **Registro diritti:** usare `info@kreluna.it` e percorso in app; registrare data, richiesta, verifica proporzionata dell'identità, sistemi coinvolti, risposta e chiusura. Evitare documenti identificativi se sufficienti mezzi meno invasivi. Preparare export minimizzato senza dati di altri utenti, rettifica, opposizione e cancellazione. Il termine ordinario di riscontro è un mese, con eventuale estensione motivata nei casi previsti: [Garante, diritti](https://www.garanteprivacy.it/Regolamentoue/diritti-degli-interessati). Non è stato realizzato un nuovo sistema di ticket/export automatico.
2. **Retention schedule:** il titolare deve fissare criteri verificabili per assistenza, segnalazioni, provvedimenti, account inattivi, token/ricevute, log, backup ed esportazioni, nominando responsabile e processo di revisione. Solo dopo adottare purge testato, eccezioni motivate e prova dell'esecuzione. Nessuna scadenza nuova o schedulazione è stata creata qui.
3. **Incident response:** definire referente e sostituto, canali fornitori, triage, contenimento e conservazione minima delle prove; documentare ogni violazione e valutare rischio/notifica/comunicazione agli interessati. Il [Garante data breach](https://www.garanteprivacy.it/data-breach) indica notifica senza ritardo e ove possibile entro 72 ore dalla conoscenza, salvo improbabilità di rischio; rischio elevato può richiedere comunicazione agli interessati. Non è stata dichiarata una violazione reale o effettuata una notifica.
4. **Accessi e fornitori:** riesaminare periodicamente grant amministrativi, MFA dell'infrastruttura, account dismessi, esportazioni, contratti e subfornitori. La console utenti non espone l'audit di accesso degli operatori e il piano Free non include i Platform Audit Logs del piano Team.
5. **Evidenza di pubblicazione:** rileggere ciascun URL privacy/termini/cookie dopo deployment e distinguere app web, console, store e app installata. Una modifica al sito non aggiorna automaticamente le copie nei pacchetti nativi.

## Questioni non risolvibili con la sola riscrittura

- Target 13+ e gestione concreta dei trattamenti dei minori nei paesi serviti.
- Durate/criteri di conservazione, backup propri e legal hold realmente adottati.
- Rimozione o disclosure corretta dei metadati dei file; nessuna promessa di sanitizzazione video senza implementazione e prove.
- Termini/account dei fornitori, configurazione Sites e visibilità dei log/esportazioni.
- Allineamento delle dichiarazioni store alla build distribuita: rubrica non corroborata, ricerca inviata ma archivio storico non provato, posizione trattata dalla mappa e potenzialmente nei file caricati.

Queste questioni restano aperte finché una decisione o una modifica verificata non viene registrata. L'esistenza di questa lista non autorizza ad affermare che siano tutte già risolte.

## Correzioni foto e servizio esterno: pronte nel sorgente, non pubblicate

Il registro precedente descrive il comportamento riscontrato prima degli interventi. Le modifiche seguenti sono state autorizzate e preparate il 28 ottobre 2026. **Non sono state caricate nel backend pubblico né nei pacchetti distribuiti:** il percorso di gestione del Site non è attualmente utilizzabile. Un'informativa pubblicata separatamente non rende operative queste correzioni.

- `app/api/images/remove-background/route.ts`: endpoint ritirato con **410**, `Cache-Control: no-store`, prima di lettura del corpo, accesso a configurazioni o chiamate esterne. Nessuna chiave è stata letta, modificata o revocata. Lo scontorno locale della UI resta distinto.
- `lib/photo-privacy.ts`: pulizia dei contenitori **JPEG, PNG e WebP** sul server. Le API community e annunci preparano tutto il gruppo prima delle scritture; un errore di formato/metadati ferma la richiesta con 400 senza caricare gli originali. Si eliminano EXIF salvo il solo orientamento, XMP, IPTC, commenti e miniature incorporate; si preservano byte delle immagini compresse, profili colore ICC e informazioni necessarie a colori/trasparenza/animazione. La ricostruzione del solo orientamento evita rotazioni indesiderate senza ricompressione.
- Limiti di lavoro: massimo **4096 segmenti/chunk complessivi per richiesta**, condivisi fra foto e sottochunk WebP e contati anche quando i blocchi vengono scartati. Massimo **32 MiB di foto da sanificare per gruppo**, verificato prima di `arrayBuffer()` e copie; gli altri limiti per singolo file restano. Il rate-limit community viene letto prima della pulizia, senza anticipare scritture. Questi controlli limitano le allocazioni aggiunte dalla sanificazione; non sostituiscono il limite del corpo multipart dell’hosting, da verificare nel runtime reale.
- Controlli specifici: lunghezze/limiti dei segmenti, scansioni JPEG progressive e metadati dopo le scansioni, checksum dei chunk PNG, RIFF WebP e sottochunk dei frame. Un JPEG/PNG/WebP identificabile dall'intestazione non può aggirare la pulizia dichiarandosi video o HEIC. Non è una validazione completa del bitstream di ciascun codec né un antivirus.
- `app/api/community/posts/route.ts` e `app/api/listings/route.ts` inviano a Storage i file risultanti, non i file originali. Il nome del file fotografico viene normalizzato; gli identificativi dei percorsi continuano a essere generati sul server.

**Limiti espliciti:** HEIC/HEIF e video mantengono il comportamento precedente e possono contenere metadati. Non è stata effettuata una pulizia dei file storici. I profili ICC sono conservati per fedeltà cromatica e possono contenere descrizioni del profilo; non si garantisce l'assenza di qualunque dato nascosto o steganografico. Le informazioni visibili nella foto rimangono. La conservazione dell'orientamento è verificata per EXIF; non viene ricostruito l'orientamento da formati proprietari non supportati. Le prove non sostituiscono un collaudo nel runtime distribuito e su dispositivi reali; verificare anche memoria/tempo con il massimo gruppo di file permesso dal servizio di hosting prima del rilascio.

**Scelta tecnica:** routine limitata ai contenitori, compatibile con il runtime Workers, senza nuovi codec nativi o invio a servizi esterni. Una libreria EXIF JPEG soltanto non copre PNG/WebP o XMP/IPTC; una ricodifica può cambiare qualità/colore/animazione. La routine è coperta da fixture reali sintetiche e controlli indipendenti; non viene presentata come libreria terza certificata. Riferimenti dei formati: [W3C PNG, terza edizione](https://www.w3.org/TR/png-3/), [WebP RIFF](https://developers.google.com/speed/webp/docs/riff_container).

**Prove ripetibili, nessun dato utente:**

1. `node --experimental-strip-types --test tests/photo-privacy.test.ts`: **27 test passati**, con ogni troncamento dei quattro file, dati aggiunti, CRC errato, EXIF non valido, mantenimento di ICC/scansioni/frame, idempotenza, tentativo di aggiramento MIME, API prive di scritture sugli errori e contenuto effettivamente passato a Storage. Prove avversarie aggiungono 100.000 segmenti/chunk vuoti, anche annidati nei frame WebP; verificano il budget condiviso tra file e il rifiuto del gruppo troppo grande prima delle copie. È verificato anche il mantenimento intenzionale del testo nel profilo ICC e che il rate-limit preceda la pulizia. La route ritirata funziona senza fornire `Request`, `process` o `fetch` al contesto di test.
2. `python3 tests/verify-photo-fixtures.py`, Node nel PATH e Pillow 11.3.0: decoder indipendente conferma su JPEG progressivo, PNG, WebP e WebP animato che pixel di ogni frame, orientamento effettivo e ICC restano identici; l'EXIF residuo contiene soltanto il tag orientamento. Non dimostra ogni combinazione di codec/decoder.
3. Lint dei cinque file TypeScript modificati/aggiunti e `tsc --noEmit` dell’intero progetto passati dopo l’integrazione delle correzioni concorrenti. Questi controlli non attestano pubblicazione o verifica end-to-end sul servizio reale.

Per concludere la correzione occorre recuperare il percorso di deployment del backend, eseguire il collaudo dei limiti in quel runtime, pubblicare, controllare le due API e il 410 sul dominio reale, poi aggiornare l'evidenza qui. L'informativa può già indicare i rischi dei file ancora non trattati, senza promettere che tutti i contenuti caricati siano stati ripuliti.
