'use client';

import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { privacyMessages } from '@/lib/i18n/privacy';

export function PrivacyContent() {
  const { locale } = useI18n();
  const copy = privacyMessages[locale];
  return <MobileShell>
    <ScreenHeader title={copy.title} back="/support" />
    <article lang={locale} className="space-y-7 px-5 py-6 text-base leading-relaxed text-white/85">
      <h1 className="text-2xl font-semibold text-white">{copy.heading}</h1>
      {copy.sections.map(([title, text]) => <section key={title} className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2><p>{text}</p>
      </section>)}
      <p><a className="text-pink-300 underline" href="mailto:info@kreluna.it?subject=%5BCOSMORA%5D%20Privacy">{copy.contact}</a></p>
      <p><Link className="text-pink-300 underline" href="/account/delete">{copy.deleteAccount}</Link></p>
      <p><a className="text-pink-300 underline" href="https://www.garanteprivacy.it/">{copy.authority}</a></p>
    </article>
  </MobileShell>;
}
