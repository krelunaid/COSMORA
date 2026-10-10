'use client';

import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { CHILD_SAFETY_OPERATOR_CONFIRMED, childSafetyMessages } from '@/lib/i18n/child-safety';

export function ChildSafetyContent() {
  const { locale } = useI18n();
  const copy = childSafetyMessages[locale];
  const contactHref = `mailto:info@kreluna.it?subject=${encodeURIComponent(`[COSMORA] ${copy.title}`)}`;

  return <MobileShell>
    <ScreenHeader title={copy.title} back="/community/rules" />
    <article lang={locale} className="space-y-7 px-5 py-6 text-base leading-relaxed text-white/85">
      <h1 className="text-2xl font-semibold text-white">{copy.title}</h1>
      {!CHILD_SAFETY_OPERATOR_CONFIRMED ? <aside className="space-y-2 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4 text-amber-100" aria-labelledby="child-safety-draft-title">
        <h2 id="child-safety-draft-title" className="font-semibold">{copy.draftTitle}</h2>
        <p>{copy.draftBody}</p>
      </aside> : null}
      <p>{copy.intro}</p>
      <Link href="/safety" className="inline-flex min-h-11 items-center rounded-xl border border-violet-300/30 bg-violet-500/10 px-4 py-2 font-semibold text-violet-100 underline">{copy.report}</Link>
      {copy.sections.map(([title, text]) => <section key={title} className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p>{text}</p>
      </section>)}
      <nav aria-label={copy.title} className="space-y-2 border-t border-white/10 pt-4">
        <a href={contactHref} className="block min-h-11 py-2 text-pink-300 underline">{copy.contact}</a>
        <Link href="/community/rules" className="block min-h-11 py-2 text-pink-300 underline">{copy.rules}</Link>
        <Link href="/privacy" className="block min-h-11 py-2 text-pink-300 underline">{copy.privacy}</Link>
      </nav>
      <p className="text-sm text-white/60">{copy.updated}</p>
    </article>
  </MobileShell>;
}
