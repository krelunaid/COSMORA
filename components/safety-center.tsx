'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Search, Ban, Flag } from 'lucide-react';
import Link from '@/components/app-link';
import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { useI18n } from '@/components/i18n-provider';
import { useBlockedContent } from '@/components/use-blocked-content';
import { safetyMessages } from '@/lib/i18n/safety';
import { communityTranslator } from '@/lib/i18n/community';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { viewerRequest } from '@/lib/viewer-request';
import { AccountRequestError } from '@/lib/account-http';
import { notifyBlockChange } from '@/lib/blocked-content';

type Profile = { id: string; display_name: string | null; country: string | null };
type BlocksState = ReturnType<typeof useBlockedContent>;
const reasons = [
  ['SPAM', 'Spam'], ['SCAM', 'Possibile truffa'], ['HARASSMENT', 'Molestie'],
  ['SEXUAL_CONTENT', 'Contenuti sessuali'], ['HATE', 'Odio'], ['VIOLENCE', 'Violenza'],
  ['COPYRIGHT', 'Copyright'], ['COUNTERFEIT', 'Contraffazione'], ['OTHER', 'Altro'],
] as const;
type Reason = (typeof reasons)[number][0];
const buttonStyle = 'min-h-11 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-40';

export function SafetyCenter() {
  const { locale } = useI18n();
  const t = safetyMessages[locale];
  const blocks = useBlockedContent();
  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader title={t.title} back="/community" />
      <div className="flex-1 space-y-5 px-4 py-5">
        <div className="flex items-start gap-3 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
          <ShieldCheck className="mt-1 size-6 shrink-0 text-violet-300" aria-hidden />
          <p className="text-sm leading-relaxed text-white/80">{t.intro}</p>
        </div>
        {blocks.viewerId ? (
          <SignedInSafetyCenter key={blocks.viewerId} actor={blocks.viewerId} blocks={blocks} />
        ) : !blocks.blocksReady ? (
          <div role={blocks.blocksError ? 'alert' : 'status'} className="space-y-3">
            <p>{blocks.blocksError ? t.blocksFailed : t.loading}</p>
            {blocks.blocksError && <button className={buttonStyle} onClick={blocks.retryBlocks}>{t.retry}</button>}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-white/15 p-4">
            <p>{t.loginRequired}</p>
            <Link href="/auth/login?next=%2Fsafety" className={`${buttonStyle} inline-flex items-center bg-violet-600`}>{t.login}</Link>
          </div>
        )}
      </div>
      <MobileNav active="profile" />
    </MobileShell>
  );
}

