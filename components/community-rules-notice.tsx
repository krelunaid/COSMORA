'use client';

import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { communityRules } from '@/lib/i18n/community-rules';

export function CommunityRulesNotice() {
  const { locale } = useI18n();
  const copy = communityRules[locale];
  return <aside className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-white/80">
    <p>{copy.publish}</p>
    <Link href="/community/rules" className="inline-flex min-h-11 items-center text-pink-300 underline">{copy.title}</Link>
  </aside>;
}
