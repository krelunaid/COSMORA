# Provenienza degli asset editoriali — candidata 31

Aggiornamento locale del 3 ottobre 2026. Questa nota riguarda i materiali distribuiti con l’interfaccia, non i file caricati dagli utenti.

## Sostituzione completata

Le copertine editoriali con provenienza o permesso di riuso non documentati sono state rimosse da `public/` e sostituite con **37 illustrazioni SVG originali costruite tramite codice**:

- 28 copertine per il catalogo eventi;
- 6 categorie: cosplay, manga/fumetti, figure, carte, videogiochi e creator;
- 1 hero astratta COSMORA;
- 2 copertine astratte per crew e incontri.

È stato anche disegnato un nuovo favicon SVG con l’iniziale COSMORA, sostituendo il vecchio simbolo generico. Il marchio testuale e l’icona applicazione COSMORA sono conservati.

Sorgente riproducibile: `scripts/generate-editorial-assets.mjs`.

Le nuove grafiche usano esclusivamente gradienti, cerchi, segmenti e tracciati disegnati in questa modifica. Non incorporano fotografie, raster, loghi di organizzatori, personaggi di franchise, carte commerciali, font scaricati o tracciati copiati da librerie di icone. Non sono state generate nuove immagini bitmap. Nessun testo o data è duplicato dentro le copertine visibili.

Le copertine evento sono astrazioni grafiche della categoria, senza rappresentare luoghi o persone realmente presenti all’evento. Nomi, città, date e collegamenti ufficiali del catalogo esistente sono preservati; la modifica non afferma partnership o autorizzazioni degli organizzatori.

## Originali preservati, esclusi dalla distribuzione

**63 file originali** sono conservati in:

`work/asset-archive/2026-10-03-editorial/public/`

L’inventario con percorso originale e SHA-256 è in:

`work/asset-archive/2026-10-03-editorial/manifest.json`

Comprende le 26 immagini principali degli eventi e le due varianti mobile; fotografie e copertine di categorie/community/hero; riferimenti e immagini dimostrative non usati; vecchia mappa Lucca; due precedenti copertine SVG e il vecchio favicon. Nessun originale è stato eliminato definitivamente.

Sono stati rimossi dalla directory pubblica anche i materiali non referenziati: il build mobile copia tutta `public/`, quindi lasciare un’immagine inutilizzata lì l’avrebbe comunque distribuita. `work/asset-archive/` non è una directory pubblica né un input di asset per Vite.

I riferimenti in home, accesso, categorie, esplora, creazione crew e dati dimostrativi sono aggiornati. La utility locale di controllo scontorno usa ora come fixture l’icona COSMORA esistente; non è stata eseguita.

## Materiali conservati e ambito dei diritti

- `public/brand/cosmora-app-icon.png`, `assets/icon-only.png` e `assets/logo.png`: identità COSMORA già presente nel progetto, conservata su richiesta. Questa modifica non attribuisce a terzi la paternità del marchio e non inventa una nuova attestazione di titolarità.
- Modello U2-Net e runtime ONNX: provenienza, revisione, hash e licenze già conservati in `public/models/u2netp/NOTICE.txt`, `LICENSE`, `ONNX-RUNTIME-LICENSE` e `ThirdPartyNotices.txt`. Non modificati.
- Mappa OpenStreetMap: continua a essere caricata dal fornitore configurato, con attribuzione visibile e collegamento al copyright in `components/event-live-map.tsx`. La sostituzione delle copertine non cambia la mappa o le condizioni del servizio.
- Media utenti: nessun file di Supabase Storage è stato toccato. La policy community richiede i diritti/permessi per i caricamenti; segnalazione, revisione e rimozione restano funzioni separate.

## Dichiarazione App Store

Il blocco documentale relativo alle vecchie immagini editoriali di eventi, categorie e community è risolto **nel sorgente della candidata 31** mediante sostituzione e rimozione dalla distribuzione. La build 30 già caricata conteneva i materiali precedenti e non viene modificata da questo lavoro.

Questa nota non equivale a dichiarare che l’app non accede a contenuti di terzi: OpenStreetMap, servizi esterni e contenuti degli utenti rimangono parte dell’app. Non attesta diritti individuali sui futuri caricamenti degli utenti. La dichiarazione nel portale deve descrivere la build effettivamente inviata e i contenuti effettivamente accessibili.

L’inventario delle grafiche nuove e dell’icona conservata, con hash e provenienza, è in `docs/EDITORIAL-ASSETS.json`. Gli SVG sono stati visualizzati tramite miniature locali; nessun test applicativo o flusso utente è stato eseguito in questa modifica.
