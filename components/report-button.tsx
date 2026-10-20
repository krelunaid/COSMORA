'use client';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';
import { reportControls } from '@/lib/i18n/report-controls';
import { safetyMessages } from '@/lib/i18n/safety';
import { blockFeedbackMessages } from '@/lib/i18n/block-feedback';
import { Ban, Flag } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import Link from '@/components/app-link';
import { AccountRequestError } from '@/lib/account-http';
import { notifyBlockChange } from '@/lib/blocked-content';
import { viewerRequest } from '@/lib/viewer-request';
export function ReportButton({
  targetType,
  targetId,
  contextMessageId,
  authorId,
  viewerId,
}: {
  targetType: 'POST' | 'SQUAD' | 'USER' | 'LISTING';
  targetId: string;
  contextMessageId?: string;
  authorId?: string;
  viewerId?: string;
}) {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const copy = reportControls[locale];
  const safety = safetyMessages[locale];
  const blockCopy = blockFeedbackMessages[locale];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const [reason, setReason] = useState('SPAM');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const blockingRef = useRef(false);
  const [blocking, setBlocking] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [blockNeedsLogin, setBlockNeedsLogin] = useState(false);
  const viewerRef = useRef(viewerId ?? '');
  const contextVersion = useRef(0);
  useLayoutEffect(() => {
    viewerRef.current = viewerId ?? '';
    contextVersion.current += 1;
    submittingRef.current = false;
    blockingRef.current = false;
    setBusy(false);
    setBlocking(false);
    setOpen(false);
    setReason('SPAM');
    setDetails('');
    setMessage('');
    setSuccess(false);
    setNeedsLogin(false);
    setBlockMessage('');
    setBlockNeedsLogin(false);
    // Pending completions belong to this viewer and target, including on unmount.
    return () => { contextVersion.current += 1; };
  }, [viewerId, targetType, targetId, contextMessageId, authorId]);
  function startAnotherReport() {
    setSuccess(false);
    setMessage('');
    setNeedsLogin(false);
    setReason('SPAM');
    setDetails('');
  }
  function toggleReport() {
    // Closing an unsent form preserves its draft and any actionable error.
    if (!open && success) startAnotherReport();
    setOpen(!open);
  }
  async function blockAuthor() {
    if (!authorId || authorId === viewerId || blockingRef.current) return;
    const actor = viewerId ?? '';
    const version = contextVersion.current;
    blockingRef.current = true;
    setBlocking(true);
    setBlockMessage('');
    setBlockNeedsLogin(false);
    try {
      await viewerRequest('/api/blocks', actor, {
        method: 'POST',
        body: JSON.stringify({
          userId: authorId,
          blocked: true,
          contextTargetType: targetType,
          contextTargetId: targetId,
        }),
      });
      if (viewerRef.current !== actor || contextVersion.current !== version) return;
      notifyBlockChange(authorId, true, actor);
    } catch (error) {
      if (viewerRef.current !== actor || contextVersion.current !== version) return;
      setBlockNeedsLogin(error instanceof AccountRequestError && error.status === 401);
      setBlockMessage(communityError(locale, error, 'Operazione non riuscita.'));
    } finally {
      if (contextVersion.current === version) {
        blockingRef.current = false;
        setBlocking(false);
      }
    }
  }
  async function submit(form: FormData) {
    if (submittingRef.current) return;
    const actor = viewerId ?? '';
    const version = contextVersion.current;
    submittingRef.current = true;
    setBusy(true);
    setMessage('');
    setNeedsLogin(false);
    try {
      await viewerRequest('/api/reports', actor, {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          contextMessageId,
          reason: form.get('reason'),
          details: form.get('details'),
        }),
      });
      if (viewerRef.current !== actor || contextVersion.current !== version) return;
      setSuccess(true);
      setMessage(t('Segnalazione ricevuta. Grazie per averci avvisato.'));
    } catch (e) {
      if (viewerRef.current !== actor || contextVersion.current !== version) return;
      setNeedsLogin(e instanceof AccountRequestError && e.status === 401);
      setMessage(communityError(locale, e, 'Invio non riuscito.'));
    } finally {
      if (contextVersion.current === version) {
        submittingRef.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={toggleReport}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-medium text-white/85"
      >
        <Flag className="size-4 shrink-0" aria-hidden />
        {open ? copy.close : t('Segnala')}
      </button>
      {authorId && authorId !== viewerId && (
        <button
          type="button"
          disabled={blocking}
          onClick={() => void blockAuthor()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300/40 bg-rose-400/15 px-3 text-sm font-semibold text-rose-100 disabled:opacity-50"
        >
          <Ban className="size-4 shrink-0" aria-hidden />
          {blocking ? safety.working : safety.block}
        </button>
      )}
      </div>
      {authorId && authorId !== viewerId && <p className="max-w-prose text-xs leading-relaxed text-white/65">{blockCopy.help}</p>}
      {blockMessage && <p role="alert" className="text-sm text-rose-200">{blockMessage}</p>}
      {blockNeedsLogin && (
        <Link href="/auth/login" className="block py-2 text-pink-300">{t('Accedi')}</Link>
      )}
      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
          }}
          className="space-y-3 rounded-xl border border-white/15 p-3"
        >
          {!success && (
            <>
              {contextMessageId && <p className="text-sm text-white/70">{t('Il messaggio selezionato sarà condiviso con i moderatori.')}</p>}
              <label className="block text-sm">
                {t('Motivo')}
                <select name="reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} className="checkout-input mt-2">
                  <option value="SPAM">Spam</option>
                  <option value="SCAM">{t('Possibile truffa')}</option>
                  <option value="HARASSMENT">{t('Molestie')}</option>
                  <option value="SEXUAL_CONTENT">
                    {t('Contenuti sessuali')}
                  </option>
                  <option value="HATE">{t('Odio')}</option>
                  <option value="VIOLENCE">{t('Violenza')}</option>
                  <option value="COPYRIGHT">Copyright</option>
                  <option value="COUNTERFEIT">{t('Contraffazione')}</option>
                  <option value="OTHER">{t('Altro')}</option>
                </select>
              </label>
              <label className="block text-sm">
                {t('Dettagli')}
                <textarea
                  name="details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  disabled={busy}
                  maxLength={2000}
                  className="checkout-input mt-2"
                />
              </label>
              <button
                disabled={busy}
                className="min-h-11 rounded-xl bg-violet-600 px-4 disabled:opacity-50"
              >
                {busy ? t('Invio…') : t('Invia segnalazione')}
              </button>
            </>
          )}
          {message && <output className="block text-sm">{message}</output>}
          {success && (
            <button type="button" onClick={startAnotherReport} className="min-h-11 rounded-xl border border-white/20 px-4">
              {copy.another}
            </button>
          )}
          {needsLogin && (
            <Link href="/auth/login" className="block py-2 text-pink-300">
              {t('Accedi')}
            </Link>
          )}
          <Link href="/safety" className="block py-2 text-pink-300">{copy.safety}</Link>
        </form>
      )}
    </div>
  );
}
