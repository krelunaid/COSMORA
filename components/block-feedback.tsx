'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { subscribeToBlockChanges, type BlockChange } from '@/lib/blocked-content';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { safetyMessages } from '@/lib/i18n/safety';
import { blockFeedbackMessages } from '@/lib/i18n/block-feedback';

/** Mounted above the screens so removing a blocked post cannot remove feedback. */
export function BlockFeedback() {
  const { locale } = useI18n();
  const t = safetyMessages[locale];
  const copy = blockFeedbackMessages[locale];
  const [notice, setNotice] = useState<BlockChange | null>(null);
  const noticeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    let viewer = '';
    let authRevision = 0;
    const updateViewer = (id: string) => {
      if (viewer !== id) setNotice(null);
      viewer = id;
    };
    const { data: auth } = client.auth.onAuthStateChange((_event, session) => {
      authRevision += 1;
      updateViewer(session?.user.id ?? '');
    });
    const revision = authRevision;
    void client.auth.getSession().then(({ data, error }) => {
      if (active && revision === authRevision) updateViewer(error ? '' : data.session?.user.id ?? '');
    }).catch(() => {
      if (active && revision === authRevision) updateViewer('');
    });
    const unsubscribe = subscribeToBlockChanges((change) => {
      // Never carry a previous account's confirmation into the next session.
      if (!viewer || change.viewerId !== viewer) return;
      if (change.blocked) setNotice(change);
      else setNotice((current) => current?.userId === change.userId ? null : current);
    });
    return () => { active = false; auth.subscription.unsubscribe(); unsubscribe(); };
  }, []);

  useEffect(() => {
    if (notice) noticeRef.current?.focus({ preventScroll: true });
  }, [notice]);

  if (!notice) return null;
  return (
    <aside
      ref={noticeRef}
      tabIndex={-1}
      aria-label={t.blockSaved}
      className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 mx-auto max-h-[calc(100dvh-112px)] max-w-[406px] overflow-y-auto rounded-2xl border border-violet-300/50 bg-[#18132f] p-4 text-white shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-2 size-5 shrink-0 text-violet-300" aria-hidden />
        <div role="status" className="min-w-0 flex-1">
          <p className="font-semibold">{t.blockSaved}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{copy.saved}</p>
        </div>
        <button type="button" aria-label={copy.dismiss} onClick={() => setNotice(null)} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/5">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <Link href="/safety?view=blocked" onClick={() => {
        setNotice(null);
        // Navigation to the same URL does not rerun the safety page effect.
        const heading = document.getElementById('safety-blocked-heading');
        heading?.scrollIntoView({ block: 'start' });
        heading?.focus({ preventScroll: true });
      }} className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold">
        {t.blockedTitle}
      </Link>
    </aside>
  );
}
