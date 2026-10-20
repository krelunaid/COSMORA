# Identità nativa e callback OAuth

Aggiornamento 3 ottobre 2026, candidata 30.

## Prodotti e firma

- iOS: app Apple `6809232374`, bundle `it.kreluna.cosmora`, team `KMQA59LC4T`.
- Profilo iOS Release: `COSMORA Kreluna App Store`, UUID `302d4e6a-9a00-422b-971f-74f8605d6098`, scadenza 6 settembre 2027. Profilo e certificato disponibili verificati dal task principale; compilazione, export e accettazione Apple sono passaggi distinti.
- Android: `com.kreluna.cosmora` conservato nei sorgenti. Non è stata verificata la console Google Play: non cambiare applicationId/namespace o package Java presumendo che debbano coincidere con iOS.

`capacitor.config.ts` usa `COSMORA_NATIVE_TARGET=ios|android` (default iOS). I comandi `pnpm ios:sync`, `pnpm ios:open`, `pnpm android:sync` e `pnpm android:open` impostano il target. Eseguire sync separatamente per ciascuna piattaforma; non eseguire `cap sync` senza piattaforma. Per il CLI diretto usare `COSMORA_NATIVE_TARGET=ios cap sync ios` oppure `COSMORA_NATIVE_TARGET=android cap sync android`.

## Callback compatibili

Entrambe le app registrano e il parser accetta solo queste due destinazioni esatte:

- `com.kreluna.cosmora://auth/callback`
- `it.kreluna.cosmora://auth/callback`

Il redirect richiesto da OAuth, conferma email e recupero password resta `com.kreluna.cosmora://auth/callback` in questa build. Cambiare il bundle Apple non richiede di cambiare contemporaneamente uno scheme personalizzato. La disponibilità dei due redirect nell'allowlist Supabase non è stata verificata nella sessione corrente: il cambio di bundle non prova il funzionamento dell'accesso reale.

Il plugin iOS accetta soltanto il server Supabase configurato e ricava lo scheme della sessione dal parametro `redirect_to`, che deve essere unico e coincidere esattamente con una delle due destinazioni. Il callback ricevuto deve mantenere lo stesso scheme, host e percorso. Restano esclusi credenziali nell'URL, porte arbitrarie, callback esterni e token implicit nel fragment. I vecchi link ricevuti via email possono continuare a rientrare nell'app; i codici PKCE richiedono comunque il verifier della sessione che li ha generati.

## Prima di attivare il redirect nuovo

1. Verificare l'allowlist Supabase Auth e aggiungere esattamente `it.kreluna.cosmora://auth/callback`, conservando anche il callback `com` per le app/link precedenti. Nessuna modifica Supabase è stata eseguita qui.
2. Mantenere il callback provider Apple/Google del progetto Supabase (`https://pwdpwgonvnuwmgfiidut.supabase.co/auth/v1/callback`). Il cambio del bundle non giustifica la sostituzione di quel return URL con uno scheme dell'app. Verificare separatamente che la configurazione Apple Services ID appartenga al team/prodotto corretto; non sono state lette o modificate credenziali provider.
3. Solo dopo la verifica remota cambiare il redirect richiesto dall'app in `lib/supabase/auth-redirect.ts`; se Android deve rimanere sul callback `com`, selezionare il callback in base alla piattaforma in tutti e tre i flussi (OAuth, conferma email, recupero).
4. Prima della release verificare accesso Apple/Google, conferma email, recupero password e apertura link ad app chiusa/aperta sul prodotto firmato corretto. Questi test non sono stati eseguiti durante la correzione di identità.

Le installazioni delle vecchie build con bundle `com.kreluna.cosmora` sono un'app iOS distinta: non si aggiornano automaticamente alla build `it`. Entrambe possono registrare il vecchio scheme; non assumere che iOS selezioni quella desiderata quando entrambe sono installate.
