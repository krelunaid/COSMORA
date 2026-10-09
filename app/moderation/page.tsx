'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '@/components/app-link';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { AccountRequestError } from '@/lib/account-http';
import { useI18n } from '@/components/i18n-provider';
import { moderationMessages, moderationReasonLabel, moderationStatusLabel, moderationTargetLabel } from '@/lib/i18n/moderation';
import { isBlockModerationNotice } from '@/lib/moderation';
import type { ModerationAction, ModerationItem, ModerationQueue } from '@/lib/moderation';

type HistoryEntry = { id: string; target_type: string; target_id: string; action: ModerationAction; reason: string; created_at: string; previous_state: { status?: string } | null; next_state: { status?: string } | null };

function DecisionCard({ item, onSaved }: { item: ModerationItem; onSaved: () => Promise<void> }) {
  const { locale } = useI18n();
  const copy = moderationMessages[locale];
  const [action, setAction] = useState<ModerationAction | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'' | 'authorizedOnly' | 'changed' | 'unavailable' | 'invalidDecision' | 'decisionFailed'>('');
  const pending = ['PENDING_REVIEW', 'pending_review'].includes(item.status);
  const hidden = ['SUSPENDED', 'REMOVED', 'moderated'].includes(item.status);
  const actions: ModerationAction[] = item.status === 'MISSING' ? [] : item.targetType === 'USER'
    ? [hidden ? 'RESTORE' : 'SUSPEND']
    : hidden ? ['RESTORE'] : pending ? ['APPROVE', 'REJECT'] : ['HIDE', 'REJECT'];
  if (item.reports.length) actions.push('DISMISS', 'RESOLVE');
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !action || reason.trim().length < 5) return;
    setBusy(true);
    setError('');
    try {
      await accountRequest('/api/moderation', { method: 'POST', body: JSON.stringify({
        targetType: item.targetType, targetId: item.targetId, expectedStatus: item.status, action, reason, reportIds: item.reports.map((report) => report.id),
      }) });
      await onSaved();
      setAction('');
      setReason('');
    } catch (e) {
      setError(e instanceof AccountRequestError
        ? e.status === 401 || e.status === 403 ? 'authorizedOnly'
          : e.status === 409 ? 'changed'
          : e.status === 404 ? 'unavailable'
          : e.status === 400 ? 'invalidDecision' : 'decisionFailed'
        : 'decisionFailed');
    } finally { setBusy(false); }
  }
  return <article className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-4">
    <p className="text-sm text-violet-200">{moderationTargetLabel(item.targetType, locale)} · {moderationStatusLabel(item.status, locale)}</p>
    <h2 className="break-words text-xl font-semibold">{item.status === 'MISSING' ? copy.unavailable : item.title === 'Utente COSMORA' ? copy.user : item.title}</h2>
    {item.body && <p className="whitespace-pre-wrap break-words text-white/80">{item.body}</p>}
    <p className="break-all text-xs text-white/50">{item.targetId}</p>
    {item.authorId && <Link className="inline-flex min-h-11 items-center text-pink-300 underline" href={'/profile/' + item.authorId}>{copy.authorProfile}</Link>}
    {item.mediaUnavailable && <p role="alert" className="text-amber-100">{copy.mediaUnavailable}</p>}
    {item.media.length > 0 && <div className="space-y-3">
      <p className="text-sm text-amber-100">{copy.examineMedia}</p>
      {item.media.map((media, index) => media.type === 'VIDEO'
        ? <video key={index} src={media.url} controls playsInline preload="metadata" className="max-h-96 w-full rounded-xl bg-black" />
        : <img key={index} src={media.url} alt={copy.mediaAlt + ' ' + (index + 1)} className="max-h-96 w-full rounded-xl object-contain" />)}
    </div>}
    {item.reports.map((report) => <div key={report.id} className="space-y-2 rounded-xl border border-amber-300/25 p-3">
      {isBlockModerationNotice(report) && <p className="inline-flex rounded-full bg-amber-300/15 px-3 py-1 text-sm font-semibold text-amber-100">{copy.blockNotice}</p>}
      <h3 className="font-semibold">{isBlockModerationNotice(report) ? copy.blockReview : moderationReasonLabel(report.reason, locale)} · {new Date(report.created_at).toLocaleString(locale)}</h3>
      {report.details && <p className="whitespace-pre-wrap break-words">{report.details}</p>}
      {report.contextTargetType && report.contextTargetId && <p className="break-all text-sm text-white/70">{copy.sourceContent}: {moderationTargetLabel(report.contextTargetType, locale)} · {report.contextTargetId}</p>}
      {report.contextMessage && <blockquote className="whitespace-pre-wrap break-words border-l-2 border-pink-300 pl-3">
        <p className="text-sm text-white/60">{copy.reportedMessage} · {new Date(report.contextMessage.created_at).toLocaleString(locale)}</p>
        {report.contextMessage.body}
      </blockquote>}
    </div>)}
    {actions.length > 0 && <form onSubmit={submit} className="space-y-3 border-t border-white/15 pt-4">
      <label className="block text-sm">{copy.decision}
        <select required disabled={busy} value={action} onChange={(e) => setAction(e.target.value as ModerationAction | '')} className="checkout-input mt-2">
          <option value="">{copy.chooseDecision}</option>
          {actions.map((value) => <option key={value} value={value} disabled={value === 'APPROVE' && item.mediaUnavailable}>{copy.actions[value]}</option>)}
        </select>
      </label>
      <label className="block text-sm">{copy.reason}
        <textarea required disabled={busy} minLength={5} maxLength={2000} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="checkout-input mt-2" />
      </label>
      {action === 'RESTORE' && <p className="text-sm text-amber-100">{copy.restoreHint}</p>}
      {action === 'SUSPEND' && <p className="text-sm text-amber-100">{copy.suspendHint}</p>}
      <button disabled={busy || !action || reason.trim().length < 5 || (action === 'APPROVE' && item.mediaUnavailable)} className="min-h-12 rounded-xl bg-violet-600 px-5 disabled:opacity-50">{busy ? copy.saving : copy.confirm}</button>
      {error && <p role="alert" className="text-rose-200">{copy[error]}</p>}
    </form>}
  </article>;
}

