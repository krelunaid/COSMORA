'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ImagePlus, MoreHorizontal, Send, Sparkles } from 'lucide-react';
import Link from '@/components/app-link';
import { MobileShell } from '@/components/mobile-shell';
import { getConversation } from '@/lib/conversations';
import { AppBackButton } from '@/components/app-back-button';

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversation = getConversation(params.conversationId);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string[]>([]);

  if (!conversation) {
    return (
      <MobileShell>
        <div className="grid min-h-dvh place-items-center px-6 text-center">
          <div><h1 className="text-xl font-semibold">Conversazione non trovata</h1><Link href="/inbox" className="mt-4 inline-block text-sm text-pink-300">Torna ai messaggi</Link></div>
        </div>
      </MobileShell>
    );
  }

  const sendMessage = () => {
    const value = draft.trim();
    if (!value) return;
    setSent((current) => [...current, value]);
    setDraft('');
  };

  return (
    <MobileShell className="flex h-dvh flex-col">
      <header className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <AppBackButton fallback="/inbox" className="-ml-2" />
        <span className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={conversation.image} alt="" fill sizes="44px" className="object-cover" /></span>
        <div className="min-w-0 flex-1"><h1 className="truncate text-[16px] font-semibold">{conversation.name}</h1><p className="mt-0.5 text-[12px] text-emerald-300">Online · {conversation.country}</p></div>
        <button aria-label="Altre opzioni" className="grid size-10 place-items-center rounded-full bg-white/5"><MoreHorizontal className="size-5" /></button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <p className="text-center text-[12px] text-white/40">Oggi</p>
        {conversation.messages.map((message, index) => (
          <div key={`${message.text}-${index}`} className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-[14px] leading-5 ${message.from === 'me' ? 'rounded-br-md bg-gradient-to-br from-pink-500 to-violet-600 text-white' : 'rounded-bl-md border border-white/8 bg-[#17172b]'}`}>
              <p>{message.text}</p>
              {message.translated && <p className="mt-2 border-t border-white/10 pt-2 text-[12px] leading-4 text-violet-200"><Sparkles className="mr-1 inline size-3" />{message.translated}</p>}
            </div>
          </div>
        ))}
        {sent.map((message, index) => <div key={`${message}-${index}`} className="flex justify-end"><p className="max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-br from-pink-500 to-violet-600 px-4 py-3 text-[14px] leading-5">{message}</p></div>)}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="flex shrink-0 items-end gap-2 border-t border-white/10 bg-[#080918] px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <button type="button" aria-label="Aggiungi immagine" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/7"><ImagePlus className="size-5 text-violet-300" /></button>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} placeholder="Scrivi un messaggio…" className="min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-[#17172b] px-4 py-3 text-[14px] outline-none placeholder:text-white/35 focus:border-pink-400/50" />
        <button aria-label="Invia messaggio" className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600"><Send className="size-5" /></button>
      </form>
    </MobileShell>
  );
}
