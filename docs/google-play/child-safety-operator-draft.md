# COSMORA — standards per la tutela dei minori

Stato: **bozza del 9 ottobre 2026, da confermare dal titolare prima della dichiarazione di conformità a Google Play**.

La pagina proposta è `/child-safety`, localizzata in italiano, inglese, francese, tedesco e spagnolo. È accessibile senza account e senza accettare prima le condizioni. Le regole della community la collegano. Il router nativo include automaticamente le pagine `app/**/page.tsx`.

La pagina usa `CHILD_SAFETY_OPERATOR_CONFIRMED = false` in `lib/i18n/child-safety.ts` e mostra esplicitamente lo stato di bozza. **Non cambiare questo valore e non attestare il processo come attivo sulla console finché il titolare non ha confermato le responsabilità e il processo sotto.** Dopo la conferma, aggiornare anche le etichette di bozza e la descrizione del processo nelle cinque lingue, riportando la data di adozione effettiva.

## Funzioni riscontrate nel codice

- `components/safety-center.tsx` permette di cercare per nome pubblico, segnalare un utente, scegliere un motivo e inserire dettagli, bloccare e gestire i blocchi. L’invio richiede l’accesso.
- `components/report-button.tsx` collega segnalazione e blocco a contenuti e autori. Le segnalazioni di conversazione possono includere il riferimento del messaggio.
- `app/api/reports/route.ts` riceve segnalazioni autenticate. Questo non dimostra che il titolare controlli la coda nella pratica.
- `app/api/moderation/route.ts` e `lib/moderation.ts` prevedono revisione di post, crew, incontri, annunci e utenti; azioni di occultamento, rifiuto, ripristino e sospensione; storico delle azioni. `lib/server/moderation-auth.ts` limita la gestione ai ruoli autorizzati.
- Non è stata riscontrata in questo incarico una procedura operativa confermata per l’escalation di CSAM alle autorità o NCMEC. La pagina la propone, senza dichiarare che esista già.

## Conferme operative richieste al titolare

1. Andrea Gadducci / Kreluna Software assume il riferimento per la sicurezza dei minori e riceve le richieste a `info@kreluna.it`, indirizzo già pubblico. Confermare chi controlla la casella e la coda di moderazione e dispone dei relativi accessi.
2. Adottare il divieto esplicito di CSAE e CSAM, inclusi grooming, richieste sessuali a minori, coercizione, sfruttamento, collegamenti e rappresentazioni digitali. Il divieto vale anche per messaggi privati e spostamento verso altri servizi.
3. Confermare il processo per esaminare le segnalazioni, limitare l’accesso al materiale sospetto, rimuovere i contenuti accertati e limitare o sospendere gli account responsabili. Non sono promessi monitoraggio continuo o un tempo di risposta garantito.
4. Stabilire il canale verso le autorità competenti e, ove applicabile secondo la normativa, NCMEC. L’eventuale trasmissione deve usare i canali previsti e non diffondere ulteriormente il materiale. La pagina non dichiara una registrazione o certificazione NCMEC.
5. Stabilire la gestione delle informazioni necessarie al caso, la loro protezione, gli accessi autorizzati e la conservazione dovuta per legge, anche se l’utente chiede la cancellazione. Non inventare termini di conservazione senza conoscere gli obblighi e gli strumenti effettivi.

## Indicazioni pubbliche già incluse nella bozza

- Percorso nell’app: Profilo → Segnala o blocca un utente; alternativa Segnala dal contenuto o dalla conversazione. Se non è disponibile un motivo specifico, selezionare Altro e spiegare nei dettagli.
- Blocco separato dalla segnalazione; possibilità di gestire e segnalare anche utenti già bloccati.
- Contatto email utilizzabile senza account, con riferimenti e descrizione testuale.
- Divieto di allegare, scaricare, inoltrare o cercare altro materiale illecito per documentare la segnalazione.
- Pericolo immediato: contattare i servizi di emergenza locali.

## Limiti della preparazione

Sono state preparate le sorgenti, senza build, test, deploy, invio di segnalazioni o modifica dei dati del backend. La pagina non è quindi dichiarata pubblicata. Il bundle Android già preparato prima di questa modifica non contiene automaticamente questa nuova pagina: occorre un nuovo sync/build prima di affermarlo.
