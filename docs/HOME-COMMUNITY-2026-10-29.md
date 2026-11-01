# COSMORA — home con Community B, 29 ottobre 2026

## Ambito integrato nel sorgente reale

- `app/page.tsx` mantiene la selezione dell'evento in base al giorno corrente, i link e i crediti originali. Fra evento e categorie compare il nuovo carosello compatto “Dalla community”. La navigazione inferiore mantiene componenti, voci e destinazioni esistenti.
- Il carosello mostra al massimo otto post con fotografie, nell'ordine restituito dalla prima pagina della vera API `/api/community/posts`. Scorrimento manuale, nessun autoplay. I post con solo testo o video restano raggiungibili in Community.
- Il tocco apre `CommunityPostDetail`, lo stesso dettaglio della Community B: nome pubblico effettivamente disponibile, media, hashtag dell'autore, condivisione, sicurezza, like e salvataggi confermati dall'API. Nessun conteggio o nome inventato.
- Un hashtag apre `/community?q=...`. Community inizializza il proprio filtro dalla query, limitata a cento caratteri, poi usa la ricerca esistente.
- Testi nuovi completi in italiano, inglese, francese, tedesco e spagnolo. Placeholder, stato vuoto e retry non sostituiscono i post con contenuti dimostrativi.

## Visibilità e sessione

`HomeCommunityCarousel` usa il client/sessione dell'app, il controllo blocchi esistente e la API che applica pubblicazione, autorizzazioni e blocchi reciproci lato server. L'elenco e il dettaglio vengono nascosti se il controllo blocchi fallisce, se cambia account o se l'identità nella risposta API non coincide con quella della richiesta. I blocchi appena confermati rimuovono immediatamente le fotografie interessate.

Il controllo sessione usa il timeout comune di dodici secondi; l'intera lettura ha un limite di venti secondi. Le richieste superate o relative a un componente smontato sono annullate. Riapertura app, ritorno alla scheda e focus aggiornano feed e link firmati; gli eventi di ripresa simultanei sono accorpati. Nessuna chiave privilegiata, query amministrativa o accesso diretto aggiuntivo ai media.

Il server resta la fonte di autorità per like/salvataggi. La home non scrive interazioni nel browser per simulare la persistenza. Servono il backend Community B e la migrazione prevista dal relativo documento di rilascio.

## Immagini categorie e provenienza

Sono conservate le immagini già presenti per Cosplay, Manga e fumetti, Action figure, Persone e venditori. Il marketplace non cambia immagini con questo intervento.

- **Carte collezionabili:** `public/editorial/category-cards-original-246cd98eef.webp`, 157.114 byte. Copia identica dell'asset WebP ottimizzato dell'anteprima approvata. Immagine generata con IA di tre carte originali, con creature e valori HP distinti, non fotografie di prodotti e non carte Pokémon/One Piece. Fonte di lavorazione: `outputs/home-real-assets-20261028/CARDS-ORIGINAL.md`; originale `assets/cosmora-original-collectible-cards-v2.png`. Non implica che tali carte siano vendute su COSMORA.
- **Videogiochi:** `public/editorial/category-gaming-real-622bc56c4d.webp`, 16.148 byte. Fotografia di John Petalcurin, [Pexels](https://www.pexels.com/photo/close-up-photo-of-gaming-keyboard-2115257/), ridimensionata e compressa, senza elaborazione generativa. [Licenza Pexels](https://www.pexels.com/license/), [termini](https://www.pexels.com/terms-of-service/). Ricerca e controllo visivo documentati il 28 ottobre in `outputs/home-real-assets-20261028/SOURCES.md`. Asset usato come immagine editoriale della categoria, senza attribuire endorsement o promettere inventario specifico. Non è una certificazione legale delle liberatorie.

Le foto degli utenti nella home sono esclusivamente quelle autorizzate dalla API. Nessuna foto usata nelle prove locali viene importata nel bundle di produzione.

## Verifiche

- TypeScript `tsc --noEmit`: passato.
- Lint dei nuovi file, helper, traduzioni e pagina home: passato.
- `tests/home-community.test.ts`: quattro test passati su separazione account, blocchi, foto/video, ordinamento/limite e risposta anonima esplicita.
- Suite completa `pnpm test`: **303 test passati, zero falliti o saltati**. Log `/tmp/cosmora-release-test-fixed-20261029.log`. Adeguati soltanto harness/asserzioni preesistenti: alias checkout risolto con dipendenza reale, reader GET vietato esplicitamente nei test upload POST, verifica firma/dimensioni dell'asset PNG Figures attuale, verifica AST di BlockFeedback come sibling persistente indipendente dalle altre notifiche. Conservata la verifica che un rimborso non verificato inviti a riprendere la stessa richiesta senza crearne una seconda.
- Prova browser locale sul componente reale e pagina home reale: tredici controlli WebKit passati, rapporto `outputs/home-release-20261029/checks-webkit.json`. Misure 320 e 390 px, barra inferiore senza sovrapposizione dei contenuti dopo lo scroll, ordine sezioni, carosello manuale, dettaglio B, interazioni confermate, cambio account, blocchi/errori, risposta di altro account rifiutata, stato vuoto e cinque lingue.
- Verifica finale anche tramite `cua_repl` su scheda locale separata: apertura dettaglio, focus iniziale sul pulsante Chiudi, conferma visuale like/salvataggio, passaggio hashtag al filtro Community.

Il folder `outputs/home-release-20261029` contiene esclusivamente un harness di verifica isolato con dati e API fittizi. Le schermate in quella cartella rappresentano tale ambiente di prova; non sono evidenza di utenti o interazioni di produzione. L'app reale non importa quel folder. Non è stata eseguita da questa attività alcuna pubblicazione web/store né prova su dispositivo fisico; la verifica backend live e la preparazione dei pacchetti restano al coordinamento del rilascio.
