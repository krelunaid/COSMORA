'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { GUARDIAN_WORKFLOW_UI_ENABLED } from '@/lib/guardian-feature';

// Prepared, intentionally not routed or active. No authentication session is
// granted to a guardian and no minor profile/name/email is disclosed by this page.
const copy: Record<Locale, {
  title: string; inactive: string; intro: string; verify: string; privacy: string;
  adult: string; responsibility: string; authorize: string; confirm: string;
  done: string; error: string; busy: string; support: string;
}> = {
  it: { title: 'Autorizzazione del genitore', inactive: 'Questa procedura non è ancora attiva.',
    intro: 'Un utente tra 13 e 17 anni ha indicato questa email per chiedere un’autorizzazione. Verificare l’email non prova l’identità o la responsabilità genitoriale e non attiva l’account.',
    verify: 'Verifica la mia email', privacy: 'Leggi l’informativa sulla privacy', adult: 'Dichiaro di essere maggiorenne.',
    responsibility: 'Dichiaro di esercitare la responsabilità genitoriale o la tutela sull’utente che ha richiesto l’autorizzazione.',
    authorize: 'Ho letto l’informativa e autorizzo la richiesta di accesso alla community COSMORA, dove profilo e contenuti possono essere pubblici e sono presenti messaggi tra utenti. Le notifiche facoltative richiedono una scelta separata.',
    confirm: 'Invia la richiesta di autorizzazione', done: 'Email verificata e dichiarazione ricevuta. La richiesta attende il controllo del titolare; l’account non è stato approvato automaticamente.',
    error: 'Non è stato possibile completare il passaggio. Il link potrebbe essere scaduto o già utilizzato. Contatta l’assistenza.', busy: 'Attendi…', support: 'Contatta COSMORA per chiarimenti o revoca' },
  en: { title: 'Parent or guardian authorisation', inactive: 'This process is not active yet.',
    intro: 'A user aged 13–17 supplied this email to request authorisation. Verifying the email does not prove identity or parental responsibility and does not activate the account.',
    verify: 'Verify my email', privacy: 'Read the privacy notice', adult: 'I declare that I am an adult.',
    responsibility: 'I declare that I hold parental responsibility or legal guardianship for the user requesting authorisation.',
    authorize: 'I have read the notice and authorise the request to access the COSMORA community, where profiles and content may be public and users can exchange messages. Optional notifications require a separate choice.',
    confirm: 'Submit authorisation request', done: 'Email verified and declaration received. The request awaits the controller’s review; the account was not automatically approved.',
    error: 'This step could not be completed. The link may have expired or already been used. Contact support.', busy: 'Please wait…', support: 'Contact COSMORA for questions or withdrawal' },
  fr: { title: 'Autorisation parentale', inactive: 'Cette procédure n’est pas encore active.',
    intro: 'Un utilisateur de 13 à 17 ans a indiqué cette adresse pour demander une autorisation. Vérifier l’adresse ne prouve ni l’identité ni l’autorité parentale et n’active pas le compte.',
    verify: 'Vérifier mon adresse', privacy: 'Lire la politique de confidentialité', adult: 'Je déclare être majeur.',
    responsibility: 'Je déclare exercer l’autorité parentale ou la tutelle sur l’utilisateur demandant l’autorisation.',
    authorize: 'J’ai lu la politique et j’autorise la demande d’accès à la communauté COSMORA, où profils et contenus peuvent être publics et les utilisateurs échanger des messages. Les notifications facultatives nécessitent un choix distinct.',
    confirm: 'Envoyer la demande d’autorisation', done: 'Adresse vérifiée et déclaration reçue. La demande attend l’examen du responsable ; le compte n’a pas été approuvé automatiquement.',
    error: 'Cette étape n’a pas pu être terminée. Le lien est peut-être expiré ou déjà utilisé. Contactez l’assistance.', busy: 'Veuillez patienter…', support: 'Contacter COSMORA pour toute question ou révocation' },
  de: { title: 'Genehmigung durch Eltern oder Sorgeberechtigte', inactive: 'Dieses Verfahren ist noch nicht aktiv.',
    intro: 'Ein Nutzer zwischen 13 und 17 Jahren hat diese E-Mail-Adresse für eine Genehmigung angegeben. Die E-Mail-Bestätigung beweist weder Identität noch Sorgeberechtigung und aktiviert das Konto nicht.',
    verify: 'Meine E-Mail bestätigen', privacy: 'Datenschutzhinweise lesen', adult: 'Ich erkläre, dass ich volljährig bin.',
    responsibility: 'Ich erkläre, dass ich für den anfragenden Nutzer sorgeberechtigt oder gesetzlicher Vormund bin.',
    authorize: 'Ich habe die Hinweise gelesen und genehmige den Antrag auf Zugang zur COSMORA-Community, in der Profile und Inhalte öffentlich sein können und Nutzer Nachrichten austauschen. Optionale Mitteilungen erfordern eine gesonderte Entscheidung.',
    confirm: 'Genehmigungsantrag senden', done: 'E-Mail bestätigt und Erklärung empfangen. Der Antrag wird vom Verantwortlichen geprüft; das Konto wurde nicht automatisch freigegeben.',
    error: 'Der Schritt konnte nicht abgeschlossen werden. Der Link ist möglicherweise abgelaufen oder bereits verwendet. Kontaktiere den Support.', busy: 'Bitte warten…', support: 'COSMORA für Fragen oder Widerruf kontaktieren' },
  es: { title: 'Autorización del progenitor o tutor', inactive: 'Este procedimiento todavía no está activo.',
    intro: 'Un usuario de 13 a 17 años ha indicado este correo para solicitar autorización. Verificarlo no acredita la identidad ni la responsabilidad parental y no activa la cuenta.',
    verify: 'Verificar mi correo', privacy: 'Leer el aviso de privacidad', adult: 'Declaro que soy mayor de edad.',
    responsibility: 'Declaro que ejerzo la responsabilidad parental o tutela legal del usuario que solicita autorización.',
    authorize: 'He leído el aviso y autorizo la solicitud de acceso a la comunidad COSMORA, donde perfiles y contenido pueden ser públicos y los usuarios pueden intercambiar mensajes. Las notificaciones opcionales requieren una elección separada.',
    confirm: 'Enviar solicitud de autorización', done: 'Correo verificado y declaración recibida. La solicitud espera la revisión del responsable; la cuenta no se ha aprobado automáticamente.',
    error: 'No se ha podido completar el paso. El enlace puede haber caducado o haberse utilizado. Contacta con asistencia.', busy: 'Espera…', support: 'Contactar con COSMORA para consultas o revocación' },
};

