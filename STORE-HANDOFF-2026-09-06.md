# Preparazione rilascio — 6 settembre 2026

## Verificato
- cosmora.kreluna.it: DNS e HTTPS attivi; Home pubblica risponde 200.
- Google abilitato in Supabase. Accesso dell'account del proprietario completato e sessione persistente dopo ricaricamento sul dominio precedente.
- Correzione reindirizzamenti login/registrazione/recupero: solo i due domini COSMORA ammessi; ambiente locale e host sconosciuti tornano al dominio precedente. Callback nativa invariata.
- 28 test unitari, typecheck, lint e build superati prima della pubblicazione.

## Non dichiarare completato
- Google produzione: schermata Branding incompleta; mancano privacy e termini pubblici. Nessuna pubblicazione OAuth effettuata.
- Dopo ricaricamento il nuovo account Apple krelunaid@gmail.com mostra risorse del programma e dettagli abbonamento: attivazione osservata. Verificare disponibilità dell'app nel team corretto prima di cambiare la firma; non ripetere l'acquisto.
- Privacy: il titolare deve essere identificato correttamente; l'utente non autorizza la pubblicazione di nome personale/indirizzo di casa. Non sostituire un'identità legale verificata con dati inventati.
- Pagamenti esclusivamente TEST; nessuna protezione acquisti, escrow o garanzia promessa. Non inviare questa modalità come checkout commerciale funzionante allo Store.
- Catalogo stand ufficiali non collegato e autorizzazione Lucca non ricevuta.
- Account revisore, asset e screenshot della build finale, questionari Apple e prova iPhone restano necessari.

## Contenuti della privacy da completare prima di renderla pubblica
- Identità e recapiti del titolare; contatto operativo info@kreluna.it.
- Account/email e identificativi Google/Apple, profilo pubblico, annunci/media, messaggi, segnalazioni, dati venditore e ordini di prova.
- Finalità/base giuridica distinte: erogazione servizio, sicurezza/moderazione, obblighi applicabili, consenso per funzioni facoltative ove richiesto.
- Fornitori effettivi: hosting Sites, Supabase, provider di accesso, Stripe TEST; OpenStreetMap riceve IP/area solo aprendo la mappa. GPS locale facoltativo, non archiviato dal componente.
- Conservazione effettiva e backup da verificare, destinatari e trasferimenti/garanzie da verificare nei contratti dei fornitori.
- Diritti, eliminazione account e reclamo all'autorità competente; nessuna promessa di cancellazione immediata da ogni backup non verificata.

## Termini da finalizzare
- Piattaforma intermediaria: venditore e acquirente sono le parti della compravendita, non Kreluna.
- Venditore indica modalità, costi e tempi di spedizione. Resi gestiti inizialmente tra le parti, senza escludere diritti inderogabili o responsabilità della piattaforma.
- Distinguere venditore privato e professionale. Vietare contraffazioni, contenuti illegali e violazioni dei diritti; indicare segnalazione/blocco/assistenza.
- Commissioni, pagamenti reali, contestazioni e obblighi del gestore richiedono scelte e verifica prima del lancio commerciale.

Fonti: https://developer.apple.com/app-store/review/guidelines/ ; https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
