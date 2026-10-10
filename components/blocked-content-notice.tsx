'use client';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator } from '@/lib/i18n/community';

export function BlockedContentNotice({ ready, error, retry }: { ready: boolean; error: boolean; retry: () => void }) {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  if (ready) return null;
  if (!error) return <output className="block py-3 text-white/70">{t('Caricamento…')}</output>;
  return <div role="alert" className="space-y-2 py-3">
    <p>{t('Caricamento non riuscito.')}</p>
    <button type="button" onClick={retry} className="min-h-11 text-pink-300">{t('Riprova')}</button>
  </div>;
}
