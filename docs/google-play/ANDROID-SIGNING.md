# Firma dei pacchetti Android COSMORA

L'helper `scripts/sign-android-release.mjs` firma un AAB già compilato usando la chiave di upload esistente. Non crea chiavi, non compila l'app e non carica nulla su Google Play.

## Prerequisiti

- Node.js e un JDK con `jarsigner` disponibile nel `PATH` o in `$JAVA_HOME/bin`.
- Credenziali già presenti in `~/.config/kreluna/cosmora/android-upload/credentials.json`. Lo script usa i nomi dei campi effettivamente presenti nel file locale, senza copiarne i valori nel repository.
- Il keystore indicato nel JSON deve trovarsi nella stessa cartella privata. L'alias atteso è `cosmora-upload`.
- Cartella privata accessibile solo al proprietario (700), credenziali e keystore accessibili solo al proprietario (600). Lo script rifiuta collegamenti simbolici e non cambia questi permessi.

Non salvare il JSON, le password o il keystore nel repository, negli output pubblici o nella scheda dello store. Conservare separatamente un backup protetto della chiave già creata.

## Utilizzo

Eseguire dalla cartella principale del progetto, sostituendo i percorsi con quelli del nuovo AAB da pubblicare:

```sh
node scripts/sign-android-release.mjs \
  --input "/percorso/COSMORA-DA-FIRMARE.aab" \
  --output "/percorso/COSMORA-FIRMATO.aab" \
  --metadata "/percorso/COSMORA-FIRMATO.json"
```

`--metadata` è facoltativo. Per scegliere un JDK specifico aggiungere `--jarsigner "/percorso/jdk/bin/jarsigner"`. Le cartelle di destinazione devono già esistere. `--help` mostra i parametri disponibili senza leggere credenziali.

## Comportamento

- Rifiuta argomenti sconosciuti o duplicati, input assente, alias diverso e output già esistenti. Mantiene intatto il file AAB di input.
- Passa le password al solo processo `jarsigner`, tramite variabili d'ambiente e opzioni `-storepass:env` / `-keypass:env`. Le password non compaiono nella riga di comando o nei messaggi dello script.
- Firma in una cartella temporanea privata e verifica la firma con `jarsigner`. Il controllo conferma la firma del pacchetto; l'accettazione su Play Console rimane un passaggio distinto.
- Pubblica il risultato soltanto dopo la verifica, con una creazione atomica che fallisce se il nome di destinazione è già occupato. Rimuove i file temporanei alla fine.
- I metadati facoltativi contengono soltanto nomi dei file, alias pubblico, data, dimensione e impronte SHA-256. Se il salvataggio dei metadati fallisce dopo la firma, lo script segnala che l'AAB è già stato salvato: non sovrascriverlo per riprovare.

L'helper è stato preparato senza eseguirlo: nessun AAB è stato firmato durante questa modifica e nessun test è stato eseguito.
