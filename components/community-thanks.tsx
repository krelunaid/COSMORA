'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { PushSettings } from '@/components/native-push';
import { Heart } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { communityThanksMessages } from '@/lib/i18n/community-thanks';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { observeSession } from '@/lib/supabase/session';
import { isTermsExemptPath } from '@/lib/terms-consent';
import { createThanksTransport, shouldShowThanks, syncThanksReceipt, thanksStore, THANKS_RECEIPT_KEY } from '@/lib/community-thanks';

export function CommunityThanks() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const transport = useMemo(() => createThanksTransport(), []);
  const exempt = isTermsExemptPath(pathname ?? '') || pathname === '/thanks';
  const userId = session?.user.id;
  const token = session?.access_token;
  const anonymous = session?.user.is_anonymous;
  const cachedReceipt: unknown = session?.user.user_metadata?.[THANKS_RECEIPT_KEY];
  const cachedReadAt = typeof cachedReceipt === 'string' ? cachedReceipt : undefined;
  const copy = communityThanksMessages[locale];

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    return observeSession(client, (next) => {
      setSession(next);
      setOpenFor((previous) => previous === next?.user.id ? previous : null);
    }, () => { setSession(null); setOpenFor(null); });
  }, []);

  useEffect(() => {
    const online = () => setRevision((n) => n + 1);
    const visible = () => { if (document.visibilityState === 'visible') online(); };
    const storage = (event: StorageEvent) => {
      if (event.key?.startsWith(`${THANKS_RECEIPT_KEY}:`)) { setOpenFor(null); online(); }
    };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('storage', storage);
    };
  }, []);

  useEffect(() => {
    if (!userId || !token || anonymous || exempt) return;
    const controller = new AbortController();
    const captured = { access_token: token, user: { id: userId, user_metadata: { [THANKS_RECEIPT_KEY]: cachedReadAt } } };
    void shouldShowThanks(captured, transport, thanksStore, controller.signal).then((show) => {
      if (!controller.signal.aborted) setOpenFor(show ? userId : null);
    });
    return () => controller.abort();
  }, [userId, token, anonymous, cachedReadAt, exempt, revision, transport]);

  function dismiss() {
    if (!session || openFor !== session.user.id) return;
    thanksStore.record(session.user.id);
    setOpenFor(null);
    // Local dismissal is immediate. Network failure never keeps the dialog open.
    void syncThanksReceipt(session, transport);
  }

  return <Dialog open={!exempt && !!userId && openFor === userId} onOpenChange={(open) => { if (!open) dismiss(); }}>
    <DialogContent className="community-thanks-dialog overflow-hidden rounded-3xl border border-violet-300/25 bg-[#121124] p-0 text-white shadow-2xl shadow-black/60 sm:max-w-lg" showCloseButton={false}>
      <div className="community-thanks-copy overflow-y-auto overscroll-contain px-6 pb-5 pt-7">
        <div aria-hidden="true" className="mb-5 grid size-12 place-items-center rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 text-fuchsia-300"><Heart className="size-6" fill="currentColor" /></div>
        <DialogTitle className="text-2xl font-semibold leading-tight tracking-tight">{copy.title}</DialogTitle>
        <DialogDescription className="mt-4 text-base leading-relaxed text-violet-100">{copy.intro}</DialogDescription>
        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-white/80">
          {copy.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p className="font-semibold text-violet-100">{copy.closing}</p>
          <p className="pt-1 text-sm">{copy.signoff}<br /><strong className="text-white">{copy.signature}</strong></p>
        </div>
        <PushSettings compact />
      </div>
      <div className="shrink-0 border-t border-white/10 bg-[#121124] px-6 py-4">
        <button type="button" onClick={dismiss} className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 text-base font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121124]">{copy.continue} <span aria-hidden="true">💜</span></button>
      </div>
    </DialogContent>
  </Dialog>;
}