export function GuardianConsentPage({ locale = 'it' }: { locale?: Locale }) {
  const [displayLocale, setDisplayLocale] = useState<Locale>(locale);
  const text = copy[displayLocale];
  const emailToken = useRef('');
  const [consentToken, setConsentToken] = useState('');
  const [version, setVersion] = useState('');
  const [checked, setChecked] = useState([false, false, false]);
  const [state, setState] = useState<'verify' | 'consent' | 'done'>('verify');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    // Clear bearer material from browser history before making any request.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    if (GUARDIAN_WORKFLOW_UI_ENABLED && /^[0-9a-f]{64}$/.test(value)) emailToken.current = value;
  }, []);
  async function submit() {
    if (!GUARDIAN_WORKFLOW_UI_ENABLED || busy || state === 'done') return;
    if (state === 'verify' ? !emailToken.current : !consentToken || !checked.every(Boolean)) { setError(true); return; }
    setBusy(true); setError(false);
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!base || !key || new URL(base).protocol !== 'https:') throw new Error('Unavailable');
      const action = state === 'verify' ? 'verify' : 'consent';
      const response = await fetch(`${base.replace(/\/+$/, '')}/functions/v1/guardian-consent/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key }, credentials: 'omit', cache: 'no-store',
        referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000),
        body: JSON.stringify(action === 'verify' ? { token: emailToken.current } : {
          consentToken, noticeVersion: version, isAdult: true, hasParentalResponsibility: true, authorizesCommunity: true,
        }),
      });
      const value: unknown = await response.json();
      if (!response.ok || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unavailable');
      const result = value as Record<string, unknown>;
      if (action === 'verify') {
        if (result.state !== 'email_verified' || typeof result.consentToken !== 'string' || !/^[0-9a-f]{64}$/.test(result.consentToken)
          || typeof result.noticeVersion !== 'string' || !['it', 'en', 'fr', 'de', 'es'].includes(String(result.locale)))
          throw new Error('Unavailable');
        emailToken.current = ''; setConsentToken(result.consentToken); setVersion(result.noticeVersion);
        setDisplayLocale(result.locale as Locale); setState('consent');
      } else {
        if (result.state !== 'pending_review') throw new Error('Unavailable');
        setConsentToken(''); setState('done');
      }
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <main lang={displayLocale} className="min-h-dvh bg-[#090a19] px-5 py-10 text-white">
    <section className="mx-auto max-w-xl space-y-5 rounded-2xl border border-white/15 p-6">
      <h1 className="text-2xl font-semibold">{text.title}</h1>
      {!GUARDIAN_WORKFLOW_UI_ENABLED ? <p>{text.inactive}</p> : state === 'done' ? <output className="block">{text.done}</output> : <>
        <p>{text.intro}</p>
        <a href={`https://software.kreluna.it/cosmora/privacy/${displayLocale === 'it' ? '' : `${displayLocale}/`}`}
          className="block text-pink-300 underline" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{text.privacy}</a>
        {state === 'consent' && <div className="space-y-4">
          {[text.adult, text.responsibility, text.authorize].map((label, i) => <label key={i} className="flex gap-3">
            <input type="checkbox" className="mt-1 size-5 shrink-0" disabled={busy} checked={checked[i]}
              onChange={event => setChecked(current => current.map((value, index) => index === i ? event.target.checked : value))} />
            <span>{label}</span>
          </label>)}
        </div>}
        <button type="button" onClick={submit} disabled={busy || (state === 'consent' && !checked.every(Boolean))}
          className="min-h-12 rounded-xl bg-violet-600 px-5 disabled:opacity-50">{busy ? text.busy : state === 'verify' ? text.verify : text.confirm}</button>
      </>}
      {error && <p role="alert">{text.error}</p>}
      <a className="block text-pink-300 underline" href="mailto:info@kreluna.it?subject=%5BCOSMORA%5D%20Genitori">{text.support}</a>
    </section>
  </main>;
}
