'use client';
import { useState } from 'react';
import Link from '@/components/app-link';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function DeleteAccountPage() {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [apple, setApple] = useState(false);
  async function remove(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmation !== 'ELIMINA') return;
    setBusy(true); setError('');
    try {
      const result = await accountRequest<{ deleted: boolean; appleManualRevocation: boolean }>('/api/account/delete', { method: 'DELETE', body: JSON.stringify({ confirmation }) });
      setApple(result.appleManualRevocation);
      await getSupabaseBrowserClient()?.auth.signOut({ scope: 'local' });
      setDeleted(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Eliminazione non riuscita.'); }
    finally { setBusy(false); }
  }
  return <MobileShell><ScreenHeader title="Elimina account" back="/profile/me" /><section className="space-y-5 p-5 text-base leading-relaxed">
    {deleted ? <><h1 className="text-2xl font-semibold">Account eliminato</h1><p>Il tuo account COSMORA e i contenuti associati sono stati rimossi.</p>{apple && <p>Per revocare anche il collegamento con Apple, apri Impostazioni iPhone → il tuo nome → Accedi con Apple → COSMORA → Elimina. Non abbiamo conservato i token Apple necessari per eseguire questa revoca automaticamente.</p>}<Link href="/" className="block rounded-xl bg-violet-600 p-3 text-center">Torna alla Home</Link></> : <>
      <h1 className="text-2xl font-semibold">Questa operazione è definitiva</h1>
      <p>Verranno eliminati profilo, annunci, foto e video caricati, post, messaggi, preferiti, dati venditore e crew che hai creato. Sarai rimosso dalle altre crew. Non potrai recuperarli.</p>
      <p>Le conversazioni saranno rimosse anche dalla cronologia degli altri partecipanti. Le eventuali copie già scaricate da altre persone non possono essere eliminate da COSMORA.</p>
      <form onSubmit={remove} className="space-y-4"><label className="block">Scrivi ELIMINA per confermare<input autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-white/25 bg-[#111225] p-3" /></label><button disabled={busy || confirmation !== 'ELIMINA'} className="min-h-12 w-full rounded-xl bg-rose-700 px-4 disabled:opacity-50">{busy ? 'Eliminazione in corso…' : 'Elimina definitivamente il mio account'}</button></form>
      {error && <p role="alert" className="text-amber-200">{error}</p>}
      <Link href="/profile/me" className="block min-h-12 py-3 text-pink-300">Annulla e torna al profilo</Link>
    </>}
  </section></MobileShell>;
}
