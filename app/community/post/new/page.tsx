'use client';
import { CommunityRulesNotice } from '@/components/community-rules-notice';
import { apiFetch } from '@/lib/api-fetch';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';

import { useState } from 'react';
import Link from '@/components/app-link';
import { CheckCircle2 } from 'lucide-react';

import { CommunityMediaPicker } from '@/components/community-media-picker';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { AccountRequestError } from '@/lib/account-http';
import { readFormResponse } from '@/lib/form-response';
import { moderateText } from '@/lib/community-moderation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const categories = [
  'Cosplay',
  'Collection',
  'Creator Work',
  'Gaming',
  'Cards',
  'Comics',
  'Figures',
  'Event',
  'Making Of',
];
export default function CreateCommunityPostPage() {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const [result, setResult] = useState<{
    status: string;
    reasons: string[];
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<Error | string>('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState('');
  async function submit(formData: FormData) {
    if (publishing) return;
    if (!mediaFiles.length) {
      setMediaError(t('Aggiungi almeno una foto o un video.'));
      return;
    }
    if (mediaFiles.reduce((total, file) => total + file.size, 0) > 32 * 1024 * 1024) {
      setMediaError(t('Carica al massimo 32 MB complessivi per post.'));
      return;
    }
    setPublishing(true);
    setPublishError('');
    setNeedsLogin(false);
    try {
      const rawCaption = formData.get('caption');
      const caption = typeof rawCaption === 'string' ? rawCaption : '';
      const moderation = moderateText('Community post', caption);
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Accesso non disponibile. Riprova più tardi.');
      const session = await client.auth.getSession();
      if (session.error) throw new Error('Accesso non disponibile. Riprova più tardi.');
      const token = session.data.session?.access_token;
      if (!token) throw new AccountRequestError('Accedi per continuare.', 401, 'AUTH_REQUIRED');
      formData.delete('media');
      for (const file of mediaFiles) formData.append('media', file);
      const response = await apiFetch('/api/community/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await readFormResponse<{
        moderation?: { status: string; reasons: string[] };
      }>(response, 'Pubblicazione non riuscita.');
      setResult(payload.moderation ?? { ...moderation, status: 'PENDING_REVIEW' });
    } catch (error) {
      setNeedsLogin(error instanceof AccountRequestError && error.status === 401);
      setPublishError(error instanceof Error ? error : 'failed');
    } finally {
      setPublishing(false);
    }
  }

  if (result)
    return (
      <MobileShell>
        <div className="flex min-h-[760px] flex-col items-center justify-center px-8 text-center">
          <CheckCircle2
            className={`size-16 ${result.status === 'ACTIVE' ? 'text-emerald-300' : 'text-amber-300'}`}
          />
          <h1 className="mt-5 text-2xl font-semibold">
            {result.status === 'ACTIVE'
              ? t('Post pubblicato')
              : t('Post inviato in revisione')}
          </h1>
          <p className="mt-3 text-sm text-white/50">
            {result.reasons[0]
              ? t(result.reasons[0])
              : t(
                  result.status === 'ACTIVE'
                    ? 'Il post è visibile nella Community.'
                    : 'Il post sarà visibile dopo la revisione.',
                )}
          </p>
          <Link
            href="/community"
            className="mt-6 grid h-11 w-full place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500"
          >
            {t('Apri Community')}
          </Link>
        </div>
      </MobileShell>
    );

  return (
    <MobileShell>
      <ScreenHeader title={t('Pubblica nella Community')} back="/community" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
        className="space-y-4 p-4"
      >
        <CommunityMediaPicker
          onFilesChange={setMediaFiles}
          error={mediaError}
          onError={setMediaError}
        />
        <textarea
          required
          name="caption"
          minLength={1}
          maxLength={2000}
          aria-label={t('Descrizione')}
          placeholder={t('Racconta cosa stai condividendo…')}
          className="checkout-input min-h-28 resize-none py-3"
        />
        <p className="text-sm text-white/60">{t('Puoi scrivere hashtag nella descrizione, per esempio #cosplay. Non collegano automaticamente una persona.')}</p>
        <Link href="/profile/me" className="block text-sm text-pink-200 underline">{t('Il nome sui tuoi post si imposta nel tuo profilo.')}</Link>
        <select
          required
          name="category"
          aria-label={t('Scegli la categoria')}
          className="checkout-input"
        >
          <option value="">{t('Scegli la categoria')}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {t(category)}
            </option>
          ))}
        </select>

        <CommunityRulesNotice />
        {publishError && (
          <p role="alert" className="text-sm text-rose-300">
            {communityError(locale, publishError, 'Pubblicazione non riuscita.')}
            {needsLogin && (
              <Link href="/auth/login" className="ml-2 underline">
                {t('Accedi')}
              </Link>
            )}
          </p>
        )}
        <button
          disabled={publishing}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium disabled:opacity-60"
        >
          {publishing ? t('Pubblicazione…') : t('Pubblica post')}
        </button>
      </form>
    </MobileShell>
  );
}
