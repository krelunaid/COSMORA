# COSMORA 1.0.8 — nome pubblico venditore

Il venditore professionale può modificare il nome pubblico nel modulo venditore. Il nome è condiviso con il profilo COSMORA e la community; il nome legale resta distinto. Il controllo di unicità rifiuta nomi già occupati. Il salvataggio esplicito usa un flag: i client precedenti non rinominano accidentalmente il profilo.

Lato server è online la funzione Edge aggiornata nel solo file seller-profile.ts. La funzione SQL `cosmora_save_shop_public_name` è stata applicata tramite SQL editor alla base online (non registrata nel ledger delle migrazioni). È riservata al service role; test di atomicità e collisione eseguiti dentro una transazione annullata. La policy di seller_details consente lettura al proprietario autenticato; accesso anonimo rifiutato. Il telefono rimane obbligatorio nel modulo e non esiste una scelta di visibilità.

Verifiche locali: 317 test app e 28 test Edge riusciti, controllo tipi e build mobile riusciti. Nessuna verifica del nuovo flusso su telefono fisico. AAB Android firmato 1.0.8 (48) inviato a Google Play il 31 ottobre 2026: la console riporta modifiche in fase di revisione. iOS 1.0.8 (49) compilato e firmato ma non caricato: Mac bloccato; la 1.0.7 (48) è in attesa di verifica Apple.

Il client include compressione migliorata delle nuove foto JPEG/HEIC e supporto opzionale alle miniature, ma le miniature per le foto esistenti e la generazione automatica non sono state pubblicate; le foto già online richiedono ancora intervento e verifica reale. PNG, WebP e video non sono compresi nella modifica JPEG/HEIC.

## Apple upload follow-up
On 31 October at 20:51 Europe/Rome, Transporter reported COSMORA 1.0.8 (49) distributed to App Store Connect and processing. This is an upload confirmation, not review submission, approval, or publication. At the same time 1.0.7 (48) remained in review. Google Play publishing overview reported 1.0.8 (48) in review. Neither status demonstrates that the photo previews are live: the thumbnail backend and backfill remain undeployed.

## Fresh Android production check
The subsequent live Play Console production dashboard lists 1.0.8 (48) — Nome venditore as latest ACTIVE release, 178 countries/regions. Publishing overview has no unpublished changes. This supersedes earlier in-review evidence. It does not prove any particular phone has installed the update. Console also reports a DEX optimization warning (deadline February 2027); no unrelated build changes were made during the photo-latency investigation.
