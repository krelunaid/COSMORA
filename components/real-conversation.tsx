'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from '@/components/app-link';
import { AppBackButton } from '@/components/app-back-button';
import { MobileShell } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
type Message = { id: string; sender_id: string; body: string; created_at: string };
export default function RealConversation() {
  const { conversationId: peer } = useParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState('Conversazione');
  const [userId, setUserId] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [revision, setRevision] = useState(0);
  const [blockNotice, setBlockNotice] = useState('');
  async function blockUser(blocked: boolean) {
    try { await accountRequest('/api/blocks', { method: 'POST', body: JSON.stringify({ userId: peer, blocked }) }); setBlockNotice(blocked ? 'Utente bloccato: non potete scambiarvi messaggi.' : 'Utente sbloccato.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Operazione non riuscita.'); }
  }
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const value = await accountRequest(`/api/messages?peer=${encodeURIComponent(peer)}`);
        if (active) { setMessages(value.messages.slice().reverse()); setUserId(value.userId); setName(value.profiles.find((profile: { id: string }) => profile.id === peer)?.display_name || 'Utente COSMORA'); setError(''); }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Caricamento non riuscito.'); }
      finally { if (active) timer = setTimeout(() => { if (document.visibilityState === 'visible') void load(); else timer = setTimeout(load, 15000); }, 15000); }
    }
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, [peer, revision]);
  async function send(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending || !draft.trim()) return;
    setSending(true); setError('');
    const id = pendingId || crypto.randomUUID(); setPendingId(id);
    try { await accountRequest('/api/messages', { method: 'POST', body: JSON.stringify({ id, recipientId: peer, body: draft.trim() }) }); setDraft(''); setPendingId(''); setRevision((value) => value + 1); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Invio non riuscito.'); }
    finally { setSending(false); }
  }
  return <MobileShell className="flex !h-dvh !min-h-0 flex-col overflow-hidden"><header className="flex min-h-16 shrink-0 items-center gap-3 px-4"><AppBackButton fallback="/inbox" /><h1 className="truncate text-lg font-semibold">{name}</h1></header><section className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
    {error && <div className="rounded-xl border border-amber-300/30 p-3"><output className="block text-base text-amber-100">{error}</output>{!userId && <Link href="/auth/login" className="mt-2 block text-pink-300">Accedi</Link>}</div>}
    {userId && <div className="flex gap-4 text-sm"><button onClick={() => blockUser(true)} className="min-h-11 text-pink-300">Blocca utente</button><button onClick={() => blockUser(false)} className="min-h-11 text-white/70">Sblocca utente</button></div>}
    {blockNotice && <output className="block text-sm text-violet-200">{blockNotice}</output>}
    {!error && messages.length === 0 && <p className="text-base text-white/70">Scrivi il primo messaggio.</p>}
    {messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? 'justify-end' : ''}`}><p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl p-3 text-base ${message.sender_id === userId ? 'bg-violet-600' : 'bg-[#202138]'}`}>{message.body}</p></div>)}
  </section><form onSubmit={send} className="flex shrink-0 gap-2 border-t border-white/15 p-3 pb-[max(12px,env(safe-area-inset-bottom))]"><textarea aria-label="Messaggio" maxLength={4000} disabled={sending} value={draft} onChange={(event) => { setDraft(event.target.value); setPendingId(''); }} rows={2} className="min-w-0 flex-1 rounded-xl bg-[#202138] p-3 text-base" placeholder="Scrivi un messaggio…" /><button disabled={sending || !draft.trim() || !userId} className="rounded-xl bg-violet-600 px-4 text-base disabled:opacity-40">{sending ? 'Invio…' : 'Invia'}</button></form></MobileShell>;
}
