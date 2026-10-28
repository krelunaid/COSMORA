# COSMORA — audit privacy e cookie, 28 ottobre 2026

## Esito e ambito

Audit tecnico-editoriale basato sui sorgenti, sullo schema/configurazione Supabase, sulle pagine pubbliche, sui pacchetti nativi identificati e sulle fonti ufficiali elencate sotto. Non è una certificazione di conformità né una garanzia contro contestazioni. La chiusura richiede anche decisioni e procedure del titolare e una verifica professionale nei paesi serviti.

Sono stati distinti il sito aziendale `software.kreluna.it`, la console amministrativa, l'app web `cosmora.kreluna.it` e i pacchetti degli store. Una pubblicazione del sito aziendale non aggiorna automaticamente gli altri tre ambienti.

## Correzioni sul sito aziendale e sulla console

- Informativa COSMORA riscritta in italiano, inglese, francese, tedesco e spagnolo, con data unica 28 ottobre 2026 e generazione dalle stesse stringhe del sorgente app.
- Descrizione di visibilità di profili/contenuti, amministrazione, destinatari, mappe, file, diritti, cancellazione e limiti effettivi delle notifiche. I 90 giorni di inattività push sono un filtro di invio, non una promessa di cancellazione automatica.
- Informativa disponibile prima e dopo l'accesso alla console; chiarita la sessione in sessionStorage e rimossa l'importazione superflua di Google Fonts. Nessun accesso a password, chat private o token push aggiunto al pannello.
- Cookie aziendali: scelte separate Meta/Google, accetta e rifiuta equivalenti, preferenze sempre riapribili. Nessun caricamento dei tag facoltativi prima della scelta.
- Scelta locale con versione, data, lingua e fornitori; vecchi rifiuti preservati, accettazioni precedenti prive di evidenza da rinnovare. Global Privacy Control mantiene i tag disattivati.
- Personalizzazione Google e Google Signals negati; URL/eventi minimizzati. Meta non caricato quando URL o referrer contengono query/frammenti. Questo non rende anonimo ogni dato ricevuto dai fornitori.
- Revoca: blocco dei nuovi eventi, cancellazione dei cookie pertinenti accessibili sul dominio e ricaricamento che interrompe gli script caricati. Informativa sui limiti per dati già trasmessi e cookie di terze parti.
- COSMORA, la console e l'anteprima restano esclusi dai tag pubblicitari aziendali.

Stato pubblicazione: **pubblicato e verificato il 28 ottobre 2026**, deployment `e132a28d-c985-4d67-abd1-5eda87ef59d2`. Sorgenti aziendali `35f2aa29`, registrazione release `6c4a6d16`, repository privato `krelunaid/kreluna-software`, ramo `sito-attuale`. La guardia ha verificato gli hash delle cinque informative COSMORA, console e cookie nelle quattro lingue; la pagina pubblica italiana è stata riletta nel browser. I riferimenti definitivi sono in `releases/current.json` del repository aziendale.

## Correzioni COSMORA nel sorgente, non ancora online

Le API di community e annunci ripuliscono i nuovi JPEG, PNG e WebP dai metadati superflui, comprese coordinate GPS, EXIF non necessario, XMP e IPTC, conservando pixel compressi, orientamento e profili colore. Non è una rimozione universale dei metadati: video/HEIC, profili ICC e file storici hanno limiti specifici. La vecchia API verso remove.bg viene ritirata con risposta 410, senza inoltrare file. Vedere il registro operativo per prove e limiti.

Il progetto Sites che serve davvero `cosmora.kreluna.it` (`appgprj_6ac23124aa008191b49cfda336e9296b`) restituisce NOT_FOUND all'account collegato. Il Site COSMORA più vecchio visibile nello stesso account è una destinazione diversa e non viene usato per aggirare questo limite. Serve recuperare l'accesso al progetto esatto. L'informativa pubblica non promette quindi che queste correzioni siano già attive nell'app.

## Minori: scelta del titolare e stato reale

Il titolare ha scelto di mantenere il pubblico dai 13 anni e coinvolgere il genitore via email per gli utenti 13–17. È stata preparata una base separata e **disattivata**: link casuale monouso, verifica del recapito, dichiarazioni esplicite, successiva verifica della responsabilità genitoriale da parte di un operatore autorizzato. Il clic nella mail non approva automaticamente l'accesso e non dà al genitore le credenziali o le chat private del figlio.

Non sono stati inviati messaggi ai genitori, attivati permessi o applicate migrazioni. Restano da completare e collaudare integrazione con iscrizione/OAuth/account esistenti, controlli API/RLS/Storage/push, invio email reale e coda di revisione. Dettagli e stato: [GUARDIAN-CONSENT-PREPARATION.md](GUARDIAN-CONSENT-PREPARATION.md). La tutela dei minori non deve essere dichiarata operativa prima di tali controlli.

