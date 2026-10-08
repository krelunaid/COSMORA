# COSMORA — preparazione App Store

## Versione iOS 1.0 (38) — 8 ottobre 2026

La build 38 è stata caricata in App Store Connect, resa disponibile al gruppo
interno TestFlight e inviata alla verifica Apple l'8 ottobre 2026 alle 10:10
(Europe/Rome). Lo stato osservato dopo l'invio è **In attesa di verifica**.
Il rilascio è configurato come automatico dopo l'approvazione. Questo stato non
attesta l'approvazione o la disponibilità pubblica nell'App Store.

La versione comprende:

- riconoscimento del proprio profilo pubblico e collegamento alla gestione;
- pulsanti di segnalazione e blocco più evidenti sui contenuti degli altri utenti;
- conferma persistente dopo il blocco, anche quando il contenuto scompare;
- collegamento diretto agli utenti bloccati, con sblocco ripetibile;
- notifiche di blocco nella coda di moderazione;
- interfaccia mobile inclusa nel pacchetto nativo, autenticazione e API native.

## Verifiche eseguite prima dell'invio

- Suite mirata: 49 test superati; ripetizione del sottoinsieme interessato dopo
  l'ultima correzione: 41 test superati.
- TypeScript e firma del pacchetto iOS verificati.
- Segnalazione, blocco, rimozione dal feed, notifica alla moderazione e sblocco
  provati tramite anteprima browser e backend reale, con account temporanei
  ordinari successivamente rimossi.
- Layout browser verificati a dimensioni iPhone e iPad.
- 273 input invariati durante la compilazione e 123 risorse del pacchetto
  confrontate con il bundle mobile generato.

Queste prove non costituiscono nuove registrazioni o test su iPhone/iPad fisici.
I filmati fisici già inviati ad Apple mantengono i loro numeri di build originali;
le note per il revisore ne indicano provenienza e passaggi. Le credenziali del
revisore e i dettagli operativi sono gestiti fuori dal repository pubblico.

## Compilazione nativa

Installare le dipendenze con `pnpm install --frozen-lockfile`, configurare le
variabili pubbliche/server necessarie partendo da `.env.example` e usare:

```sh
pnpm run ios:sync
pnpm run ios:open
```

La release 38 è stata archiviata con l'override Xcode
`CURRENT_PROJECT_VERSION=38` e `MARKETING_VERSION=1.0`. Il file di progetto
conserva il valore storico 33: per nuove release usare un numero di build non
ancora caricato, senza confondere il valore di default con la build pubblicata.
Certificati, profili di provisioning e chiavi restano fuori da Git.

Per Android usare `pnpm run android:sync` e `pnpm run android:open`.
La presenza del progetto Android non attesta una pubblicazione su Google Play.

## Riferimenti tecnici

- [Identità native](docs/NATIVE-IDENTITY.md)
- [Trasporto API nativo](docs/NATIVE-API-TRANSPORT.md)
- [Attivazione della moderazione](docs/MODERATION-ACTIVATION.md)
- [Provenienza degli asset editoriali](docs/EDITORIAL-ASSET-PROVENANCE.md)

Le modifiche iOS della build 38 non attestano un aggiornamento del sito web:
la pubblicazione del backend/sito e quella dei pacchetti mobili sono operazioni
separate.
