'use client';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function RecoveryPage() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (active && event === 'PASSWORD_RECOVERY' && session) setReady(true);
    });
    // A signed-in user may also change their own password from this page.
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage('Il collegamento non è valido o è scaduto. Richiedine uno nuovo.');
      else if (data.session) setReady(true);
      else if (window.location.hash.includes('error')) setMessage('Il collegamento è scaduto. Richiedine uno nuovo.');
    }).catch(() => { if (active) setMessage('Connessione non disponibile. Riprova.'); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Servizio non disponibile.');
      if (ready) {
        const password = form.get('password');
        if (typeof password !== 'string') throw new Error('Inserisci una password.');
        if (password.length < 8 || password !== form.get('confirm')) throw new Error('Le password devono coincidere e contenere almeno 8 caratteri.');
        const { error } = await client.auth.updateUser({ password });
        if (error) throw new Error('Password non aggiornata. Controlla i requisiti o richiedi un nuovo collegamento.');
        setDone(true); setMessage('Password aggiornata. Puoi tornare al tuo profilo.');
      } else {
        const email = form.get('email');
        if (typeof email !== 'string') throw new Error('Inserisci un indirizzo email.');
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'https://cosmora-app.andreagadducci.chatgpt.site/auth/recovery' });
        if (error) throw new Error('Invio non riuscito. Attendi qualche minuto e riprova.');
        setMessage('Se l’indirizzo è associato a un account, riceverai un collegamento per scegliere una nuova password. Controlla anche la posta indesiderata.');
      }
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Operazione non riuscita.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-dvh bg-[#090a19] px-5 py-12 text-base"><section className="mx-auto max-w-md space-y-6">
    <Link href="/auth/login" className="block py-3 text-pink-300">Torna all’accesso</Link><h1 className="text-2xl font-semibold">{ready ? 'Scegli una nuova password' : 'Recupera il tuo account'}</h1>
    {!done && <form onSubmit={submit} className="space-y-5">{ready ? <><label className="block">Nuova password<input name="password" type="password" autoComplete="new-password" minLength={8} required className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3" /></label><label className="block">Ripeti la password<input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3" /></label></> : <label className="block">Email del tuo account<input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3" /></label>}<Button type="submit" disabled={busy} className="min-h-12 w-full text-base">{busy ? 'Attendi…' : ready ? 'Salva password' : 'Invia collegamento'}</Button></form>}
    {message && <output className="block rounded-xl border border-white/20 p-4 text-base text-white/85">{message}</output>}{done && <Link href="/profile/me" className="block py-3 text-pink-300">Vai al tuo profilo</Link>}
  </section></main>;
}
