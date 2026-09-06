# Lucca — integrazione e autorizzazione

La scheda locale conserva il tema notturno. Rimossi mappa statica, numeri dimostrativi e comandi inattivi. Aggiunta mappa stradale reale Leaflet/OpenStreetMap, caricata su azione del visitatore, con filtro notturno e attribuzione visibile. GPS opzionale tramite browser, indicatore di precisione, arresto all’uscita e quando la pagina viene nascosta. Nessun permesso dagli organizzatori ottenuto e nessuna richiesta inviata.

Il catalogo espositori è ancora assente: il campo ricerca mostra uno stato non disponibile, non risultati inventati. Mancano importazione autorizzata, schede, filtri e gestione delle adesioni degli espositori. Non dichiarare il sistema completo.

Controlli: compilazione, TypeScript e suite esistente superati. GPS su iPhone fisico e rendering interattivo non ancora verificati. Prima di produzione verificare permessi nativi, privacy e fornitore cartografico adeguato al traffico; il servizio tile OSM non offre SLA. Nessun download offline o prefetch implementato. Riferimento: https://operations.osmfoundation.org/policies/tiles/

## Mappa live: lavoro necessario

- Scegliere un fornitore cartografico con licenza e attribuzione compatibili, verificando condizioni e costi delle tile.
- Ottenere dati autorizzati e aggiornabili: espositori, coordinate stand, padiglioni e ingressi. Non dedurre posizioni da immagini dimostrative.
- Implementare posizione GPS su richiesta, stato di accuratezza e gestione del permesso negato. Non conservare o condividere la posizione per impostazione predefinita; interrompere il rilevamento uscendo dalla mappa.
- Prevedere ricerca e filtri stand. Non promettere navigazione indoor: il GPS può essere impreciso nei padiglioni.
- Provare su iPhone fisico e con rete debole. Aggiornare privacy e dichiarazioni Apple secondo il comportamento effettivo.

## Bozza email — NON INVIATA

Destinatario: info@luccacrea.it

Oggetto: COSMORA — richiesta collaborazione e utilizzo dati Lucca Comics & Games 2026

Buongiorno,

siamo Kreluna Software e stiamo sviluppando COSMORA, un’app dedicata a community cosplay, eventi e annunci marketplace. Vorremmo offrire una guida indipendente a Lucca Comics & Games con una mappa notturna, ricerca degli stand e visualizzazione della posizione dell’utente.

Chiediamo se sia possibile ottenere autorizzazione scritta a utilizzare nell’app e nel relativo sito dati su espositori, stand, padiglioni, ingressi e programma. Disponete di API o file aggiornabili con coordinate e identificativi stabili?

Quali condizioni, eventuali costi, attribuzioni, durata e limiti commerciali si applicano? Quali mappe, immagini, descrizioni e marchi possono essere utilizzati e come si gestiscono aggiornamenti e revoca? Non presenteremo COSMORA come app ufficiale o partner senza accordo esplicito.

Grazie,
Kreluna Software — COSMORA
info@kreluna.it

## Fonti controllate il 6 settembre 2026

- https://lucca2026.luccacomicsandgames.com/it/home
- https://www.luccacrea.it/contatti/

Nessuna API pubblica documentata o licenza di riutilizzo individuata nel controllo. Questo non esclude la disponibilità di accordi privati.