export default function ModerationPage() {
  const { locale } = useI18n();
  const copy = moderationMessages[locale];
  const [view, setView] = useState<'pending' | 'hidden' | 'history'>('pending');
  const [offset, setOffset] = useState(0);
  const [queue, setQueue] = useState<ModerationQueue>({ items: [], more: false });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'' | 'authorizedOnly' | 'queueFailed'>('');
  const blockNotices = queue.items.reduce((count, item) => count + item.reports.filter(isBlockModerationNotice).length, 0);
  const requestKey = view + ':' + offset;
  const currentRequestKey = useRef(requestKey);
  currentRequestKey.current = requestKey;
  const load = useCallback(async () => {
    if (currentRequestKey.current !== requestKey) return;
    setLoading(true);
    setError('');
    try {
      if (view === 'history') {
        const response = await accountRequest<{ history: HistoryEntry[] }>('/api/moderation?view=history');
        if (currentRequestKey.current !== requestKey) return;
        setHistory(response.history);
      } else {
        const response = await accountRequest<ModerationQueue>('/api/moderation?view=' + view + '&offset=' + offset);
        if (currentRequestKey.current !== requestKey) return;
        setQueue(response);
      }
    } catch (e) {
      if (currentRequestKey.current !== requestKey) return;
      setQueue({ items: [], more: false });
      setHistory([]);
      setError(e instanceof AccountRequestError && (e.status === 401 || e.status === 403) ? 'authorizedOnly' : 'queueFailed');
    } finally { if (currentRequestKey.current === requestKey) setLoading(false); }
  }, [view, offset, requestKey]);
  useEffect(() => { void load(); }, [load]);
  return <MobileShell>
    <ScreenHeader title={copy.title} back="/support" />
    <main className="space-y-5 p-5 pb-24">
      <p className="text-sm text-white/70">{copy.intro}</p>
      {view === 'pending' && !loading && !error && blockNotices > 0 && <output className="block rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">{copy.blockCount}: {blockNotices}</output>}
      <div className="flex flex-wrap gap-2">
        {(['pending', 'hidden', 'history'] as const).map((tab) => <button key={tab} onClick={() => { setOffset(0); setView(tab); }} aria-pressed={view === tab} className={'min-h-11 rounded-xl px-3 ' + (view === tab ? 'bg-violet-600' : 'border border-white/20')}>{copy[tab]}</button>)}
        <button disabled={loading} onClick={() => void load()} className="min-h-11 rounded-xl border border-white/20 px-3 disabled:opacity-50">{copy.refresh}</button>
      </div>
      {loading ? <output>{copy.loading}</output> : error ? <div className="space-y-3"><p role="alert" className="text-rose-200">{copy[error]}</p><Link href="/auth/login" className="inline-flex min-h-11 items-center text-pink-300">{copy.login}</Link></div>
        : view === 'history' ? <><p className="text-sm text-white/60">{copy.latestDecisions}</p>{history.length === 0 && <p>{copy.noDecisions}</p>}{history.map((entry) => <article key={entry.id} className="space-y-2 rounded-xl border border-white/15 p-4">
          <h2 className="font-semibold">{copy.actions[entry.action] || entry.action} · {moderationTargetLabel(entry.target_type, locale)}</h2>
          <p className="text-sm">{new Date(entry.created_at).toLocaleString(locale)} · {moderationStatusLabel(entry.previous_state?.status, locale)} → {moderationStatusLabel(entry.next_state?.status, locale)}</p>
          <p className="whitespace-pre-wrap break-words">{entry.reason}</p><p className="break-all text-xs text-white/50">{entry.target_id}</p>
        </article>)}</>
        : <>{queue.items.length === 0 && <p>{copy.empty}</p>}{queue.items.map((item) => <DecisionCard key={item.targetType + item.targetId + item.status} item={item} onSaved={async () => { if (offset) setOffset(0); else await load(); }} />)}
          <div className="flex justify-between gap-3">
            {offset > 0 && <button onClick={() => setOffset(Math.max(0, offset - 50))} className="min-h-11 rounded-xl border border-white/20 px-3">{copy.previous}</button>}
            {queue.more && <button onClick={() => setOffset(offset + 50)} className="min-h-11 rounded-xl border border-white/20 px-3">{copy.next}</button>}
          </div>
        </>}
    </main>
  </MobileShell>;
}
