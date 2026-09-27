'use client';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';
import { useState } from 'react';
import Link from '@/components/app-link';
import { accountRequest } from '@/lib/account-client';
export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'POST' | 'SQUAD' | 'USER';
  targetId: string;
}) {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  async function submit(form: FormData) {
    setBusy(true);
    setMessage('');
    setNeedsLogin(false);
    try {
      await accountRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          reason: form.get('reason'),
          details: form.get('details'),
        }),
      });
      setSuccess(true);
      setMessage(t('Segnalazione ricevuta. Grazie per averci avvisato.'));
    } catch (e) {
      setNeedsLogin(e instanceof Error && e.message.startsWith('Accedi'));
      setMessage(communityError(locale, e, 'Invio non riuscito.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="min-h-11 text-sm text-white/65"
      >
        {t('Segnala')}
      </button>
      {open && (
        <form
          action={submit}
          className="space-y-3 rounded-xl border border-white/15 p-3"
        >
          {!success && (
            <>
              <label className="block text-sm">
                {t('Motivo')}
                <select name="reason" className="checkout-input mt-2">
                  <option value="SPAM">Spam</option>
                  <option value="SCAM">{t('Possibile truffa')}</option>
                  <option value="HARASSMENT">{t('Molestie')}</option>
                  <option value="SEXUAL_CONTENT">
                    {t('Contenuti sessuali')}
                  </option>
                  <option value="HATE">{t('Odio')}</option>
                  <option value="COPYRIGHT">Copyright</option>
                  <option value="OTHER">{t('Altro')}</option>
                </select>
              </label>
              <label className="block text-sm">
                {t('Dettagli')}
                <textarea
                  name="details"
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
          {needsLogin && (
            <Link href="/auth/login" className="block py-2 text-pink-300">
              {t('Accedi')}
            </Link>
          )}
        </form>
      )}
    </div>
  );
}
