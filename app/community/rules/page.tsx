'use client';

import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { communityRules } from '@/lib/i18n/community-rules';

export default function CommunityRulesPage() {
  const { locale } = useI18n();
  const copy = communityRules[locale];
  return <MobileShell>
    <ScreenHeader title={copy.title} back="/support" />
    <article lang={locale} className="space-y-7 px-5 py-6 text-base leading-relaxed text-white/85">
      <h1 className="text-2xl font-semibold text-white">{copy.title}</h1>
      <p>{copy.intro}</p>
      {copy.sections.map(([title, text]) => <section key={title} className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2><p>{text}</p>
      </section>)}
      <Link href="/support" className="block min-h-11 py-2 text-pink-300 underline">{copy.support}</Link>
    </article>
  </MobileShell>;
}