L'email prova il controllo del recapito, non l'identità o la responsabilità genitoriale. La soglia italiana dei 14 anni riguarda il consenso per specifici servizi online: non è una soglia universale né risolve la capacità contrattuale. Servono verifiche proporzionate per i paesi e le funzioni effettivamente offerti.

## Verifiche contrattuali e operative da completare

Il titolare ha dichiarato di non sapere quali accordi siano già presenti e ha richiesto un elenco, senza autorizzare accettazioni contrattuali implicite.

1. **Supabase:** account e termini/DPA applicabili, data di accettazione, subfornitori, paesi/accessi di supporto, SCC o altro meccanismo pertinente. La regione primaria UE non dimostra che ogni trattamento resti in UE.
2. **Cloudflare e hosting Sites:** identificare entrambi i contratti, account e servizi; log, esportazioni, trasferimenti e incidenti. La console e l'app non hanno lo stesso hosting.
3. **Aruba:** contratto del servizio di posta utilizzato, nomina/DPA quando applicabile, conservazione, accessi e cancellazione. L'informativa generale Aruba non sostituisce questa verifica.
4. **Apple/Google/Firebase:** termini developer, accesso OAuth, APNs/FCM, paesi e gestione identificativi. Eliminare un token FCM non equivale a eliminare immediatamente ogni Firebase Installation ID.
5. **Altri servizi:** ruolo e condizioni di OpenStreetMap e degli eventuali dati Stripe storici/test; nessun accordo firmato è stato inventato.
6. **Conservazione e diritti:** adottare criteri operativi per assistenza, segnalazioni, richieste genitori, account inattivi, log, esportazioni e backup; assegnare responsabile e revisioni. Nessuna cancellazione massiva o durata arbitraria applicata.
7. **Minori e rischi:** screening DPIA e, se necessario, DPIA; procedura di responsabilità genitoriale, revoca, segnalazioni e prove indispensabili; piano incidenti e gestione richieste.
8. **Store:** riconciliare Data Safety e App Privacy con la build distribuita. La dichiarazione Google relativa alla rubrica non è corroborata dai permessi dei pacchetti ispezionati; mappe e metadati richiedono invece valutazione della posizione. Non cambiare le dichiarazioni sulla sola base del testo informativo.
9. **Account pubblicitari:** riesaminare le impostazioni effettive Meta/Google e la conservazione degli identificatori; la prova locale del consenso non costituisce un registro centralizzato e durevole.

Il registro completo, con fonti, fatti verificati e limiti, è in [PRIVACY-OPERATIONS-2026-10-28.md](PRIVACY-OPERATIONS-2026-10-28.md).

## Collaudi

- TypeScript globale, build console e scansione delle chiavi server nel bundle: superati.
- 22 test consenso superati: rifiuto, assenza di richieste prima del consenso, granularità, revoca, dati minimizzati, storage indisponibile, GPC, più schede e lingue.
- Browser su pacchetto locale: banner leggibile, rifiuto chiude le preferenze e resta dopo ricaricamento; assenti script pubblicitari prima/dopo il rifiuto. Un tab di controllo non rispondeva più agli input; una nuova scheda ha consentito di verificare il comportamento, senza cambiare codice per quel falso sintomo.
- Media: 27 test superati, API/parser e confronto con decoder indipendente; vedere registro operativo. Nessun upload di foto personali usato come prova.
- Guardian: 14 test superati con dipendenze simulate, non una prova dell'invio email o della migrazione SQL su database reale. Attivazione mantenuta OFF.

## Fonti ufficiali e limiti internazionali

- [Garante: cookie e tracciamento](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876) e [FAQ](https://www.garanteprivacy.it/faq/Cookie).
- [Garante: minori](https://www.garanteprivacy.it/temi/minori), [DPIA](https://www.garanteprivacy.it/valutazione-d-impatto-della-protezione-dei-dati-dpia-) e [diritti](https://www.garanteprivacy.it/Regolamentoue/diritti-degli-interessati).
- [Commissione europea: obblighi privacy](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en).
- [ICO: Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/about-this-code/) e [eccezioni per storage/accesso](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/).
- [Svizzera: legge federale](https://www.fedlex.admin.ch/eli/cc/2022/491/en); occorre identificare paesi e garanzie realmente pertinenti.
- [FTC: COPPA](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions); per minori di 13 anni contano pubblico effettivo e conoscenza, non solo una frase nei termini.
- [CPPA: applicabilità CCPA](https://www.cppa.ca.gov/faq.html); obblighi e soglie vanno valutati sul servizio concreto, senza dichiararne automaticamente l'applicazione o l'esenzione.

Queste fonti sono una base dell'audit e non coprono tutte le giurisdizioni. La presenza di cinque traduzioni non equivale a conformità mondiale.
