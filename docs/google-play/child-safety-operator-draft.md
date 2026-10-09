# COSMORA — standards per la tutela dei minori

Stato: **standard adottati dal titolare il 9 ottobre 2026**. Il titolare ha confermato Andrea Gadducci / Kreluna Software come referente a `info@kreluna.it` e l'adozione del processo operativo descritto sotto. La conferma è distinta dal deployment della pagina e dalla dichiarazione salvata in Google Play.

La pagina è `/child-safety`, localizzata in italiano, inglese, francese, tedesco e spagnolo. È accessibile senza account e senza accettare prima le condizioni. Le regole della community la collegano. Il router nativo include automaticamente le pagine `app/**/page.tsx`.

La pagina usa ora `CHILD_SAFETY_OPERATOR_CONFIRMED = true` in `lib/i18n/child-safety.ts`: il banner di bozza è nascosto, il processo è presentato come adottato e la data del 9 ottobre 2026 compare nelle cinque lingue. Il vecchio nome di questo documento conserva la traccia della preparazione; non indica lo stato corrente della policy. La conferma del titolare non costituisce una verifica indipendente dell'operatività né una certificazione.

## Funzioni riscontrate nel codice

- `components/safety-center.tsx` permette di cercare per nome pubblico, segnalare un utente, scegliere un motivo e inserire dettagli, bloccare e gestire i blocchi. L’invio richiede l’accesso.
- `components/report-button.tsx` collega segnalazione e blocco a contenuti e autori. Le segnalazioni di conversazione possono includere il riferimento del messaggio.
- `app/api/reports/route.ts` riceve segnalazioni autenticate. Questo non dimostra che il titolare controlli la coda nella pratica.
- `app/api/moderation/route.ts` e `lib/moderation.ts` prevedono revisione di post, crew, incontri, annunci e utenti; azioni di occultamento, rifiuto, ripristino e sospensione; storico delle azioni. `lib/server/moderation-auth.ts` limita la gestione ai ruoli autorizzati.
- Il titolare ha adottato il processo di escalation descritto nella pagina verso le autorità competenti e NCMEC ove applicabile. Non è dichiarata una registrazione o certificazione NCMEC e non è stata eseguita una segnalazione reale durante questo incarico.

## Responsabilità e processo adottati dal titolare

1. Andrea Gadducci / Kreluna Software assume il riferimento per la sicurezza dei minori e riceve le richieste a `info@kreluna.it`, indirizzo già pubblico. Il titolare ha confermato la responsabilità della gestione delle segnalazioni e della coda di moderazione.
2. È adottato il divieto esplicito di CSAE e CSAM, inclusi grooming, richieste sessuali a minori, coercizione, sfruttamento, collegamenti e rappresentazioni digitali. Il divieto vale anche per messaggi privati e spostamento verso altri servizi.
3. È adottato il processo per esaminare le segnalazioni, limitare l’accesso al materiale sospetto, rimuovere i contenuti accertati e limitare o sospendere gli account responsabili. Non sono promessi monitoraggio continuo o un tempo di risposta garantito.
4. È adottata la segnalazione alle autorità competenti e, ove applicabile secondo la normativa, NCMEC. L’eventuale trasmissione deve usare i canali previsti e non diffondere ulteriormente il materiale. La pagina non dichiara una registrazione o certificazione NCMEC.
5. È adottata la gestione delle informazioni necessarie al caso, la loro protezione, gli accessi autorizzati e la conservazione dovuta per legge, anche se l’utente chiede la cancellazione. Non sono dichiarati termini di conservazione ulteriori rispetto agli obblighi applicabili.

## Indicazioni pubbliche incluse nella policy

- Percorso nell’app: Profilo → Segnala o blocca un utente; alternativa Segnala dal contenuto o dalla conversazione. Se non è disponibile un motivo specifico, selezionare Altro e spiegare nei dettagli.
- Blocco separato dalla segnalazione; possibilità di gestire e segnalare anche utenti già bloccati.
- Contatto email utilizzabile senza account, con riferimenti e descrizione testuale.
- Divieto di allegare, scaricare, inoltrare o cercare altro materiale illecito per documentare la segnalazione.
- Pericolo immediato: contattare i servizi di emergenza locali.

## Limiti della preparazione

L'adozione è stata applicata alle sorgenti, senza build, test, deploy, invio di segnalazioni o modifica dei dati del backend durante questa modifica. La pagina aggiornata non è quindi dichiarata pubblicata. Il bundle Android locale con policy in bozza non riflette automaticamente l'adozione: occorre un nuovo sync/build e la pubblicazione web prima di attestare la versione finale sullo store.
