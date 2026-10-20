# Attivazione moderazione COSMORA

## Stato di questa modifica

Il codice e la migrazione sono locali. La migrazione non è stata eseguita, il backend non è stato pubblicato e nessun account ha ricevuto privilegi. Il controllo TypeScript non sostituisce la verifica del flusso sul database.

Aggiornamento del 3 ottobre 2026: il dashboard Supabase del progetto originale `pwdpwgonvnuwmgfiidut` è accessibile con la sessione browser esistente e COSMORA risulta sano. Il progetto Sites del manifest continua però a restituire `404 project_not_found` tramite `get_site`; il backend online resta v38. Non applicare la migrazione finché non è possibile pubblicare immediatamente il backend aggiornato.

Prima della release pubblica devono essere disponibili insieme schema, backend e app aggiornati. Pubblicare soltanto il pacchetto iOS non attiva la moderazione.

## Ordine di attivazione

1. Pianificare una finestra di aggiornamento del backend. Il vecchio backend pubblica automaticamente i contenuti e usa URL pubblici delle foto.
2. Applicare, con gli strumenti autorizzati del progetto, `supabase/migrations/20261003190000_moderation_queue.sql`.
3. Pubblicare immediatamente il backend aggiornato. La migrazione rende privati i bucket delle foto e blocca le mutazioni dirette: il backend precedente non è compatibile con questi cambiamenti.
4. Assegnare esplicitamente almeno un operatore responsabile e il suo ruolo server. Attivare una presa in carico effettiva delle segnalazioni.
5. Eseguire una verifica funzionale autorizzata prima della release: coda, approvazione, segnalazione, rimozione, ripristino, sospensione, accesso all’eliminazione da account sospeso e accessi negati per account ordinari. Non è stata eseguita in questa modifica.

`requireAuthenticatedUser` rifiuta le normali funzioni autenticate se la tabella `user_moderation` non è disponibile. L’eliminazione account usa `allowDeleting=true` e resta accessibile anche per account sospesi o con eliminazione già avviata.

## Assegnazione dei ruoli

Sono autorizzati esclusivamente gli utenti per cui **auth.users.raw_app_meta_data.cosmora_role** vale **admin** o **moderator**. L’API valida il bearer con Supabase; la funzione SQL rilegge il ruolo del moderatore nel database.

Non usare `user_metadata`, il campo pubblico `profiles.role`, i ruoli delle crew o una variabile nel browser. Nessuna schermata dell’app assegna ruoli.

L’assegnazione va fatta dall’amministratore tramite Supabase Admin, su un UUID verificato. Esempio da eseguire esclusivamente in un ambiente server autorizzato, con client Admin già configurato:

```ts
const current = await admin.auth.admin.getUserById(operatorUserId);
if (current.error || !current.data.user) throw new Error('Operatore non trovato');
const changed = await admin.auth.admin.updateUserById(operatorUserId, {
  app_metadata: {
    ...current.data.user.app_metadata,
    cosmora_role: 'moderator',
  },
});
if (changed.error) throw changed.error;
```

Per revocare l’accesso, impostare `cosmora_role: null` preservando gli altri app_metadata. Non scrivere chiavi di servizio nel client o nella build mobile. Dopo l’assegnazione, rinnovare la sessione dell’operatore per mostrare il collegamento in Assistenza; l’autorizzazione server resta indipendente dalla visibilità del collegamento.

## Funzionamento

- `/moderation` mostra contenuti da esaminare, contenuti nascosti/utenti sospesi e ultime 100 decisioni. Le code sono paginate.
- `GET /api/moderation` espone la coda solo agli operatori; `POST` registra una decisione con stato atteso e motivazione.
- La funzione `cosmora_moderation_decision` esegue nello stesso commit stato, chiusura delle sole segnalazioni mostrate all’operatore e registro. Un cambio concorrente di stato restituisce un conflitto.
- Nuovi post, annunci e crew vanno in revisione. Riattivazioni e modifiche di annunci da pubblicare tornano in revisione.
- Annunci `moderated` non sono modificabili o riattivabili dal venditore. Il ripristino recupera lo stato registrato prima della rimozione, senza cancellare i dati.
- Le segnalazioni comprendono post, annunci, crew e utenti. In chat si può segnalare un singolo messaggio ricevuto: l’API verifica che sia stato inviato dall’utente segnalato al segnalante. Solo quel messaggio viene mostrato ai moderatori.
- Account senza profilo pubblico possono essere segnalati e sospesi. Le segnalazioni di contenuti ormai eliminati possono essere archiviate.
- La sospensione impedisce l’uso delle funzioni autenticate e nasconde il profilo pubblico tramite un flag modificabile solo dal server. Nomi e collegamenti al profilo sono neutralizzati nella community e nelle conversazioni personali; UUID e messaggi restano disponibili per la responsabilità delle segnalazioni. L’operatore deve esaminare e nascondere anche gli eventuali altri contenuti pubblici già caricati. La sospensione non cancella automaticamente tutto lo storico.
- I preferiti di contenuti non pubblici diventano schede neutre rimovibili, senza titolo o fotografia del contenuto.
- Foto/video sono in bucket privati. Le URL firmate pubbliche durano fino a un’ora; quelle della coda durano 15 minuti. URL già emesse e copie già scaricate possono restare disponibili fino alla scadenza: nascondere il contenuto non revoca istantaneamente ogni copia.
- La migrazione protegge registro e sospensioni con RLS/revoche e rimuove le scritture dirette dei client su profili, contenuti e Storage. Le API con service_role continuano a operare dopo aver verificato l’utente.

## Compiti operativi prima della pubblicazione

Deve esistere un operatore effettivo che controlla la coda, risponde alle segnalazioni e applica le regole della community. Il repository non configura persone, copertura oraria o notifiche esterne. Le regole e i contatti vanno resi disponibili nell’app. I contenuti preesistenti ancora attivi richiedono una revisione dell’inventario: questa migrazione non li nasconde automaticamente.
