'use client';
import { useCommerce } from '@/components/use-commerce';
import { Mail } from 'lucide-react';
import Link from '@/components/app-link';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { useI18n } from '@/components/i18n-provider';
import { communityRules } from '@/lib/i18n/community-rules';
import { ModerationLink } from '@/components/moderation-link';
import { SafetyLink } from '@/components/safety-link';

export default function SupportPage() {
  const { t } = useCommerce();
  const { locale } = useI18n();
  const subject = t('supportSubject');
  const mailto = `mailto:info@kreluna.it?subject=${encodeURIComponent(subject)}`;
  return (
    <MobileShell>
      <ScreenHeader title={t('support')} back="/profile/me" />
      <section className="space-y-6 px-5 py-6 text-base leading-relaxed">
        <SafetyLink />
        <ModerationLink />
        <div>
          <h1 className="text-2xl font-semibold">{t('help')}</h1>
          <p className="mt-3 text-white/75">{t('supportIntro')}</p>
        </div>
        <a
          href={mailto}
          className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300"
        >
          <Mail className="size-5" aria-hidden="true" /> {t('contactSupport')}
        </a>
        <div className="rounded-2xl border border-white/15 bg-[#111225] p-4">
          <p className="break-all">
            Email:{' '}
            <a className="text-pink-300 underline" href={mailto}>
              info@kreluna.it
            </a>
          </p>
          <p className="mt-3">
            {t('subject')} <span className="text-white/80">{subject}</span>
          </p>
          <p className="mt-3 text-white/75">{t('mailHint')}</p>
        </div>
        <p className="text-white/75">{t('describeIssue')}</p>
        <p className="rounded-2xl border border-amber-300/25 p-4 text-amber-100">
          {t('noSecrets')}
        </p>
        <Link href="/community/rules" className="block min-h-12 text-pink-300 underline">
          {communityRules[locale].title}
        </Link>
        <Link
          href="/privacy"
          className="block min-h-12 text-pink-300 underline"
        >
          {t('privacy')}
        </Link>
        <Link
          href="/account/delete"
          className="block min-h-12 text-pink-300 underline"
        >
          {t('deleteAccount')}
        </Link>
      </section>
    </MobileShell>
  );
}