function SignedInSafetyCenter({ actor, blocks }: { actor: string; blocks: BlocksState }) {
  const { locale } = useI18n();
  const t = safetyMessages[locale];
  const tr = communityTranslator(locale);
  const alive = useRef(true);
  const mutation = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const blockedHeadingRef = useRef<HTMLHeadingElement>(null);
  const showBlockedList = useSearchParams().get('view') === 'blocked';
  const [query, setQuery] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  const [search, setSearch] = useState<{ rows: Profile[]; loading: boolean; failed: boolean }>({ rows: [], loading: false, failed: false });
  const [selected, setSelected] = useState<Profile | null>(null);
  const [reason, setReason] = useState<Reason | ''>('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingBlock, setPendingBlock] = useState(false);
  const [reportNotice, setReportNotice] = useState<'reportSaved' | 'reportAndBlockSaved' | 'partialSuccess' | 'reportFailed' | 'rateLimited' | null>(null);
  const [actionNotice, setActionNotice] = useState<'blockSaved' | 'unblockSaved' | 'actionFailed' | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [confirmation, setConfirmation] = useState<{ profile: Profile; blocked: boolean } | null>(null);
  const [blockNames, setBlockNames] = useState<{ rows: Profile[]; failed: boolean }>({ rows: [], failed: false });
  const normalizedQuery = query.trim().slice(0, 80);
  const blockedKey = [...blocks.blockedIds].sort().join(',');
  const selectedIsBlocked = Boolean(selected && blocks.blockedIds.has(selected.id));

  useEffect(() => {
    if (showBlockedList && blocks.blocksReady) {
      blockedHeadingRef.current?.scrollIntoView({ block: 'start' });
      blockedHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [showBlockedList, blocks.blocksReady]);

  useEffect(() => {
    if (confirmation) confirmationRef.current?.scrollIntoView({ block: 'nearest' });
  }, [confirmation]);

  // Invalidate immediately in the auth callback, before React renders another
  // account. The parent keys this entire form by actor, so drafts never migrate.
  useEffect(() => {
    alive.current = true;
    const client = getSupabaseBrowserClient();
    const auth = client?.auth.onAuthStateChange((_event, session) => {
      if ((session?.user.id ?? '') !== actor) {
        alive.current = false;
        mutation.current?.abort();
      }
    });
    return () => {
      alive.current = false;
      mutation.current?.abort();
      auth?.data.subscription.unsubscribe();
    };
  }, [actor]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    if (normalizedQuery.length < 2) {
      setSearch({ rows: [], loading: false, failed: false });
      return () => { active = false; controller.abort(); };
    }
    setSearch({ rows: [], loading: true, failed: false });
    const delay = setTimeout(() => {
      deadline = setTimeout(() => {
        if (!active || !alive.current) return;
        active = false;
        controller.abort();
        setSearch({ rows: [], loading: false, failed: true });
      }, 15000);
      void (async () => {
        try {
          const client = getSupabaseBrowserClient();
          if (!client) throw new Error('Client unavailable');
          const session = await client.auth.getSession();
          if (session.error || session.data.session?.user.id !== actor) throw new Error('Session changed');
          if (!active || !alive.current) return;
          // These are public profile fields only. The existing profiles RLS still
          // hides moderated accounts; outgoing blocks deliberately do not filter
          // this safety-only picker so blocked users can be reported again.
          const pattern = normalizedQuery.replace(/[\\%_]/g, (char) => '\\' + char);
          const { data, error } = await client.from('profiles')
            .select('id,display_name,country').neq('id', actor)
            .ilike('display_name', '%' + pattern + '%')
            .order('display_name').order('id').limit(24).abortSignal(controller.signal);
          if (error) throw error;
          if (active && alive.current) setSearch({ rows: (data ?? []) as Profile[], loading: false, failed: false });
        } catch {
          if (active && alive.current) setSearch({ rows: [], loading: false, failed: true });
        } finally { clearTimeout(deadline); }
      })();
    }, 250);
    return () => { active = false; clearTimeout(delay); clearTimeout(deadline); controller.abort(); };
  }, [normalizedQuery, searchRevision, actor]);

  useEffect(() => {
    const ids = blockedKey ? blockedKey.split(',') : [];
    const controller = new AbortController();
    let active = true;
    setBlockNames({ rows: [], failed: false });
    if (!ids.length || !blocks.blocksReady) return () => { active = false; controller.abort(); };
    const deadline = setTimeout(() => {
      if (!active || !alive.current) return;
      active = false;
      controller.abort();
      setBlockNames({ rows: [], failed: true });
    }, 15000);
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        if (!client) throw new Error('Client unavailable');
        const rows: Profile[] = [];
        for (let index = 0; index < ids.length; index += 100) {
          const { data, error } = await client.from('profiles').select('id,display_name,country')
            .in('id', ids.slice(index, index + 100)).neq('id', actor).abortSignal(controller.signal);
          if (error) throw error;
          if (!active || !alive.current) return;
          rows.push(...((data ?? []) as Profile[]));
        }
        if (active && alive.current) setBlockNames({ rows, failed: false });
      } catch {
        if (active && alive.current) setBlockNames({ rows: [], failed: true });
      } finally { clearTimeout(deadline); }
    })();
    return () => { active = false; clearTimeout(deadline); controller.abort(); };
  }, [blockedKey, blocks.blocksReady, blocks.blocksRevision, actor]);

  function resetReport() {
    if (mutation.current) return;
    setReason(''); setDetails(''); setAlsoBlock(false); setSaved(false);
    setPendingBlock(false); setReportNotice(null); setNeedsLogin(false);
  }

  function select(profile: Profile) {
    if (mutation.current || profile.id === actor) return;
    if (profile.id !== selected?.id) resetReport();
    setSelected(profile);
    setConfirmation(null);
    setActionNotice(null);
    // The existing form stays reachable even after its target has been blocked.
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: 'start' }));
  }

  async function updateBlock(profile: Profile, blocked: boolean, signal: AbortSignal) {
    await viewerRequest('/api/blocks', actor, {
      method: 'POST', signal,
      body: JSON.stringify({ userId: profile.id, blocked, contextTargetType: 'USER', contextTargetId: profile.id }),
    });
    if (!alive.current) return;
    notifyBlockChange(profile.id, blocked, actor);
  }

  async function submitReport() {
    if (!selected || selected.id === actor || !reason || saved || mutation.current || !alive.current) return;
    if (alsoBlock && !blocks.blocksReady) return;
    const profile = selected;
    const shouldBlock = alsoBlock && !blocks.blockedIds.has(profile.id);
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true); setNeedsLogin(false); setReportNotice(null); setActionNotice(null);
    let reportConfirmed = false;
    try {
      await viewerRequest('/api/reports', actor, {
        method: 'POST', signal: controller.signal,
        body: JSON.stringify({ targetType: 'USER', targetId: profile.id, reason, details: details.trim() }),
      });
      if (!alive.current) return;
      reportConfirmed = true;
      setSaved(true);
      setReportNotice('reportSaved');
      if (shouldBlock) {
        setPendingBlock(true);
        await updateBlock(profile, true, controller.signal);
        if (!alive.current) return;
        setPendingBlock(false);
        setReportNotice('reportAndBlockSaved');
      }
    } catch (error) {
      if (!alive.current) return;
      setNeedsLogin(error instanceof AccountRequestError && error.status === 401);
      setReportNotice(reportConfirmed ? 'partialSuccess' : error instanceof AccountRequestError && error.status === 429 ? 'rateLimited' : 'reportFailed');
    } finally {
      if (mutation.current === controller) mutation.current = null;
      if (alive.current) setBusy(false);
    }
  }

  async function changeBlock(profile: Profile, blocked: boolean, finishReport = false) {
    if (profile.id === actor || mutation.current || !alive.current || !blocks.blocksReady) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true); setNeedsLogin(false); setActionNotice(null);
    try {
      await updateBlock(profile, blocked, controller.signal);
      if (!alive.current) return;
      setConfirmation(null);
      setActionNotice(blocked ? 'blockSaved' : 'unblockSaved');
      if (finishReport || (saved && selected?.id === profile.id && blocked)) {
        setPendingBlock(false);
        setReportNotice('reportAndBlockSaved');
      } else if (saved && selected?.id === profile.id && !blocked) {
        setPendingBlock(false);
        setReportNotice('reportSaved');
      }
    } catch (error) {
      if (!alive.current) return;
      setNeedsLogin(error instanceof AccountRequestError && error.status === 401);
      setActionNotice('actionFailed');
      if (finishReport) setReportNotice('partialSuccess');
    } finally {
      if (mutation.current === controller) mutation.current = null;
      if (alive.current) setBusy(false);
    }
  }

  function profileName(profile: Profile) { return profile.display_name || t.unavailableUser; }
  function userSummary(profile: Profile) {
    return <><span className="block break-words font-semibold">{profileName(profile)}</span><span className="block text-xs text-white/55">{profile.country ? profile.country + ' · ' : ''}{t.reference}: {profile.id.slice(-8)}</span></>;
  }

  return (
    <>
      <section className="space-y-3" aria-labelledby="safety-search-heading">
        <h2 id="safety-search-heading" className="flex items-center gap-2 text-lg font-semibold"><Search className="size-5 text-violet-300" aria-hidden />{t.search}</h2>
        <label className="block">
          <span className="sr-only">{t.search}</span>
          <input type="search" value={query} maxLength={80} disabled={busy} placeholder={t.searchPlaceholder} className="checkout-input" aria-describedby="safety-search-help"
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim().slice(0, 80) !== normalizedQuery)
                setSearch({ rows: [], loading: value.trim().length >= 2, failed: false });
            }} />
        </label>
        <p id="safety-search-help" className="text-sm leading-relaxed text-white/65">{t.searchHint}</p>
        <div aria-live="polite">
          {normalizedQuery.length < 2 ? <p className="text-sm text-white/55">{t.searchEmpty}</p> : search.loading ? <p>{t.loading}</p> : search.failed ? <div role="alert"><p>{t.searchFailed}</p><button className={buttonStyle + ' mt-2'} onClick={() => setSearchRevision((value) => value + 1)}>{t.retry}</button></div> : !search.rows.length ? <p>{t.noResults}</p> : null}
        </div>
        <ul className="space-y-2">
          {search.rows.map((profile) => <li key={profile.id}><button type="button" disabled={busy} aria-pressed={selected?.id === profile.id} onClick={() => select(profile)} className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border p-3 text-left disabled:opacity-40 ${selected?.id === profile.id ? 'border-violet-400 bg-violet-500/15' : 'border-white/15'}`}><span>{userSummary(profile)}{blocks.blockedIds.has(profile.id) && <span className="mt-1 inline-block text-xs text-amber-200">{t.blocked}</span>}</span><span className="shrink-0 text-sm text-violet-200">{t.choose}</span></button></li>)}
        </ul>
        {search.rows.length === 24 && <p className="text-xs text-white/60">{t.searchLimit}</p>}
      </section>

      <section ref={formRef} className="scroll-mt-5 space-y-4 rounded-2xl border border-white/15 bg-[#111225] p-4" aria-labelledby="safety-report-heading">
        <h2 id="safety-report-heading" className="flex items-center gap-2 text-lg font-semibold"><Flag className="size-5 text-pink-300" aria-hidden />{t.reportTitle}</h2>
        {!selected ? <p className="text-sm text-white/65">{t.selectUser}</p> : <>
          <div className="rounded-xl bg-white/5 p-3"><p className="mb-1 text-xs text-white/55">{t.selected}</p>{userSummary(selected)}</div>
          <form onSubmit={(event) => { event.preventDefault(); void submitReport(); }} className="space-y-4">
            <fieldset disabled={busy || saved} className="space-y-4 disabled:opacity-70">
              <label className="block text-sm">{t.reason}<select required value={reason} onChange={(event) => setReason(event.target.value as Reason)} className="checkout-input mt-2"><option value="">{t.chooseReason}</option>{reasons.map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}</select></label>
              <label className="block text-sm">{t.details}<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={4} placeholder={t.detailsHint} className="checkout-input mt-2" /></label>
              {blocks.blocksReady && selectedIsBlocked ? <p className="text-sm text-violet-200">{t.alreadyBlocked}</p> : <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" checked={alsoBlock} onChange={(event) => setAlsoBlock(event.target.checked)} disabled={!blocks.blocksReady} className="mt-1 size-5 shrink-0 accent-violet-500" /><span>{t.alsoBlock}</span></label>}
              <p className="text-xs leading-relaxed text-white/60">{t.blockHelp}</p>
            </fieldset>
            {!saved && <button type="submit" disabled={busy || !reason || (alsoBlock && !blocks.blocksReady)} className={`${buttonStyle} w-full border-violet-400/40 bg-violet-600`}>{busy ? t.sending : t.submit}</button>}
            {reportNotice && <div role={reportNotice === 'partialSuccess' || reportNotice === 'reportFailed' || reportNotice === 'rateLimited' ? 'alert' : 'status'} className="rounded-xl border border-white/15 p-3 text-sm">{t[reportNotice]}</div>}
            {saved && <div className="space-y-3"><p className="text-sm text-white/65">{t.reportSavedHint}</p><div className="flex flex-wrap gap-2">{pendingBlock && <button type="button" disabled={busy || !blocks.blocksReady} className={`${buttonStyle} bg-violet-600`} onClick={() => void changeBlock(selected, true, true)}>{busy ? t.working : t.retryBlock}</button>}<button type="button" disabled={busy} className={buttonStyle} onClick={resetReport}>{t.newReport}</button></div></div>}
          </form>
          <div className="border-t border-white/10 pt-4"><button type="button" disabled={busy || !blocks.blocksReady} className={buttonStyle} onClick={() => { setConfirmation({ profile: selected, blocked: !selectedIsBlocked }); setActionNotice(null); }}>{selectedIsBlocked ? t.unblock : t.block}</button></div>
        </>}
      </section>

      {confirmation && <div ref={confirmationRef} className="space-y-3 rounded-xl border border-amber-200/30 bg-amber-200/5 p-4" role="group" aria-label={confirmation.blocked ? t.confirmBlock : t.confirmUnblock}><p className="font-semibold">{confirmation.blocked ? t.confirmBlock : t.confirmUnblock}</p><div>{userSummary(confirmation.profile)}</div><p className="text-sm text-white/65">{t.blockHelp}</p><div className="flex gap-3"><button type="button" disabled={busy || !blocks.blocksReady} className={`${buttonStyle} bg-violet-600`} onClick={() => void changeBlock(confirmation.profile, confirmation.blocked)}>{busy ? t.working : t.confirm}</button><button type="button" disabled={busy} className={buttonStyle} onClick={() => setConfirmation(null)}>{t.cancel}</button></div></div>}
      {actionNotice && <p role={actionNotice === 'actionFailed' ? 'alert' : 'status'} className="rounded-xl border border-white/15 p-3 text-sm">{t[actionNotice]}</p>}
      {needsLogin && <Link href="/auth/login?next=%2Fsafety" className={`${buttonStyle} inline-flex items-center text-pink-300`}>{t.login}</Link>}

      <section className="space-y-3 border-t border-white/10 pt-5" aria-labelledby="safety-blocked-heading">
        <h2 ref={blockedHeadingRef} tabIndex={-1} id="safety-blocked-heading" className="flex scroll-mt-4 items-center gap-2 text-lg font-semibold outline-none"><Ban className="size-5 text-violet-300" aria-hidden />{t.blockedTitle}{blocks.blocksReady ? ` (${blocks.blockedIds.size})` : ''}</h2>
        <p className="text-sm text-white/65">{t.blockedIntro}</p>
        {!blocks.blocksReady ? <div role={blocks.blocksError ? 'alert' : 'status'}><p>{blocks.blocksError ? t.blocksFailed : t.loading}</p>{blocks.blocksError && <button className={`${buttonStyle} mt-2`} onClick={blocks.retryBlocks}>{t.retry}</button>}</div> : !blocks.blockedIds.size ? <p className="text-sm text-white/60">{t.noBlocks}</p> : <>
          {blockNames.failed && <p role="status" className="text-sm text-amber-100">{t.blockNamesFailed}</p>}
          <ul className="space-y-3">{[...blocks.blockedIds].map((id) => {
            const profile = blockNames.rows.find((row) => row.id === id) ?? { id, display_name: null, country: null };
            return <li key={id} className="space-y-3 rounded-xl border border-white/15 p-3"><div>{userSummary(profile)}</div><div className="flex flex-wrap gap-2"><button type="button" className={buttonStyle} disabled={busy} onClick={() => select(profile)}>{t.reportUser}</button><button type="button" className={buttonStyle} disabled={busy} onClick={() => { setConfirmation({ profile, blocked: false }); setActionNotice(null); }}>{t.unblock}</button></div></li>;
          })}</ul>
        </>}
      </section>
    </>
  );
}
